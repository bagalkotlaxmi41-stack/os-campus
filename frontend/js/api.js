// ============================================
// Campus OS — Python REST API & Realtime Client
// Connects Frontend to SQLite Realtime Database Engine
// ============================================

// Fast Non-blocking Fetch with Timeout (prevents UI freeze/lags when backend is offline or on serverless)
async function fastFetch(url, options = {}, timeoutMs = 1200) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Dynamic Environment-Aware API Base URL
const getPythonApiBaseUrl = function() {
  if (typeof localStorage !== 'undefined') {
    const custom = localStorage.getItem('cos_api_url');
    if (custom) return custom.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location) {
    const { hostname, port, origin } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      if (port === '8000') return origin;
      return 'http://localhost:8000';
    }
    return origin;
  }
  return 'http://localhost:8000';
};

const PYTHON_API_BASE_URL = getPythonApiBaseUrl();

const PythonAPI = {
  /**
   * Health Check
   */
  checkHealth: async function() {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/health`, {}, 600);
      if (!res.ok) return false;
      const data = await res.json();
      return data.status === 'online';
    } catch (e) {
      return false;
    }
  },

  // ============================================================
  // ACCOUNTS & STUDENT DIRECTORY
  // ============================================================
  getAccounts: async function() {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/accounts`, {}, 900);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  searchAccounts: async function(query) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/accounts/search?q=${encodeURIComponent(query)}`, {}, 900);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  getAccount: async function(handle) {
    try {
      const clean = handle.startsWith('@') ? handle : '@' + handle;
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/accounts/${encodeURIComponent(clean)}`, {}, 900);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  saveAccount: async function(account) {
    try {
      const handle = (account.username || account.handle || '').startsWith('@') ? (account.username || account.handle) : '@' + (account.username || account.handle);
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: handle,
          displayName: account.displayName || account.name || 'Student',
          email: account.email || null,
          password: account.password || null,
          department: account.department || 'Computer Science & Engineering',
          semester: Number(account.semester) || 5,
          usn: account.usn || null,
          bio: account.bio || '',
          skills: account.skills || [],
          photo: account.photo || null,
          role: account.role || 'STUDENT',
          xp: Number(account.xp) || 150
        })
      }, 1500);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to save account to backend');
      }
      const data = await res.json();
      return data.account;
    } catch (err) {
      console.warn('API saveAccount fallback to local:', err);
      return account;
    }
  },

  login: async function(identifier, password) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      }, 1500);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Login failed');
      }
      const data = await res.json();
      return data.account;
    } catch (err) {
      throw err;
    }
  },

  register: async function(account) {
    return this.saveAccount(account);
  },

  deleteAccount: async function(handle) {
    try {
      const clean = handle.startsWith('@') ? handle : '@' + handle;
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/accounts/${encodeURIComponent(clean)}`, {
        method: 'DELETE'
      }, 1200);
      return res.ok;
    } catch (err) {
      return false;
    }
  },

  updateAccountPhoto: async function(handle, photoBase64) {
    try {
      const clean = handle.startsWith('@') ? handle : '@' + handle;
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/accounts/${encodeURIComponent(clean)}/photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo: photoBase64 })
      }, 1500);
      return res.ok;
    } catch (err) {
      return false;
    }
  },

  updateAccountRole: async function(handle, role) {
    try {
      const clean = handle.startsWith('@') ? handle : '@' + handle;
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/accounts/${encodeURIComponent(clean)}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: role })
      }, 1200);
      return res.ok;
    } catch (err) {
      return false;
    }
  },

  adminResetPassword: async function(handle, newPassword) {
    try {
      const clean = handle.startsWith('@') ? handle : '@' + handle;
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: clean, password: newPassword })
      }, 1200);
      return res.ok;
    } catch (err) {
      return false;
    }
  },

  // ============================================================
  // POSTS FEED & STUDY MATERIALS
  // ============================================================
  getPosts: async function(filter) {
    filter = filter || {};
    try {
      let url = `${PYTHON_API_BASE_URL}/api/posts?`;
      if (filter.handle) url += `handle=${encodeURIComponent(filter.handle)}&`;
      if (filter.type) url += `type=${encodeURIComponent(filter.type)}&`;
      if (filter.q) url += `q=${encodeURIComponent(filter.q)}&`;
      const res = await fastFetch(url, {}, 1000);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  createPost: async function(postData) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      }, 1500);
      if (!res.ok) throw new Error('Failed to create post on backend');
      const data = await res.json();
      return data.post;
    } catch (err) {
      return postData;
    }
  },

  updatePost: async function(postId, updatedFields) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/posts/${encodeURIComponent(postId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      }, 1200);
      return res.ok;
    } catch (err) {
      return false;
    }
  },

  deletePost: async function(postId) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/posts/${encodeURIComponent(postId)}`, {
        method: 'DELETE'
      }, 1200);
      return res.ok;
    } catch (err) {
      return false;
    }
  },

  toggleLike: async function(postId, userHandle) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/posts/${encodeURIComponent(postId)}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: userHandle || '@student' })
      }, 1000);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  getLiveStats: async function() {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/stats/live`, {}, 800);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  // ============================================================
  // ACADEMIC VAULT (Notes, Tasks, Attendance)
  // ============================================================
  getNotes: async function(handle) {
    try {
      const url = handle ? `${PYTHON_API_BASE_URL}/api/notes?handle=${encodeURIComponent(handle)}` : `${PYTHON_API_BASE_URL}/api/notes`;
      const res = await fastFetch(url, {}, 900);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  },

  saveNote: async function(note) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note)
      }, 1200);
      return res.ok;
    } catch (e) { return false; }
  },

  deleteNote: async function(id) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/notes/${encodeURIComponent(id)}`, { method: 'DELETE' }, 1000);
      return res.ok;
    } catch (e) { return false; }
  },

  getTasks: async function(handle) {
    try {
      const url = handle ? `${PYTHON_API_BASE_URL}/api/tasks?handle=${encodeURIComponent(handle)}` : `${PYTHON_API_BASE_URL}/api/tasks`;
      const res = await fastFetch(url, {}, 900);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  },

  saveTask: async function(task) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      }, 1200);
      return res.ok;
    } catch (e) { return false; }
  },

  deleteTask: async function(id) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }, 1000);
      return res.ok;
    } catch (e) { return false; }
  },

  getAttendance: async function(handle) {
    try {
      const url = handle ? `${PYTHON_API_BASE_URL}/api/attendance?handle=${encodeURIComponent(handle)}` : `${PYTHON_API_BASE_URL}/api/attendance`;
      const res = await fastFetch(url, {}, 900);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  },

  saveAttendance: async function(att) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(att)
      }, 1200);
      return res.ok;
    } catch (e) { return false; }
  },

  // ============================================================
  // OWNER & ADMINISTRATOR API METHODS
  // ============================================================
  adminLogin: async function(key, email) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/admin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, email })
      }, 1500);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Authentication failed' }));
        throw new Error(err.detail || 'Access denied');
      }
      return await res.json();
    } catch (e) {
      throw e;
    }
  },

  getAdminStats: async function() {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/admin/stats`, {}, 900);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  },

  getBanners: async function() {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/banners`, {}, 900);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  },

  getAdminBanners: async function() {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/admin/banners`, {}, 900);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  },

  saveAdminBanner: async function(banner) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/admin/banners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(banner)
      }, 1500);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  },

  deleteAdminBanner: async function(id) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/admin/banners/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      }, 1200);
      return res.ok;
    } catch (e) { return false; }
  },

  toggleAdminBanner: async function(id) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/admin/banners/${encodeURIComponent(id)}/toggle`, {
        method: 'PUT'
      }, 1200);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  },

  adminBroadcast: async function(data) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/admin/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }, 1500);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  },

  getAdminAuditLogs: async function() {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/admin/audit-logs`, {}, 900);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) { return []; }
  }
};

window.PythonAPI = PythonAPI;
