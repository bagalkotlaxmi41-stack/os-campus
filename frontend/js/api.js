// ============================================
// Campus OS — Python REST API & Realtime Client
// Connects Frontend to SQLite Realtime Database Engine
// ============================================

// Fast Fetch with configurable timeout (default 5000ms to tolerate serverless cold starts)
async function fastFetch(url, options = {}, timeoutMs = 5000) {
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
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/health`, {}, 2500);
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
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/accounts`, {}, 4000);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  searchAccounts: async function(query) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/accounts/search?q=${encodeURIComponent(query)}`, {}, 3500);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  getAccount: async function(handle) {
    try {
      const clean = handle.startsWith('@') ? handle : '@' + handle;
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/accounts/${encodeURIComponent(clean)}`, {}, 3500);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  checkHandleAvailability: async function(handle) {
    try {
      const clean = handle.startsWith('@') ? handle : '@' + handle;
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/accounts/check-handle/${encodeURIComponent(clean)}`, {}, 3000);
      if (!res.ok) return { available: true };
      return await res.json();
    } catch (e) {
      return { available: true };
    }
  },

  checkEmailAvailability: async function(email) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/accounts/check-email/${encodeURIComponent(email)}`, {}, 3000);
      if (!res.ok) return { available: true };
      return await res.json();
    } catch (e) {
      return { available: true };
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
          program: account.program || 'BCA',
          college: account.college || 'Campus OS Academic Network',
          usn: account.usn || null,
          bio: account.bio || '',
          skills: account.skills || [],
          photo: account.photo || null,
          role: account.role || 'STUDENT',
          privacy: account.privacy || { profileVisibility: 'public', showEmail: false, showUSN: true }
        })
      }, 6000);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to save account to backend');
      }
      const data = await res.json();
      return data.account;
    } catch (err) {
      console.warn('API saveAccount notice:', err);
      throw err;
    }
  },

  updateProfile: async function(handle, profileData) {
    try {
      const clean = handle.startsWith('@') ? handle : '@' + handle;
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/accounts/${encodeURIComponent(clean)}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      }, 6000);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to update profile');
      }
      const data = await res.json();
      return data.account;
    } catch (e) {
      console.warn('API updateProfile notice:', e);
      throw e;
    }
  },

  changePassword: async function(handle, oldPassword, newPassword) {
    try {
      const clean = handle.startsWith('@') ? handle : '@' + handle;
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/accounts/${encodeURIComponent(clean)}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword })
      }, 5000);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to change password');
      }
      return await res.json();
    } catch (e) {
      console.warn('API changePassword notice:', e);
      throw e;
    }
  },

  changeHandle: async function(oldHandle, newHandle) {
    try {
      const cleanOld = oldHandle.startsWith('@') ? oldHandle : '@' + oldHandle;
      const cleanNew = newHandle.startsWith('@') ? newHandle : '@' + newHandle;
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/accounts/${encodeURIComponent(cleanOld)}/change-handle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newHandle: cleanNew })
      }, 6000);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to change username');
      }
      return await res.json();
    } catch (e) {
      console.warn('API changeHandle notice:', e);
      throw e;
    }
  },

  login: async function(identifier, password) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      }, 6000);
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
      }, 4000);
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
      }, 6000);
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
      }, 6000);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to update account role on backend');
      }
      return await res.json();
    } catch (err) {
      console.warn('API updateAccountRole error:', err);
      throw err;
    }
  },

  adminResetPassword: async function(handle, newPassword) {
    try {
      const clean = handle.startsWith('@') ? handle : '@' + handle;
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: clean, password: newPassword })
      }, 4000);
      return res.ok;
    } catch (err) {
      return false;
    }
  },

  adminLogin: async function(password, identifier) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password, identifier: identifier || '' })
      }, 5000);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Admin login failed');
      }
      return await res.json();
    } catch (e) {
      console.warn('API adminLogin error:', e);
      throw e;
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
      // Increased from 1000ms — 1s was too short for serverless cold starts
      const res = await fastFetch(url, {}, 4000);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  searchAll: async function(q) {
    if (!q || !q.trim()) return { accounts: [], posts: [], notes: [] };
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/search?q=${encodeURIComponent(q.trim())}`, {}, 5000);
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
      }, 6000);
      if (!res.ok) throw new Error('Failed to create post on backend');
      const data = await res.json();
      return data.post;
    } catch (err) {
      console.warn('API createPost error:', err);
      return postData;
    }
  },

  updatePost: async function(postId, updatedFields) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/posts/${encodeURIComponent(postId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      }, 5000);
      return res.ok;
    } catch (err) {
      return false;
    }
  },

  deletePost: async function(postId) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/posts/${encodeURIComponent(postId)}`, {
        method: 'DELETE'
      }, 5000);
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
      }, 4000);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      return null;
    }
  },
  // Alias for backward compatibility
  likePost: async function(postId, userHandle) {
    return this.toggleLike(postId, userHandle);
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
  // NOTE: adminLogin is defined above at line ~284 targeting /api/admin/login
  // This section previously had a duplicate definition that was removed to prevent silent override

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
