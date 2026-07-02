# 企业培训考试系统 - 项目交接文档

## 项目概述

纯前端 HTML/CSS/JS 架构的企业培训考试系统，无后端依赖，使用 localStorage 持久化数据。支持公共题库与项目题库分离、项目卡片式管理、人员项目绑定、多格式题目批量导入（含预览编辑）、题目图片、简答题人工阅卷、自定义题型分值、真实数据成绩统计等功能。

## 快速开始

1. 将本文件夹解压到任意目录
2. 在 WorkBuddy 中打开该目录作为工作区
3. 用浏览器打开 `index.html` 即可使用，或启动本地服务器：
   ```
   python -m http.server 8080
   ```
   然后访问 `http://localhost:8080`

## 演示账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 管理员 | admin | 123456 |
| 员工 | EMP001 | 123456 |

## 文件结构

```
exam-system/
├── index.html              # 登录入口（管理员/员工分流）
├── admin-dashboard.html    # 管理端首页（数据概览）
├── admin-questions.html    # 题库管理（项目卡片布局、CRUD、批量操作、导入预览编辑、图片支持）
├── admin-exams.html        # 考试管理（三步创建向导、抽题规则自定义分值）
├── admin-users.html        # 人员管理（项目绑定、批量导入、自动生成）
├── admin-statistics.html   # 成绩统计（真实数据、项目筛选联动、导出成绩单）
├── admin-review.html       # 阅卷中心（简答题人工评分、按单题满分约束）
├── admin-settings.html     # 系统设置（管理员管理、模块开关、题目分类管理）
├── exam-home.html          # 考生首页（按项目过滤可见考试）
├── exam-take.html          # 在线考试页（按规则抽题、按分值计分、图片展示）
├── exam-result.html        # 考试结果页（含简答题待阅卷状态、图片展示）
├── css/style.css           # 全局样式
└── js/common.js            # 核心公共脚本（数据模型、管理器、解析器）
```

## 核心数据模型 (js/common.js)

### 题目 (questions)
```javascript
{
  id: number,
  type: 'single' | 'multiple' | 'judge' | 'short',
  scope: 'public' | 'project',     // 公共题库 or 项目题库
  project_id: number | null,       // 项目题库时关联的项目 ID
  category: string,                // 分类（通过 SettingsManager 动态管理）
  difficulty: 1 | 2 | 3,           // 简单 / 中等 / 困难
  content: string,                 // 题干
  options: string[],               // 选项数组（简答题无此字段）
  answer: number | number[] | string,  // 单选/判断: 数字索引; 多选: 数字数组; 简答: 参考答案文本
  analysis: string,                // 解析
  image: string | null,            // base64 DataURL 图片（可选）
  status: 'active' | 'deleted',
  created: string
}
```

### 考试 (exams)
```javascript
{
  id, title, description,
  scope: 'public' | 'project',
  project_id: number | null,
  status: 'draft' | 'published',
  start_time, end_time,
  duration: number,                // 考试时长（分钟）
  participants: number,            // 考生人数
  question_count: number,          // 题目数量
  total_score: number,             // 总分（始终 100）
  pass_score: number,              // 及格线
  rules: [{                        // 抽题规则
    type: 'single' | 'multiple' | 'judge' | 'short',
    difficulty: '' | '1' | '2' | '3',
    count: number,                 // 该规则抽题数量
    score: number                  // 每题分数
  }]
}
```

### 考试结果 (exam_results)
```javascript
{
  id, examId, examTitle,
  examScope, examProjectId,
  username, realName, department,
  score: number,                   // 总得分（自动判分 + 阅卷得分）
  totalScore: number,              // 满分
  correctCount, wrongCount, totalQuestions,
  autoGradableCount, manualReviewCount,
  correctRate: number,
  passScore, passed: boolean,
  results: [{                      // 逐题结果
    questionId, question,
    userAnswer, isCorrect,
    manualReview: boolean,         // 是否需要人工阅卷
    reviewScore: number | undefined,
    reviewComment: string | undefined,
    maxScore: number,              // 该题满分
    score: number                  // 该题得分（自动判分题）
  }],
  timeSpent, isAuto, submittedAt
}
```

### 管理员 (admin_accounts)
```javascript
{
  id, username, password,
  real_name, role: 'super_admin' | 'admin' | 'reviewer',
  department, status: 'active' | 'disabled',
  project_ids: [],                 // 项目权限
  modules: []                      // 模块权限
}
```

