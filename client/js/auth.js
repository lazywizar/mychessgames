document.addEventListener('DOMContentLoaded', () => {
    // Debug: Log the API URL
    console.log('Current API URL:', CONFIG.API_URL);

    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (btn.dataset.tab === 'login') {
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
            } else {
                registerForm.classList.remove('hidden');
                loginForm.classList.add('hidden');
            }
        });
    });

    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors(loginForm);
        
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        // Basic validation
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

            if (response.ok) {
                // Store token
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Redirect to dashboard
                window.location.href = '/dashboard.html';
            } else {
                showError(loginForm, data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            showError(loginForm, 'Network error. Please check your connection and try again.');
        }
    });

    // Register form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors(registerForm);
        
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        // Basic validation
        if (!username || !email || !password) {
            showError(registerForm, 'All fields are required');
            return;
        }

        // Email validation
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

            if (response.ok) {
                // Store token
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Redirect to dashboard
                window.location.href = '/dashboard.html';
            } else {
                showError(registerForm, data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showError(registerForm, 'Network error. Please check your connection and try again.');
        }
    });
});

function showError(form, message) {
    // Remove existing error message if any
    clearErrors(form);

    // Create and append new error message
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
