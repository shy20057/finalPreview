/**
 * AI 服务封装，支持 OpenAI 兼容格式
 * —— uni-app port of src/utils/ai.js (fetch -> uni.request)
 */

function postChat(url, payload, apiKey) {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      data: payload,
      timeout: 120000,
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const err = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
          reject(new Error(`AI 请求失败 (${res.statusCode}): ${err}`))
          return
        }
        resolve(res.data)
      },
      fail: (err) => reject(new Error(err?.errMsg || 'AI 请求失败')),
    })
  })
}

function endpointFor(baseUrl) {
  const isMinimax = baseUrl.toLowerCase().includes('minimax')
  const endpoint = isMinimax ? '/text/chatcompletion_v2' : '/chat/completions'
  return `${baseUrl.replace(/\/$/, '')}${endpoint}`
}

function pickContent(data) {
  const choice = data?.choices?.[0]
  return choice?.message?.content || choice?.text || '无返回内容'
}

export async function analyzeQuestion(config, questionData) {
  const prompt = buildAnalyzePrompt(questionData)
  return callAi(config, prompt)
}

export async function chatWithAi(config, messages) {
  const { baseUrl, apiKey, model } = config
  if (!baseUrl || !apiKey || !model) {
    throw new Error('请先配置 AI API 参数')
  }

  const data = await postChat(endpointFor(baseUrl), {
    model,
    messages: [
      { role: 'system', content: '你是一位计算机操作系统课程的资深教授，擅长用通俗易懂的语言讲解复杂概念。请用中文回答，保持简洁明了。' },
      ...messages,
    ],
    temperature: 0.7,
    stream: false,
  }, apiKey)

  return pickContent(data)
}

async function callAi(config, prompt) {
  const { baseUrl, apiKey, model } = config
  if (!baseUrl || !apiKey || !model) {
    throw new Error('请先配置 AI API 参数')
  }

  const data = await postChat(endpointFor(baseUrl), {
    model,
    messages: [
      { role: 'system', content: '你是一位计算机操作系统课程的资深教授，擅长用通俗易懂的语言讲解复杂概念。请用中文回答。' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    stream: false,
  }, apiKey)

  return pickContent(data)
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

  prompt += `\n请按以下结构提供分析（每部分使用 ### 标题，内容用 Markdown 格式）：

### 核心知识点
题目涉及的关键概念和原理

### 答案解析
为什么正确答案是正确的，详细推导过程

### 选项分析
逐一分析每个选项为什么对或错（如果是选择题；填空题则分析易错点）

### 拓展延伸
相关概念补充、对比辨析和记忆技巧

### 总结
一句话核心要点`

  return prompt
}
