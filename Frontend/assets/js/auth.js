// assets/js/auth.js
import { apiLogin } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const errorMsg = document.getElementById('errorMsg');
  const toggleEye = document.getElementById('toggleEye');
  const passwordField = document.getElementById('password');

  // Toggle password visibility
  toggleEye.addEventListener('click', () => {
    const isPassword = passwordField.type === 'password';
    passwordField.type = isPassword ? 'text' : 'password';
    toggleEye.src = isPassword
      ? '../images/eyeonTrans.png'
      : '../images/eyeoffTrans.png';
  });

  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
      const data = await apiLogin(username, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '../HomePage/homepage.html';
    } catch (err) {
      errorMsg.style.display = 'block';
    }
  });
});
