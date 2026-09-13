# 数据库 - 数据库设计

以下内容由学习通导出的单选题整理而来，题库主题为数据库设计阶段、E-R 图转换、逻辑结构设计与数据库实施等知识点。

```json
{
  "name": "数据库-数据库设计",
  "subject": "数据库",
  "questions": [
    {
      "id": 1,
      "type": "single",
      "question": "在数据库设计中，将E-R图转换为关系数据模型是下述哪个阶段完成的工作",
      "options": [
        { "label": "A", "text": "需求分析阶段" },
        { "label": "B", "text": "概念设计阶段" },
        { "label": "C", "text": "逻辑设计阶段" },
        { "label": "D", "text": "物理设计阶段" }
      ],
      "answer": "C",
      "score": 10
    },
    {
      "id": 2,
      "type": "single",
      "question": "在进行数据库逻辑结构设计时，不属于逻辑设计应遵守的原则的是",
      "options": [
        { "label": "A", "text": "尽可能避免插入异常" },
        { "label": "B", "text": "尽可能避免删除异常" },
        { "label": "C", "text": "尽可能避免数据冗余" },
        { "label": "D", "text": "尽可能避免多表连接操作" }
      ],
      "answer": "D",
      "score": 10
    },
    {
      "id": 3,
      "type": "single",
      "question": "在将E-R图转换为关系模型时，一般都将m:n联系转换成一个独立的关系模式。下列关于这种联系产生的关系模式的主键的说法，正确的是",
      "options": [
        { "label": "A", "text": "只需包含m端关系模式的主键即可" },
        { "label": "B", "text": "只需包含n端关系模式的主键即可" },
        { "label": "C", "text": "至少包含m端和n端关系模式的主键" },
        { "label": "D", "text": "必须添加新的属性作为主键" }
      ],
      "answer": "C",
      "score": 10
    },
    {
      "id": 4,
      "type": "single",
      "question": "数据流图是从“数据”和“处理”两方面来表达数据处理的一种图形化表示方法，该方法主要用在数据库设计的",
      "options": [
        { "label": "A", "text": "需求分析阶段" },
        { "label": "B", "text": "概念结构设计阶段" },
        { "label": "C", "text": "逻辑结构设计阶段" },
        { "label": "D", "text": "物理结构设计阶段" }
      ],
      "answer": "A",
      "score": 10
    },
    {
      "id": 5,
      "type": "single",
      "question": "在将局部E-R图合并为全局E-R图时，可能会产生一些冲突。下列冲突中不属于合并E-R图冲突的是",
      "options": [
        { "label": "A", "text": "结构冲突" },
        { "label": "B", "text": "语法冲突" },
        { "label": "C", "text": "属性冲突" },
        { "label": "D", "text": "命名冲突" }
      ],
      "answer": "B",
      "score": 10
    },
    {
      "id": 6,
      "type": "single",
      "question": "一个银行营业所可以有多个客户，一个客户也可以在多个营业所进行存取款业务，则客户和银行营业所之间的联系是",
      "options": [
        { "label": "A", "text": "一对一" },
        { "label": "B", "text": "一对多" },
        { "label": "C", "text": "多对一" },
        { "label": "D", "text": "多对多" }
      ],
      "answer": "D",
      "score": 10
    },
    {
      "id": 7,
      "type": "single",
      "question": "设实体A与实体B之间是一对多联系。下列进行的逻辑结构设计方法中，最合理的是",
      "options": [
        { "label": "A", "text": "实体A和实体B分别对应一个关系模式，且外键放在实体B的关系模式中" },
        { "label": "B", "text": "实体A和实体B分别对应一个关系模式，且外键放在实体A的关系模式中" },
        { "label": "C", "text": "为实体A和实体B设计一个关系模式，该关系模式包含两个实体的全部属性" },
        { "label": "D", "text": "分别为实体A、实体B和它们之间的联系设计一个关系模式，外键在联系对应的关系模式中" }
      ],
      "answer": "A",
      "score": 10
    },
    {
      "id": 8,
      "type": "single",
      "question": "设有描述学生借书情况的关系模式：借书(书号，读者号，借书日期，还书日期)，设一个读者可在不同日期多次借阅同一本书，但不能在同一天对同一本书借阅多次。该关系模式的主键是",
      "options": [
        { "label": "A", "text": "书号" },
        { "label": "B", "text": "(书号，读者号)" },
        { "label": "C", "text": "(书号，读者号，借书日期)" },
        { "label": "D", "text": "(书号，读者号，借书日期，还书日期)" }
      ],
      "answer": "C",
      "score": 10
    },
    {
      "id": 9,
      "type": "single",
      "question": "在数据库设计中，进行用户子模式设计是下列哪个阶段要完成的工作",
      "options": [
        { "label": "A", "text": "需求分析阶段" },
        { "label": "B", "text": "概念结构设计阶段" },
        { "label": "C", "text": "逻辑结构设计阶段" },
        { "label": "D", "text": "物理结构设计阶段" }
      ],
      "answer": "C",
      "score": 10
    },
    {
      "id": 10,
      "type": "single",
      "question": "数据库物理结构设计完成后就进入到数据库实施阶段。下列不属于数据库实施阶段工作的是",
      "options": [
        { "label": "A", "text": "调试应用程序" },
        { "label": "B", "text": "试运行应用程序" },
        { "label": "C", "text": "加载数据" },
        { "label": "D", "text": "扩充系统功能" }
      ],
      "answer": "D",
      "score": 10
    }
  ]
}
```
