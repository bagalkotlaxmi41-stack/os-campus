/**
 * Campus OS - Real-Time Student Notifications Engine
 * Author: Antigravity IDE
 * Description: Live real-time notification drawer, SVG bell badge, dynamic post sync & instant alerts.
 */

const NotificationsManager = {
  activeTab: 'all',
  lastSeenPostId: null,
  pollTimer: null,

  getReadIds() {
    try {
      return JSON.parse(localStorage.getItem('cos_read_notifs') || '[]');
    } catch {
      return [];
    }
  },

  setReadIds(ids) {
    try {
      localStorage.setItem('cos_read_notifs', JSON.stringify(ids));
    } catch (e) {
      console.warn('Storage error:', e);
    }
  },

  isRead(id) {
    const ids = this.getReadIds();
    return ids.includes(id);
  },

  markAsRead(id) {
    const ids = this.getReadIds();
    if (!ids.includes(id)) {
      ids.push(id);
      this.setReadIds(ids);
    }
    this.render();
  },

  markAllAsRead(e) {
    if (e) e.stopPropagation();
    const notifs = this.getAllNotifications();
    const ids = notifs.map(n => n.id);
    this.setReadIds(ids);
    this.render();
    this.showToast('✅ All notifications marked as read');
  },

  getAllNotifications() {
    const posts = window.Storage && Storage.getPosts ? Storage.getPosts() : [];
    const circulars = [
      {
        id: 'circ_exam_odd_2026',
        type: 'circular',
        title: 'Odd Semester Exam Form Submission',
        desc: 'University Regular & Backlog Examination fees submission portal is live.',
        author: 'Exam Cell',
        handle: '@admin_exam',
        time: '2h ago',
        timestamp: Date.now() - 2 * 3600 * 1000,
        url: 'index.html#campusNoticesGrid',
        icon: '🏛️'
      },
      {
        id: 'circ_ssp_kyc_2026',
        type: 'circular',
        title: 'SSP State Scholarship e-KYC Verification',
        desc: 'Room 104 e-Attestation desk open for SC/ST/OBC/Minority applications.',
        author: 'Student Welfare',
        handle: '@student_welfare',
        time: '5h ago',
        timestamp: Date.now() - 5 * 3600 * 1000,
        url: 'index.html#campusNoticesGrid',
        icon: '💰'
      },
      {
        id: 'circ_placement_tcs_2026',
        type: 'circular',
        title: 'TCS & Infosys Campus Placement Drive',
        desc: 'Eligibility criteria & pre-placement orientation registered in Auditorium 2.',
        author: 'Training & Placement',
        handle: '@placement_cell',
        time: '1d ago',
        timestamp: Date.now() - 24 * 3600 * 1000,
        url: 'index.html#campusNoticesGrid',
        icon: '💼'
      }
    ];

    const postNotifs = posts.map(p => {
      const authorName = p.author || p.displayName || p.name || 'Student';
      const rawHandle = p.handle || p.username || '@student';
      const handle = rawHandle.startsWith('@') ? rawHandle : '@' + rawHandle;
      const typeLabel = p.pdfData || p.type === 'pdf' ? '📄 PDF Study Note' :
                        p.videoUrl || p.type === 'video' ? '🎥 Lecture Video' : '📝 Study Note';

      return {
        id: p.id,
        type: 'post',
        title: p.title || 'New Study Resource Shared',
        desc: p.desc || `Shared ${typeLabel} for ${p.subject || 'Semester Classes'}`,
        author: authorName,
        handle: handle,
        photo: p.authorPhoto || (window.Storage ? Storage.getUserPhoto(handle) : null),
        postType: typeLabel,
        timestamp: p.createdAt || Date.now(),
        time: this.formatTimeAgo(p.createdAt || Date.now()),
        url: `profile.html?handle=${encodeURIComponent(handle)}`
      };
    });

    const all = [...postNotifs, ...circulars];
    all.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return all;
  },

  formatTimeAgo(ts) {
    if (!ts) return 'Just now';
    const diff = Math.floor((Date.now() - Number(ts)) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  },

  render() {
    const listContainer = document.getElementById('notificationListContainer');
    const badge = document.getElementById('notificationBadgeDot');
    const unreadCountText = document.getElementById('notifUnreadCountText');
    const bellBtn = document.getElementById('navNotificationBtn');

    const allNotifs = this.getAllNotifications();
    const readIds = this.getReadIds();
    const unreadNotifs = allNotifs.filter(n => !readIds.includes(n.id));
    const unreadCount = unreadNotifs.length;

    // Update Badge
    if (badge) {
      if (unreadCount > 0) {
        badge.style.display = 'flex';
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      } else {
        badge.style.display = 'none';
      }
    }

    if (unreadCountText) {
      unreadCountText.textContent = unreadCount === 0 ? 'All caught up' : `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}`;
    }

    if (!listContainer) return;

    // Filter by tab
    let filtered = allNotifs;
    if (this.activeTab === 'posts') {
      filtered = allNotifs.filter(n => n.type === 'post');
    } else if (this.activeTab === 'circulars') {
      filtered = allNotifs.filter(n => n.type === 'circular');
    }

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding:36px 20px; color:#64748b;">
          <div style="font-size:32px; margin-bottom:10px; opacity:0.6;">🔔</div>
          <div style="font-size:14px; font-weight:700; color:#cbd5e1; margin-bottom:4px;">No notifications here</div>
          <div style="font-size:12px;">When peers share notes, PDFs, or circulars, they'll show up live right here!</div>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(item => {
      const isUnread = !readIds.includes(item.id);
      const isPost = item.type === 'post';
      
      let avatarHtml;
      if (item.photo) {
        avatarHtml = `<img src="${item.photo}" alt="${this.escapeHtml(item.author)}" style="width:100%;height:100%;object-fit:cover;" />`;
      } else if (isPost) {
        avatarHtml = item.author ? item.author[0].toUpperCase() : 'S';
      } else {
        avatarHtml = item.icon || '📢';
      }

      const badgeTag = item.postType ? `<span style="display:inline-block; font-size:10px; font-weight:700; padding:2px 8px; border-radius:12px; background:rgba(124,58,237,0.2); color:#c4b5fd; border:1px solid rgba(139,92,246,0.3); margin-top:4px;">${this.escapeHtml(item.postType)}</span>` : '';

      return `
        <div class="notif-item ${isUnread ? 'unread' : ''}" onclick="NotificationsManager.handleItemClick('${item.id}', '${item.url}')">
          <div class="notif-avatar-col">
            <div class="notif-avatar-circle ${!isPost ? 'circular-icon' : ''}">
              ${avatarHtml}
            </div>
            ${isUnread ? '<div class="notif-unread-dot" title="Unread"></div>' : ''}
          </div>

          <div class="notif-body-col">
            <div class="notif-author-row">
              <span class="notif-author-name">${this.escapeHtml(item.author)}</span>
              <span class="notif-handle">${this.escapeHtml(item.handle)}</span>
              <span class="notif-time-badge">${this.escapeHtml(item.time)}</span>
            </div>
            <div class="notif-item-title">${this.escapeHtml(item.title)}</div>
            <div class="notif-item-desc">${this.escapeHtml(item.desc)}</div>
            ${badgeTag}
          </div>
        </div>
      `;
    }).join('');
  },

  handleItemClick(id, url) {
    this.markAsRead(id);
    this.closeDropdown();
    if (url) {
      window.location.href = url;
    }
  },

  switchTab(tab, btn) {
    this.activeTab = tab;
    document.querySelectorAll('.notif-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this.render();
  },

  toggleDropdown(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) return;

    const isOpen = dropdown.classList.contains('open');
    if (isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  },

  openDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) return;
    dropdown.classList.add('open');

    // Auto-mark all current notifications as read upon seeing them
    const notifs = this.getAllNotifications();
    const ids = notifs.map(n => n.id);
    this.setReadIds(ids);
    try {
      localStorage.setItem('cos_last_seen_notif_time', String(Date.now()));
    } catch(e) {}

    // Re-render so badge immediately drops to 0 and items show normal state
    this.render();

    // Attach document listener
    setTimeout(() => {
      document.addEventListener('click', this._outsideClickListener);
    }, 10);
  },

  closeDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) dropdown.classList.remove('open');
    document.removeEventListener('click', this._outsideClickListener);
    this.render();
  },

  _outsideClickListener(e) {
    const wrapper = document.getElementById('navNotificationWrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      NotificationsManager.closeDropdown();
    }
  },

  triggerBellAnimation() {
    const bellBtn = document.getElementById('navNotificationBtn');
    if (!bellBtn) return;
    const svg = bellBtn.querySelector('.bell-icon-svg');
    if (svg) {
      svg.classList.remove('bell-ring-active');
      void svg.offsetWidth; // Trigger reflow
      svg.classList.add('bell-ring-active');
    }
  },

  showToast(message, avatar) {
    let toast = document.getElementById('campusNotificationToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'campusNotificationToast';
      toast.className = 'campus-live-notif-toast';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <div style="font-size:20px;">🔔</div>
        <div>
          <div style="font-size:12px; font-weight:800; color:#fff;">Live Campus Update</div>
          <div style="font-size:11px; color:#cbd5e1;">${this.escapeHtml(message)}</div>
        </div>
      </div>
    `;

    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4500);
  },

  async pollRemotePosts() {
    if (!window.PythonAPI || !PythonAPI.getPosts) return;
    try {
      const posts = await PythonAPI.getPosts();
      if (posts && Array.isArray(posts) && posts.length > 0) {
        const latestPost = posts[0];
        if (this.lastSeenPostId && latestPost.id !== this.lastSeenPostId) {
          // New post detected!
          if (window.Storage) Storage.setPosts(posts);
          this.triggerBellAnimation();
          this.showToast(`${latestPost.author || 'A student'} posted: "${latestPost.title}"`);
        }
        this.lastSeenPostId = latestPost.id;
        if (window.Storage) Storage.setPosts(posts);
        this.render();
      }
    } catch (e) {
      // Quiet poll
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  },

  init() {
    this._outsideClickListener = this._outsideClickListener.bind(this);
    this.render();

    // Track latest post ID
    const posts = window.Storage && Storage.getPosts ? Storage.getPosts() : [];
    if (posts.length > 0) {
      this.lastSeenPostId = posts[0].id;
    }

    // Start Realtime Polling (Every 6 seconds)
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => {
      this.pollRemotePosts();
    }, 6000);
  }
};

// Global shorthand for inline onclicks
function toggleNotificationDropdown(e) {
  NotificationsManager.toggleDropdown(e);
}
function markAllNotificationsRead(e) {
  NotificationsManager.markAllAsRead(e);
}
function switchNotifTab(tab, btn) {
  NotificationsManager.switchTab(tab, btn);
}

document.addEventListener('DOMContentLoaded', () => {
  NotificationsManager.init();
});
