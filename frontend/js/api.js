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
  },

  // ============================================================
  // CLOUD SYNC API (Cross-Device Discovery via Vercel Blob)
  // ============================================================
  getCloudAccounts: async function() {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/cloud/accounts`, {}, 6000);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.warn('[CloudSync] getCloudAccounts fallback:', err);
      return this.getAccounts();
    }
  },

  searchCloudAccounts: async function(query) {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/cloud/accounts/search?q=${encodeURIComponent(query)}`, {}, 5000);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.warn('[CloudSync] searchCloudAccounts fallback:', err);
      return this.searchAccounts(query);
    }
  },

  getCloudPosts: async function() {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/cloud/posts`, {}, 6000);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.warn('[CloudSync] getCloudPosts fallback:', err);
      return this.getPosts();
    }
  },

  getCloudNotifications: async function() {
    try {
      const res = await fastFetch(`${PYTHON_API_BASE_URL}/api/cloud/notifications`, {}, 5000);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      return [];
    }
  }
};

// ============================================================
// CAMPUS EMAIL SERVICE (EmailJS Integration)
// ============================================================
const CampusEmailService = {
  publicKey: "MQxZeO4-7lL0-gfX7",

  getDevice() {
    if (typeof navigator === 'undefined') return 'Personal Computer';
    const ua = navigator.userAgent || '';
    if (/android/i.test(ua)) return 'Mobile (Android)';
    if (/iPad|iPhone|iPod/.test(ua)) return 'Mobile (iOS / iPhone)';
    if (/Windows/i.test(ua)) return 'Desktop (Windows PC)';
    if (/Macintosh|Mac OS/i.test(ua)) return 'Desktop (Apple macOS)';
    if (/Linux/i.test(ua)) return 'Desktop (Linux)';
    if (/mobile/i.test(ua)) return 'Mobile Device';
    return 'Web Device';
  },

  getBrowser() {
    if (typeof navigator === 'undefined') return 'Web Browser';
    const ua = navigator.userAgent || '';
    if (ua.includes('Edg/')) return 'Microsoft Edge';
    if (ua.includes('Chrome/') && !ua.includes('Edg/')) return 'Google Chrome';
    if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Apple Safari';
    if (ua.includes('Firefox/')) return 'Mozilla Firefox';
    if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
    return 'Modern Browser';
  },

  getLoginTime() {
    const now = new Date();
    try {
      return now.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return now.toISOString();
    }
  },

  getLocation() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) return `${tz} · Campus Network`;
    } catch (e) {}
    return 'Campus OS Academic Network';
  },

  getServiceId() {
    return localStorage.getItem('cos_emailjs_service_id') || window.EMAILJS_SERVICE_ID || 'default_service';
  },

  getTemplateId() {
    return localStorage.getItem('cos_emailjs_template_id') || window.EMAILJS_TEMPLATE_ID || 'template_welcome';
  },

  setCredentials(serviceId, templateId) {
    if (serviceId) localStorage.setItem('cos_emailjs_service_id', serviceId.trim());
    if (templateId) localStorage.setItem('cos_emailjs_template_id', templateId.trim());
  },

  /**
   * Dispatch Login / Account Creation Notification via EmailJS
   * Template parameters match: {{full_name}}, {{login_time}}, {{device}}, {{browser}}, {{location}}
   */
  async sendLoginNotification(user) {
    if (!user || !user.email) return { success: false, message: "No email provided" };

    if (typeof emailjs === 'undefined') {
      console.warn('[CampusEmail] EmailJS SDK not available on page.');
      return { success: false, message: "EmailJS SDK not loaded" };
    }

    try {
      emailjs.init({ publicKey: this.publicKey });
    } catch(e) {}

    const fullName = user.displayName || user.name || user.fullName || 'Student';
    const email = (user.email || '').trim();
    const loginTime = this.getLoginTime();
    const device = this.getDevice();
    const browser = this.getBrowser();
    const location = this.getLocation();

    const templateParams = {
      // Direct template variables from EmailJS template
      full_name: fullName,
      login_time: loginTime,
      device: device,
      browser: browser,
      location: location,

      // Recipient fields for EmailJS header & To Email field
      to_email: email,
      email: email,
      user_email: email,
      recipient_email: email,
      reply_to: email,
      to_name: fullName,
      name: fullName,
      user_name: fullName,

      // Extra metadata
      handle: user.handle || user.username || '@student',
      user_handle: user.handle || user.username || '@student',
      college: user.college || 'Campus OS Academic Network',
      department: user.department || 'Computer Science & Engineering',
      semester: user.semester || 5,
      joined_date: new Date().toLocaleDateString(),
      app_name: 'Campus OS',
      message: `Your Campus OS account was successfully signed in on ${device} via ${browser} at ${loginTime}.`
    };

    const sId = this.getServiceId();
    const tId = this.getTemplateId();

    const serviceCandidates = [
      sId,
      window.EMAILJS_SERVICE_ID,
      'service_campus_os',
      'service_gmail',
      'service_default',
      'default_service'
    ].filter(Boolean);

    const templateCandidates = [
      tId,
      window.EMAILJS_TEMPLATE_ID,
      'template_welcome',
      'template_login',
      'template_signin',
      'template_signup',
      'template_default'
    ].filter(Boolean);

    let sent = false;
    let lastErr = null;

    for (const s of Array.from(new Set(serviceCandidates))) {
      if (sent) break;
      for (const t of Array.from(new Set(templateCandidates))) {
        try {
          const res = await emailjs.send(s, t, templateParams, this.publicKey);
          console.log('✅ Sign-in email dispatched via EmailJS:', res);
          sent = true;
          break;
        } catch (err) {
          lastErr = err;
          console.debug(`[CampusEmail] Attempt (${s}, ${t}):`, err?.text || err?.message || err);
        }
      }
    }

    return {
      success: sent,
      email: email,
      error: sent ? null : (lastErr?.text || lastErr?.message || "Service ID or Template ID not configured")
    };
  },

  async sendWelcome(user) {
    return this.sendLoginNotification(user);
  }
};

window.CampusEmailService = CampusEmailService;
window.sendWelcomeEmail = function(user) {
  return CampusEmailService.sendLoginNotification(user);
};

window.PythonAPI = PythonAPI;

// ── Trigger remote sync NOW that PythonAPI is available ──
// This fixes the race condition where storage.js ran init() before api.js loaded,
// permanently locking out cloud sync and leaving localStorage empty on new devices.
(function triggerBackendSync() {
  const S = window.Storage || window.CampusStorage || window.COS_Storage;
  if (S && S.syncWithBackend) {
    S.syncWithBackend().catch(function(e) {
      console.warn('[API] Storage syncWithBackend note:', e);
    });
  }
})();
