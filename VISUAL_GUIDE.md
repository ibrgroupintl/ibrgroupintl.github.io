# Stripe Subscriber Type Integration - Visual Guide

## Header Badge Display

### Before Integration
```
┌─────────────────────────────────────────────────────────┐
│  Impact in Business    [☰ Menu]  [Search]  👤 John Doe │
│                                               ✉ ⚙      │
└─────────────────────────────────────────────────────────┘
```

### After Integration
```
┌─────────────────────────────────────────────────────────┐
│  Impact in Business    [☰ Menu]  [Search]  👤 John Doe │
│                                      [Founding Subscriber] ✉ ⚙ │
└─────────────────────────────────────────────────────────┘
```

### Badge Styles by Type

```
┌────────────────────────┐
│ Founding Subscriber    │  ← Gold background (#fef3c7)
└────────────────────────┘

┌────────────────────────┐
│ Premium                │  ← Blue background (#e0e7ff)
└────────────────────────┘

(Hidden if "none")
```

---

## Implementation Architecture

```
┌──────────────────────────────────────────────────────────┐
│ Browser: members.html                                    │
│                                                          │
│  1. User clicks "Sign In"                               │
│  2. Google OAuth popup appears                          │
│  3. Firebase Auth processes login                       │
│  4. fetchSubscriberType() function called               │
│     └─→ Calls firebase.functions().httpsCallable()      │
└──────────────────────┬───────────────────────────────────┘
                       │
                       │ HTTPS Call with Firebase Auth Token
                       ↓
┌──────────────────────────────────────────────────────────┐
│ Firebase Cloud Function: getSubscriberType              │
│                                                          │
│  1. Verify Firebase Auth token                          │
│  2. Extract user email from token                       │
│  3. Initialize Stripe SDK                              │
│  4. Query: stripe.customers.list({email: userEmail})    │
│  5. Query: stripe.subscriptions.list({customer: id})    │
│  6. Return subscriber type to client                    │
└──────────────────────┬───────────────────────────────────┘
                       │
                       │ Calls Stripe API
                       ↓
┌──────────────────────────────────────────────────────────┐
│ Stripe API                                               │
│                                                          │
│  GET /v1/customers?email=user@example.com               │
│  GET /v1/subscriptions?customer=cus_xxxxx               │
│                                                          │
│  Response: {status: "active", product: "prod_xxxxx"}    │
└──────────────────────┬───────────────────────────────────┘
                       │
                       │ Response with subscription data
                       ↓
┌──────────────────────────────────────────────────────────┐
│ Browser: members.html                                    │
│                                                          │
│  1. Receive subscriber type from Cloud Function         │
│  2. Update badge text: "Founding Subscriber"            │
│  3. Apply CSS class: .subscriber-badge.founding         │
│  4. Show badge in header                                │
│                                                          │
│  Result: User sees [Founding Subscriber] badge          │
└──────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
User Email (Firebase Auth)
         ↓
    ┌────────┐
    │ Cloud  │
    │ Func   │
    └────────┘
         ↓
Query Stripe Customers by Email
         ↓
    ┌────────┐
    │ Stripe │ ← customer.id
    │ API    │
    └────────┘
         ↓
Query Customer Subscriptions
         ↓
    ┌────────┐
    │ Stripe │ ← product_id, status
    │ API    │
    └────────┘
         ↓
Query Product Metadata
         ↓
    ┌────────┐
    │ Stripe │ ← subscriber_type
    │ API    │
    └────────┘
         ↓
Return to Browser: {
  subscriberType: "founding_subscriber",
  status: "active"
}
         ↓
Update Badge in Header
```

---

## Setup Timeline

```
Week 1: Configuration
├─ Gather Stripe Secret Key from Dashboard
├─ Configure Firebase Environment Variables
└─ Test with Stripe Test Keys (sk_test_*)

Week 1: Deployment
├─ Install npm dependencies
├─ Deploy Cloud Function to Firebase
└─ Verify function is running

Week 2: Testing
├─ Test with test Stripe keys
├─ Verify badge appears on login
├─ Test multiple subscriber types
└─ Verify performance & error handling

Week 2: Production
├─ Switch to live Stripe keys
├─ Monitor Firebase function logs
└─ Monitor Stripe API usage

Ongoing: Maintenance
├─ Monitor error rates
├─ Update subscriber types as needed
└─ Customize badge styles
```

---

## File Structure

