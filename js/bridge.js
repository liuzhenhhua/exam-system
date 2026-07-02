/**
 * 后端迁移层
 * 运行时劫持 localStorage 函数，在 API 可用时透明切换为 API 调用
 * 在 common.js 之后、页面脚本之前加载
 */
(function () {
  'use strict';

  // 检查是否在 Node.js 后端环境中（通过检测 window 是否有 fetch 和 API_BASE）
  if (typeof window === 'undefined' || !window.ApiClient) return;

  // 等待 DOM 加载完成后检测后端
  async function initBackendBridge() {
    const available = await ApiClient.checkBackend();
    console.log('[迁移层] 后端', available ? '已连接 ✓' : '不可用，使用 localStorage 模式');

    if (available) {
      patchLoginFlow();
      patchDataManagers();
    }
  }

  function patchLoginFlow() {
    const origValidate = AccountManager.validateLogin;
    AccountManager.validateLogin = async function (username, password) {
      try {
        if (await ApiClient.useBackend()) {
          const result = await ApiClient.login(username, password);
          if (result.token) {
            ApiClient.setToken(result.token);
            // 同步存储 current_user 供离线备用
            localStorage.setItem('current_user', JSON.stringify(result.user));
            return { success: true, user: result.user };
          }
        }
      } catch (e) {
        // 后端登录失败，回退到 localStorage
        console.warn('[迁移层] 后端登录失败，使用本地模式:', e.message);
      }
      return origValidate(username, password);
    };
  }

  function patchDataManagers() {
    // 把各 Manager 的数据读写函数替换为 API 调用
    // 优先后端，失败时回退 localStorage

    // --- AccountManager ---
    const origGetExaminee = AccountManager.getExamineeAccounts;
    AccountManager.getExamineeAccounts = function () {
      const stored = Utils.getLocal('examinee_accounts');
      // 如果是管理员角色且后端可用，异步刷新
      ApiClient.useBackend().then(available => {
        if (available) {
          ApiClient.getUsers().then(data => {
            if (data.users) {
              Utils.saveLocal('examinee_accounts', data.users);
            }
          }).catch(() => {});
        }
      });
      return stored || [];
    };

    const origAddAccount = AccountManager.addAccount;
    AccountManager.addAccount = async function (account) {
      if (await ApiClient.useBackend()) {
        try {
          const result = await ApiClient.addUser(account);
          account.id = result.id;
        } catch (e) { console.warn('[迁移层] addAccount API 失败:', e.message); }
      }
      return origAddAccount.call(this, account);
    };

    const origUpdateAccount = AccountManager.updateAccount;
    AccountManager.updateAccount = async function (id, updates) {
      if (await ApiClient.useBackend()) {
        ApiClient.updateUser(id, updates).catch(() => {});
      }
      return origUpdateAccount.call(this, id, updates);
    };

    const origDeleteAccount = AccountManager.deleteAccount;
    AccountManager.deleteAccount = async function (id) {
      if (await ApiClient.useBackend()) {
        ApiClient.deleteUser(id).catch(() => {});
      }
      return origDeleteAccount.call(this, id);
    };

    const origBatchAdd = AccountManager.batchAddAccounts;
    AccountManager.batchAddAccounts = async function (accountList) {
      if (await ApiClient.useBackend() && accountList.length > 0) {
        ApiClient.batchAddUsers(accountList).catch(() => {});
      }
      return origBatchAdd.call(this, accountList);
    };

    // --- ExamManager ---
    const origGetExams = ExamManager.getExams;
    ExamManager.getExams = function () {
      const stored = Utils.getLocal('admin_exams');
      ApiClient.useBackend().then(available => {
        if (available) {
          ApiClient.getExams({ pageSize: 500 }).then(data => {
            if (data.exams) Utils.saveLocal('admin_exams', data.exams);
          }).catch(() => {});
        }
      });
      return stored || [];
    };

    const origAddExam = ExamManager.addExam;
    ExamManager.addExam = async function (exam) {
      if (await ApiClient.useBackend()) {
        try {
          const result = await ApiClient.addExam(exam);
          exam.id = result.id;
        } catch (e) { console.warn('[迁移层] addExam API 失败:', e.message); }
      }
      return origAddExam.call(this, exam);
    };

    const origUpdateExam = ExamManager.updateExam;
    ExamManager.updateExam = async function (id, updates) {
      if (await ApiClient.useBackend()) {
        ApiClient.updateExam(id, updates).catch(() => {});
      }
      return origUpdateExam.call(this, id, updates);
    };

    const origDeleteExam = ExamManager.deleteExam;
    ExamManager.deleteExam = async function (id) {
      if (await ApiClient.useBackend()) {
        ApiClient.deleteExam(id).catch(() => {});
      }
      return origDeleteExam.call(this, id);
    };

    // --- QuestionBankManager ---
    const origGetQuestions = QuestionBankManager.getQuestions;
    QuestionBankManager.getQuestions = function () {
      const stored = Utils.getLocal('question_bank');
      ApiClient.useBackend().then(available => {
        if (available) {
          ApiClient.getQuestions({ pageSize: 2000 }).then(data => {
            if (data.questions) Utils.saveLocal('question_bank', data.questions);
          }).catch(() => {});
        }
      });
      return stored || [];
    };

    // --- ResultManager ---
    const origGetResults = ResultManager.getResults;
    ResultManager.getResults = function () {
      const stored = Utils.getLocal('exam_results');
      ApiClient.useBackend().then(available => {
        if (available) {
          ApiClient.getResults({}).then(data => {
            if (data.results) Utils.saveLocal('exam_results', data.results);
          }).catch(() => {});
        }
      });
      return stored || [];
    };

    const origAddResult = ResultManager.addResult;
    ResultManager.addResult = async function (resultData) {
      if (await ApiClient.useBackend()) {
        try {
          // 先提交到后端
          const response = await ApiClient.submitResult(resultData);
          if (response.result) {
            resultData.reviewCompleted = response.result.reviewCompleted;
            resultData.passed = response.result.passed;
            resultData.score = response.result.score;
            resultData.objectiveScore = response.result.objectiveScore;
          }
        } catch (e) { console.warn('[迁移层] submitResult API 失败:', e.message); }

        // 同步刷新本地结果
        try {
          const data = await ApiClient.getResults({});
          if (data.results) Utils.saveLocal('exam_results', data.results);
        } catch (e) {}
      }
      return origAddResult.call(this, resultData);
    };

    // --- DepartmentManager ---
    const origGetDepts = DepartmentManager.getDepartments;
    DepartmentManager.getDepartments = function () {
      const stored = Utils.getLocal('departments');
      ApiClient.useBackend().then(available => {
        if (available) {
          ApiClient.getDepartments().then(data => {
            if (data.departments) Utils.saveLocal('departments', data.departments);
          }).catch(() => {});
        }
      });
      return stored || [];
    };

    // --- AdminManager ---
    const origGetAdmins = AdminManager.getAdmins;
    AdminManager.getAdmins = function () {
      const stored = Utils.getLocal('admin_accounts');
      ApiClient.useBackend().then(available => {
        if (available) {
          ApiClient.getAdmins().then(data => {
            if (data.admins) Utils.saveLocal('admin_accounts', data.admins);
          }).catch(() => {});
        }
      });
      return stored || [];
    };
  }

  // DOM 加载后立即初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackendBridge);
  } else {
    initBackendBridge();
  }
})();
