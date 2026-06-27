/**
 * AI 服务封装，支持 OpenAI 兼容格式
 */

export async function analyzeQuestion(config, questionData) {
  const prompt = buildAnalyzePrompt(questionData)
  return callAi(config, prompt)
}

export async function chatWithAi(config, messages) {
  const { baseUrl, apiKey, model } = config
  if (!baseUrl || !apiKey || !model) {
    throw new Error('请先配置 AI API 参数')
  }

  const isMinimax = baseUrl.toLowerCase().includes('minimax')
  const endpoint = isMinimax ? '/text/chatcompletion_v2' : '/chat/completions'
  const url = `${baseUrl.replace(/\/$/, '')}${endpoint}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是一位计算机操作系统课程的资深教授，擅长用通俗易懂的语言讲解复杂概念。请用中文回答，保持简洁明了。' },
        ...messages,
      ],
      temperature: 0.7,
      stream: false,
    }),
  })

  if (!response.ok) {
    const err = await response.text().catch(() => '未知错误')
    throw new Error(`AI 请求失败 (${response.status}): ${err}`)
  }

  const data = await response.json()
  const choice = data.choices?.[0]
  return choice?.message?.content || choice?.text || '无返回内容'
}

async function callAi(config, prompt) {
  const { baseUrl, apiKey, model } = config
  if (!baseUrl || !apiKey || !model) {
    throw new Error('请先配置 AI API 参数')
  }

  const isMinimax = baseUrl.toLowerCase().includes('minimax')
  const endpoint = isMinimax ? '/text/chatcompletion_v2' : '/chat/completions'
  const url = `${baseUrl.replace(/\/$/, '')}${endpoint}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是一位计算机操作系统课程的资深教授，擅长用通俗易懂的语言讲解复杂概念。请用中文回答。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      stream: false,
    }),
  })

  if (!response.ok) {
    const err = await response.text().catch(() => '未知错误')
    throw new Error(`AI 请求失败 (${response.status}): ${err}`)
  }

  const data = await response.json()
  const choice = data.choices?.[0]
  return choice?.message?.content || choice?.text || '无返回内容'
}

function buildAnalyzePrompt(data) {
  let prompt = `请对以下题目进行详细分析：\n\n题目：${data.question}\n`

  if ((data.type === 'single' || data.type === 'multi') && data.options) {
    prompt += '\n选项：\n'
    for (const opt of data.options) {
      prompt += `${opt.label}. ${opt.text}\n`
    }
    if (data.type === 'single') {
      prompt += `\n正确答案：${data.answer}\n`
    } else {
      prompt += `\n正确答案：${Array.isArray(data.answer) ? data.answer.join('、') : data.answer}\n`
    }
  } else if (data.type === 'fill') {
    prompt += `\n填空数量：${data.blanks}\n`
    prompt += `正确答案：${data.answer.join(' / ')}\n`
  }

  if (data.userAnswer !== undefined && data.userAnswer !== null) {
    if (data.type === 'single') {
      prompt += `用户选择：${data.userAnswer}\n`
    } else if (data.type === 'multi') {
      prompt += `用户选择：${Array.isArray(data.userAnswer) ? data.userAnswer.join('、') : data.userAnswer}\n`
    } else {
      prompt += `用户答案：${Array.isArray(data.userAnswer) ? data.userAnswer.join(' / ') : data.userAnswer}\n`
    }
  }

  prompt += `\n请提供以下内容（用 Markdown 格式）：
1. **核心知识点**：题目涉及的关键概念
2. **答案解析**：为什么正确答案是正确的
3. **选项分析**：逐一分析每个选项为什么对或错（如果是选择题）
4. **拓展延伸**：相关概念补充和记忆技巧
5. **总结**：一句话核心要点`

  return prompt
}
