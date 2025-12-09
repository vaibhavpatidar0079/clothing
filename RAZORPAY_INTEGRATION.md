# Razorpay Integration Setup Guide

## Overview
This guide provides step-by-step instructions to integrate Razorpay Payment Gateway into your e-commerce platform. The integration is complete with both backend (Django) and frontend (React) components.

---

## Backend Setup (Django)

### 1. **Install Razorpay Package**
Already added to `requirements.txt`:
```
razorpay>=1.3.0
```

Install it:
```bash
pip install razorpay
```

### 2. **Configure Razorpay Credentials in `.env`**
Create or update your `.env` file in the backend root:

```env
# Razorpay API Keys (from https://dashboard.razorpay.com/)
RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
```

**How to get your credentials:**
1. Go to https://dashboard.razorpay.com/
2. Login to your Razorpay account
3. Navigate to Settings → API Keys
4. Copy your Key ID and Secret

### 3. **Django Settings Already Updated**
The following have been added to `settings.py`:
- Environment variable reading for `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
- Configuration at the end of settings file

### 4. **Database Migration**
Run the migration to add Razorpay fields to the Order model:

```bash
cd backend
python manage.py migrate store
```

**New fields added to Order model:**
- `razorpay_order_id`: Stores Razorpay Order ID
- `razorpay_payment_id`: Stores Razorpay Payment ID
- `razorpay_signature`: Stores Razorpay Payment Signature (for verification)

### 5. **Backend Implementation Files**

#### a. **Razorpay Utilities** (`store/utils/razorpay_utils.py`)
This file contains all Razorpay-related logic:

**Key Functions:**
- `RazorpayPaymentHandler`: Main class for Razorpay operations
  - `create_razorpay_order()`: Creates a Razorpay order
  - `verify_payment_signature()`: Verifies payment signature (security critical)
  - `fetch_payment_details()`: Fetches payment info from Razorpay

- `handle_razorpay_payment_for_order()`: Creates order and returns data for frontend
- `verify_and_process_razorpay_payment()`: Verifies signature and marks order as paid

#### b. **Updated Views** (`store/views.py`)

**Modified `OrderViewSet.create()` method:**
- Checks if payment method is 'RAZORPAY'
- If Razorpay selected:
  - Creates order with `payment_status='pending'`
  - Initializes Razorpay order via `handle_razorpay_payment_for_order()`
  - Returns Razorpay order details in response

**New Action: `OrderViewSet.verify_payment()`**
- Endpoint: `POST /api/v1/orders/verify_payment/`
- Verifies payment signature using HMAC-SHA256
- Updates order status to 'paid' if verification succeeds
- Uses database transaction for data integrity

### 6. **API Endpoints**

#### Create Order (Existing, Enhanced)
```
POST /api/v1/orders/
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "shipping_address_id": 1,
  "coupon_code": "SUMMER20",
  "payment_method": "RAZORPAY"  // or "CARD", "GPAY", "COD"
}

Response:
{
  "id": "uuid",
  "order_status": "pending",
  "payment_status": "pending",
  "payment_method": "RAZORPAY",
  "total_amount": "5000.00",
  "razorpay_order": {
    "razorpay_order_id": "order_xxxxx",
    "razorpay_key_id": "rzp_live_xxxxx",
    "amount": 500000,  // in paise
    "currency": "INR",
    "customer_email": "user@example.com",
    "customer_phone": "+91xxxxxxxxxx",
    "customer_name": "John Doe",
    "order_id": "uuid"
  }
}
```

#### Verify Payment
```
POST /api/v1/orders/verify_payment/
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "order_id": "uuid",
  "razorpay_payment_id": "pay_xxxxx",
  "razorpay_order_id": "order_xxxxx",
  "razorpay_signature": "xxxxxxxxxxxxxxxx"
}

Response on Success:
{
  "message": "Payment verified successfully. Order is now being processed.",
  "data": { ... order data ... }
}

