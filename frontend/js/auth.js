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
    const demoHandle = '@alex_cs';
    const demoUser = {
      uid: 'user_demo',
      displayName: 'Alex Student',
      name: 'Alex Student',
      username: demoHandle,
      handle: demoHandle,
      email: 'demo@collegeos.app',
      college: "BLDE Association's Campus, Jamakhandi",
      department: 'Computer Science & Engineering',
      program: 'BCA',
      semester: 5,
      xp: 150,
      bio: 'Student at Campus OS exploring software engineering and AI.',
      skills: ['Python', 'Web Dev', 'Data Structures'],
      role: 'STUDENT',
      status: 'ACTIVE',
      joinedAt: Date.now()
    };
    Storage.setUser(demoUser);
    Storage.addAccount(demoUser);
    if (window.PythonAPI && PythonAPI.saveAccount) PythonAPI.saveAccount(demoUser).catch(() => {});
    if (window.FirebaseService && FirebaseService.createAccount) FirebaseService.createAccount(demoUser).catch(() => {});
    showToast('Welcome!', 'Logged in as demo user 🎉', 'success');
    setTimeout(() => window.location.href = 'profile.html', 600);
  });

  // Login
  loginForm?.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;
    const btn = loginForm.querySelector('.btn-primary');

    if (!email || !pass) { showToast('Missing fields', 'Please fill in all fields', 'error'); return; }

    // Check stored user or accounts directory
    const allAccs = Storage.getAccounts();
    const matchedAcc = allAccs.find(a => 
      (a.email && a.email.toLowerCase() === email.toLowerCase()) || 
      (a.handle && a.handle.toLowerCase() === email.toLowerCase()) || 
      (a.username && a.username.toLowerCase() === email.toLowerCase())
    );
    const user = matchedAcc || Storage.getUser();

    if (user && (user.email === email || (user.handle && user.handle.toLowerCase() === email.toLowerCase()) || (user.username && user.username.toLowerCase() === email.toLowerCase()) || (user.name && user.name.toLowerCase() === email.toLowerCase()))) {
      Storage.setUser(user);
      setLoading(btn, true);
      setTimeout(() => {
        showToast('Welcome back!', `Good to see you, ${(user.displayName || user.name || 'Student').split(' ')[0]} 👋`, 'success');
        setTimeout(() => window.location.href = 'profile.html', 500);
      }, 600);
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

    // Enforce Strict One Email One Account
    if (Storage.isEmailTaken(email)) {
      showToast('Email in use', 'An account with this email is already registered. Please sign in.', 'error');
      return;
    }

    const rawHandle = name.toLowerCase().replace(/[^a-z0-9_]/g, '') || ('student_' + Date.now().toString(36));
    const handle = '@' + rawHandle;

    const user = {
      uid: 'user_' + Date.now().toString(36),
      displayName: name,
      name: name,
      username: handle,
      handle: handle,
      email: email,
      college: college || "BLDE Association's Campus, Jamakhandi",
      department: branch || 'Computer Science & Engineering',
      program: 'BCA',
      semester: parseInt(semester, 10) || 5,
      xp: 150,
      bio: `Student at Campus OS studying ${branch || 'Computer Science'}.`,
      skills: ['Academic Learner'],
      role: 'STUDENT',
      status: 'ACTIVE',
      joinedAt: Date.now()
    };

    setLoading(btn, true);
    setTimeout(() => {
      Storage.setUser(user);
      Storage.addAccount(user);
      if (window.PythonAPI && PythonAPI.saveAccount) PythonAPI.saveAccount(user).catch(() => {});
      if (window.FirebaseService && FirebaseService.createAccount) FirebaseService.createAccount(user).catch(() => {});
      showToast('Account created!', `Welcome to Campus OS, ${name.split(' ')[0]}! 🎉`, 'success');
      setTimeout(() => window.location.href = 'profile.html', 600);
    }, 800);
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
