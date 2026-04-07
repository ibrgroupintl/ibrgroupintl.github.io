# Quick Start: Stripe Integration (5 minutes)

## Prerequisites
- ✅ Google OAuth configured (already done)
- ✅ Firebase project active (already done)
- ✅ Stripe account created

## Step 1: Get Your Stripe Key (2 min)

1. Go to https://dashboard.stripe.com
2. Click **Developers** (top right corner)
3. Click **API Keys**
4. Copy the **Secret Key** starting with `sk_live_` (or `sk_test_` for testing)

## Step 2: Configure Firebase (1 min)

Open terminal and run:

```bash
firebase functions:config:set stripe.secret_key="sk_YOUR_KEY_HERE"
```

Replace `sk_YOUR_KEY_HERE` with your actual key.

**Verify it worked:**
```bash
firebase functions:config:get stripe
```

You should see your key in the output.

## Step 3: Deploy (2 min)

```bash
cd functions
npm install
npm run deploy
```

Wait for "✅ Function deployed successfully"

## Step 4: Test

1. Go to your members.html page
2. Sign in with Google
3. Look for the subscriber badge in the header

**Expected result**: 
- If you have a Stripe subscription → Badge shows "Founding Subscriber"
- If no subscription → Badge is hidden

---

## Troubleshooting (1 min)

### Badge not showing?

**Check 1**: Is user signed in?
- Look for the user name in the header

**Check 2**: Open browser console (F12)
- Any error messages?
- If yes, copy the error

**Check 3**: Verify deployment
```bash
firebase functions:list
```
- Do you see `getSubscriberType` listed?

**Check 4**: Verify Stripe key
```bash
firebase functions:config:get
```
- Is `stripe.secret_key` showing a value?

---

## FAQ

**Q: My badge shows but the text is wrong?**
A: Check your Stripe product metadata. In Stripe Dashboard → Products → Your Product → Metadata, ensure `subscriber_type` is set correctly.

**Q: I see "Founding Subscriber" but my subscription is actually "Premium"?**
A: Update the product metadata in Stripe to match your subscription type.

**Q: How do I customize the badge color?**
A: Edit `members.html`, find `.subscriber-badge.founding` CSS and change the colors.

**Q: How do I add a new subscriber type?**
A: 
1. Create a new product in Stripe
2. Set metadata: `subscriber_type` = your type
3. Add CSS class in members.html with colors
4. Done! No redeploy needed.

**Q: Is my Stripe secret key secure?**
A: Yes! It's stored in Firebase environment variables, never exposed to the browser.

---

## Next: Customization

### Change Badge Colors

In `members.html`, find this section and edit:

```css
.subscriber-badge.founding {
  background: #fef3c7;  /* Change this color */
  color: #92400e;       /* Change this color */
}
```

### Add a New Subscriber Type

1. **In Stripe**:
   - Create product "Premium"
   - Set metadata: `subscriber_type` = `premium`

2. **In members.html**, add:
```css
.subscriber-badge.premium {
  background: #c7d2fe;
  color: #3730a3;
}
```

3. Done! Users with "Premium" subscriptions will see a blue badge.

---

## Monitoring

### View Function Logs

Firebase Console → Functions → getSubscriberType → Logs

Look for:
- ✅ Success: "Returning: founding_subscriber"
- ❌ Error: "STRIPE_SECRET_KEY is undefined"
- ❌ Error: "No Stripe customer found"

### Check API Usage

Stripe Dashboard → Developers → Events

Look for API requests and response times.

---

## Production Checklist

- [ ] Stripe secret key configured
- [ ] Cloud Function deployed
- [ ] Tested with test Stripe account
- [ ] Switched to live Stripe keys (sk_live_*)
- [ ] Redeployed function with live keys
- [ ] Badge appears on members.html login
- [ ] Tested with real subscription
- [ ] Monitored function logs for errors

---

## Support

Still stuck? Check these files:

1. **Setup details**: `STRIPE_INTEGRATION_SETUP.md`
2. **How it works**: `IMPLEMENTATION_SUMMARY.md`
3. **API reference**: `STRIPE_API_REFERENCE.md`
4. **Visual guide**: `VISUAL_GUIDE.md`

Or check Firebase logs:
```bash
firebase functions:log --tail
```

---

## Summary

**What you did:**
✅ Configured Stripe API key in Firebase
✅ Deployed Cloud Function to query Stripe
✅ Added subscriber badge to members.html header
✅ Badge now shows user's subscription type on login

**What happens now:**
→ Users sign in with Google
→ System queries their Stripe subscription
→ Badge displays their subscriber type
→ Badge is hidden if no subscription

**Next time:**
→ Customize colors and types
→ Add more subscriber tiers
→ Restrict features by type
