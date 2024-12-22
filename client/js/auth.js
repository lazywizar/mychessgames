// Get token from localStorage
function getToken() {
    console.log('Getting token from localStorage');
    return localStorage.getItem('token');
}

// Check if user is authenticated
function requireAuth() {
    console.log('Checking authentication...');
    const token = getToken();
    
    if (!token) {
        console.log('No token found');
        return false;
    }
    
    // Check if token is expired
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (Date.now() >= payload.exp * 1000) {
            console.log('Token expired');
            localStorage.removeItem('token');
            return false;
        }
        console.log('Authentication successful');
        return true;
    } catch (error) {
        console.error('Error checking token:', error);
        localStorage.removeItem('token');
        return false;
    }
}

// Logout function
function logout() {
    console.log('Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}

// Show error message in form
function showError(form, message) {
    clearErrors(form);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    form.appendChild(errorDiv);
}

function clearErrors(form) {
    const existingErrors = form.querySelectorAll('.error-message');
    existingErrors.forEach(error => error.remove());
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Initialize auth-related elements when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Current pathname:', window.location.pathname);
    
    // If we're on the index page and already authenticated, redirect to dashboard
    if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        if (requireAuth()) {
            console.log('Already authenticated, redirecting to dashboard');
            window.location.href = '/dashboard.html';
            return;
        }
    }
    
    // If we're on a protected page and not authenticated, redirect to login
    if (window.location.pathname.endsWith('dashboard.html') || 
        window.location.pathname.endsWith('game.html')) {
        if (!requireAuth()) {
            console.log('Not authenticated, redirecting to login');
            window.location.href = '/index.html';
            return;
        }
    }

    // Get DOM elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const logoutBtn = document.getElementById('logoutBtn');

    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Handle tab switching
    if (tabBtns) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const targetForm = btn.dataset.tab === 'login' ? loginForm : registerForm;
                const otherForm = btn.dataset.tab === 'login' ? registerForm : loginForm;

                if (targetForm) targetForm.classList.remove('hidden');
                if (otherForm) otherForm.classList.add('hidden');

                clearErrors(loginForm);
                clearErrors(registerForm);
            });
        });
    }
    
    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors(loginForm);
            
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;

            if (!username || !password) {
                showError(loginForm, 'Username and password are required');
                return;
            }

            try {
                console.log('Attempting login with:', { username });
                const response = await fetch(`${CONFIG.API_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();
                console.log('Login response:', { status: response.status, data });

                if (response.ok && data.token) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    console.log('Login successful, redirecting to dashboard');
                    window.location.replace('/dashboard.html');
                } else {
                    showError(loginForm, data.message || 'Login failed');
                }
            } catch (error) {
                console.error('Login error:', error);
                showError(loginForm, 'Network error. Please try again.');
            }
        });
    }
    
    // Handle registration form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors(registerForm);
            
            const username = document.getElementById('registerUsername').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;

            if (!username || !email || !password) {
                showError(registerForm, 'All fields are required');
                return;
            }

            if (!isValidEmail(email)) {
                showError(registerForm, 'Please enter a valid email address');
                return;
            }

            try {
                console.log('Attempting registration with:', { username, email });
                const response = await fetch(`${CONFIG.API_URL}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await response.json();
                console.log('Registration response:', { status: response.status, data });

                if (response.ok && data.token) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    console.log('Registration successful, redirecting to dashboard');
                    window.location.replace('/dashboard.html');
                } else {
                    showError(registerForm, data.message || 'Registration failed');
                }
            } catch (error) {
                console.error('Registration error:', error);
                showError(registerForm, 'Network error. Please try again.');
            }
        });
    }
});
