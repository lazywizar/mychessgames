document.addEventListener('DOMContentLoaded', () => {
    // Wait for nav to be loaded
    const observer = new MutationObserver((mutations, obs) => {
        const nav = document.querySelector('.nav-container');
        if (nav) {
            setupNavigation();
            obs.disconnect();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});

function setupNavigation() {
    // Profile dropdown toggle
    const profileButton = document.querySelector('.profile-button');
    const profileMenu = document.querySelector('.profile-menu');

    if (profileButton && profileMenu) {
        profileButton.addEventListener('click', (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!profileMenu.contains(e.target)) {
                profileMenu.classList.remove('active');
            }
        });
    }

    // Add Games button functionality
    const addGamesButton = document.querySelector('.add-games-button');
    if (addGamesButton) {
        addGamesButton.addEventListener('click', () => {
            const modal = document.getElementById('uploadModal');
            if (modal) {
                modal.style.display = 'block';
            } else {
                window.location.href = '/dashboard.html';
            }
        });
    }

    // Logout functionality
    const logoutButton = document.querySelector('.logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            console.log('Logout clicked');
            // Clear authentication data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Redirect to login page
            window.location.href = '/index.html';
        });
    }

    // Update user info
    const userInfo = document.querySelector('.user-info');
    const user = JSON.parse(localStorage.getItem('user'));
    if (userInfo && user) {
        userInfo.textContent = user.username;
    }
}
