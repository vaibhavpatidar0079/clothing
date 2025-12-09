# Razorpay Integration - Quick Reference

## What's Been Implemented

### Backend (Django)
✅ **Model Updates**
- Order model now has: `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`

✅ **Settings Configuration**
- Razorpay API keys loaded from environment variables
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`

✅ **Utility Module** (`store/utils/razorpay_utils.py`)
- `RazorpayPaymentHandler` class for all Razorpay operations
- `handle_razorpay_payment_for_order()` - Creates Razorpay order
- `verify_and_process_razorpay_payment()` - Verifies signature and updates order

✅ **API Endpoints**
- **Create Order:** `POST /api/v1/orders/` (existing, enhanced)
  - Returns Razorpay order details if payment_method='RAZORPAY'
- **Verify Payment:** `POST /api/v1/orders/verify_payment/` (new)
  - Verifies payment signature
  - Marks order as paid if signature is valid

✅ **Database Migration**
- `migrations/0011_add_razorpay_fields.py` - Adds 3 new fields to Order model

### Frontend (React)

✅ **Razorpay Utilities** (`src/lib/razorpay.js`)
- `loadRazorpayScript()` - Dynamically loads SDK from CDN
- `initializeRazorpayPayment()` - Opens payment modal
- `verifyRazorpayPayment()` - Sends payment details to backend

✅ **CheckoutPage Updates** (`src/pages/CheckoutPage.jsx`)
- Added "RAZORPAY" payment method option
- Enhanced `handlePlaceOrder()` to handle Razorpay flow
- Shows Razorpay information to users

---

## Setup Instructions

### Step 1: Install Backend Package
```bash
cd backend
pip install razorpay
```

### Step 2: Configure Credentials
Create/update `.env` file:
```env
RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
```

Get keys from: https://dashboard.razorpay.com/app/settings/api-keys

### Step 3: Run Migration
```bash
cd backend
python manage.py migrate store
```

### Step 4: Start Application
```bash
# Terminal 1: Backend
cd backend
python manage.py runserver

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Step 5: Test Payment
1. Go to checkout page
2. Select "Razorpay (Cards, UPI, NetBanking)"
3. Use test card: `4111 1111 1111 1111`
4. Verify order is marked as paid in orders page

---

## Payment Flow (Technical)

```
Frontend                          Backend                    Razorpay
   |                                |                           |
   |-- POST /api/v1/orders/ ------->|                           |
   |     (with payment_method)       |-- Create Razorpay Order -|
   |                                 |<-- Return order_id -------|
   |<--- Order + Razorpay Data ------|                           |
   |                                 |                           |
   |-- Open Payment Modal ---------->|                           |
   |-- User Completes Payment ------>|                           |
   |<-- Payment Success (Signature) -|                           |
   |                                 |                           |
   |-- POST /verify_payment/ ------->|                           |
   |     (with signature)            |-- Verify Signature ------|
   |                                 |<-- Valid/Invalid ---------|
   |<--- Payment Verified -----------|                           |
   |-- Redirect to Orders Page       |                           |
```

---

## Key Files Summary

| File | Purpose |
|------|---------|
| `requirements.txt` | Razorpay package dependency |
| `settings.py` | Razorpay API key configuration |
| `models.py` | Order model with Razorpay fields |
| `migrations/0011_...py` | Database schema update |
| `utils/razorpay_utils.py` | All Razorpay business logic |
| `views.py` | API endpoints and order creation |
| `lib/razorpay.js` | Frontend payment utilities |
| `pages/CheckoutPage.jsx` | User payment interface |

---

## Environment Variables Needed

```env
# In backend/.env
RAZORPAY_KEY_ID=your_key_id_here
RAZORPAY_KEY_SECRET=your_secret_here
```

---

## API Response Examples

### Create Order Response (with Razorpay)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "order_status": "pending",
  "payment_status": "pending",
  "payment_method": "RAZORPAY",
  "total_amount": "5000.00",
  "razorpay_order": {
    "razorpay_order_id": "order_DBJOWzybf0sJbb",
    "razorpay_key_id": "rzp_live_ExjpAUN3gVHrPJ",
    "amount": 500000,
    "currency": "INR",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "+919876543210"
  }
}
```

### Verify Payment Response
```json
{
  "message": "Payment verified successfully. Order is now being processed.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "order_status": "processing",
    "payment_status": "paid",
    "razorpay_payment_id": "pay_DBJOWzybf0sJbb",
    "razorpay_signature": "signature_hash_here"
  }
}
```

---

## Testing Credentials

For development testing:
- **Key ID:** rzp_test_XXXXXXXX (from test dashboard)
- **Secret:** Available from Settings → API Keys
- **Test Cards:** https://razorpay.com/docs/testing/

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Razorpay SDK failed" | Check browser console, verify CDN access |
| "Signature verification failed" | Verify API secret in .env is correct |
| "Order not marked as paid" | Check Django logs, verify payment endpoint is called |
| "Missing fields error" | Ensure all 4 fields sent from frontend |

---

## Security Notes

✅ **Implemented Security Features:**
- HMAC-SHA256 signature verification
- API keys in environment variables (not in code)
- Database transactions for data integrity
- Order status validation before processing
- User ownership verification (orders belong to requesting user)

**Never:**
- Expose API keys in frontend
- Skip signature verification
- Store sensitive data in localStorage unencrypted

---

## Next Steps (Optional Enhancements)

1. **Webhooks** - Listen to Razorpay webhook events
2. **Refunds** - Implement refund logic
3. **Recurring Payments** - For subscriptions
4. **Invoice Generation** - Auto-generate invoices on payment
5. **Email Notifications** - Send payment confirmation emails
6. **Admin Dashboard** - View payment status in admin panel

---

## Support Resources

- **Razorpay Docs:** https://razorpay.com/docs/
- **API Reference:** https://razorpay.com/docs/api/
- **Integration Examples:** https://github.com/razorpay

---

**Ready to Test:** Yes ✅
**Live Deployment:** Requires updating .env with live keys
**Estimated Setup Time:** 5-10 minutes
