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
      college: "Campus OS Academic Network",
      department: 'Computer Science & Engineering',
      program: 'BCA',
      semester: 5,
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
  loginForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;
    const btn = loginForm.querySelector('.btn-primary');

    if (!email || !pass) { 
      showToast('Missing fields', 'Please enter your email/handle and password', 'error'); 
      return; 
    }

    setLoading(btn, true);

    try {
      let user = null;
      // 1. Try Backend API Auth
      if (window.PythonAPI && PythonAPI.login) {
        try {
          user = await PythonAPI.login(email, pass);
        } catch (apiErr) {
          console.warn('Backend login attempt note:', apiErr);
          // If backend returned explicit 401 or 404, capture message
          if (apiErr.message && (apiErr.message.includes('password') || apiErr.message.includes('not found'))) {
            setLoading(btn, false);
            showToast('Authentication Error', apiErr.message, 'error');
            return;
          }
        }
      }

      // 2. Fallback to Local Directory Auth
      if (!user) {
        user = Storage.authenticate(email, pass);
      }

      if (user) {
        Storage.setUser(user);
        showToast('Welcome back!', `Good to see you, ${(user.displayName || user.name || 'Student').split(' ')[0]} 👋`, 'success');
        setTimeout(() => window.location.href = 'profile.html', 500);
      } else {
        setLoading(btn, false);
        showToast('Invalid Credentials', 'Incorrect password or email. Please check and try again.', 'error');
      }
    } catch (err) {
      setLoading(btn, false);
      showToast('Login Failed', err.message || 'Unable to sign in. Please try again.', 'error');
    }
  });

  // Signup
  signupForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const pass = document.getElementById('signup-password').value;
    const college = document.getElementById('signup-college')?.value.trim();
    const branch = document.getElementById('signup-branch')?.value.trim();
    const semester = document.getElementById('signup-semester')?.value;
    const btn = signupForm.querySelector('.btn-primary');

    if (!name || !email || !pass) { 
      showToast('Missing fields', 'Full name, email, and password are required', 'error'); 
      return; 
    }
    if (pass.length < 6) { 
      showToast('Weak password', 'Password must be at least 6 characters', 'warning'); 
      return; 
    }

    // Check if account already exists
    const existingAcc = Storage.getAccounts().find(a => (a.email || '').toLowerCase() === email.toLowerCase());
    if (existingAcc) {
      if (existingAcc.password === pass || !existingAcc.password) {
        Storage.setUser(existingAcc);
        showToast('Welcome back!', `Account exists — logged in automatically as ${(existingAcc.displayName || existingAcc.name || 'Student').split(' ')[0]} 👋`, 'success');
        setTimeout(() => window.location.href = 'profile.html', 500);
        return;
      } else {
        showToast('Account Exists', 'An account with this email already exists. Please sign in with your password.', 'warning');
        switchTab('login');
        const loginEmailInput = document.getElementById('login-email');
        if (loginEmailInput) loginEmailInput.value = email;
        return;
      }
    }

    setLoading(btn, true);

    const rawHandle = name.toLowerCase().replace(/[^a-z0-9_]/g, '') || ('student_' + Date.now().toString(36));
    const handle = '@' + rawHandle;

    const user = {
      uid: 'user_' + Date.now().toString(36),
      displayName: name,
      name: name,
      username: handle,
      handle: handle,
      email: email,
      password: pass,
      college: college || "Campus OS Academic Network",
      department: branch || 'Computer Science & Engineering',
      program: 'BCA',
      semester: parseInt(semester, 10) || 5,
      bio: `Student at Campus OS studying ${branch || 'Computer Science'}.`,
      skills: ['Academic Learner'],
      role: 'STUDENT',
      status: 'ACTIVE',
      joinedAt: Date.now()
    };

    try {
      if (window.PythonAPI && PythonAPI.register) {
        await PythonAPI.register(user).catch(e => console.warn('Backend register note:', e));
      }
      Storage.setUser(user);
      Storage.addAccount(user);
      if (window.FirebaseService && FirebaseService.createAccount) {
        FirebaseService.createAccount(user).catch(() => {});
      }
      showToast('Account created!', `Welcome to Campus OS, ${name.split(' ')[0]}! 🎉`, 'success');
      setTimeout(() => window.location.href = 'profile.html', 600);
    } catch (err) {
      setLoading(btn, false);
      showToast('Registration Error', err.message || 'Failed to create account.', 'error');
    }
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