Response on Failure:
{
  "error": "Payment signature verification failed. Payment cannot be processed."
}
```

---

## Frontend Setup (React)

### 1. **Razorpay SDK Utility** (`src/lib/razorpay.js`)
This file contains utility functions for Razorpay integration:

**Functions:**
- `loadRazorpayScript()`: Dynamically loads Razorpay SDK from CDN
- `initializeRazorpayPayment(options)`: Opens Razorpay payment modal
- `verifyRazorpayPayment(details, orderId, apiClient)`: Verifies payment with backend

### 2. **Updated CheckoutPage** (`src/pages/CheckoutPage.jsx`)

**Changes Made:**
1. Added import for Razorpay utilities
2. Enhanced `handlePlaceOrder()` function:
   - Creates order via API
   - If payment method is 'RAZORPAY':
     - Loads Razorpay SDK
     - Initializes payment modal with order details
     - Handles success/error callbacks
     - Verifies payment with backend
   - For other payment methods: immediate success

3. Updated payment method selection:
   - Added "Razorpay (Cards, UPI, NetBanking)" option
   - Shows informational text about supported payment methods

### 3. **Payment Flow (User Perspective)**

```
1. User selects items and goes to checkout
2. Selects "Razorpay" as payment method
3. Clicks "Pay ₹XXXX"
4. Order created on backend
5. Razorpay modal opens with payment options
6. User completes payment in Razorpay modal
7. Payment signature sent to backend for verification
8. Backend verifies signature using HMAC-SHA256
9. If valid: Order marked as paid, user redirected to orders page
10. If invalid: Error message shown to user
```

---

## Security Features

### 1. **Signature Verification**
- Uses HMAC-SHA256 algorithm
- Compares computed signature with Razorpay-provided signature
- Prevents tampering with order or payment data
- Located in `RazorpayPaymentHandler.verify_payment_signature()`

### 2. **Environment Variables**
- API keys stored in `.env` file
- Never committed to version control
- Read via Django's environ package

### 3. **Database Transactions**
- Uses `@transaction.atomic` decorator
- Ensures data consistency
- Rollback on errors

### 4. **Order Status Management**
- Orders stay in 'pending' status until payment verified
- Only after successful signature verification → 'processing'
- Prevents processing of unverified payments

---

## Testing Razorpay Integration

### 1. **Local Testing (Development)**
Razorpay provides test credentials:
- Test Mode: Use test keys from Razorpay Dashboard
- No real payments will be charged

### 2. **Test Cards**
Use these test cards in Razorpay modal:
```
Visa Card:
Number: 4111 1111 1111 1111
CVV: 123
Expiry: Any future date

Netbanking:
HDFC: Can use 'testbank' login
```

### 3. **Testing Flow**
```bash
# 1. Start backend
cd backend
python manage.py runserver

# 2. Start frontend
cd frontend
npm run dev

# 3. Go to checkout page
# 4. Select RAZORPAY as payment method
# 5. Complete payment with test card
# 6. Verify order in /profile?tab=orders
```

---

## Troubleshooting

### 1. **"Razorpay SDK failed to initialize"**
- Check browser console for CORS issues
- Ensure Razorpay CDN is accessible
- Try in incognito mode (rules out browser extensions)

### 2. **"Payment signature verification failed"**
- Verify API keys in `.env` are correct
- Check that `RAZORPAY_KEY_SECRET` is accurate
- Ensure order IDs match between frontend and backend

### 3. **Order Not Marked as Paid**
- Check Django logs: `python manage.py runserver`
- Verify payment verification endpoint is called
- Ensure response has correct payment details

### 4. **"Missing required payment verification fields"**
- Check that all four fields are sent from frontend:
  - `order_id`
  - `razorpay_payment_id`
  - `razorpay_order_id`
  - `razorpay_signature`

---

## Production Deployment Checklist

- [ ] Update `.env` with live Razorpay credentials
- [ ] Set `DEBUG=False` in Django settings
- [ ] Enable HTTPS (required by Razorpay)
- [ ] Configure CORS for your frontend domain
- [ ] Test with real test cards
- [ ] Review security settings in Razorpay dashboard
- [ ] Set up webhook for payment notifications (optional)
- [ ] Monitor payment verification errors
- [ ] Have error handling and logging in place

---

## Additional Resources

- **Razorpay Documentation**: https://razorpay.com/docs/
- **API Reference**: https://razorpay.com/docs/api/
- **SDK Checkout**: https://razorpay.com/docs/payments/smart-checkout/
- **Test Cards**: https://razorpay.com/docs/testing/

---

## Support & Contact

For issues or questions:
1. Check Razorpay documentation
2. Review error logs in Django
3. Check browser console for frontend errors
4. Contact Razorpay support: https://razorpay.com/support/

---

## Summary of Changes

### Backend Files Modified:
- ✅ `requirements.txt` - Added razorpay package
- ✅ `settings.py` - Added Razorpay configuration
- ✅ `store/models.py` - Added Razorpay fields to Order model
- ✅ `store/migrations/0011_add_razorpay_fields.py` - Database migration
- ✅ `store/views.py` - Updated OrderViewSet with Razorpay logic
- ✅ `store/utils/razorpay_utils.py` - New utility module (created)

### Frontend Files Modified:
- ✅ `src/lib/razorpay.js` - New Razorpay utilities (created)
- ✅ `src/pages/CheckoutPage.jsx` - Enhanced with Razorpay payment flow

---

**Integration Status:** ✅ Complete and Ready for Testing
