
# Impact in Business Recruitment — Premium Subscriber Dashboard

This project is a premium subscriber dashboard for Impact in Business Recruitment, featuring:

- **Stripe integration** for premium/founding subscriber badge display
- **Firebase Auth** (Google OAuth) for secure sign-in
- **Cloud Functions** for secure backend logic
- **Modern UI** with consistent branding and dark/light theme support
- **Substack integration** for premium content access

---

## 🚀 Quick Start

### Prerequisites
- Node.js 24+
- Firebase CLI (`npm install -g firebase-tools`)
- Stripe account (for premium badge)
- Google Cloud project (for OAuth)

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd ibrgroupintl.github.io
npm install
```

### 2. Configure Firebase & Stripe
Set your Stripe secret key:
```bash
firebase functions:config:set stripe.secret_key="sk_live_YOUR_KEY_HERE"
```

### 3. Deploy
```bash
cd functions
npm install
firebase deploy --only functions,hosting
```

---

## 🏗️ Project Structure

- `/functions` — Cloud Functions (Node.js, Stripe, Firebase Admin)
- `/public` or root — Frontend HTML/CSS/JS (see `index.html`, `members.html`, etc.)
- `/firebase-config.js` — Firebase web config (initialized directly, no .env)
- `/members.html` — Member dashboard with dynamic badge
- `/directory.html` — Member directory
- `/index.html` — Main landing page

---

## 🔑 Features

- **Subscriber Badge**: Shows "Founding Subscriber" or "Premium" in the member header, based on Stripe subscription
- **Secure Cloud Function**: Looks up Stripe by email, never exposes secret keys to client
- **Modern UI**: Responsive, accessible, and visually consistent (see `index.html` for theme)
- **In-app Messaging**: Firestore-based, no Mailgun
- **Social Footer**: Icons only, no text links

---

## 🛠️ Technologies Used

- Firebase Hosting & Functions
- Stripe API
- Node.js 24+
- HTML, CSS, JavaScript (no C code)

---

## 📄 Documentation

- See `QUICK_START.md`, `DEPLOYMENT_READY.md`, `STRIPE_INTEGRATION_SETUP.md`, and `COMPLETION_CHECKLIST.md` for detailed setup and customization.

---

## 🤝 Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements.

---

## 📬 Support

For help, see the documentation files or contact the project maintainer.
