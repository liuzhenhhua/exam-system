/**
 * 后端迁移层
 * 运行时劫持 localStorage 函数，在 API 可用时透明切换为 API 调用
 * 在 common.js 之后、页面脚本之前加载
 */
(function () {
  'use strict';

  if (typeof window === 'undefined' || !window.ApiClient) return;

  // 全局刷新标记：防止重复触发
  let _refreshing = false;

  // 通用：异步从后端拉取数据并刷新 localStorage，然后触发页面重新渲染
  async function syncFromBackend(key, apiCall, renderFn) {
    if (_refreshing) return;
    _refreshing = true;
    try {
      const available = await ApiClient.useBackend();
      if (available) {
        const data = await apiCall();
        if (data) {
          Utils.saveLocal(key, data);
          // 如果页面提供了渲染函数，重新渲染
          if (renderFn && typeof renderFn === 'function') {
            renderFn();
          }
        }
      }
    } catch (e) {
      // 静默失败
    } finally {
      _refreshing = false;
    }
  }

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
            localStorage.setItem('current_user', JSON.stringify(result.user));
            return { success: true, user: result.user };
          }
        }
      } catch (e) {
        console.warn('[迁移层] 后端登录失败，使用本地模式:', e.message);
      }
      return origValidate(username, password);
    };
  }

  function patchDataManagers() {

    // --- AccountManager ---
    const origGetExaminee = AccountManager.getExamineeAccounts;
    AccountManager.getExamineeAccounts = function () {
      const stored = Utils.getLocal('examinee_accounts');
      if (!_mutationLock) {
        ApiClient.useBackend().then(available => {
          if (available && !_mutationLock) {
            ApiClient.getUsers().then(data => {
              if (data.users && !_mutationLock) {
                // 字段名转换：后端 snake_case → 前端 camelCase
                const users = data.users.map(u => ({
                  ...u,
                  departmentId: u.department_id || u.departmentId || null,
                  real_name: u.real_name || u.realName || '',
                  project_ids: u.project_ids || [],
                }));
                Utils.saveLocal('examinee_accounts', users);
              }
            }).catch(() => {});
          }
        });
      }
      return stored || [];
    };

    const origAddAccount = AccountManager.addAccount;
    AccountManager.addAccount = async function (account) {
      if (await ApiClient.useBackend()) {
        try {
          // 字段名转换：前端 camelCase → 后端 snake_case
          const result = await ApiClient.addUser({
            username: account.username,
            password: account.password,
            real_name: account.real_name,
            department_id: account.departmentId || null,
            department: account.department || '',
            position: account.position || '',
            status: account.status,
            project_ids: account.project_ids || []
          });
          account.id = result.id;
        } catch (e) { console.warn('[迁移层] addAccount API 失败:', e.message); }
      }
      return origAddAccount.call(this, account);
    };

    const origUpdateAccount = AccountManager.updateAccount;
    AccountManager.updateAccount = async function (id, updates) {
      if (await ApiClient.useBackend()) {
        _mutationLock = true;
        // 字段名转换：camelCase → snake_case
        const apiUpdates = { ...updates };
        if (updates.departmentId !== undefined) {
          apiUpdates.department_id = updates.departmentId;
          delete apiUpdates.departmentId;
        }
        try { await ApiClient.updateUser(id, apiUpdates); }
        catch (e) { console.warn('[迁移层] updateUser API 失败:', e.message); }
        setTimeout(() => { _mutationLock = false; }, 2000);
      }
      return origUpdateAccount.call(this, id, updates);
    };

    const origDeleteAccount = AccountManager.deleteAccount;
    AccountManager.deleteAccount = async function (id) {
      if (await ApiClient.useBackend()) {
        _mutationLock = true;
        try { await ApiClient.deleteUser(id); }
        catch (e) { console.warn('[迁移层] deleteUser API 失败:', e.message); }
        setTimeout(() => { _mutationLock = false; }, 2000);
      }
      return origDeleteAccount.call(this, id);
    };

    const origBatchAdd = AccountManager.batchAddAccounts;
    AccountManager.batchAddAccounts = async function (accountList) {
      if (await ApiClient.useBackend() && accountList.length > 0) {
        _mutationLock = true;
        // 字段名转换：camelCase → snake_case
        const apiUsers = accountList.map(a => ({
          username: a.username,
          password: a.password,
          real_name: a.real_name,
          department_id: a.departmentId || null,
          department: a.department || '',
          position: a.position || '',
          status: a.status,
          project_ids: a.project_ids || [],
          created: a.created
        }));
        try { await ApiClient.batchAddUsers(apiUsers); }
        catch (e) { console.warn('[迁移层] batchAddUsers API 失败:', e.message); }
        setTimeout(() => { _mutationLock = false; }, 2000);
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

    // 补丁 getExam：优先从后端获取单个考试（含题目快照）
    const origGetExam = ExamManager.getExam;
    ExamManager.getExam = function (id) {
      // 异步从后端获取，同步返回 localStorage 缓存
      ApiClient.useBackend().then(available => {
        if (available) {
          ApiClient.getExam(id).then(data => {
            if (data.exam) {
              // 更新 localStorage 中的单个考试
              const exams = Utils.getLocal('admin_exams') || [];
              const idx = exams.findIndex(e => String(e.id) === String(id));
              if (idx !== -1) {
                exams[idx] = { ...exams[idx], ...data.exam };
              } else {
                exams.push(data.exam);
              }
              Utils.saveLocal('admin_exams', exams);
            }
          }).catch(() => {});
        }
      });
      return origGetExam.call(this, id);
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

    const origBatchAddQuestions = QuestionBankManager.batchAddQuestions;
    QuestionBankManager.batchAddQuestions = async function (questions, scope, projectId) {
      if (await ApiClient.useBackend()) {
        try {
          await ApiClient.batchAddQuestions(questions, scope, projectId);
          // 从后端重新拉取最新题库
          const data = await ApiClient.getQuestions({ pageSize: 2000 });
          if (data.questions) Utils.saveLocal('question_bank', data.questions);
        } catch (e) { console.warn('[迁移层] batchAddQuestions API 失败:', e.message); }
      }
      return origBatchAddQuestions.call(this, questions, scope, projectId);
    };

    // --- ResultManager ---
    // 后端 DB 行 → 前端 camelCase 格式转换
    function mapBackendResult(r) {
      if (!r) return r;
      // 如果已经是 camelCase 格式（本地创建的），直接返回
      if (r.examId !== undefined) return r;
      // 从后端 DB 行转换
      const mapped = {
        id: r.id,
        examId: r.exam_id,
        username: r.username,
        realName: r.real_name || r.realName || '',
        department: r.department || '',
        score: Number(r.score) || 0,
        passScore: r.pass_score || 60,
        passed: r.passed === null || r.passed === undefined ? null : !!r.passed,
        correctCount: r.correct_count || 0,
        wrongCount: r.wrong_count || 0,
        totalScore: r.total_score || 100,
        autoScore: Number(r.auto_score) || 0,
        objectiveScore: Number(r.objective_score !== undefined ? r.objective_score : r.auto_score) || 0,
        manualReviewCount: r.manual_review_count || 0,
        reviewCompleted: r.review_completed === undefined ? (r.manual_review_count === 0) : !!r.review_completed,
        submittedAt: r.submitted_at || '',
        timeSpent: r.time_spent || ''
      };
      return mapped;
    }

    // 突变锁：防止后台同步覆盖刚执行的增删改
    let _mutationLock = false;
    function withMutationLock(fn) {
      return async function (...args) {
        _mutationLock = true;
        try { return await fn.apply(this, args); }
        finally { setTimeout(() => { _mutationLock = false; }, 2000); }
      };
    }

    const origGetResults = ResultManager.getResults;
    ResultManager.getResults = function () {
      const stored = Utils.getLocal('exam_results');
      if (!_mutationLock) {
        ApiClient.useBackend().then(available => {
          if (available && !_mutationLock) {
            ApiClient.getResults({}).then(data => {
              if (data.results && !_mutationLock) {
                const results = data.results.map(mapBackendResult);
                Utils.saveLocal('exam_results', results);
              }
            }).catch(() => {});
          }
        });
      }
      return stored || [];
    };

    const origAddResult = ResultManager.addResult;
    ResultManager.addResult = async function (resultData) {
      if (await ApiClient.useBackend()) {
        _mutationLock = true;
        try {
          const response = await ApiClient.submitResult(resultData);
          if (response.result) {
            const backendResult = response.result;
            // 合并后端返回的字段，保留前端已有的 examTitle/results/correctRate 等
            resultData.id = backendResult.id || resultData.id;
            resultData.reviewCompleted = backendResult.reviewCompleted !== undefined ? backendResult.reviewCompleted : (resultData.manualReviewCount === 0);
            resultData.passed = backendResult.passed !== undefined ? backendResult.passed : resultData.passed;
            resultData.score = backendResult.score !== undefined ? Number(backendResult.score) : resultData.score;
            resultData.objectiveScore = backendResult.objectiveScore !== undefined ? Number(backendResult.objectiveScore) : (resultData.autoScore || resultData.score);
          }
        } catch (e) { console.warn('[迁移层] submitResult API 失败:', e.message); }
        // 不再从后端重新拉取全部结果（会覆盖本地 examTitle/results 等字段）
        // 而是让 origAddResult 把 resultData 存入 localStorage
        setTimeout(() => { _mutationLock = false; }, 2000);
      }
      return origAddResult.call(this, resultData);
    };

    // --- DepartmentManager（完整 CRUD 补丁）---
    const origGetDepts = DepartmentManager.getDepartments;
    DepartmentManager.getDepartments = function () {
      const stored = Utils.getLocal('departments');
      ApiClient.useBackend().then(available => {
        if (available) {
          ApiClient.getDepartments().then(data => {
            if (data.departments) {
              // 转换 parent_id → parentId 以兼容前端
              const depts = data.departments.map(d => ({
                id: d.id,
                name: d.name,
                level: d.level,
                parentId: d.parent_id || d.parentId || null
              }));
              Utils.saveLocal('departments', depts);
            }
          }).catch(() => {});
        }
      });
      return stored || [];
    };

    const origAddDept = DepartmentManager.addDepartment;
    DepartmentManager.addDepartment = async function (dept) {
      if (await ApiClient.useBackend()) {
        try {
          const result = await ApiClient.addDepartment({
            name: dept.name,
            level: dept.level,
            parent_id: dept.parentId || null
          });
          dept.id = result.id;
        } catch (e) { console.warn('[迁移层] addDepartment API 失败:', e.message); }
      }
      return origAddDept.call(this, dept);
    };

    const origUpdateDept = DepartmentManager.updateDepartment;
    DepartmentManager.updateDepartment = async function (id, updates) {
      if (await ApiClient.useBackend()) {
        try {
          await ApiClient.updateDepartment(id, {
            name: updates.name,
            level: updates.level,
            parent_id: updates.parentId || null
          });
        } catch (e) { console.warn('[迁移层] updateDepartment API 失败:', e.message); }
      }
      return origUpdateDept.call(this, id, updates);
    };

    const origDeleteDept = DepartmentManager.deleteDepartment;
    DepartmentManager.deleteDepartment = async function (id) {
      if (await ApiClient.useBackend()) {
        try {
          await ApiClient.deleteDepartment(id);
        } catch (e) {
          console.warn('[迁移层] deleteDepartment API 失败:', e.message);
          return { success: false, msg: e.message || '删除部门失败' };
        }
      }
      return origDeleteDept.call(this, id);
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

    // --- PositionManager（岗位数据同步）---
    if (typeof PositionManager !== 'undefined') {
      const origGetPositions = PositionManager.getPositions;
      PositionManager.getPositions = function () {
        const stored = Utils.getLocal('positions');
        ApiClient.useBackend().then(available => {
          if (available) {
            ApiClient.getPositions().then(data => {
              if (data.positions) {
                // 转换 sort_order → sortOrder 以兼容前端
                const positions = data.positions.map(p => ({
                  id: p.id,
                  name: p.name,
                  sortOrder: p.sort_order !== undefined ? p.sort_order : (p.sortOrder || 0)
                }));
                Utils.saveLocal('positions', positions);
              }
            }).catch(() => {});
          }
        });
        return stored || [];
      };

      const origAddPosition = PositionManager.addPosition;
      PositionManager.addPosition = async function (pos) {
        if (await ApiClient.useBackend()) {
          try {
            const result = await ApiClient.addPosition({ name: pos.name, sort_order: pos.sortOrder || 0 });
            pos.id = result.id;
          } catch (e) { console.warn('[迁移层] addPosition API 失败:', e.message); }
        }
        return origAddPosition.call(this, pos);
      };

      const origUpdatePosition = PositionManager.updatePosition;
      PositionManager.updatePosition = async function (id, updates) {
        if (await ApiClient.useBackend()) {
          const apiUpdates = {};
          if (updates.name !== undefined) apiUpdates.name = updates.name;
          if (updates.sortOrder !== undefined) apiUpdates.sort_order = updates.sortOrder;
          ApiClient.updatePosition(id, apiUpdates).catch(() => {});
        }
        return origUpdatePosition.call(this, id, updates);
      };

      const origDeletePosition = PositionManager.deletePosition;
      PositionManager.deletePosition = async function (id) {
        if (await ApiClient.useBackend()) {
          ApiClient.deletePosition(id).catch(() => {});
        }
        return origDeletePosition.call(this, id);
      };
    }
  }

  // DOM 加载后立即初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackendBridge);
  } else {
    initBackendBridge();
  }
})();
