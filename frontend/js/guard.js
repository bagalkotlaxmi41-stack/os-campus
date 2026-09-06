/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║       Campus OS — Universal Authentication Guard v2.0           ║
 * ║  Blocks unauthenticated access to protected pages with a        ║
 * ║  stunning full-screen gate. Includes smooth animation,          ║
 * ║  logo branding, and redirect-after-login logic.                 ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

(function CampusAuthGuard() {
  'use strict';

  // ─── CONFIG ───────────────────────────────────────────────────────
  const STORAGE_KEY  = 'cos_user';
  const REDIRECT_KEY = 'cos_auth_redirect';
  const AUTH_PAGE    = 'auth.html';

  // ─── CHECK SESSION ────────────────────────────────────────────────
  function getUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  const user = getUser();
  if (user && (user.username || user.handle || user.email)) {
    // Logged in — allow access immediately
    return;
  }

  // ─── SAVE REDIRECT ───────────────────────────────────────────────
  try {
    sessionStorage.setItem(REDIRECT_KEY, window.location.href);
  } catch (e) {}

  // Prevent body scroll while gate is showing
  document.documentElement.style.overflow = 'hidden';

  // ─── BUILD GATE HTML ─────────────────────────────────────────────
  const gate = document.createElement('div');
  gate.id = 'campusAuthGate';
  gate.setAttribute('role', 'dialog');
  gate.setAttribute('aria-label', 'Campus OS Access Gate');

  gate.innerHTML = `
<style>
#campusAuthGate {
  position: fixed; inset: 0; z-index: 999999;
  display: flex; align-items: center; justify-content: center; padding: 20px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  background: #06050e;
  opacity: 0; transition: opacity 0.4s ease;
}
#campusAuthGate.gate-visible { opacity: 1; }

.gate-orb {
  position: absolute; border-radius: 50%;
  filter: blur(80px); pointer-events: none;
  animation: gateOrb 8s ease-in-out infinite alternate;
}
.gate-orb-1 {
  width:500px;height:500px;
  background:radial-gradient(circle,rgba(124,58,237,0.35) 0%,transparent 70%);
  top:-120px;left:-80px;animation-delay:0s;
}
.gate-orb-2 {
  width:400px;height:400px;
  background:radial-gradient(circle,rgba(6,182,212,0.25) 0%,transparent 70%);
  bottom:-100px;right:-60px;animation-delay:-4s;
}
.gate-orb-3 {
  width:300px;height:300px;
  background:radial-gradient(circle,rgba(139,92,246,0.2) 0%,transparent 70%);
  top:50%;left:50%;transform:translate(-50%,-50%);animation-delay:-2s;
}
@keyframes gateOrb {
  0%{transform:translateY(0) scale(1);}
  100%{transform:translateY(-30px) scale(1.1);}
}
.gate-grid {
  position:absolute;inset:0;pointer-events:none;
  background-image:
    linear-gradient(rgba(139,92,246,0.04) 1px,transparent 1px),
    linear-gradient(90deg,rgba(139,92,246,0.04) 1px,transparent 1px);
  background-size:40px 40px;
}

.gate-card {
  position:relative;z-index:1;
  width:100%;max-width:420px;
  background:rgba(13,11,28,0.85);
  border:1px solid rgba(139,92,246,0.35);
  border-radius:28px;
  padding:44px 36px 40px;
  box-shadow:0 32px 80px rgba(0,0,0,0.7),0 0 60px rgba(124,58,237,0.18),inset 0 1px 0 rgba(255,255,255,0.06);
  backdrop-filter:blur(32px);-webkit-backdrop-filter:blur(32px);
  transform:translateY(28px) scale(0.96);
  transition:transform 0.5s cubic-bezier(0.16,1,0.3,1),opacity 0.45s ease;
  opacity:0;text-align:center;
}
#campusAuthGate.gate-visible .gate-card {
  transform:translateY(0) scale(1);opacity:1;transition-delay:0.08s;
}
.gate-card::before {
  content:'';position:absolute;inset:-1px;border-radius:28px;
  background:linear-gradient(135deg,rgba(139,92,246,0.4),rgba(6,182,212,0.2),rgba(139,92,246,0.4));
  z-index:-1;opacity:0.5;
}

.gate-logo-wrap {
  display:flex;flex-direction:column;align-items:center;margin-bottom:24px;
}
.gate-logo-img {
  width:76px;height:76px;border-radius:20px;object-fit:contain;
  box-shadow:0 0 40px rgba(124,58,237,0.55),0 0 80px rgba(124,58,237,0.18);
  animation:gatePulse 3s ease-in-out infinite;margin-bottom:12px;
}
@keyframes gatePulse {
  0%,100%{box-shadow:0 0 30px rgba(124,58,237,0.5),0 0 60px rgba(124,58,237,0.15);}
  50%{box-shadow:0 0 55px rgba(124,58,237,0.85),0 0 110px rgba(124,58,237,0.28),0 0 20px rgba(34,211,238,0.3);}
}
.gate-brand-name {
  font-size:22px;font-weight:900;letter-spacing:-0.03em;
  background:linear-gradient(135deg,#c084fc,#818cf8,#38bdf8);
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
  line-height:1;
}
.gate-brand-sub {
  font-size:10.5px;font-weight:700;color:rgba(148,163,184,0.65);
  letter-spacing:0.1em;text-transform:uppercase;margin-top:5px;
}

.gate-badge {
  display:inline-flex;align-items:center;gap:6px;
  background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.25);
  border-radius:100px;padding:4px 14px;
  font-size:10.5px;font-weight:800;color:#a78bfa;
  text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px;
}
.gate-badge-dot {
  width:6px;height:6px;border-radius:50%;background:#a78bfa;
  animation:gateDotPulse 1.5s ease-in-out infinite;
}
@keyframes gateDotPulse {
  0%,100%{opacity:1;transform:scale(1);}
  50%{opacity:0.35;transform:scale(0.65);}
}

.gate-headline {
  font-size:26px;font-weight:900;color:#ffffff;
  letter-spacing:-0.03em;line-height:1.18;margin-bottom:10px;
}
.gate-headline span {
  background:linear-gradient(135deg,#a78bfa,#38bdf8);
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
}
.gate-sub {
  font-size:13.5px;color:rgba(148,163,184,0.78);line-height:1.55;margin-bottom:22px;
}

.gate-features {
  display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:24px;
}
.gate-feature-pill {
  display:inline-flex;align-items:center;gap:4px;
  background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);
  border-radius:100px;padding:4px 10px;font-size:11px;font-weight:700;
  color:rgba(203,213,225,0.75);
}

.gate-page-ctx {
  display:inline-block;margin-bottom:22px;padding:5px 12px;
  background:rgba(15,23,42,0.8);border:1px solid rgba(51,65,85,0.5);
  border-radius:8px;font-size:11px;font-weight:700;
  color:rgba(148,163,184,0.6);font-family:'JetBrains Mono',monospace;
}
.gate-page-ctx em { color:#38bdf8; font-style:normal; }

.gate-btn-primary {
  width:100%;padding:14px 20px;border-radius:14px;border:none;cursor:pointer;
  font-family:inherit;font-size:14px;font-weight:800;letter-spacing:-0.01em;
  background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;
  box-shadow:0 8px 24px rgba(124,58,237,0.4);
  transition:all 0.2s ease;margin-bottom:10px;
  display:flex;align-items:center;justify-content:center;gap:8px;
  position:relative;overflow:hidden;
}
.gate-btn-primary::after {
  content:'';position:absolute;top:0;left:-100%;
  width:100%;height:100%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent);
  transition:left 0.5s ease;
}
.gate-btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(124,58,237,0.58);}
.gate-btn-primary:hover::after{left:100%;}
.gate-btn-primary:active{transform:translateY(0);}

.gate-divider {
  display:flex;align-items:center;gap:10px;margin:12px 0;
  color:rgba(100,116,139,0.55);font-size:11px;font-weight:700;
  text-transform:uppercase;letter-spacing:0.08em;
}
.gate-divider::before,.gate-divider::after {
  content:'';flex:1;height:1px;background:rgba(255,255,255,0.05);
}

.gate-btn-secondary {
  width:100%;padding:13px 20px;border-radius:14px;
  border:1px solid rgba(139,92,246,0.28);cursor:pointer;
  font-family:inherit;font-size:14px;font-weight:700;
  background:rgba(139,92,246,0.06);color:rgba(167,139,250,0.88);
  transition:all 0.2s ease;
  display:flex;align-items:center;justify-content:center;gap:8px;
}
.gate-btn-secondary:hover {
  background:rgba(139,92,246,0.14);border-color:rgba(139,92,246,0.48);
  color:#c084fc;transform:translateY(-1px);
}

.gate-footer {
  margin-top:22px;font-size:11px;color:rgba(100,116,139,0.55);line-height:1.5;
}
.gate-footer a {
  color:rgba(139,92,246,0.65);text-decoration:none;font-weight:700;
}
.gate-footer a:hover{color:#a78bfa;text-decoration:underline;}

@media(max-width:480px){
  .gate-card{padding:32px 22px 28px;border-radius:22px;}
  .gate-headline{font-size:22px;}
  .gate-logo-img{width:60px;height:60px;}
}
</style>

<div class="gate-orb gate-orb-1"></div>
<div class="gate-orb gate-orb-2"></div>
<div class="gate-orb gate-orb-3"></div>
<div class="gate-grid"></div>

<div class="gate-card" role="main">
  <div class="gate-logo-wrap">
    <img src="img/logo.png" alt="Campus OS" class="gate-logo-img" id="gateLogoImg" />
    <div class="gate-brand-name">Campus OS</div>
    <div class="gate-brand-sub">Smart Academic Operating Platform</div>
  </div>

  <div class="gate-badge">
    <div class="gate-badge-dot"></div>
    Student Access Required
  </div>

  <div class="gate-headline">
    Your <span>Academic OS</span><br/>awaits you
  </div>
  <div class="gate-sub">
    Create your free student account to unlock real-time timetables, attendance tracking, notes vault, and your student network.
  </div>

  <div class="gate-features">
    <div class="gate-feature-pill">📅 Live Timetable</div>
    <div class="gate-feature-pill">📈 Attendance Radar</div>
    <div class="gate-feature-pill">📝 Notes Vault</div>
    <div class="gate-feature-pill">👥 Student Feed</div>
    <div class="gate-feature-pill">✅ Task Board</div>
    <div class="gate-feature-pill">📊 Dashboard</div>
  </div>

  <div class="gate-page-ctx">
    Trying to access <em id="gatePageLabel">this page</em>
  </div>

  <button class="gate-btn-primary" onclick="campusGateRegister()">
    🚀 Create Free Account
  </button>

  <div class="gate-divider">already a student?</div>

  <button class="gate-btn-secondary" onclick="campusGateSignIn()">
    🔑 Sign In to My Account
  </button>

  <div class="gate-footer">
    <a href="index.html">← Back to Campus OS Home</a>
    &nbsp;·&nbsp; Free forever
  </div>
</div>`;

  // ─── NAVIGATION ──────────────────────────────────────────────────
  window.campusGateRegister = function() {
    gate.style.opacity = '0.7';
    gate.querySelector('.gate-card').style.transform = 'translateY(-12px) scale(0.97)';
    setTimeout(function() { window.location.href = AUTH_PAGE + '?mode=register'; }, 220);
  };
  window.campusGateSignIn = function() {
    gate.style.opacity = '0.7';
    gate.querySelector('.gate-card').style.transform = 'translateY(-12px) scale(0.97)';
    setTimeout(function() { window.location.href = AUTH_PAGE + '?mode=login'; }, 220);
  };

  // ─── INJECT ──────────────────────────────────────────────────────
  function injectGate() {
    // Fix relative paths if in subfolders
    var depth = (window.location.pathname.match(/\//g) || []).length;
    var prefix = depth > 2 ? '../'.repeat(depth - 2) : '';
    var logoEl = gate.querySelector('#gateLogoImg');
    if (logoEl && prefix) logoEl.src = prefix + 'img/logo.png';

    // Set page label from document title
    var raw = document.title || '';
    var label = raw.replace('— Campus OS','').replace('Campus OS','').replace(/[·\-–]/g,'').trim();
    var ctx = gate.querySelector('#gatePageLabel');
    if (ctx && label) ctx.textContent = label;

    document.body.appendChild(gate);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        gate.classList.add('gate-visible');
      });
    });
  }

  if (document.body) {
    injectGate();
  } else {
    document.addEventListener('DOMContentLoaded', injectGate);
  }

})();
