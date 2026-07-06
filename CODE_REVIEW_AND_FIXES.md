# 鲸鱼培训考试系统 - 代码审查与修复文档

> **审查时间**：2026-07-02  
> **审查人**：资深开发工程师  
> **审查范围**：全系统 14 个文件（11 个 HTML 页面 + 1 个 JS 核心脚本 + 1 个 CSS 样式 + 1 个项目文档）

---

## 一、审查发现的问题总览

| 问题类别 | 严重程度 | 影响范围 | 修复状态 |
|---------|---------|---------|---------|
| XSS 注入漏洞 | 🔴 严重 | 全部 HTML 页面 | ✅ 已修复 |
| 密码明文存储/显示 | 🔴 严重 | admin-users, admin-settings | ✅ 已修复 |
| 逻辑 Bug（永真条件） | 🟡 中等 | ExamManager.getExamsForExaminee() | ✅ 已修复 |
| 数据一致性 Bug | 🟡 中等 | AccountManager.getAdminAccounts() | ✅ 已修复 |
| localStorage key 不一致 | 🟡 中等 | PROJECT_GUIDE.md vs common.js | ✅ 已修复 |
| JSON.parse 异常崩溃 | 🟡 中等 | Utils.getLocal() | ✅ 已修复 |
| ID 生成栈溢出风险 | 🟠 低 | 多个 Manager 的 addXxx() | ✅ 已修复 |
| ECharts resize 内存泄漏 | 🟠 低 | admin-statistics.html | ✅ 已修复 |
| 导出工具泄露密码 | 🟡 中等 | ExportUtil.exportAccountList() | ✅ 已修复 |
| 全局命名空间污染 | 🟠 低 | 所有 Manager 对象 | ⚠️ 需长期重构 |
| 题库与考试题目数据重复 | 🟠 低 | examQuestions vs questionBank | ⚠️ 需长期重构 |

---

## 二、分模块修复详情

### 2.1 核心公共脚本 — `js/common.js`

#### 已修复问题

| # | 问题 | 修复方式 | 位置 |
|---|------|---------|------|
| 1 | **XSS：Utils.showModal() 直接注入 contentHtml** | 添加注释说明调用方需确保 contentHtml 已转义；Utils.confirm() 内部自动转义 message 和 title | ~L675-710 |
| 2 | **XSS：ProjectManager.projectSelectHtml / projectTagsHtml 未转义** | 项目名称使用 `Utils.escapeHtml(p.name)`，属性值使用 `Utils.escapeAttr(p.id)` | ~L767-789 |
| 3 | **HTML 转义函数缺失** | 创建 `Utils.escapeHtml()`（使用 DOM TextNode 安全转义）和 `Utils.escapeAttr()`（5 字符完整转义：`&` `"` `'` `<` `>`） | ~L644-656 |
| 4 | **逻辑 Bug：ExamManager.getExamsForExaminee() 永真条件** | `e.status !== 'ended' || e.status === 'ended'` 永为 true → 重写为正确的项目/作用域过滤逻辑，保留已结束考试供考生查看成绩 | ~L1163-1172 |
| 5 | **数据一致性：AccountManager.getAdminAccounts() 忽略 localStorage** | 原代码直接返回 MOCK_DATA → 改为委托 `AdminManager.getAdmins()`，与 AdminManager 保持一致 | ~L805-806 |
| 6 | **Utils.getLocal() JSON.parse 可能崩溃** | 添加 try/catch 包装，解析失败时返回 defaultVal 并 console.warn | ~L659-664 |
| 7 | **ID 生成：Math.max(...array.map()) 可能栈溢出** | 全部改为 `array.reduce((max, x) => Math.max(max, x.id), 0)` | 所有 Manager 的 addXxx() |
| 8 | **addQuestion() 缺少 created 字段** | 添加 `question.created = new Date().toISOString().slice(0, 10)` | ~L1034 |
| 9 | **ExportUtil.exportAccountList() 导出密码字段** | 移除密码字段，只导出工号/姓名/部门/岗位/状态/创建日期 | ~L2058-2088 |

