import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged, getIdToken, GoogleAuthProvider, signInWithCredential } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { firebaseConfig, GOOGLE_CLIENT_ID } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const protectedContent = document.getElementById('protected-content');
const userNameEl = document.getElementById('userName');
const userEmailEl = document.querySelector('[data-user-email]');
const logoutBtn = document.getElementById('logoutBtn');
const loginSection = document.getElementById('login-section');
const googleStatusEl = document.getElementById('google-login-status');

// Sign out handler
logoutBtn?.addEventListener('click', () => {
  signOut(auth).catch(err => console.error('Sign out error', err));
});

// Handler for Google Identity Services credentials
window.handleGoogleCredentialResponse = async function (response) {
  if (!response || !response.credential) {
    console.warn('No credential returned from Google Identity.');
    return;
  }
  try {
    const idToken = response.credential;
    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
    // onAuthStateChanged will run after successful sign-in
  } catch (err) {
    console.error('Error signing in with Google credential:', err);
    if (googleStatusEl) googleStatusEl.textContent = 'Sign-in failed. Please try again.';
  }
};

function initGoogleButton() {
  if (!window.google || !google.accounts || !google.accounts.id) {
    console.warn('Google Identity Services not available yet.');
    return;
  }
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: window.handleGoogleCredentialResponse
  });
  google.accounts.id.renderButton(
    document.getElementById('g_id_signin'),
    { theme: 'outline', size: 'large', text: 'signin_with' }
  );
  // Optional: show one-tap prompt. Comment out if undesired.
  // google.accounts.id.prompt();
}

window.addEventListener('load', function () { setTimeout(initGoogleButton, 250); });

// Enforce authentication: if not signed-in, redirect to /login.html
onAuthStateChanged(auth, async user => {
  if (user) {
    // Reveal protected UI and hide login section
    if (loginSection) loginSection.style.display = 'none';
    if (protectedContent) protectedContent.style.display = '';
    if (userNameEl) userNameEl.textContent = user.displayName || user.email || 'Member';
    if (userEmailEl) userEmailEl.textContent = user.email || '';
    if (googleStatusEl) googleStatusEl.textContent = `Signed in as ${user.email || user.displayName || 'user'}`;

    // Send ID token to backend to establish a secure session cookie (server should verify)
    try {
      const idToken = await getIdToken(user, /* forceRefresh= */ false);
      fetch('/sessionLogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      }).then(resp => {
        if (!resp.ok) console.warn('sessionLogin returned non-OK', resp.status);
      }).catch(err => console.error('sessionLogin network error', err));
    } catch (err) {
      console.error('Failed to get ID token', err);
    }
  } else {
    // Not signed in — show login UI and keep protected content hidden
    if (loginSection) loginSection.style.display = '';
    if (protectedContent) protectedContent.style.display = 'none';
    if (googleStatusEl) googleStatusEl.textContent = 'Not signed in';
  }
});
