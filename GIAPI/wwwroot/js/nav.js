function createNavBar() {
    if (document.querySelector('nav')) return;
    console.log('Creating navbar');

    const nav = document.createElement('nav');
    const navLeft = document.createElement('div');
    navLeft.className = 'nav-left';
    const ulLeft = document.createElement('ul');
    const leftLinks = [
        { text: 'Home', href: '/index.html' }, // Всегда видна
        { text: 'Login', href: '/login.html', class: 'auth-link' }, // Только неавторизованным
        { text: 'Register', href: '/register.html', class: 'auth-link' }, // Только неавторизованным
        { text: 'Inventory', href: '/inventory.html', class: 'auth-link hidden', id: 'inventory-link' }, // Только авторизованным
        { text: 'Admin Panel', href: '/admin.html', class: 'auth-link hidden', id: 'admin-link' }, // Только Admin
        { text: 'Moderator Panel', href: '/moderator.html', class: 'auth-link hidden', id: 'moderator-link' } // Только Moderator
    ];
    leftLinks.forEach(link => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.text;
        if (link.class) a.className = link.class;
        if (link.id) a.id = link.id;
        li.appendChild(a);
        ulLeft.appendChild(li);
    });
    navLeft.appendChild(ulLeft);

    const activeBag = document.createElement('div');
    activeBag.id = 'active-bag';
    activeBag.style.textAlign = 'center';
    activeBag.style.flex = '1';
    activeBag.textContent = 'No bag active';

    const navRight = document.createElement('div');
    navRight.className = 'nav-right';

    const authStatus = document.createElement('div');
    authStatus.id = 'auth-status';
    authStatus.textContent = 'You are not authenticated';

    const loginForm = document.createElement('form');
    loginForm.id = 'login-form';
    loginForm.className = 'auth-form';
    const usernameInput = document.createElement('input');
    usernameInput.type = 'text';
    usernameInput.id = 'nav-username';
    usernameInput.placeholder = 'Username';
    usernameInput.required = true;
    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.id = 'nav-password';
    passwordInput.placeholder = 'Password';
    passwordInput.required = true;
    const loginBtn = document.createElement('button');
    loginBtn.type = 'submit';
    loginBtn.textContent = 'Login';
    loginForm.append(usernameInput, passwordInput, loginBtn);

    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logout-btn';
    logoutBtn.className = 'hidden';
    logoutBtn.textContent = 'Logout';

    const themeWrapper = document.createElement('div');
    themeWrapper.className = 'theme-wrapper';
    const themeBtn = document.createElement('button');
    themeBtn.id = 'theme-btn';
    themeBtn.textContent = 'Theme';
    const themeList = document.createElement('ul');
    themeList.id = 'theme-list';
    themeList.className = 'theme-list hidden';
    const themes = [
        { theme: 'light1', text: 'Light 1' },
        { theme: 'light2', text: 'Light 2' },
        { theme: 'light3', text: 'Light 3' },
        { theme: 'dark1', text: 'Dark 1' },
        { theme: 'dark2', text: 'Dark 2' },
        { theme: 'dark3', text: 'Dark 3' }
    ];
    themes.forEach(t => {
        const li = document.createElement('li');
        li.setAttribute('data-theme', t.theme);
        li.textContent = t.text;
        themeList.appendChild(li);
    });
    themeWrapper.append(themeBtn, themeList);

    navRight.append(authStatus, loginForm, logoutBtn, themeWrapper);
    nav.append(navLeft, activeBag, navRight);
    document.body.insertBefore(nav, document.body.firstChild);

    const token = localStorage.getItem('token');

    // Функция управления видимостью кнопок
    function updateAuthUI(username, role) {
        const authLinks = document.querySelectorAll('.auth-link');
        const inventoryLink = document.getElementById('inventory-link');
        const adminLink = document.getElementById('admin-link');
        const moderatorLink = document.getElementById('moderator-link');

        if (username && role) {
            // Авторизован
            authStatus.textContent = `Logged in as ${username}, ${role}`;
            loginForm.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
            authLinks.forEach(link => link.classList.add('hidden')); // Скрываем все auth-link
            inventoryLink.classList.remove('hidden'); // Показываем Inventory для всех авторизованных
            if (role === 'Admin') adminLink.classList.remove('hidden'); // Только для Admin
            if (role === 'Moderator') moderatorLink.classList.remove('hidden'); // Только для Moderator
        } else {
            // Не авторизован
            authStatus.textContent = 'You are not authenticated';
            loginForm.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
            authLinks.forEach(link => {
                link.classList.add('hidden'); // Скрываем все по умолчанию
                if (link.textContent === 'Login' || link.textContent === 'Register') {
                    link.classList.remove('hidden'); // Показываем только Login и Register
                }
            });
        }
    }

    // Проверка токена при загрузке
    if (token) {
        fetch('/api/auth/verify', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(response => response.ok ? response.json() : Promise.reject('Token invalid'))
            .then(data => {
                localStorage.setItem('username', data.username);
                localStorage.setItem('role', data.role);
                updateAuthUI(data.username, data.role);
            })
            .catch(() => {
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                localStorage.removeItem('role');
                updateAuthUI(null, null);
            });
    } else {
        updateAuthUI(null, null);
    }

    loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        const username = usernameInput.value;
        const password = passwordInput.value;
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const result = await response.json();
        if (response.ok) {
            localStorage.setItem('token', result.token);
            localStorage.setItem('username', username);
            localStorage.setItem('role', result.role || 'Player');
            updateAuthUI(username, result.role || 'Player');
            loginForm.reset();
        } else {
            authStatus.textContent = result.message || 'Invalid credentials';
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        updateAuthUI(null, null);
    });

    themeBtn.addEventListener('click', () => {
        themeList.classList.toggle('hidden');
    });

    themeList.querySelectorAll('li').forEach(item => {
        item.addEventListener('click', () => {
            const theme = item.getAttribute('data-theme');
            document.body.className = theme;
            localStorage.setItem('theme', theme);
            themeList.classList.add('hidden');
        });
    });

    const savedTheme = localStorage.getItem('theme') || 'light1';
    document.body.className = savedTheme;
}

document.addEventListener('DOMContentLoaded', createNavBar);