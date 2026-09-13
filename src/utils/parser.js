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
 * 内置"项目使用指南"题库。
 * 介绍项目各功能模块的使用方法，让用户通过答题形式快速上手。
 * 标记 builtin: true 后，UI 层会显示"内置"标签且隐藏编辑/删除按钮，用户不可修改。
 */
const builtinGuideBank = {
  id: 'builtin-guide',
  name: '项目使用指南 · 新手必读',
  subject: '使用指南',
  sourceFile: 'builtin-guide',
  builtin: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  questions: [
    {
      id: 1,
      type: 'single',
      question: '想要快速跳转到某个功能页面（如笔记、资源），最快的方式是？',
      options: [
        { label: 'A', text: '在地址栏手动输入路径' },
        { label: 'B', text: '按下 Ctrl+K（Mac 为 ⌘K）打开命令面板搜索' },
        { label: 'C', text: '每次都回到首页再点导航栏' },
        { label: 'D', text: '关闭浏览器重新打开' },
      ],
      answer: 'B',
      score: 2.0,
      explanation: '命令面板支持模糊搜索全部页面，按 Ctrl+K 或 ⌘K 即可唤起，键盘上下选择、回车跳转。',
    },
    {
      id: 2,
      type: 'single',
      question: '右下角那只猫头图标的作用是？',
      options: [
        { label: 'A', text: '纯装饰，没有实际功能' },
        { label: 'B', text: '点击展开次级菜单入口（笔记、练习笔记、资源）' },
        { label: 'C', text: '只能拖动，不能点击' },
        { label: 'D', text: '切换明暗主题' },
      ],
      answer: 'B',
      score: 2.0,
      explanation: '猫头可拖动到屏幕任意位置，点击展开笔记、练习笔记、资源三个次级入口。每 10 秒会弹出一句可爱语录。',
    },
    {
      id: 3,
      type: 'multi',
      question: '以下哪些方式可以向题库导入题目？（多选）',
      options: [
        { label: 'A', text: '点击"导入题库"按钮上传 Markdown 文件' },
        { label: 'B', text: '复制 AI 提示词到 ChatGPT 等工具生成 JSON，再上传' },
        { label: 'C', text: '直接在浏览器地址栏输入题目' },
        { label: 'D', text: '通过导入弹窗内的格式说明了解 JSON 结构后手动编写' },
      ],
      answer: ['A', 'B', 'D'],
      score: 3.0,
      explanation: '导入弹窗右侧有常驻格式说明和 AI 提示词，支持上传 Markdown 文件（内含 JSON 代码块），也可用 AI 生成后再上传。',
    },
    {
      id: 4,
      type: 'fill',
      question: '在答题页面中，按(__①__)键可以打开/关闭 AI 侧栏获取解题思路；答题结束后可以进入(__②__)页面查看本次答题的详细解析。',
      blanks: 2,
      answer: ['Tab', '结果'],
      score: 2.5,
      explanation: 'Tab 键切换 AI 侧栏；答题提交后跳转到结果页，可查看每题的正确答案与解析。',
    },
    {
      id: 5,
      type: 'single',
      question: '错题本的作用是？',
      options: [
        { label: 'A', text: '记录答错的题目，方便针对性复习' },
        { label: 'B', text: '收藏喜欢的题目' },
        { label: 'C', text: '导出题目给别人' },
        { label: 'D', text: '删除不需要的题目' },
      ],
      answer: 'A',
      score: 2.0,
      explanation: '错题本自动收集你答错的题目，支持按学科筛选和重做，是针对性复习的利器。',
    },
    {
      id: 6,
      type: 'single',
      question: '练习模式和模拟考试模式的区别是？',
      options: [
        { label: 'A', text: '练习模式即时判分，模拟考试交卷后才判分' },
        { label: 'B', text: '练习模式更难' },
        { label: 'C', text: '两者完全一样' },
        { label: 'D', text: '模拟考试不能做题' },
      ],
      answer: 'A',
      score: 2.0,
      explanation: '练习模式每答一题即时反馈对错；模拟考试全程不提示，交卷后统一判分，更接近真实考试体验。',
    },
    {
      id: 7,
      type: 'single',
      question: '学习资源页面可以做什么？',
      options: [
        { label: 'A', text: '上传和管理 HTML 格式的学习资源' },
        { label: 'B', text: '只能查看，不能上传' },
        { label: 'C', text: '删除数据库里的题目' },
        { label: 'D', text: '修改题库内容' },
      ],
      answer: 'A',
      score: 2.0,
      explanation: '资源页支持上传 HTML 文件，提供软删除（仅界面隐藏）和硬删除（从磁盘删除）两种方式。',
    },
    {
      id: 8,
      type: 'essay',
      question: '请简述笔记和练习笔记的区别。',
      answer: '笔记是在题库浏览时为某道题添加的备注，侧重知识点记录；练习笔记是在答题过程中记录的思路与心得，与答题上下文关联。两者入口不同：笔记从题库详情页进入，练习笔记从答题页面侧栏进入。',
      score: 5.0,
    },
  ],
}

/**
 * 加载内置示例题库。
 * 返回标记 builtin: true 的题库，UI 层会显示"内置"标签且隐藏编辑/删除按钮，用户不可修改。
 * @returns {Promise<Array>} 内置题库数组
 */
export async function loadBuiltinBanks() {
  return [builtinGuideBank]
}