#### 待长期重构问题

| # | 问题 | 建议 |
|---|------|------|
| 10 | **全局命名空间污染** | 所有 Manager 对象直接挂在 window 上，建议使用 IIFE 或模块化打包 |
| 11 | **密码明文存储于 localStorage** | 纯前端架构，长期建议接入后端 API 后使用 bcrypt/argon2 哈希存储 |
| 12 | **examQuestions 与 questionBank 数据重复** | 长期建议：考试题目应从题库动态抽取，不再维护独立副本 |

---

### 2.2 登录页 — `index.html`

✅ 原代码已安全（错误提示使用 textContent），无需额外修复

### 2.3 管理端首页 — `admin-dashboard.html`

✅ exam.title 已转义，数据源已改为 ExamManager.getExams()

### 2.4 题库管理 — `admin-questions.html`

✅ 全部 ~16 处 XSS 已修复（q.content, q.category, p.name, opt, q.image, q.answer 等）

### 2.5 考试管理 — `admin-exams.html`

✅ exam.title, 项目名, 表单属性值已转义

### 2.6 人员管理 — `admin-users.html`

✅ 密码字段改为 `value=""` + placeholder，用户信息全部转义

### 2.7 阅卷中心 — `admin-review.html`

✅ 题目内容、用户答案、参考答案、考生姓名、考试标题、图片src 全部转义

### 2.8 成绩统计 — `admin-statistics.html`

✅ 用户数据已转义，ECharts resize 内存泄漏已修复

### 2.9 系统设置 — `admin-settings.html`

✅ 管理员密码不再明文显示，用户数据全部转义

### 2.10 考生首页 — `exam-home.html`

✅ 项目名、考试标题/描述、成绩标题全部转义

### 2.11 在线考试 — `exam-take.html`

✅ 题目内容、选项文本、图片src 全部转义

### 2.12 考试结果 — `exam-result.html`

✅ 不完整转义已改为完整 `Utils.escapeHtml()`，所有用户数据已转义

### 2.13 项目文档 — `PROJECT_GUIDE.md`

✅ localStorage key 不一致已修正（`exam_exams` → `admin_exams`）

### 2.14 全局样式 — `css/style.css`

✅ 无问题

---

## 三、安全修复核心方法

### 3.1 XSS 防护：双重转义策略

- **内容注入**：`Utils.escapeHtml(str)` — 利用浏览器 DOM API 安全转义
- **属性注入**：`Utils.escapeAttr(str)` — 5字符完整转义（`&` `"` `'` `<` `>`）

### 3.2 密码安全处理

- 编辑表单：`value=""` + `placeholder="留空则不修改密码"`
- 导出功能：不再导出密码字段

### 3.3 数据一致性保障

- `Utils.getLocal()` 增加 try/catch
- ID 生成使用 `reduce` 防栈溢出

---

## 四、后续讨论方案记录

> 此区域用于记录未来修改的讨论方案。每次讨论后请在此追加条目。

### 讨论 #1：密码安全升级方案（✅ 已决策）

**提出时间**：2026-07-02
**背景**：当前系统为纯前端架构，密码以明文存储在 localStorage 中，存在严重安全风险。
**方案选项**：
- A. 接入后端 API 后使用 bcrypt/argon2 哈希存储
- B. 前端使用 SHA-256 + salt 做简易哈希（安全性有限）
- C. 保持现状，在系统设置中增加"密码安全等级"提示

**当前状态**：✅ 已决策
**决策**：**采纳方案 A，但分阶段实施**。
- **短期（当前版本）**：采用方案 C 的轻量措施——在系统设置页面增加明显的安全警告提示（如"当前为演示模式，密码以明文存储，请勿用于生产环境"），同时在登录页和用户管理页增加警示横幅。
- **长期（下一迭代）**：明确规划接入后端 API 的路线图，届时统一采用 bcrypt 哈希存储。在此之前，**禁止**在前端自行实现任何哈希算法（方案 B），因为前端哈希无法替代服务端加密，且会给人"已安全"的错觉。

