document.addEventListener('DOMContentLoaded', () => {
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

    // Logout functionality
    const setupLogout = () => {
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
    };

    // Update user info in the nav
    const updateUserInfo = () => {
        const userInfo = document.querySelector('.user-info');
        const user = JSON.parse(localStorage.getItem('user'));
        
        if (userInfo && user) {
            userInfo.textContent = user.username;
        }
    };

    // Initial setup
    setupLogout();
    updateUserInfo();

    // If using dynamic navigation loading, observe DOM changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                setupLogout();
                updateUserInfo();
            }
        });
    });

    // Start observing the document with the configured parameters
    observer.observe(document.body, { childList: true, subtree: true });
});
