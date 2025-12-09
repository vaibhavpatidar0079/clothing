# Razorpay Integration - Setup & Testing Instructions

## 🚀 Quick Setup (5 Minutes)

### Step 1: Get Razorpay Credentials (2 minutes)
1. Go to https://dashboard.razorpay.com/
2. Sign up or login
3. Go to Settings → API Keys
4. Copy your **Key ID** and **Secret**

### Step 2: Configure Backend (1 minute)
1. Open `backend/.env` file
2. Add these lines:
```env
RAZORPAY_KEY_ID=your_key_id_here
RAZORPAY_KEY_SECRET=your_secret_here
```

### Step 3: Install & Migrate (2 minutes)
```bash
# In terminal, go to backend folder
cd backend

# Install Razorpay package
pip install razorpay

# Run migration
python manage.py migrate store
```

### Step 4: Start Application
```bash
# Terminal 1 - Backend
cd backend
python manage.py runserver

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

✅ **Setup Complete!** You're ready to test.

---

## 🧪 Testing Payment Flow

### Test 1: Open Checkout Page
1. Go to http://localhost:5173
2. Add any product to cart
3. Go to Cart page
4. Click "Proceed to Checkout"
5. Select a delivery address (or add new one)

### Test 2: Select Razorpay Payment
1. In "Payment Method" section
2. Select radio button: **"Razorpay (Cards, UPI, NetBanking)"**
3. Notice the information text about supported payment methods

### Test 3: Complete Payment
1. Click the **"Pay ₹XXXX"** button
2. Razorpay payment modal opens
3. You'll see payment options

### Test 4: Use Test Card
In the Razorpay modal, use this test card:
```
Card Number:  4111 1111 1111 1111
Expiry:       Any future date (e.g., 12/25)
CVV:          Any 3 digits (e.g., 123)
```

### Test 5: Verify Success
1. After entering card details, click "Pay"
2. You should see success message
3. You'll be redirected to Orders page
4. Order should show status: **"Processing"** (payment successful)

---

## ✓ Verification Checklist

After completing the payment flow:

- [ ] Order appears in Orders list
- [ ] Order status shows "Processing"
- [ ] Payment status shows "Paid"
- [ ] Success notification appeared
- [ ] Cart was cleared (can't see items anymore)
- [ ] Razorpay order ID is stored in database
- [ ] Payment ID is stored in database
- [ ] Signature is stored in database

### Check Database Directly
```bash
# In Django shell
python manage.py shell

# Run these commands:
from store.models import Order
order = Order.objects.latest('created_at')
print(f"Order ID: {order.id}")
print(f"Payment Status: {order.payment_status}")
print(f"Razorpay Order ID: {order.razorpay_order_id}")
print(f"Razorpay Payment ID: {order.razorpay_payment_id}")
print(f"Razorpay Signature: {order.razorpay_signature}")
exit()
```

---

## 🔍 Testing Different Scenarios

### Scenario 1: Successful Payment (Already Done)
✅ Use test card `4111 1111 1111 1111`
- Expected: Order marked as paid, redirect to orders

### Scenario 2: Cancel Payment
1. In Razorpay modal, close the modal (X button)
2. You should see error: "Payment cancelled by user"
3. You stay on checkout page
4. Order should NOT be created

**Result:** ✅ Order not created, user can try again

### Scenario 3: Use Different Payment Method
1. Go back to checkout
2. Select "Credit / Debit Card (Simulated)"
3. Click Pay
4. Order created with status: Paid (no Razorpay flow)

**Result:** ✅ Other payment methods still work

### Scenario 4: Use COD
1. Go back to checkout
2. Select "Cash on Delivery"
3. Click "Place Order" button (Pay button changes text)
4. Order created with status: Pending (user pays later)

**Result:** ✅ COD payment method works

---

## 🐛 Common Issues & Solutions

### Issue 1: "pip: command not found"
**Solution:**
```bash
# Use python's pip module instead
python -m pip install razorpay
```

### Issue 2: "No module named razorpay"
**Solution:**
```bash
# Make sure you're in the right virtual environment
# If using venv:
source venv/Scripts/activate  # On Linux/Mac
venv\Scripts\activate  # On Windows
pip install razorpay
```

### Issue 3: "RAZORPAY_KEY_ID not configured"
**Solution:**
1. Check if `.env` file exists in `backend` folder
2. Verify the format is: `RAZORPAY_KEY_ID=your_key`
3. Restart Django: `Ctrl+C` and rerun `python manage.py runserver`

### Issue 4: Razorpay modal doesn't open
**Solution:**
1. Check browser console (F12 → Console tab)
2. Look for error messages about loading script
3. Try in incognito mode (rules out browser extensions)
4. Verify internet connection (SDK loads from CDN)

### Issue 5: "Payment signature verification failed"
**Solution:**
1. Check API Secret in `.env` is EXACTLY correct
2. No spaces before/after the value
3. Restart Django after changing .env
4. Make sure you're using test keys (not live keys)

### Issue 6: Order created but payment not verified
**Solution:**
1. Check Django logs for errors
2. Verify all payment details are being sent
3. Check network tab in browser (F12 → Network)
4. Look for 400/500 errors in API calls

---

## 📊 Monitoring & Logs

### Django Logs
Watch for payment-related logs:
```bash
# You should see:
"Razorpay order created for order xxxxx"
"Payment signature verified for payment pay_xxxxx"
```

### Browser Console (F12)
Check for JavaScript errors:
- Script loading errors
- API request failures
- Payment modal issues

### Network Tab (F12 → Network)
Monitor API calls:
1. `POST /api/v1/orders/` - Create order
2. `POST /api/v1/orders/verify_payment/` - Verify payment

Both should return **200 OK** status.

---

## 🎯 Expected Response Examples

### Successful Create Order Response
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "order_status": "pending",
  "payment_status": "pending",
  "payment_method": "RAZORPAY",
  "total_amount": "5000.00",
  "razorpay_order": {
    "razorpay_order_id": "order_DBJOWzybf0sJbb",
    "razorpay_key_id": "rzp_test_ExjpAUN3gVHrPJ",
    "amount": 500000,
    "currency": "INR",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "+919876543210"
  }
}
```