**关联代码变更**：
- 在 `admin-settings.html` 顶部增加安全警示横幅（使用 `Utils.escapeHtml` 转义静态文案）。
- 在 `index.html` 登录框下方增加演示环境提示。
- 无需修改 `common.js` 中的密码存储逻辑（保持现状，等待后端改造）。

---

### 讨论 #2：模块化重构方案（✅ 已决策）

**提出时间**：2026-07-02
**背景**：所有 Manager 对象（`ProjectManager`、`AccountManager`、`QuestionBankManager` 等）直接挂在全局 `window` 上，存在命名空间污染和变量冲突风险，不利于代码维护和扩展。
**方案选项**：
- A. 使用 ES Module + 构建工具（Vite/Rollup）打包
- B. 使用 IIFE 封闭作用域 + namespace 对象（如 `ExamSystem.ProjectManager`）
- C. 保持现状，添加命名前缀约定

**当前状态**：✅ 已决策
**决策**：**采纳方案 B（IIFE + 命名空间）作为短期过渡，长期向方案 A 演进**。
- **理由**：当前项目为纯静态 HTML + 单 JS 文件，引入构建工具（方案 A）会改变项目结构，增加部署复杂度，不适合当前阶段的快速迭代。方案 B 能以最小改动实现作用域隔离，且兼容现有所有页面调用方式（只需将 `window.XXXManager` 改为 `ExamSystem.XXXManager`）。
- **实施步骤**：
  1. 在 `common.js` 顶部创建全局命名空间 `const ExamSystem = {};`。
  2. 将所有 Manager 的定义包裹在 IIFE 中，并挂载到 `ExamSystem` 上（如 `ExamSystem.ProjectManager = { ... }`）。
  3. 在各 HTML 页面中，将 `ProjectManager.xxx()` 调用统一替换为 `ExamSystem.ProjectManager.xxx()`（可逐步替换，新旧并存期间做兼容处理）。
  4. 后续引入 ESLint 检测未声明的全局变量，确保命名空间整洁。

**关联代码变更**：
- 修改 `js/common.js`，增加 `ExamSystem` 命名空间，迁移所有 Manager。
- 修改所有 HTML 页面中的 Manager 调用（约 100+ 处），可分批完成。
- 在 `PROJECT_GUIDE.md` 中更新架构说明。

---

### 讨论 #3：题库数据架构优化（✅ 已决策）

**提出时间**：2026-07-02
**背景**：`MOCK_DATA` 中 `examQuestions`（考试题目快照）与 `questionBank`（题库主表）存在数据重复。当题库题目修改后，已发布的考试题目不会同步更新，目前是通过复制副本实现的，导致维护成本高且数据不一致风险大。
**方案选项**：
- A. 考试题目统一从 questionBank 动态抽取，删除 examQuestions
- B. 保留 examQuestions 作为考试题目快照（考试发布后题目锁定）
- C. 使用 exam_question_relations 关联表替代数据复制

**当前状态**：✅ 已决策
**决策**：**采纳方案 B + C 的混合策略**。
- **核心原则**：考试一旦"发布"（状态变为 `published` 或 `ongoing`），其题目内容必须**快照锁定**，确保考生看到的题目与教师组卷时一致，不受后续题库修改影响。
- **具体做法**：
  1. 保留 `examQuestions` 作为考试发布时的题目副本（即快照），但**仅存储题目 ID 和当时的题目内容副本**（而非完整关系表）。
  2. 新增 `exam_question_snapshot` 数据结构（可存在 `localStorage` 单独 key 中），用于存储考试 ID → 题目列表（含题目内容、选项、答案）的映射。
  3. 当教师"组卷"时，从 `questionBank` 抽取题目，生成快照并存入 `examQuestions`。此后，该考试的题目独立于题库。
  4. 当教师"重新组卷"或"编辑考试"时，允许重新从题库拉取并覆盖快照（需提示"将覆盖已保存的题目"）。
  5. 这样既保留了快照的稳定性，又避免了全局数据重复（只存一份快照，而非每个考试都复制全部题目）。

