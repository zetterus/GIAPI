function createNavBar() {
    const nav = document.createElement('nav');
    nav.innerHTML = `
        <div class="nav-left">
            <ul>
                <li><a href="/index.html">Home</a></li>
                <li><a href="/login.html">Login</a></li>
                <li><a href="/register.html">Register</a></li>
            </ul>
        </div>
        <div class="nav-right">
            <div id="auth-status">You are not authenticated</div>
            <form id="login-form" class="auth-form">
                <input type="text" id="nav-username" placeholder="Username" required>
                <input type="password" id="nav-password" placeholder="Password" required>
                <button type="submit">Login</button>
            </form>
            <button id="logout-btn" class="hidden">Logout</button>
            <div class="theme-wrapper">
                <button id="theme-btn">Theme</button>
                <ul id="theme-list" class="theme-list hidden">
                    <li data-theme="light1">Light 1</li>
                    <li data-theme="light2">Light 2</li>
                    <li data-theme="light3">Light 3</li>
                    <li data-theme="dark1">Dark 1</li>
                    <li data-theme="dark2">Dark 2</li>
                    <li data-theme="dark3">Dark 3</li>
                </ul>
            </div>
        </div>
    `;
    document.body.insertBefore(nav, document.body.firstChild);

    const loginForm = document.getElementById('login-form');
    const authStatus = document.getElementById('auth-status');
    const logoutBtn = document.getElementById('logout-btn');
    const themeBtn = document.getElementById('theme-btn');
    const themeList = document.getElementById('theme-list');
    const token = localStorage.getItem('token');

    // Проверка авторизации
    if (token) {
        fetch('/api/auth/verify', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(response => {
                if (response.ok) return response.json();
                throw new Error('Token invalid');
            })
            .then(data => {
                authStatus.textContent = `Logged in as ${data.username}, ${data.role}`;
                loginForm.classList.add('hidden');
                logoutBtn.classList.remove('hidden');
            })
            .catch(() => {
                localStorage.removeItem('token');
                authStatus.textContent = "You are not authenticated";
                logoutBtn.classList.add('hidden');
            });
    }

    // Логин
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('nav-username').value;
        const password = document.getElementById('nav-password').value;

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();
        if (response.ok) {
            localStorage.setItem('token', result.token);
            authStatus.textContent = `Logged in as ${username}, ${result.role || 'Player'}`;
            loginForm.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
        } else {
            authStatus.textContent = result.message || "Invalid credentials";
        }
    });

    // Логаут
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        authStatus.textContent = "You are not authenticated";
        loginForm.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
    });

    // Переключение тем
    themeBtn.addEventListener('click', () => {
        themeList.classList.toggle('hidden');
    });

    themeList.querySelectorAll('li').forEach(item => {
        item.addEventListener('click', () => {
            const theme = item.getAttribute('data-theme');
            document.body.className = ''; // Сбрасываем классы
            document.body.classList.add(theme);
            localStorage.setItem('theme', theme);
            themeList.classList.add('hidden');
        });
    });

    // Загрузка сохранённой темы
    const savedTheme = localStorage.getItem('theme') || 'light1';
    document.body.classList.add(savedTheme);
}

document.addEventListener('DOMContentLoaded', createNavBar);