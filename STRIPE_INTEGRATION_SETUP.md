# Stripe Integration Setup Guide

This guide explains how to configure the Stripe integration for displaying subscriber type in the members.html header.

## Overview

The implementation uses:
- **Google OAuth** for user authentication via Firebase Auth
- **Stripe API** to query customer subscription status by email
- **Firebase Cloud Function** (`getSubscriberType`) to securely fetch subscription data
- **Header Badge** to display the subscriber type

## Setup Steps

### 1. Get Your Stripe Secret Key

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API Keys**
3. Copy your **Secret Key** (starts with `sk_live_` for production or `sk_test_` for testing)

### 2. Set the Environment Variable in Firebase

Run this command in your terminal:

```bash
firebase functions:config:set stripe.secret_key="sk_live_YOUR_SECRET_KEY_HERE"
```

Replace `sk_live_YOUR_SECRET_KEY_HERE` with your actual Stripe secret key.

**For local development**, create a `.runtimeconfig.json` file in the `functions/` directory:

```json
{
  "stripe": {
    "secret_key": "sk_test_YOUR_TEST_SECRET_KEY"
  }
}
```

### 3. Deploy the Cloud Function

```bash
cd functions
npm install
npm run deploy
```

This will:
- Install the Stripe package
- Deploy the `getSubscriberType` Cloud Function to Firebase

### 4. Enable Cloud Functions API

If you see an error about Cloud Functions API not being enabled:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Search for "Cloud Functions API"
3. Click **Enable**

### 5. Set Stripe Product Metadata (Optional)

To categorize subscriber types, you can add metadata to your Stripe products:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Products**
2. Edit your product (e.g., "Founding Subscriber")
3. Under **Settings**, add custom metadata:
   - Key: `subscriber_type`
   - Value: `founding_subscriber` (or any custom type)

If no metadata is set, the default type is `founding_subscriber`.

## How It Works

### User Flow

1. User signs in with Google OAuth → Firebase Auth authenticates them
2. `members.html` detects authentication and calls `fetchSubscriberType()`
3. `fetchSubscriberType()` calls the Firebase Cloud Function
4. The function:
   - Verifies the user's Firebase Auth token
   - Extracts the user's email
   - Queries Stripe for customers matching that email
   - Retrieves their active subscriptions
   - Returns the subscriber type
5. The header badge updates with the subscription status

### Subscriber Type Badge Styles

- **Founding Subscriber**: Yellow/gold background (`#fef3c7`)
- **Other types**: Blue background (`#e0e7ff`)
- **No subscription**: Hidden by default

## Testing

### Test in Local Development

1. Start the Firebase emulator:
   ```bash
   firebase emulators:start
   ```

2. In a separate terminal, set a test environment variable:
   ```bash
   export STRIPE_SECRET_KEY="sk_test_YOUR_TEST_KEY"
   ```

3. Visit `http://localhost:5000/members.html`
4. Sign in with a Google account that has a Stripe test subscription

### Test Production Deployment

1. Ensure your Stripe secret key is configured:
   ```bash
   firebase functions:config:get
   ```

2. Deploy:
   ```bash
   firebase deploy --only functions
   ```

3. Visit your live members page and sign in

## Troubleshooting

### Badge Not Showing

**Check the browser console** (F12 → Console tab):
- Look for "Failed to fetch subscriber type" errors
- Verify the Cloud Function is deployed: `firebase functions:list`

### "STRIPE_SECRET_KEY is undefined"

- Ensure the config is set: `firebase functions:config:get stripe`
- If empty, run: `firebase functions:config:set stripe.secret_key="sk_..."`
- Redeploy: `firebase deploy --only functions`

### "Unauthenticated request"

- Ensure the user is logged in to Firebase before the function is called
- Check Firebase Auth is initialized in `firebase-config.js`

### Stripe API Errors

- Verify your Stripe secret key is correct (should be in Stripe Dashboard)
- Check API rate limits: https://dashboard.stripe.com/developers/requests
- Ensure the customer email in Stripe matches the Firebase user's email

## Files Modified

1. **functions/src/index.ts**: Added `getSubscriberType` Cloud Function
2. **functions/package.json**: Added Stripe dependency
3. **members.html**: Added subscriber badge UI and fetch logic

## Next Steps

- Customize subscriber type labels and styles in members.html
- Add more subscriber tiers to your Stripe products
- Implement subscriber type restrictions for specific features (e.g., only show certain reports for founding subscribers)
- Add analytics to track subscriber type distribution
