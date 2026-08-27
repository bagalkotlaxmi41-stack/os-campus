// ============================================
// Campus OS — Python REST API & Realtime Client
// Connects Frontend to SQLite Realtime Database Engine
// ============================================

// Dynamic Environment-Aware API Base URL
const getPythonApiBaseUrl = () => {
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
  /**
   * Health Check
   */
  async checkHealth() {
    try {
      const res = await fetch(`${PYTHON_API_BASE_URL}/health`);
      if (!res.ok) return false;
      const data = await res.json();
      return data.status === 'online';
    } catch {
      return false;
    }
  },

  // ============================================================
  // ACCOUNTS & STUDENT DIRECTORY (Like Instagram / FB)
  // ============================================================
  async getAccounts() {
    try {
      const res = await fetch(`${PYTHON_API_BASE_URL}/api/accounts`);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.warn('API getAccounts fallback to local:', err);
      return null;
    }
  },

  async searchAccounts(query) {
    try {
      const res = await fetch(`${PYTHON_API_BASE_URL}/api/accounts/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.warn('API searchAccounts fallback to local:', err);
      return null;
    }
  },

  async getAccount(handle) {
    try {
      const clean = handle.startsWith('@') ? handle : '@' + handle;
      const res = await fetch(`${PYTHON_API_BASE_URL}/api/accounts/${encodeURIComponent(clean)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('API getAccount fallback to local:', err);
      return null;
    }
  },

  async saveAccount(account) {
    try {
      const handle = (account.username || account.handle || '').startsWith('@') ? (account.username || account.handle) : '@' + (account.username || account.handle);
      const res = await fetch(`${PYTHON_API_BASE_URL}/api/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: handle,
          displayName: account.displayName || account.name || 'Student',
          email: account.email || null,
          department: account.department || 'Computer Science & Engineering',
          semester: Number(account.semester) || 5,
          usn: account.usn || null,
          bio: account.bio || '',
          skills: account.skills || [],
          photo: account.photo || null,
          role: account.role || 'STUDENT',
          xp: Number(account.xp) || 150
        })
      });
      if (!res.ok) throw new Error('Failed to save account to backend');
      const data = await res.json();
      return data.account;
    } catch (err) {
      console.warn('API saveAccount fallback:', err);
      return account;
    }
  },

  async updateAccountPhoto(handle, photoBase64) {
    try {
      const clean = handle.startsWith('@') ? handle : '@' + handle;
      const res = await fetch(`${PYTHON_API_BASE_URL}/api/accounts/${encodeURIComponent(clean)}/photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo: photoBase64 })
      });
      return res.ok;
    } catch (err) {
      console.warn('API updatePhoto fallback:', err);
      return false;
    }
  },

  // ============================================================
  // POSTS FEED & SOCIAL INTERACTIONS
  // ============================================================
  async getPosts(filter = {}) {
    try {
      let url = `${PYTHON_API_BASE_URL}/api/posts?`;
      if (filter.handle) url += `handle=${encodeURIComponent(filter.handle)}&`;
      if (filter.type) url += `type=${encodeURIComponent(filter.type)}&`;
      if (filter.q) url += `q=${encodeURIComponent(filter.q)}&`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('API getPosts fallback to local:', err);
      return null;
    }
  },

  async createPost(postData) {
    try {
      const res = await fetch(`${PYTHON_API_BASE_URL}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });
      if (!res.ok) throw new Error('Failed to create post on backend');
      const data = await res.json();
      return data.post;
    } catch (err) {
      console.warn('API createPost fallback:', err);
      return postData;
    }
  },

  async deletePost(postId) {
    try {
      const res = await fetch(`${PYTHON_API_BASE_URL}/api/posts/${encodeURIComponent(postId)}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (err) {
      console.warn('API deletePost fallback:', err);
      return false;
    }
  },

  async toggleLike(postId, userHandle) {
    try {
      const res = await fetch(`${PYTHON_API_BASE_URL}/api/posts/${encodeURIComponent(postId)}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: userHandle || '@student' })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('API toggleLike fallback:', err);
      return null;
    }
  },

  async addComment(postId, author, handle, text) {
    try {
      const res = await fetch(`${PYTHON_API_BASE_URL}/api/posts/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, handle, text })
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.comment;
    } catch (err) {
      console.warn('API addComment fallback:', err);
      return null;
    }
  },

  async getLiveStats() {
    try {
      const res = await fetch(`${PYTHON_API_BASE_URL}/api/stats/live`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  // ============================================================
  // ACADEMIC VAULT (Notes, Tasks, Attendance, Prediction)
  // ============================================================
  async getNotes(handle) {
    try {
      const url = handle ? `${PYTHON_API_BASE_URL}/api/notes?handle=${encodeURIComponent(handle)}` : `${PYTHON_API_BASE_URL}/api/notes`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },

  async saveNote(note) {
    try {
      const res = await fetch(`${PYTHON_API_BASE_URL}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note)
      });
      return res.ok;
    } catch { return false; }
  },

  async deleteNote(id) {
    try {
      const res = await fetch(`${PYTHON_API_BASE_URL}/api/notes/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return res.ok;
    } catch { return false; }
  },

  async getTasks(handle) {
    try {
      const url = handle ? `${PYTHON_API_BASE_URL}/api/tasks?handle=${encodeURIComponent(handle)}` : `${PYTHON_API_BASE_URL}/api/tasks`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },

  async saveTask(task) {
    try {
      const res = await fetch(`${PYTHON_API_BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      return res.ok;
    } catch { return false; }
  },

  async deleteTask(id) {
    try {
      const res = await fetch(`${PYTHON_API_BASE_URL}/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return res.ok;
    } catch { return false; }
  },

  async getAttendance(handle) {
    try {
      const url = handle ? `${PYTHON_API_BASE_URL}/api/attendance?handle=${encodeURIComponent(handle)}` : `${PYTHON_API_BASE_URL}/api/attendance`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },

  async saveAttendance(att) {
    try {
      const res = await fetch(`${PYTHON_API_BASE_URL}/api/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(att)
      });
      return res.ok;
    } catch { return false; }
  },

  // ============================================================
  // AI TOOLS
  // ============================================================
  async summarizeNote(title, content, subject = 'General') {
    try {
      const res = await fetch(`${PYTHON_API_BASE_URL}/api/ai/summarize-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, subject })
      });
      if (!res.ok) throw new Error('Summarization failed');
      return await res.json();
    } catch (err) {
      const lines = content.split('\n').filter(l => l.trim().length > 0);
      return {
        title, subject,
        key_points: lines.slice(0, 3),
        suggested_tags: ['notes', subject.toLowerCase()],
        estimated_read_time_mins: Math.max(1, Math.ceil(content.split(' ').length / 200)),
        summary_text: content.substring(0, 150) + '...'
      };
    }
  },

  async predictAttendance(subject, present, total, targetPercentage = 75) {
    try {
      const res = await fetch(`${PYTHON_API_BASE_URL}/api/attendance/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          present: Number(present),
          total: Number(total),
          target_percentage: Number(targetPercentage)
        })
      });
      if (!res.ok) throw new Error('Prediction failed');
      return await res.json();
    } catch (err) {
      const currentPct = total ? Math.round((present / total) * 100) : 0;
      let skippable = 0;
      let required = 0;
      if (currentPct >= targetPercentage) {
        skippable = Math.max(0, Math.floor((100 * present - targetPercentage * total) / targetPercentage));
      } else {
        required = Math.max(0, Math.ceil((targetPercentage * total - 100 * present) / (100 - targetPercentage)));
      }
      return {
        subject, present, total,
        current_percentage: currentPct,
        target_percentage: targetPercentage,
        status: currentPct >= targetPercentage ? 'SAFE' : 'WARNING',
        skippable_classes: skippable,
        required_classes: required,
        recommendation: currentPct >= targetPercentage
          ? `Safe zone! You can miss up to ${skippable} class(es).`
          : `Alert! You need to attend next ${required} class(es) to hit ${targetPercentage}%.`
      };
    }
  }
};

window.PythonAPI = PythonAPI;