### 题目分类 (system_settings)
```javascript
{
  categories: [
    { id: 1, name: '公共红线考试' },
    { id: 2, name: '项目红线考试' }
  ],
  modules: { ... },                // 模块开关
  examDefaults: { ... }            // 考试默认设置
}
```

## 全局管理器对象（讨论#2：ExamSystem 命名空间重构）

> **架构说明**（2026-07-02 更新）：所有管理器对象已挂载至 `window.ExamSystem` 命名空间下，同时保留全局别名以兼容过渡期。新代码推荐使用 `ExamSystem.XXX` 格式。

| 对象 | 命名空间访问 | localStorage Key | 职责 |
|------|------------|-----------------|------|
| `ProjectManager` | `ExamSystem.ProjectManager` | `projects` | 项目 CRUD、软删除、项目名称/标签 HTML 生成 |
| `QuestionBankManager` | `ExamSystem.QuestionBankManager` | `question_bank` | 题库 CRUD、按作用域/项目筛选、批量导入、数据自动修复 |
| `ExamManager` | `ExamSystem.ExamManager` | `admin_exams` | 考试 CRUD、**分页查询**、**题目快照系统**、按作用域筛选 |
| `AccountManager` | `ExamSystem.AccountManager` | `examinee_accounts` | 考生账号 CRUD、项目绑定读写 |
| `ResultManager` | `ExamSystem.ResultManager` | `exam_results` | 考试结果 CRUD、阅卷打分、统计计算 |
| `AdminManager` | `ExamSystem.AdminManager` | `admin_accounts` | 管理员 CRUD、登录验证、权限控制 |
| `SettingsManager` | `ExamSystem.SettingsManager` | `system_settings` | 系统设置、分类管理、模块开关 |
| `QuestionParser` | `ExamSystem.QuestionParser` | — | 多格式题目解析（Word/PDF/Excel/CSV/TXT） |

### 新增：考试题目快照数据结构（讨论#3）

> **localStorage Key**: `exam_question_snapshot`
> 
> 当考试"发布"时，系统从题库抽取题目并生成快照锁定，确保考生看到的题目与组卷时一致。

```javascript
// exam_question_snapshot 结构
{
  [examId]: [
    {
      originalId: number,        // 题库原始 ID
      type: 'single' | 'multiple' | 'judge' | 'short',
      content: string,
      options: string[] | null,
      answer: number | number[] | string,
      analysis: string,
      difficulty: 1 | 2 | 3,
      category: string,
      score: number               // 该题分值
    }
  ]
}
```

**核心方法**：
- `ExamManager.generateExamSnapshot(examId, rules, scope, projectId)` — 发布时从题库抽题并保存快照
- `ExamManager.getExamQuestions(examId)` — 优先读快照，兼容旧数据
- `ExamManager.regenerateSnapshot(examId, rules, scope, projectId)` — 重新组卷覆盖快照
- `ExamManager.hasSnapshot(examId)` — 检查是否已有快照

### 新增：分页功能（讨论#4）

> **方法**: `ExamManager.getExamsPaginated(page, pageSize, filters)`
> 
> 返回值: `{ data: Exam[], total: number, page: number, pageSize: number, totalPages: number }`
>
> 支持筛选条件: `{ scope: 'public'|'project'|'all', status: string, search: string }`
>
> **前端页面**: admin-exams.html 已实现完整分页 UI（页码按钮 + 每页条数切换 + 搜索过滤）

## 已实现功能清单

### 题库管理
- [x] **项目卡片布局**：顶部展示"全部/公共/各项目"卡片，点击切换筛选，每张卡片显示题目计数
- [x] **CRUD**：新增/编辑/删除题目，支持单选/多选/判断/简答四种题型
- [x] **题目图片**：FileReader → base64 存储，全链路展示（题库缩略图 → 考试 → 结果 → 阅卷）
- [x] **批量操作**：全选/反选、批量编辑（改分类/难度/移动题库）、批量删除
- [x] **批量导入**：支持 Word/PDF/Excel/CSV/TXT 格式
- [x] **导入预览编辑**：解析后每道题可点击"编辑"展开内联表单，修改所有字段后单题删除
- [x] **解析器增强**：括号标记题型识别（如"（多选）"）、多种答案/解析标记格式、全角转半角
- [x] **分类管理**：分类通过 `SettingsManager.getCategories()` 动态获取，默认"公共红线考试"和"项目红线考试"

