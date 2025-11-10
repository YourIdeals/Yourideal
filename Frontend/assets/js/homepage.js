// assets/js/homepage.js
import { initHeader } from './header.js';
import { enforceAccessControl, validateSession } from './access-control.js';

document.addEventListener('DOMContentLoaded', async () => {
  validateSession();        // ✅ Ensures session still valid or redirects if disabled
  await initHeader();       // ✅ Loads header and user info
  enforceAccessControl();   // ✅ (Optional) Hides any restricted nav links/buttons

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !user) {
    window.location.href = '../LoginPage/LoginPage.html';
    return;
  }

  const displayName = user.display_name || user.name || user.username;
  const wel = document.querySelector('.welcome');
  if (wel) wel.textContent = `Hi ${displayName} !!!!`;

  const el = document.getElementById('datetime');
  const tick = () => (el ? (el.textContent = new Date().toLocaleString()) : null);
  tick();
  setInterval(tick, 1000);
});
