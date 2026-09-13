/**
 * 演示题库种子数据。
 * 当数据库为空且未播种过时，自动注入让新用户开箱即用。
 */

export const demoBanks = [
  {
    name: '操作系统 · 进程管理示例',
    subject: '操作系统',
    sourceFile: 'demo-seed',
    questions: [
      {
        id: 1,
        type: 'single',
        question: '在下列进程调度算法中，可能会产生"饥饿"现象的是？',
        options: [
          { label: 'A', text: '时间片轮转调度算法' },
          { label: 'B', text: '短作业优先调度算法' },
          { label: 'C', text: '先来先服务调度算法' },
          { label: 'D', text: '高响应比优先调度算法' },
        ],
        answer: 'B',
        score: 2.5,
      },
      {
        id: 2,
        type: 'multi',
        question: '以下哪些是引起进程切换的原因？',
        options: [
          { label: 'A', text: '进程请求 I/O 操作' },
          { label: 'B', text: '时间片用完' },
          { label: 'C', text: '进程正常结束' },
          { label: 'D', text: '进程被挂起' },
        ],
        answer: ['A', 'B', 'C', 'D'],
        score: 3.0,
      },
      {
        id: 3,
        type: 'fill',
        question: '进程的三种基本状态包括就绪态、运行态和(__①__)；当时间片用完时，进程由运行态转换为(__②__)。',
        blanks: 2,
        answer: ['阻塞态', '就绪态'],
        score: 2.8,
      },
      {
        id: 4,
        type: 'essay',
        question: '请简述进程与线程的区别。',
        answer: '进程是资源分配的最小单位，线程是 CPU 调度的最小单位。一个进程可包含多个线程，线程间共享进程的资源（如内存、文件描述符），但拥有各自的栈、寄存器与程序计数器。线程切换开销小于进程切换，因为不需要切换地址空间。',
        score: 5.0,
      },
      {
        id: 5,
        type: 'single',
        question: '下列关于临界区的描述，正确的是？',
        options: [
          { label: 'A', text: '临界区是进程请求共享资源的代码段' },
          { label: 'B', text: '临界区是进程访问独占资源的代码段' },
          { label: 'C', text: '临界区只能由一个进程进入，永久独占' },
          { label: 'D', text: '临界区中可以执行任何 I/O 操作' },
        ],
        answer: 'A',
        score: 2.5,
      },
    ],
  },
  {
    name: '计算机网络 · TCP/IP 基础示例',
    subject: '计算机网络',
    sourceFile: 'demo-seed',
    questions: [
      {
        id: 1,
        type: 'single',
        question: 'TCP 三次握手中，第二次握手报文中的 SYN 和 ACK 标志位分别被设置为？',
        options: [
          { label: 'A', text: 'SYN=1, ACK=0' },
          { label: 'B', text: 'SYN=1, ACK=1' },
          { label: 'C', text: 'SYN=0, ACK=1' },
          { label: 'D', text: 'SYN=0, ACK=0' },
        ],
        answer: 'B',
        score: 2.5,
      },
      {
        id: 2,
        type: 'multi',
        question: '以下哪些是 TCP 协议的特点？',
        options: [
          { label: 'A', text: '面向连接' },
          { label: 'B', text: '提供可靠交付' },
          { label: 'C', text: '全双工通信' },
          { label: 'D', text: '不保证数据顺序' },
        ],
        answer: ['A', 'B', 'C'],
        score: 3.0,
      },
      {
        id: 3,
        type: 'fill',
        question: 'TCP 连接建立需要(__①__)次握手，连接释放需要(__②__)次挥手。',
        blanks: 2,
        answer: ['三', '四'],
        score: 2.5,
      },
      {
        id: 4,
        type: 'essay',
        question: '请简述 TCP 拥塞控制的四种算法。',
        answer: 'TCP 拥塞控制主要包括四种算法：慢开始（Slow Start）、拥塞避免（Congestion Avoidance）、快重传（Fast Retransmit）和快恢复（Fast Recovery）。发送方维护一个拥塞窗口 cwnd，通过网络拥塞程度动态调整 cwnd 大小，实现网络吞吐量与稳定性的平衡。',
        score: 5.0,
      },
      {
        id: 5,
        type: 'single',
        question: 'TCP 报文段首部中，用于标识数据部分的起始位置的字段是？',
        options: [
          { label: 'A', text: '序号 seq' },
          { label: 'B', text: '确认号 ack' },
          { label: 'C', text: '数据偏移' },
          { label: 'D', text: '窗口' },
        ],
        answer: 'C',
        score: 2.5,
      },
    ],
  },
]
