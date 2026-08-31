// ============================================
// College OS — Shared App Utilities
// ============================================
var Storage = window.CampusStorage || window.Storage;

// ---- ID Generator ----
function genId() {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
}
window.genId = genId;

// ---- Auth Guard ----
function requireAuth() {
  let user = Storage.getUser();
  if (!user) {
    const accs = Storage.getAccounts();
    if (accs && accs.length > 0) {
      user = accs[0];
      Storage.setUser(user);
      return user;
    }
    const path = window.location.pathname;
    if (!path.includes('auth.html') && !path.includes('index.html')) {
      user = {
        displayName: 'Student',
        name: 'Student',
        username: '@student',
        handle: '@student',
        department: 'Computer Science & Engineering',
        semester: 5,
        college: "Campus OS Academic Network"
      };
      Storage.setUser(user);
      Storage.addAccount(user);
      return user;
    }
    return null;
  }
  return user;
}

function redirectIfAuth() {
  const user = Storage.getUser();
  if (user) window.location.href = 'dashboard.html';
}

// ---- Toast System ----
function showToast(title, msg = '', type = 'info') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = document.getElementById('toast-container') || (() => {
    const el = document.createElement('div');
    el.id = 'toast-container';
    document.body.appendChild(el);
    return el;
  })();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
    </div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ---- Modal Helpers ----
function openModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    const first = overlay.querySelector('input, textarea, select');
    if (first) setTimeout(() => first.focus(), 100);
  }
}
function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}
function closeModalOnOverlay(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(id); });
}

// ---- Date Utilities ----
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatRelative(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(new Date(ts).toISOString().split('T')[0]);
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / 86400000);
}
function getTodayName() {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Good Night';
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Good Night';
}

// ---- Scroll Reveal ----
function initScrollReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); obs.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.scroll-reveal').forEach(el => obs.observe(el));
}

// ---- Mobile Sidebar ----
function initMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const menuBtn = document.querySelector('.mobile-menu-btn');
  if (!sidebar) return;
  menuBtn?.addEventListener('click', () => { sidebar.classList.add('open'); overlay?.classList.add('open'); });
  overlay?.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); });
}

// ---- Dropdown ----
function initDropdowns() {
  document.querySelectorAll('[data-dropdown]').forEach(trigger => {
    const menuId = trigger.dataset.dropdown;
    const menu = document.getElementById(menuId);
    if (!menu) return;
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = menu.classList.contains('open');
      document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
      if (!isOpen) menu.classList.add('open');
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
  });
}

// ---- Ripple Effect ----
function addRipple(el) {
  el.classList.add('ripple-container');
  el.addEventListener('click', function (e) {
    const ripple = document.createElement('div');
    ripple.className = 'ripple-effect';
    const rect = this.getBoundingClientRect();
    ripple.style.left = (e.clientX - rect.left - 20) + 'px';
    ripple.style.top = (e.clientY - rect.top - 20) + 'px';
    this.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  });
}

// ---- Render User Avatar ----
function renderUserAvatar(user, size = 'md') {
  if (user?.photo) {
    const safeName = esc(user.name || user.displayName || 'Avatar');
    const safeInitials = esc(((user?.name || user?.displayName || 'U').split(' ').map(w => w[0]).join('').substr(0, 2)).toUpperCase());
    return `<div class="avatar avatar-${size}"><img src="${user.photo}" alt="${safeName}" onerror="this.parentElement.innerHTML='${safeInitials}'" /></div>`;
  }
  const initials = ((user?.name || user?.displayName || 'U').split(' ').map(w => w[0]).join('').substr(0, 2)).toUpperCase();
  return `<div class="avatar avatar-${size}">${initials}</div>`;
}

// ---- Load sidebar & mark active ----
function markSidebarActive(page) {
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
}

// ---- Priority badge ----
function priorityBadge(p) {
  const map = { high: 'danger', medium: 'warning', low: 'success' };
  return `<span class="badge badge-${map[p] || 'muted'}">${p}</span>`;
}

// ---- Status badge ----
function statusBadge(s) {
  const map = { 'todo': 'muted', 'in-progress': 'info', 'done': 'success' };
  const label = { 'todo': 'To Do', 'in-progress': 'In Progress', 'done': 'Done' };
  return `<span class="badge badge-${map[s] || 'muted'}">${label[s] || s}</span>`;
}

// ---- Escape HTML ----
function esc(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ---- Progress % ----
function pct(present, total) {
  if (!total) return 0;
  return Math.round((present / total) * 100);
}

// ---- Attendance color ----
function attColor(percent) {
  if (percent >= 75) return '#10b981';
  if (percent >= 60) return '#f59e0b';
  return '#ef4444';
}

// ---- Animated Counter ----
function animateCount(el, target, duration = 800) {
  let start = 0;
  const step = timestamp => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    el.textContent = Math.floor(progress * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}

// ---- Init on DOMContentLoaded ----
document.addEventListener('DOMContentLoaded', () => {
  initScrollReveal();
  initMobileSidebar();
  initDropdowns();

  // Close all modals on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      document.body.style.overflow = '';
    }
  });
});
