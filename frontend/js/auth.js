// ============================================
// College OS — Auth Logic
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  redirectIfAuth();

  const loginTab = document.getElementById('login-tab');
  const signupTab = document.getElementById('signup-tab');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const tabIndicator = document.getElementById('tab-indicator');

  // Tab toggle
  function switchTab(tab) {
    if (tab === 'login') {
      loginTab.classList.add('active');
      signupTab.classList.remove('active');
      loginForm.classList.remove('hidden');
      signupForm.classList.add('hidden');
      tabIndicator.style.transform = 'translateX(0)';
    } else {
      signupTab.classList.add('active');
      loginTab.classList.remove('active');
      signupForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
      tabIndicator.style.transform = 'translateX(100%)';
    }
  }

  loginTab?.addEventListener('click', () => switchTab('login'));
  signupTab?.addEventListener('click', () => switchTab('signup'));

  // Switch from login link
  document.getElementById('go-to-signup')?.addEventListener('click', e => { e.preventDefault(); switchTab('signup'); });
  document.getElementById('go-to-login')?.addEventListener('click', e => { e.preventDefault(); switchTab('login'); });

  // Demo login
  document.getElementById('demo-btn')?.addEventListener('click', () => {
    const demoUser = {
      name: 'Alex Student',
      email: 'demo@collegeos.app',
      college: 'IIT Demo',
      branch: 'Computer Science',
      semester: '5',
      avatar: '',
      joinedAt: Date.now(),
    };
    Storage.setUser(demoUser);
    showToast('Welcome!', 'Logged in as demo user 🎉', 'success');
    setTimeout(() => window.location.href = 'dashboard.html', 600);
  });

  // Login
  loginForm?.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;
    const btn = loginForm.querySelector('.btn-primary');

    if (!email || !pass) { showToast('Missing fields', 'Please fill in all fields', 'error'); return; }

    // Check stored user
    const user = Storage.getUser();
    if (user && user.email === email) {
      setLoading(btn, true);
      setTimeout(() => {
        showToast('Welcome back!', `Good to see you, ${user.name.split(' ')[0]} 👋`, 'success');
        setTimeout(() => window.location.href = 'dashboard.html', 500);
      }, 800);
    } else {
      showToast('Account not found', 'Please sign up first or use Demo mode', 'error');
    }
  });

  // Signup
  signupForm?.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const pass = document.getElementById('signup-password').value;
    const college = document.getElementById('signup-college').value.trim();
    const branch = document.getElementById('signup-branch').value.trim();
    const semester = document.getElementById('signup-semester').value;
    const btn = signupForm.querySelector('.btn-primary');

    if (!name || !email || !pass) { showToast('Missing fields', 'Name, email, and password are required', 'error'); return; }
    if (pass.length < 6) { showToast('Weak password', 'Password must be at least 6 characters', 'warning'); return; }

    setLoading(btn, true);
    setTimeout(() => {
      const user = { name, email, college, branch, semester, avatar: '', joinedAt: Date.now() };
      Storage.setUser(user);
      showToast('Account created!', `Welcome to College OS, ${name.split(' ')[0]}! 🎉`, 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 600);
    }, 1000);
  });

  // Password toggle
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', function () {
      const input = document.getElementById(this.dataset.target);
      const isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      this.textContent = isPass ? '🙈' : '👁️';
    });
  });
});

function setLoading(btn, loading) {
  btn.disabled = loading;
  if (loading) {
    btn._origText = btn.innerHTML;
    btn.innerHTML = '<div class="loading-spinner"></div>';
  } else if (btn._origText) {
    btn.innerHTML = btn._origText;
  }
}
