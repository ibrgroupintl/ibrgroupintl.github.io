// public/firebase-config.js
// replace the placeholders with values from Firebase Console
// Firebase and Google Identity configuration
// Replace the placeholder values with your Firebase project values.
export const firebaseConfig = {
  apiKey: "AIzaSyCXPA4TasdF-pX7Ey5Tyf_aSrufZzCqPxo",
  authDomain: "supa-73a39.web.app",
  projectId: "supa-73a39",
  storageBucket: "supa-73a39.firebasestorage.app",
  messagingSenderId: "447556072560",
  appId: "1:447556072560:web:4f2831fd7f86e23cf470b5"
};

// Google Identity Services client ID (OAuth 2.0 client ID for web apps)
export const GOOGLE_CLIENT_ID = "48296920094-d85spf4rkpsr7nap3v91geu22gna0cug.apps.googleusercontent.com";

// Note: These values are public identifiers used by client SDKs. Do not place
// server secrets here. For stronger protection, validate ID tokens server-side
// (e.g. call /sessionLogin) before granting access to protected endpoints.
window.firebaseConfig = {
  apiKey: "AIzaSyCXPA4TasdF-pX7Ey5Tyf_aSrufZzCqPxo",
  authDomain: "supa-73a39.web.app",
  projectId: "supa-73a39",
  appId: "1:447556072560:web:4f2831fd7f86e23cf470b5",
  // other fields...
};