### Successful Payment Verification Response
```json
{
  "message": "Payment verified successfully. Order is now being processed.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "order_status": "processing",
    "payment_status": "paid",
    "payment_method": "RAZORPAY",
    "razorpay_payment_id": "pay_DBJOWzybf0sJbb",
    "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
  }
}
```

---

## 📱 Mobile Testing

### Testing on Mobile Device
1. Find your computer's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. On mobile, go to: `http://YOUR_IP:5173`
3. Test payment flow on mobile Razorpay modal

### Mobile Tips
- Razorpay modal is responsive
- Works on all modern mobile browsers
- Test with actual test card (not phone validation)

---

## 🔐 Security Verification

### Verify Signature Verification Works
1. In Django shell, test signature verification:
```python
from store.utils.razorpay_utils import RazorpayPaymentHandler
handler = RazorpayPaymentHandler()

# Test with valid signature
valid = handler.verify_payment_signature(
    "order_DBJOWzybf0sJbb",
    "pay_DBJOWzybf0sJbb",
    "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
)
print(f"Valid signature: {valid}")  # Should be True or False

# Test with invalid signature
invalid = handler.verify_payment_signature(
    "order_DBJOWzybf0sJbb",
    "pay_DBJOWzybf0sJbb",
    "invalid_signature"
)
print(f"Invalid signature: {invalid}")  # Should be False
```

### Verify API Keys Protection
1. Check `.env` is in `.gitignore`
2. Never commit `.env` to git
3. Verify keys are not in any source files

---

## 📈 Performance Testing

### Test Multiple Orders
1. Create 5-10 orders
2. Verify all payments
3. Check database performance
4. Monitor Django logs

### Load Testing
1. Simulate concurrent users
2. Ensure signature verification doesn't bottleneck
3. Check database transaction handling

---

## 🚀 Advanced Testing

### Test with Different Browsers
- Chrome
- Firefox
- Safari
- Edge

### Test Network Conditions
1. Throttle network (Chrome DevTools)
2. Test with slow 3G connection
3. Verify error handling

### Test Error Scenarios
1. Disconnect internet during payment
2. Close modal abruptly
3. Refresh page during payment
4. Test with invalid API keys

---

## ✅ Final Verification Checklist

Before deploying to production:

- [ ] Can create order with Razorpay
- [ ] Payment modal opens
- [ ] Payment completes successfully
- [ ] Signature verification works
- [ ] Order marked as paid
- [ ] Cart cleared after payment
- [ ] Redirect works correctly
- [ ] Error messages display properly
- [ ] Logs show expected messages
- [ ] Database stores all payment details
- [ ] API keys protected in .env
- [ ] Works on mobile
- [ ] Works on different browsers
- [ ] Network errors handled gracefully

---

## 📞 Getting Help

### If Something Doesn't Work

1. **Check Django Logs**
   ```bash
   # Terminal showing "runserver" output
   # Look for error messages
   ```

2. **Check Browser Console**
   ```
   Press F12 → Console tab
   Look for red error messages
   ```

3. **Check Network Requests**
   ```
   Press F12 → Network tab
   Click "Pay" button
   Look for failing requests
   ```

4. **Check .env Configuration**
   ```bash
   # Verify file exists and contains keys
   cat backend/.env
   ```

5. **Verify Migration Ran**
   ```bash
   python manage.py showmigrations store
   # Should show ✓ for 0011_add_razorpay_fields
   ```

---

## 🎓 Learning Resources

- **Razorpay JavaScript SDK:** https://razorpay.com/docs/payments/smart-checkout/
- **API Documentation:** https://razorpay.com/docs/api/
- **Test Credentials:** https://razorpay.com/docs/testing/
- **Security Best Practices:** https://razorpay.com/docs/payments/payments/

---

## 📝 Testing Log Template

Keep track of your tests:

```
Date: ____
Time: ____

Test Scenario: ___________________________
Expected Result: ___________________________
Actual Result: ___________________________
Status: ✅ Pass / ❌ Fail
Notes: ___________________________

Browser: ____
Device: ____
Network: ____
```

---

**You're All Set!** ✅

Start with **Step 1: Get Razorpay Credentials** and follow through to **Test 5: Verify Success**.

If you encounter any issues, refer to the **Common Issues & Solutions** section.

**Happy Testing!** 🎉