```
ibrgroupintl.github.io/
│
├── members.html (UPDATED)
│   ├── CSS: .subscriber-badge styling
│   ├── HTML: <span id="subscriberBadge">
│   └── JS: fetchSubscriberType() function
│
├── functions/
│   ├── src/
│   │   └── index.ts (UPDATED)
│   │       └── export const getSubscriberType = onCall(...)
│   │
│   └── package.json (UPDATED)
│       └── "stripe": "14.8.0"
│
└── Documentation/
    ├── STRIPE_INTEGRATION_SETUP.md (NEW)
    ├── IMPLEMENTATION_SUMMARY.md (NEW)
    ├── STRIPE_API_REFERENCE.md (NEW)
    └── VISUAL_GUIDE.md (this file)
```

---

## Example Stripe Account Setup

### Products in Stripe Dashboard

```
┌─────────────────────────────────┐
│ My Products                     │
├─────────────────────────────────┤
│ ✓ Founding Subscriber           │
│   Price: $99/month              │
│   Metadata:                     │
│   ├─ subscriber_type            │
│   └─ founding_subscriber        │
├─────────────────────────────────┤
│ ✓ Premium Subscription          │
│   Price: $49/month              │
│   Metadata:                     │
│   ├─ subscriber_type            │
│   └─ premium                    │
└─────────────────────────────────┘
```

### Customers in Stripe

```
┌──────────────────────────────────────┐
│ Customers                            │
├──────────────────────────────────────┤
│ john.doe@example.com                 │
│ └─ Subscriptions:                    │
│    └─ Founding Subscriber (Active)   │
├──────────────────────────────────────┤
│ jane.smith@example.com               │
│ └─ Subscriptions:                    │
│    └─ Premium (Active)               │
├──────────────────────────────────────┤
│ user@test.com                        │
│ └─ No subscriptions                  │
└──────────────────────────────────────┘
```

---

## Testing Scenarios

### Scenario 1: User with Active Subscription

```
Input:  User signs in → john.doe@example.com
Cloud Function:
  ├─ Query Stripe customers by email
  ├─ Find customer with founding subscriber product
  ├─ Check subscription is active
  └─ Return: {subscriberType: "founding_subscriber", status: "active"}
Output: Badge shows "Founding Subscriber" in header
```

### Scenario 2: User with No Subscription

```
Input:  User signs in → newuser@example.com
Cloud Function:
  ├─ Query Stripe customers by email
  ├─ No customer found OR no active subscriptions
  └─ Return: {subscriberType: "none", status: "no_subscription"}
Output: Badge is hidden
```

### Scenario 3: Subscription Expires

```
Before: User has active subscription → Badge shows "Founding Subscriber"
After:  Subscription expires in Stripe
Next Login: 
  ├─ Cloud function queries Stripe
  ├─ Subscription no longer active
  ├─ Return: {subscriberType: "none", status: "no_active_subscription"}
Output: Badge is hidden
```

---

## Performance Considerations

### Latency Breakdown

```
Total Round-Trip Time: ~500-800ms

├─ Network latency to Firebase: ~100ms
├─ Cloud Function startup: ~200ms
├─ Stripe API call: ~150-300ms
├─ Network latency back: ~100ms
└─ DOM update: <10ms
```

### Optimization Tips

```
1. Cache in localStorage
   ├─ Store subscriber type after first fetch
   └─ Reuse on subsequent page loads

2. Batch calls
   ├─ Fetch subscriber data with other user data
   └─ Reduce number of separate requests

3. Monitor API limits
   ├─ Stripe: ~100 req/sec
   ├─ Firebase: Pay-as-you-go pricing
   └─ Track usage in Cloud Console
```

---

## Troubleshooting Decision Tree

```
Badge not showing?
  ├─ User signed in?
  │  ├─ No → Direct to login
  │  └─ Yes → Continue
  │
  ├─ Browser console errors?
  │  ├─ Yes → Copy error message
  │  │  ├─ "STRIPE_SECRET_KEY undefined" → Set config
  │  │  ├─ "getSubscriberType not found" → Deploy function
  │  │  └─ Other → Check Firebase Cloud Functions logs
  │  └─ No → Continue
  │
  ├─ Cloud Function deployed?
  │  ├─ No → Run: firebase deploy --only functions
  │  └─ Yes → Continue
  │
  └─ Stripe key configured?
     ├─ No → Run: firebase functions:config:set stripe.secret_key="sk_..."
     └─ Yes → Contact support
```

---

## Next Steps

1. **Immediate**: Configure Stripe secret key
2. **Today**: Deploy Cloud Function
3. **This week**: Test with test keys
4. **Production**: Switch to live keys
5. **Ongoing**: Monitor and customize as needed

---

## Contact & Support

- **Firebase Console**: https://console.firebase.google.com
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Function Logs**: Firebase Console → Functions → Logs
- **API Status**: https://status.stripe.com
