/**
 * 题库解析器
 * 从 Markdown 文件中提取 JSON 代码块并解析为题库数据
 */

/**
 * 从 Markdown 内容中提取 JSON 数据
 * @param {string} mdContent - Markdown 文件内容
 * @returns {{ success: boolean, data: Object|null, error: string|null }}
 */
export function parseMdBank(mdContent) {
  if (!mdContent || typeof mdContent !== 'string') {
    return { success: false, data: null, error: '文件内容为空' }
  }

  // 查找 ```json ... ``` 代码块
  // 支持 ```json 和 ``` 之间的内容
  const jsonBlockRegex = /```json\s*\n([\s\S]*?)```/
  const match = mdContent.match(jsonBlockRegex)

  if (!match || !match[1]) {
    return {
      success: false,
      data: null,
      error: '未找到 JSON 代码块。请确保 Markdown 文件中包含 ```json ... ``` 格式的代码块'
    }
  }

  const jsonStr = match[1].trim()

  try {
    const data = JSON.parse(jsonStr)
    return { success: true, data, error: null }
  } catch (e) {
    return {
      success: false,
      data: null,
      error: `JSON 解析失败: ${e.message}`
    }
  }
}

/**
 * 读取文件内容
 * @param {File} file - 用户上传的文件对象
 * @returns {Promise<string>} 文件文本内容
 */
export function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file, 'UTF-8')
  })
}

/**
 * 加载内置示例题库（已禁用，全部从数据库获取）
 * @returns {Promise<Array>} 空数组
 */
export async function loadBuiltinBanks() {
  return []
}
