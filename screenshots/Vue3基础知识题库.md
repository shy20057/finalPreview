# Vue 3 - 基础知识

本题库为生成的 Vue 3 基础练习，共 10 道题，涵盖响应式数据、指令、计算属性和组件通信，包含四种题型，每题 10 分，总分 100 分。

```json
{
  "name": "Vue 3 基础知识",
  "subject": "前端开发",
  "questions": [
    {
      "id": 1,
      "type": "single",
      "question": "在 Vue 模板中，将变量 message 的值显示为文本，应使用哪种语法？",
      "options": [
        { "label": "A", "text": "${message}" },
        { "label": "B", "text": "{{ message }}" },
        { "label": "C", "text": "#{message}" },
        { "label": "D", "text": "<message />" }
      ],
      "answer": "B",
      "score": 10.0
    },
    {
      "id": 2,
      "type": "single",
      "question": "在 Vue 3 的 JavaScript 代码中，已执行 const count = ref(0)，以下哪种写法可以正确增加 count 的值？",
      "options": [
        { "label": "A", "text": "count++" },
        { "label": "B", "text": "count.set(1)" },
        { "label": "C", "text": "count.value++" },
        { "label": "D", "text": "count.update()" }
      ],
      "answer": "C",
      "score": 10.0
    },
    {
      "id": 3,
      "type": "single",
      "question": "关于 v-if 和 v-show，以下说法正确的是？",
      "options": [
        { "label": "A", "text": "v-if 会根据条件创建或销毁对应内容，v-show 主要通过 CSS 的 display 属性控制显示" },
        { "label": "B", "text": "v-show 在条件为 false 时会销毁组件实例" },
        { "label": "C", "text": "v-if 只能用于文本，不能用于组件" },
        { "label": "D", "text": "v-if 和 v-show 都只能接收字符串" }
      ],
      "answer": "A",
      "score": 10.0
    },
    {
      "id": 4,
      "type": "single",
      "question": "使用 v-for 渲染可能发生排序变化的列表时，通常应该选择什么作为 key？",
      "options": [
        { "label": "A", "text": "每次渲染时生成的随机数" },
        { "label": "B", "text": "列表项稳定且唯一的 id" },
        { "label": "C", "text": "所有列表项共用的固定字符串" },
        { "label": "D", "text": "当前时间戳" }
      ],
      "answer": "B",
      "score": 10.0
    },
    {
      "id": 5,
      "type": "multi",
      "question": "以下哪些是 Vue 提供的有效指令？",
      "options": [
        { "label": "A", "text": "v-bind" },
        { "label": "B", "text": "v-on" },
        { "label": "C", "text": "v-model" },
        { "label": "D", "text": "v-delete" }
      ],
      "answer": ["A", "B", "C"],
      "score": 10.0
    },
    {
      "id": 6,
      "type": "multi",
      "question": "关于 Vue 的计算属性 computed，以下说法正确的有哪些？",
      "options": [
        { "label": "A", "text": "计算属性可以根据其他响应式数据生成派生值" },
        { "label": "B", "text": "计算属性会根据其响应式依赖缓存计算结果" },
        { "label": "C", "text": "只要组件重新渲染，计算属性就一定重新执行计算函数" },
        { "label": "D", "text": "通常应避免在计算属性的 getter 中修改状态或发起网络请求" }
      ],
      "answer": ["A", "B", "D"],
      "score": 10.0
    },
    {
      "id": 7,
      "type": "fill",
      "question": "在 Vue 3 中，通常使用 ____ 函数创建包装基本类型值的响应式引用；在 JavaScript 代码中，通过该引用的 ____ 属性读取或修改其值。",
      "blanks": 2,
      "answer": ["ref", "value"],
      "score": 10.0
    },
    {
      "id": 8,
      "type": "fill",
      "question": "在 Vue 3 单文件组件的 <script setup> 中，使用 ____ 编译器宏声明组件接收的 props，使用 ____ 编译器宏声明组件触发的自定义事件。",
      "blanks": 2,
      "answer": ["defineProps", "defineEmits"],
      "score": 10.0
    },
    {
      "id": 9,
      "type": "essay",
      "question": "请简述 computed 和 watch 的主要用途及区别，并分别举出一个适用场景。",
      "answer": "computed 主要用于根据响应式数据生成派生值，并根据响应式依赖缓存结果，例如根据商品单价和数量计算总价。watch 主要用于监听指定数据源的变化，并执行相应操作，适合处理副作用，例如监听搜索关键词变化后请求搜索接口。通常使用 computed 表达数据之间的计算关系，使用 watch 执行数据变化后需要触发的异步操作或其他副作用。",
      "score": 10.0
    },
    {
      "id": 10,
      "type": "essay",
      "question": "请说明 Vue 中父子组件之间常用的数据通信方式，以及子组件为什么不应直接修改父组件传入的 prop。",
      "answer": "父组件通过 props 向子组件传递数据，子组件通过触发自定义事件向父组件传递操作意图或数据，由父组件更新自身状态，再将新值传给子组件。组件也可以通过约定的 prop 和 update 事件实现 v-model。props 遵循单向数据流，子组件不应直接给 prop 重新赋值，以免导致数据来源不清晰或被父组件后续更新覆盖。对于对象和数组类型的 prop，也应避免擅自修改其内部内容，通常通过事件通知父组件统一修改。",
      "score": 10.0
    }
  ]
}
```