### 考试管理
- [x] **三步创建向导**：基本信息 → 抽题规则 → 确认发布
- [x] **抽题规则**：按题型 + 难度配置，支持自定义每题分数
- [x] **分值约束**：满分始终 100 分，不等于 100 时阻止发布，支持"自动均分"按钮
- [x] **公共/项目考试**：创建时选择作用域，项目考试仅对参与该项目的员工可见
- [x] **草稿/发布**：支持保存为草稿后续编辑
- [x] **题目快照锁定**（讨论#3）：发布时从题库抽取题目并锁定为快照，确保考生看到一致内容
- [x] **重新组卷**（讨论#3）：非进行中的考试可从题库重新抽取题目（覆盖快照）
- [x] **分页浏览**（讨论#4）：Client-Side 分页，支持搜索过滤、每页条数切换（5/10/20/50）

### 在线考试
- [x] **按规则抽题**：按题型/难度从对应题库随机抽取，题库不足自动补齐
- [x] **按分值计分**：每题得分由抽题规则中的 `score` 字段决定
- [x] **四种题型**：单选、多选、判断、简答
- [x] **简答题**：交卷后标记为待阅卷，不参与自动判分
- [x] **防作弊**：切屏检测、超时自动交卷
- [x] **答题进度**：30 秒自动保存，支持断点续考（按 examId 隔离）
- [x] **图片展示**：题目有图片时在考试页展示大图

### 阅卷中心
- [x] **简答题人工评分**：管理员逐题打分，输入评语
- [x] **单题满分约束**：评分上限为该题 `maxScore`
- [x] **自动重算总分**：阅卷后 `ResultManager.recalcScore()` 自动更新总分和通过状态
- [x] **图片展示**：阅卷时展示题目图片

### 成绩统计
- [x] **真实数据驱动**：所有统计从 `ResultManager.getResultsByExam()` 获取，替代硬编码
- [x] **项目筛选联动**：选项目 → 筛出该项目下的考试
- [x] **统计卡片**：参考人数、平均分、最高分、最低分、及格率
- [x] **分数段分布图**：真实分数段统计
- [x] **题型正确率**：真实题型正确率分析
- [x] **排行榜**：支持搜索和状态过滤
- [x] **导出成绩单**：支持导出全部成绩 / 单人成绩明细

### 系统设置
- [x] **管理员管理**：CRUD、角色权限（super_admin/admin/reviewer）、项目权限、模块开关
- [x] **模块开关**：控制管理端各功能模块的显示
- [x] **题目分类管理**：新增/删除分类，全系统动态引用
- [x] **考试默认设置**：及格线、时长等默认值

### 人员管理
- [x] **项目绑定**：新增/编辑/批量导入/自动生成时均可多选项目
- [x] **考生首页过滤**：考生仅看到公共考试 + 参与项目的考试

### 通用
- [x] **localStorage 持久化**：所有数据自动保存，首次访问自动初始化示例数据
- [x] **数据自动修复**：`QuestionBankManager.getQuestions()` 检测旧格式数据自动转换
- [x] **进度隔离**：答题进度按 `examId` 隔离，切换考试不会串数据

## 数据持久化 Keys

| Key | 说明 |
|-----|------|
| `projects` | 项目列表 |
| `question_bank` | 题库数据 |
| `admin_exams` | 考试列表 |
| `exam_question_snapshot` | **考试题目快照**（讨论#3：发布时锁定题目副本） |
| `examinee_accounts` | 考生账号 |
| `exam_results` | 考试结果 |
| `admin_accounts` | 管理员账号 |
| `system_settings` | 系统设置 |
| `current_exam` | 当前进行的考试（临时） |
| `exam_answers` | 当前答题进度（临时，按 examId 隔离） |
| `current_user` | 当前登录用户（临时） |

清除浏览器 localStorage 数据可重置为初始状态。

## 可扩展方向

- [ ] 接入真实后端 API 替换 localStorage
- [ ] 考试时间限制更精细控制（断点续考策略优化）
- [ ] 题目版本管理 / 审核流程
- [ ] 移动端适配优化
- [ ] 数据导入导出（Excel 格式人员名单）
- [ ] 考试分析报表（跨考试维度）
- [ ] 题目标签系统（替代单一分类）
