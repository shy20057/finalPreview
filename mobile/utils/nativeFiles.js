/** Android documents use the Storage Access Framework; uni.chooseFile is Web-only. */
let documentBusy = false
const MAX_TEXT_SIZE = 20 * 1024 * 1024
function errorOf(e, fallback) { return new Error(e?.message || e?.errMsg || fallback) }

function androidDocument(action, filename, consume) {
  return new Promise((resolve, reject) => {
    if (documentBusy) { reject(new Error('请先完成当前文件操作')); return }
    documentBusy = true
    const activity = plus.android.runtimeMainActivity()
    const previous = activity.onActivityResult
    const requestCode = action === 'open' ? 48171 : 48172
    function finish(error, result) {
      activity.onActivityResult = previous
      documentBusy = false
      error ? reject(error) : resolve(result)
    }
    try {
      const Intent = plus.android.importClass('android.content.Intent')
      const intent = new Intent(action === 'open' ? Intent.ACTION_OPEN_DOCUMENT : Intent.ACTION_CREATE_DOCUMENT)
      intent.addCategory(Intent.CATEGORY_OPENABLE)
      const extension = String(filename || '').split('.').pop().toLowerCase()
      const mime = { md: 'text/markdown', markdown: 'text/markdown', json: 'application/json', html: 'text/html', txt: 'text/plain' }[extension] || 'application/octet-stream'
      intent.setType(action === 'open' ? '*/*' : mime)
      if (filename) intent.putExtra(Intent.EXTRA_TITLE, filename)
      activity.onActivityResult = (code, result, data) => {
        if (code !== requestCode) { previous?.(code, result, data); return }
        if (result !== -1 || !data) { finish(new Error('cancel')); return }
        try {
          const uri = plus.android.invoke(data, 'getData')
          const resolver = activity.getContentResolver()
          plus.android.importClass(resolver)
          finish(null, consume(resolver, uri))
        } catch (error) { finish(errorOf(error, '文件操作失败')) }
      }
      activity.startActivityForResult(intent, requestCode)
    } catch (error) { finish(errorOf(error, '无法打开系统文件选择器')) }
  })
}

function readAndroidDocument(resolver, uri) {
  let filename = 'document.txt'
  let size = 0
  let cursor
  try {
    cursor = resolver.query(uri, null, null, null, null)
    if (cursor) {
      plus.android.importClass(cursor)
      if (cursor.moveToFirst()) {
        const ni = cursor.getColumnIndex('_display_name')
        const si = cursor.getColumnIndex('_size')
        if (ni >= 0) filename = String(cursor.getString(ni))
        if (si >= 0) size = Number(cursor.getLong(si)) || 0
      }
    }
  } finally { cursor?.close() }
  if (size > MAX_TEXT_SIZE) throw new Error('文件不能超过 20MB')
  const InputStreamReader = plus.android.importClass('java.io.InputStreamReader')
  const BufferedReader = plus.android.importClass('java.io.BufferedReader')
  const stream = resolver.openInputStream(uri)
  const reader = new BufferedReader(new InputStreamReader(stream, 'UTF-8'))
  try {
    const lines = []
    let count = 0
    let line
    while ((line = reader.readLine()) !== null) {
      line = String(line)
      count += line.length + 1
      if (count > MAX_TEXT_SIZE) throw new Error('文件不能超过 20MB')
      lines.push(line)
    }
    return { filename, name: filename, size: size || count, content: lines.join('\n'), path: String(uri.toString()) }
  } finally { reader.close() }
}

export function readTextFile(filePath) {
  return new Promise((resolve, reject) => {
    if (typeof plus !== 'undefined') {
      plus.io.resolveLocalFileSystemURL(filePath, entry => entry.file(file => {
        const reader = new plus.io.FileReader()
        reader.onloadend = e => resolve(String(e.target.result || ''))
        reader.onerror = e => reject(errorOf(e, '文件读取失败'))
        reader.readAsText(file, 'utf-8')
      }, e => reject(errorOf(e, '文件读取失败'))), e => reject(errorOf(e, '文件读取失败')))
      return
    }
    // #ifdef H5
    fetch(filePath).then(r => r.text()).then(resolve, reject)
    return
    // #endif
    // #ifndef H5
    if (typeof uni.getFileSystemManager === 'function') {
      uni.getFileSystemManager().readFile({ filePath, encoding: 'utf-8', success: r => resolve(r.data), fail: e => reject(errorOf(e, '文件读取失败')) })
    } else reject(new Error('当前平台不支持文件读取'))
    // #endif
  })
}

