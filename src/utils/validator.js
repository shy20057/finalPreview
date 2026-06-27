/**
 * 题库 JSON 格式校验器
 * 对解析出的 JSON 进行结构和必填项校验
 */

/**
 * 校验完整题库数据
 * @param {Object} data - 解析后的 JSON 数据
 * @returns {{ valid: boolean, errors: string[], data: Object|null }}
 */
export function validateBank(data) {
  const errors = []

  // 顶层字段校验
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['数据格式错误：不是有效的 JSON 对象'], data: null }
  }

  if (!data.name || typeof data.name !== 'string') {
    errors.push('缺少必填字段 "name"（题库名称）')
  }

  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    errors.push('缺少必填字段 "questions"（题目数组）或题目为空')
    return { valid: false, errors, data: null }
  }

  // 逐题校验
  const questionErrors = []
  data.questions.forEach((q, index) => {
    const qErrors = validateQuestion(q, index + 1)
    questionErrors.push(...qErrors)
  })

  if (questionErrors.length > 0) {
    // 最多显示 5 条错误
    errors.push(...questionErrors.slice(0, 5))
    if (questionErrors.length > 5) {
      errors.push(`... 还有 ${questionErrors.length - 5} 个错误`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : null
  }
}

/**
 * 校验单道题目
 * @param {Object} q - 题目对象
 * @param {number} num - 题号（用于错误提示）
 * @returns {string[]} 错误信息数组
 */
function validateQuestion(q, num) {
  const errors = []

  if (!q.id && q.id !== 0) {
    errors.push(`第 ${num} 题：缺少 "id" 字段`)
  }

  if (!q.type || !['single', 'multi', 'fill', 'essay'].includes(q.type)) {
    errors.push(`第 ${num} 题：type 必须是 "single"、"multi"、"fill" 或 "essay"`)
    return errors // 无法继续校验
  }

  if (!q.question || typeof q.question !== 'string') {
    errors.push(`第 ${num} 题：缺少 "question"（题目文本）`)
  }

  if (q.type === 'single') {
    // 单选题校验
    if (!Array.isArray(q.options) || q.options.length < 2) {
      errors.push(`第 ${num} 题（单选）：options 至少需要 2 个选项`)
    } else {
      q.options.forEach((opt, i) => {
        if (!opt.label || !opt.text) {
          errors.push(`第 ${num} 题（单选）：第 ${i + 1} 个选项缺少 label 或 text`)
        }
      })
    }

    if (!q.answer || typeof q.answer !== 'string') {
      errors.push(`第 ${num} 题（单选）：缺少 "answer"（正确答案字母）`)
    }
  }

  if (q.type === 'multi') {
    // 多选题校验
    if (!Array.isArray(q.options) || q.options.length < 3) {
      errors.push(`第 ${num} 题（多选）：options 至少需要 3 个选项`)
    } else {
      q.options.forEach((opt, i) => {
        if (!opt.label || !opt.text) {
          errors.push(`第 ${num} 题（多选）：第 ${i + 1} 个选项缺少 label 或 text`)
        }
      })
    }

    if (!Array.isArray(q.answer) || q.answer.length < 2) {
      errors.push(`第 ${num} 题（多选）：answer 必须是至少包含 2 个正确答案的数组，如 ["A", "C"]`)
    }
  }

  if (q.type === 'fill') {
    // 填空题校验
    if (!q.blanks || typeof q.blanks !== 'number' || q.blanks < 1) {
      errors.push(`第 ${num} 题（填空）：缺少 "blanks"（填空数量）或值无效`)
    }

    if (!Array.isArray(q.answer) || q.answer.length === 0) {
      errors.push(`第 ${num} 题（填空）：缺少 "answer"（答案数组）`)
    } else if (q.blanks && q.answer.length !== q.blanks) {
      errors.push(`第 ${num} 题（填空）：answer 数组长度(${q.answer.length})与 blanks(${q.blanks})不一致`)
    }
  }

  if (q.type === 'essay') {
    // 简答题校验
    if (!q.answer || typeof q.answer !== 'string') {
      errors.push(`第 ${num} 题（简答）：缺少 "answer"（参考答案文本）`)
    }
  }

  return errors
}

/**
 * 生成题库统计摘要
 * @param {Object} data - 校验通过的题库数据
 * @returns {Object} 统计信息
 */
export function getBankSummary(data) {
  const questions = data.questions || []
  const singleCount = questions.filter(q => q.type === 'single').length
  const multiCount = questions.filter(q => q.type === 'multi').length
  const fillCount = questions.filter(q => q.type === 'fill').length
  const essayCount = questions.filter(q => q.type === 'essay').length
  const totalScore = questions.reduce((sum, q) => sum + (q.score || 2), 0)

  return {
    name: data.name,
    subject: data.subject || '未分类',
    chapter: data.chapter || '',
    totalQuestions: questions.length,
    singleCount,
    multiCount,
    fillCount,
    essayCount,
    totalScore
  }
}
