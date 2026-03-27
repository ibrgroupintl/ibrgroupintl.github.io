document.addEventListener('DOMContentLoaded', () => {
    // 1. Backend Simulation for Post-Login Welcome Hub
    // In a production environment, user data would be fetched from a secure session or API.
    const mockUser = {
        name: "Alex Thompson",
        role: "Senior Investment Associate",
        lastLogin: "March 26, 2026"
    };

    // 2. Personalize Hub Welcome
    const welcomeText = document.getElementById('user-welcome');
    if (welcomeText) {
        welcomeText.textContent = `Welcome, ${mockUser.name.split(' ')[0]}`;
        console.log(`Resource Centre initialized for ${mockUser.name}.`);
    }

    // 3. Logout Interaction
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if(confirm('Are you sure you want to sign out of the Resource Centre?')) {
                // Simulate session termination
                window.location.href = '/index.html';
            }
        });
    }

    // 4. Feature Card Interactions
    const resourceCards = document.querySelectorAll('.resource-card');
    resourceCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            console.log(`Browsing Resource: ${card.querySelector('h3').textContent}`);
        });
    });

    // 5. Hide Sensitive Hub elements if no session (Simulation)
    const checkSession = () => {
        // Mock check for a secure token or cookie
        const hasSession = true; 
        if (!hasSession) {
            document.body.innerHTML = '<h1>403 Forbidden</h1><p>Secure login required to access the Resource Centre.</p>';
        }
    };

    checkSession();
});
