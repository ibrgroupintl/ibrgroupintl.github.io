# Stripe Integration Reference

## API Flow Diagram

```
Google OAuth User → Firebase Auth → Cloud Function → Stripe API → Badge Display
     email              user.email      getSubscriberType()      query by email
```

## Example Response from Cloud Function

### Success Response (Active Subscriber)

```json
{
  "subscriberType": "founding_subscriber",
  "status": "active",
  "subscriptionId": "sub_1234567890",
  "customerId": "cus_1234567890"
}
```

**Badge Display**: "Founding Subscriber" (Gold)

### Success Response (No Subscription)

```json
{
  "subscriberType": "none",
  "status": "no_subscription"
}
```

**Badge Display**: Hidden (not shown to user)

### Success Response (Custom Subscriber Type)

```json
{
  "subscriberType": "premium",
  "status": "active",
  "subscriptionId": "sub_0987654321",
  "customerId": "cus_0987654321"
}
```

**Badge Display**: "Premium" (Blue)

---

## Stripe Setup Examples

### Setting Product Metadata (for subscriber types)

**Via Stripe Dashboard:**

1. Go to Products
2. Select your product
3. Scroll to Metadata
4. Add:
   - **Key**: `subscriber_type`
   - **Value**: `founding_subscriber` (or `premium`, `enterprise`, etc.)

**Via Stripe CLI:**

```bash
stripe products update prod_1234567890 \
  -d "metadata[subscriber_type]=founding_subscriber"
```

**Via cURL:**

```bash
curl https://api.stripe.com/v1/products/prod_1234567890 \
  -u sk_test_YOUR_KEY: \
  -d "metadata[subscriber_type]=founding_subscriber"
```

### Finding Your Stripe Data

**List all customers:**

```bash
curl https://api.stripe.com/v1/customers \
  -u sk_test_YOUR_KEY:
```

**Find customer by email:**

```bash
curl https://api.stripe.com/v1/customers?email=user@example.com \
  -u sk_test_YOUR_KEY:
```

**List subscriptions for a customer:**

```bash
curl https://api.stripe.com/v1/subscriptions?customer=cus_1234567890 \
  -u sk_test_YOUR_KEY:
```

---

## JavaScript Implementation Details

### How the Badge Gets Updated

```javascript
// In members.html, when user authenticates:
async function fetchSubscriberType() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    // Call Firebase Cloud Function (automatically passes auth token)
    const callable = firebase.functions().httpsCallable('getSubscriberType');
    const result = await callable({});

    // Format the type (e.g., "founding_subscriber" → "Founding Subscriber")
    const badgeText = result.data.subscriberType
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Update badge
    subscriberBadge.textContent = badgeText;
    subscriberBadge.className = `subscriber-badge ${result.data.subscriberType}`;

    // Show badge only if not "none"
    if (result.data.subscriberType !== 'none') {
      subscriberBadge.style.display = 'inline-block';
    }
  } catch (err) {
    console.error('Failed to fetch subscriber type:', err);
  }
}
```

---

## Deployment Checklist

- [ ] Stripe secret key configured: `firebase functions:config:set stripe.secret_key="sk_..."`
- [ ] npm dependencies installed: `cd functions && npm install`
- [ ] Cloud Function deployed: `firebase deploy --only functions`
- [ ] Firebase Authentication enabled in Console
- [ ] Google OAuth client ID configured in your project
- [ ] Stripe products created in Dashboard
- [ ] Product metadata set (optional, but recommended)
- [ ] members.html updated with badge UI and fetch logic
- [ ] Tested locally with test Stripe keys
- [ ] Tested in production with live Stripe keys

---

## CSS Classes for Customization

### Default Classes

```css
.subscriber-badge                  /* Base styling */
.subscriber-badge.founding         /* Founding Subscriber (gold) */
.subscriber-badge.premium          /* Premium tier (blue) - custom */
.subscriber-badge.enterprise       /* Enterprise tier (blue) - custom */
.subscriber-badge.none             /* No subscription (hidden) */
```

### Adding New Subscriber Types

1. Add product metadata in Stripe: `subscriber_type: "your_type"`
2. Add CSS class in members.html:
   ```css
   .subscriber-badge.your_type {
     background: #your_color;
     color: #your_text_color;
   }
   ```
3. Deploy - no code changes needed, styling applies automatically!

---

## Monitoring & Debugging

### Firebase Console

1. Go to Functions
2. Click `getSubscriberType` 
3. View **Logs** to see function execution
4. View **Metrics** to monitor errors and latency

### Common Log Messages

**Success:**
```
getSubscriberType called with auth: user@example.com
Stripe customer found: cus_1234567890
Active subscription found: sub_1234567890
Returning: founding_subscriber
```

**Error - No Customer:**
```
No Stripe customer found for user@example.com
Returning: no_subscription
```

**Error - Invalid Key:**
```
Error: Invalid API Key provided
```

### Test the Function Directly

In Firebase Console → Functions → getSubscriberType:

1. Click **Testing**
2. Call the function
3. See response or error

---

## FAQ

**Q: How often is the subscriber type fetched?**
A: Once per login (when `fetchSubscriberType()` is called after auth)

**Q: What if the user's subscription expires?**
A: On next login, the badge will disappear (subscription no longer active)

**Q: Can I cache the subscriber type?**
A: Yes, store in localStorage or Firestore, but refresh on each login to stay up-to-date

**Q: What if the user signs in with different emails?**
A: Each email is queried separately against Stripe - make sure customers in Stripe match Firebase emails

**Q: Is there a rate limit?**
A: Stripe has API rate limits (~100 req/sec). Firebase Functions caching helps reduce calls.

**Q: How do I test with Stripe test keys?**
A: Use `sk_test_...` keys; create test products and subscriptions in Stripe test dashboard

**Q: How do I switch from test to production?**
A: Update the config with `sk_live_...` key: `firebase functions:config:set stripe.secret_key="sk_live_..."`

---

## Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Firebase Cloud Functions Guide](https://firebase.google.com/docs/functions)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Stripe Dashboard](https://dashboard.stripe.com)
