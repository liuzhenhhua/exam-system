/**
 * API 客户端 — 所有后端请求封装
 * 自动根据 API_BASE 是否可用来决定走后端还是 localStorage
 * 部署到 Railway 后，API_BASE 自动为 /api（相对路径）
 */
window.ApiClient = (function () {
  'use strict';

  // 部署到云端时，前端和后端同一域名，API_BASE = /api
  // 本地开发时，前端在 localhost 打开，后端也在 localhost:3000
  const API_BASE = '/api';
  let _token = null;
  let _backendAvailable = null; // null=未检测, true/false

  function getToken() {
    if (_token) return _token;
    _token = localStorage.getItem('exam_token');
    return _token;
  }

  function setToken(token) {
    _token = token;
    if (token) {
      localStorage.setItem('exam_token', token);
    } else {
      localStorage.removeItem('exam_token');
    }
  }

  function clearAuth() {
    _token = null;
    localStorage.removeItem('exam_token');
    localStorage.removeItem('current_user');
  }

  async function request(method, path, body = null, retryOnAuth = true) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    // 请求超时：交卷等操作可能较慢，给30秒
    const controller = new AbortController();
    options.signal = controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const resp = await fetch(API_BASE + path, options);
      clearTimeout(timeoutId);
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        if (resp.status === 401 && retryOnAuth && token) {
          clearAuth();
          throw new Error('unauthorized');
        }
        throw new Error(data.error || `请求失败 (${resp.status})`);
      }

      // 标记后端可用
      if (_backendAvailable !== true) {
        _backendAvailable = true;
      }

      return await resp.json();
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.message === 'unauthorized') {
        // Token 过期，跳转登录
        if (window.location.pathname !== '/' && !window.location.pathname.endsWith('index.html')) {
          window.location.href = 'index.html';
        }
        throw err;
      }
      // 网络错误 = 后端不可用
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        _backendAvailable = false;
        throw new Error('backend-unavailable');
      }
      // 请求超时
      if (err.name === 'AbortError') {
        throw new Error('请求超时，请检查网络后重试');
      }
      throw err;
    }
  }

  // 检测后端是否可用
  async function checkBackend() {
    if (_backendAvailable !== null) return _backendAvailable;
    try {
      await request('GET', '/health');
      _backendAvailable = true;
    } catch (e) {
      _backendAvailable = false;
    }
    return _backendAvailable;
  }

  // 判断是否应该使用后端
  async function useBackend() {
    if (_backendAvailable === true) return true;
    if (_backendAvailable === false) return false;
    return await checkBackend();
  }

  // ==================== 公开 API ====================

  return {
    // 令牌管理
    getToken,
    setToken,
    clearAuth,
    checkBackend,
    useBackend,

    // 认证
    login(username, password) {
      return request('POST', '/auth/login', { username, password });
    },
    getCurrentUser() {
      return request('GET', '/auth/me');
    },
    changePassword(oldPassword, newPassword) {
      return request('PUT', '/auth/password', { oldPassword, newPassword });
    },

    // 用户管理
    getUsers(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return request('GET', `/users${qs ? '?' + qs : ''}`);
    },
    addUser(user) { return request('POST', '/users', user); },
    batchAddUsers(users) { return request('POST', '/users/batch', { users }); },
    updateUser(id, data) { return request('PUT', `/users/${id}`, data); },
    deleteUser(id) { return request('DELETE', `/users/${id}`); },

    // 考试
    getExams(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return request('GET', `/exams${qs ? '?' + qs : ''}`);
    },
    getExam(id) { return request('GET', `/exams/${id}`); },
    addExam(exam) { return request('POST', '/exams', exam); },
    updateExam(id, data) { return request('PUT', `/exams/${id}`, data); },
    deleteExam(id) { return request('DELETE', `/exams/${id}`); },

    // 题库
    getQuestions(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return request('GET', `/questions${qs ? '?' + qs : ''}`);
    },
    addQuestion(q) { return request('POST', '/questions', q); },
    batchAddQuestions(questions, scope, project_id) {
      return request('POST', '/questions/batch', { questions, scope, project_id });
    },
    updateQuestion(id, data) { return request('PUT', `/questions/${id}`, data); },
    deleteQuestion(id) { return request('DELETE', `/questions/${id}`); },
    getQuestionStats() { return request('GET', '/questions/stats'); },

    // 考试结果
    submitResult(data) { return request('POST', '/results', data); },
    getResults(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return request('GET', `/results${qs ? '?' + qs : ''}`);
    },
    getMyResults() { return request('GET', '/results/my'); },
    getExamResults(examId) { return request('GET', `/results/exam/${examId}`); },
    getResultDetails(id) { return request('GET', `/results/${id}/details`); },
    reviewQuestion(resultId, questionIndex, score, comment) {
      return request('PUT', `/results/${resultId}/review`, { questionIndex, score, comment });
    },

    // 部门
    getDepartments() { return request('GET', '/departments'); },
    addDepartment(data) { return request('POST', '/departments', data); },
    updateDepartment(id, data) { return request('PUT', `/departments/${id}`, data); },
    deleteDepartment(id) { return request('DELETE', `/departments/${id}`); },

    // 岗位
    getPositions() { return request('GET', '/positions'); },
    addPosition(data) { return request('POST', '/positions', data); },
    updatePosition(id, data) { return request('PUT', `/positions/${id}`, data); },
    deletePosition(id) { return request('DELETE', `/positions/${id}`); },

    // 管理员
    getAdmins() { return request('GET', '/admins'); },
    addAdmin(data) { return request('POST', '/admins', data); },
    updateAdmin(id, data) { return request('PUT', `/admins/${id}`, data); },
    deleteAdmin(id) { return request('DELETE', `/admins/${id}`); },

    // 项目
    getProjects() { return request('GET', '/projects'); },
    addProject(data) { return request('POST', '/projects', data); },
    updateProject(id, data) { return request('PUT', `/projects/${id}`, data); },
    deleteProject(id) { return request('DELETE', `/projects/${id}`); },

    // 分类
    getCategories() { return request('GET', '/categories'); },
    addCategory(name) { return request('POST', '/categories', { name }); },
    deleteCategory(id) { return request('DELETE', `/categories/${id}`); },

    // 设置
    getSettings() { return request('GET', '/settings'); },
    updateSettings(data) { return request('PUT', '/settings', data); },

    // 统计
    getStats() { return request('GET', '/stats'); },
    getDeptStats() { return request('GET', '/stats/dept'); },
    getPositionStats() { return request('GET', '/stats/position'); }
  };
})();