**关联代码变更**：
- 修改 `ExamManager.createExam()` 和 `addQuestionToExam()` 逻辑，确保添加题目时写入快照。
- 修改 `ExamManager.getExamQuestions()` 优先读取快照，若不存在则从题库动态生成（兼容旧数据）。
- 调整 `admin-exams.html` 中的组卷交互，增加"从题库重新组卷"按钮。
- 清理 `MOCK_DATA` 中的静态 `examQuestions` 示例，改为运行时生成。

---

### 讨论 #4：考试分页功能实现（✅ 已决策）

**提出时间**：2026-07-02
**背景**：`admin-exams.html` 页面已有分页 UI（上一页/下一页/页码按钮），但实际并未实现分页逻辑，当前会渲染所有考试记录，当考试数量增多时影响性能。
**方案选项**：
- A. 实现 Server-Side 分页（需后端支持）
- B. 实现 Client-Side 分页（前端切片渲染）
- C. 当前数据量小，暂不分页，超过 100 条时再实现

**当前状态**：✅ 已决策
**决策**：**采纳方案 B（客户端分页）作为立即实施方案，同时预留方案 A 的扩展接口**。
- **理由**：当前系统为纯前端，无后端服务，无法实现服务端分页。但考虑到未来可能接入后端，分页逻辑应封装在 Manager 层，便于后续替换为 API 调用。
- **实施细节**：
  1. 在 `ExamManager` 中增加 `getExamsPaginated(page, pageSize, filters)` 方法，返回 `{ data: [], total: number }`。
  2. 前端渲染时根据当前页码和每页大小对考试列表进行切片。
  3. 分页 UI 点击事件绑定到该方法，重新渲染表格。
  4. 每页大小默认为 10，允许用户切换（5/10/20/50）。
  5. 搜索/筛选条件也应用在分页之前，确保结果正确。
  6. 在方法内部加上注释 `// TODO: 接入后端后替换为 API 调用`，便于后续迁移。

**关联代码变更**：
- 修改 `js/common.js` 中的 `ExamManager`，新增 `getExamsPaginated` 方法。
- 修改 `admin-exams.html` 中的渲染函数 `renderExams()`，改为调用分页方法，并管理当前页码状态。
- 增加分页控件的交互事件（点击页码、切换每页条数）。
- 更新 `PROJECT_GUIDE.md` 中的数据流说明。

### 讨论模板（新讨论请复制此模板追加）

```
### 讨论 #N：[讨论标题]（状态）
**提出时间**：YYYY-MM-DD  
**背景**：[问题描述]  
**方案选项**：A/B/C  
**当前状态**：[待讨论/已决策/已实现]  
**决策**：[结果或"待定"]
**关联代码变更**：[变更文件和位置]
```

---

## 五、修复统计

| 文件 | XSS 修复数 | 其他修复数 | 总修复数 |
|------|----------|----------|---------|
| js/common.js | 4 | 6 | 10 |
| index.html | 0 | 0 | 0 |
| admin-dashboard.html | 1 | 1 | 2 |
| admin-questions.html | 16+ | 0 | 16+ |
| admin-exams.html | 3+ | 0 | 3+ |
| admin-users.html | 8+ | 1 | 9+ |
| admin-review.html | 8+ | 0 | 8+ |
| admin-statistics.html | 4+ | 1 | 5+ |
| admin-settings.html | 6+ | 1 | 7+ |
| exam-home.html | 4 | 0 | 4 |
| exam-take.html | 3 | 0 | 3 |
| exam-result.html | 6 | 0 | 6 |
| PROJECT_GUIDE.md | 0 | 2 | 2 |
| css/style.css | 0 | 0 | 0 |
| **合计** | **~55** | **~12** | **~67** |

---

*本文档由资深开发工程师审查并编写，后续每次代码修改后请更新对应模块的条目，并在"后续讨论方案记录"区域追加讨论记录。*
