(function(){
  // top-script.js - include on protected pages
  // Responsibilities:
  //  - initialize Firebase client (expects /firebase-config.js to set window.firebaseConfig)
  //  - enforce client-side fallback redirect to /login.html when not signed in
  //  - populate simple UI tokens (id="userName" and elements with [data-user-email])
  //  - wire logout button (id="logoutBtn") to clear session via POST /sessionLogout and sign out client SDK

  window.addEventListener('load', function () {
    if (!window.firebase || !window.firebaseConfig) return;
    try { firebase.initializeApp(window.firebaseConfig); } catch (e) { /* already initialized */ }

    const auth = firebase.auth();

    auth.onAuthStateChanged(function(user){
      if (!user) {
        // server-side gate should redirect already; this is a client fallback
        try { window.location.replace('/login.html'); } catch(e){}
        return;
      }

      // Populate user-facing elements
      const nameEl = document.getElementById('userName');
      if (nameEl) nameEl.textContent = user.displayName || user.email || '';

      const emailEls = document.querySelectorAll('[data-user-email]');
      emailEls.forEach(function(el){ el.textContent = user.email || ''; });
    });

    // Logout: clear server session cookie and sign out client SDK
    async function logout(){
      try {
        await fetch('/sessionLogout', { method: 'POST', credentials: 'include' });
      } catch (e) { console.warn('sessionLogout failed', e); }
      try { await auth.signOut(); } catch (e) { /* ignore */ }
      try { window.location.replace('/login.html'); } catch(e){}
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // helper to get fresh ID token when needed (returns null when not signed-in)
    window.getIdToken = async function(){
      const u = auth.currentUser;
      if (!u) return null;
      return await u.getIdToken();
    };
  });
})();
