// assets/js/header.js
import { getUserProfile, fetchNotifications } from './api.js';

export async function initHeader() {
  // Favicon setup
  if (!document.querySelector('link[rel="icon"]')) {
    const l = document.createElement('link');
    l.rel = 'icon';
    l.type = 'image/x-icon';
    l.href = '/favicon.ico';
    document.head.appendChild(l);
  }

  // Header layout
  const headerHTML = `
    <header>
      <img src="../images/logo.png" alt="Your Ideal Logo" id="logoBtn">
      <nav>
        <a href="../Council/council.html" class="council-link">🏛 Local Council</a>
        <a href="../ClientManagement/clientmanagement.html" class="client-link">👥 Client Management</a>
        <a id="userManagementLink" href="../UserManagement/usermanagement.html">👤 User Management</a>
      </nav>
      <div class="right-menu">
        <div class="notification">
          <button id="notifBtn">🔔 <span id="notifCount" class="badge">0</span></button>
          <div id="notifBox" class="notifications"></div>
        </div>
        <div class="profile">
          <img src="../images/profile.png" id="profileBtn" alt="Profile">
          <div class="dropdown" id="profileBox">
            <img src="../images/profile.png" alt="Profile Pic">
            <h4 id="profileUsername"></h4>
            <p><b>User Name:</b> <span id="profileName"></span></p>
            <p><b>User Role:</b> <span id="profileRole"></span></p>
          </div>
        </div>
        <a href="#" class="logout"><img src="../images/LogOut.png" id="logoutBtn" alt="Logout"></a>
        <div class="hamburger" id="hamburgerBtn"><img src="../images/GridmenuTrans.png" alt="Menu"></div>
      </div>
    </header>
    <div class="mobile-menu" id="mobileMenu">
      <a href="../Council/council.html" class="council-link">🏛 Local Council</a> 
      <a href="../ClientManagement/clientmanagement.html" class="client-link">👥 Client Management</a>
      <a id="mobileUserManagementLink" href="../UserManagement/usermanagement.html">👤 User Management</a>
      <a href="#" class="logout"><img src="../images/LogOut.png" id="mobileLogoutBtn" alt="Logout"></a>
    </div>
  `;
  document.body.insertAdjacentHTML('afterbegin', headerHTML);

  // Auth check
  const token = localStorage.getItem('token');
  const cachedUser = JSON.parse(localStorage.getItem('user') || 'null');
  if (!token || !cachedUser) {
    window.location.href = '../LoginPage/LoginPage.html';
    return;
  }

  fillUser(cachedUser);

  try {
    const apiUser = await getUserProfile(token);
    if (apiUser && apiUser.username) {
      localStorage.setItem('user', JSON.stringify(apiUser));
      fillUser(apiUser);
    }
  } catch {}

  // Navigation + logout
  document.getElementById('logoBtn').addEventListener('click', () => {
    window.location.href = '../HomePage/homepage.html';
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../LoginPage/LoginPage.html';
  };
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  document.getElementById('mobileLogoutBtn').addEventListener('click', handleLogout);

  // Notification logic
  const notifBtn = document.getElementById('notifBtn');
  const notifBox = document.getElementById('notifBox');
  const notifCount = document.getElementById('notifCount');
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}").username || "guest";
  const seenKey = `seenNotifications_${currentUser}`;
  const clearedKey = `notifClearedAt_${currentUser}`;

  async function loadNotifications() {
    try {
      const notifications = await fetchNotifications();
      if (!Array.isArray(notifications)) return;

      // Sort newest first
      notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Check if user has cleared notifications
      const clearedAt = localStorage.getItem(clearedKey);
      if (clearedAt) {
        notifBox.innerHTML = '<p class="no-notif">No notifications</p>';
        notifCount.textContent = "0";
        return;
      }

      // Get user-specific seen list
      const seenList = JSON.parse(localStorage.getItem(seenKey) || "[]");
      const unseen = notifications.filter(n => !seenList.includes(n.id));

      notifCount.textContent = unseen.length > 0 ? unseen.length : "0";

      notifBox.innerHTML = `
        <div class="notif-header">
          <strong>Notifications</strong>
          <button id="clearNotifBtn">Clear All</button>
        </div>
        ${notifications.map(n => `
          <div class="notif-item ${seenList.includes(n.id) ? "" : "unread"}">
            <img src="../images/profile.png">
            <div>
              <p><b>${n.user}</b> ${n.action}</p>
              <small>${n.timestamp}</small>
            </div>
          </div>
        `).join('') || '<p class="no-notif">No notifications</p>'}
      `;

      // Clear All
      const clearBtn = document.getElementById("clearNotifBtn");
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          const allIds = notifications.map(n => n.id);
          localStorage.setItem(seenKey, JSON.stringify(allIds));
          localStorage.setItem(clearedKey, new Date().toISOString());
          notifCount.textContent = "0";
          notifBox.innerHTML = '<p class="no-notif">No notifications</p>';
        });
      }

    } catch (err) {
      console.error("❌ Failed to load notifications:", err);
    }
  }

  // Load notifications every 30s
  await loadNotifications();
  setInterval(loadNotifications, 30000);

  // When bell icon is clicked
  notifBtn.addEventListener('click', () => {
    const isOpen = notifBox.style.display === 'block';
    notifBox.style.display = isOpen ? 'none' : 'block';
    profileBox.style.display = 'none';

    // Mark all visible unread as seen
    const seenList = JSON.parse(localStorage.getItem(seenKey) || "[]");
    const unreadItems = notifBox.querySelectorAll(".notif-item.unread");
    const newSeen = [...seenList];

    unreadItems.forEach(item => {
      const timestamp = item.querySelector("small")?.textContent;
      if (timestamp && !newSeen.includes(timestamp)) newSeen.push(timestamp);
      item.classList.remove("unread");
    });
    localStorage.setItem(seenKey, JSON.stringify([...new Set(newSeen)]));
    notifCount.textContent = "0";
  });

  // Profile menu + hamburger
  const profileBtn = document.getElementById('profileBtn');
  const profileBox = document.getElementById('profileBox');
  profileBtn.addEventListener('click', () => {
    const isOpen = profileBox.style.display === 'block';
    profileBox.style.display = isOpen ? 'none' : 'block';
    notifBox.style.display = 'none';
  });

  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  hamburgerBtn.addEventListener('click', () => {
    mobileMenu.style.display = mobileMenu.style.display === 'flex' ? 'none' : 'flex';
  });

  // Close menus when clicking outside
  document.addEventListener('click', (e) => {
    if (
      !notifBtn.contains(e.target) && !notifBox.contains(e.target) &&
      !profileBtn.contains(e.target) && !profileBox.contains(e.target) &&
      !hamburgerBtn.contains(e.target) && !mobileMenu.contains(e.target)
    ) {
      notifBox.style.display = 'none';
      profileBox.style.display = 'none';
      mobileMenu.style.display = 'none';
    }
  });

  // Fill user details
  function fillUser(user) {
    const uname = document.getElementById('profileUsername');
    const name = document.getElementById('profileName');
    const role = document.getElementById('profileRole');
    const displayName = user.display_name || user.name || user.username;
    if (uname) uname.textContent = user.username;
    if (name) name.textContent = displayName;
    if (role) role.textContent = user.role;

    const userMgmtLink = document.getElementById('userManagementLink');
    const mobileUserMgmtLink = document.getElementById('mobileUserManagementLink');
    const isSuper = (user.role || '').toUpperCase() === 'SUPER_ADMIN';
    if (!isSuper) {
      if (userMgmtLink) userMgmtLink.style.display = 'none';
      if (mobileUserMgmtLink) mobileUserMgmtLink.style.display = 'none';
    } else {
      if (userMgmtLink) userMgmtLink.style.display = '';
      if (mobileUserMgmtLink) mobileUserMgmtLink.style.display = '';
    }
  }

  return JSON.parse(localStorage.getItem('user') || 'null');
}