export async function pickTextFile(extensions = ['.md', '.markdown', '.txt']) {
  let file
  if (typeof plus !== 'undefined' && plus.os.name === 'Android') {
    file = await androidDocument('open', '', readAndroidDocument)
  } else {
    file = await new Promise((resolve, reject) => {
      const choose = uni.chooseFile || uni.chooseMessageFile
      if (!choose) { reject(new Error('当前平台不支持文档选择')); return }
      choose({ count: 1, type: 'all', extension: extensions,
        success: async res => {
          const selected = res.tempFiles?.[0]
          if (!selected) { reject(new Error('cancel')); return }
          try {
            const content = selected.text ? await selected.text() : await readTextFile(selected.path || selected.tempFilePath)
            resolve({ filename: selected.name || 'document.txt', name: selected.name || 'document.txt', content, size: selected.size || content.length, path: selected.path })
          } catch (error) { reject(error) }
        }, fail: e => reject(errorOf(e, '选择文件失败')),
      })
    })
  }
  if (file.size > MAX_TEXT_SIZE) throw new Error('文件不能超过 20MB')
  if (extensions.length && !extensions.some(ext => file.filename.toLowerCase().endsWith(ext.toLowerCase()))) {
    throw new Error(`请选择 ${extensions.join('、')} 文件`)
  }
  return file
}

export function writeTextFile(filename, content) {
  // #ifdef H5
  return Promise.resolve({ filename, content })
  // #endif
  // #ifndef H5
  return new Promise((resolve, reject) => {
    if (typeof plus === 'undefined') { reject(new Error('当前平台不支持文件写入')); return }
    const safeName = String(filename || 'export.md').replace(/[\\/:*?"<>|]/g, '_')
    plus.io.requestFileSystem(plus.io.PRIVATE_DOC, fs => {
      fs.root.getFile(safeName, { create: true }, entry => entry.createWriter(writer => {
        let truncated = false
        writer.onerror = e => reject(errorOf(e, '文件写入失败'))
        writer.onwrite = () => {
          if (!truncated) { truncated = true; writer.seek(0); writer.write(content) }
          else resolve(entry.toLocalURL())
        }
        writer.truncate(0)
      }, e => reject(errorOf(e, '文件写入失败'))), e => reject(errorOf(e, '创建文件失败')))
    }, e => reject(errorOf(e, '文件系统不可用')))
  })
  // #endif
}

/** Existing callers use this name; Android exports via the system Save dialog. */
export async function shareFile(filePath, title = '导出文件') {
  // #ifdef H5
  const blob = new Blob([filePath.content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filePath.filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return
  // #endif
  // #ifndef H5
  if (typeof plus === 'undefined') throw new Error('当前平台不支持导出文件')
  if (plus.os.name === 'Android') {
    const content = await readTextFile(filePath)
    const filename = decodeURIComponent(filePath.split('/').pop() || 'export.md')
    return androidDocument('save', filename, (resolver, uri) => {
      const OutputStreamWriter = plus.android.importClass('java.io.OutputStreamWriter')
      const stream = resolver.openOutputStream(uri, 'wt')
      const writer = new OutputStreamWriter(stream, 'UTF-8')
      try { writer.write(content); writer.flush() } finally { writer.close() }
      uni.showToast({ title: '文件已保存', icon: 'success' })
      return String(uri.toString())
    })
  }
  plus.runtime.openFile(filePath, {}, e => uni.showToast({ title: e?.message || title, icon: 'none' }))
  // #endif
}

export function readImageDataUrl(file) {
  const filePath = typeof file === 'string' ? file : file?.path
  if (!filePath) return Promise.reject(new Error('没有可读取的图片'))
  return new Promise((resolve, reject) => {
    if (typeof plus !== 'undefined') {
      plus.io.resolveLocalFileSystemURL(filePath, entry => entry.file(image => {
        const reader = new plus.io.FileReader()
        reader.onloadend = e => resolve(e.target.result)
        reader.onerror = e => reject(errorOf(e, '图片读取失败'))
        reader.readAsDataURL(image)
      }, reject), reject)
      return
    }
    // #ifdef H5
    fetch(filePath).then(r => r.blob()).then(blob => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('图片读取失败'))
      reader.readAsDataURL(blob)
    }).catch(reject)
    return
    // #endif
    // #ifndef H5
    reject(new Error('当前平台不支持图片读取'))
    // #endif
  })
}
