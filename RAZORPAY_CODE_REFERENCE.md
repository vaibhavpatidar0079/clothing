# Razorpay Integration - Code Reference

## Complete Implementation Summary

This document provides a quick lookup for all Razorpay-related code snippets.

---

## Backend Configuration

### 1. Environment Variables (`.env`)
```env
RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
```

### 2. Settings Update (`settings.py`)
```python
# Add to environ.Env() initialization:
env = environ.Env(
    ...
    RAZORPAY_KEY_ID=(str, ''),
    RAZORPAY_KEY_SECRET=(str, ''),
)

# Add at end of settings.py:
# Razorpay Configuration
RAZORPAY_KEY_ID = env('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = env('RAZORPAY_KEY_SECRET')
```

### 3. Model Fields (`models.py` - Order class)
```python
# Razorpay Integration Fields
razorpay_order_id = models.CharField(
    max_length=100, blank=True, null=True, 
    help_text="Razorpay Order ID"
)
razorpay_payment_id = models.CharField(
    max_length=100, blank=True, null=True, 
    help_text="Razorpay Payment ID"
)
razorpay_signature = models.CharField(
    max_length=255, blank=True, null=True, 
    help_text="Razorpay Payment Signature"
)
```

### 4. Imports in Views (`views.py`)
```python
import logging
from .utils.razorpay_utils import (
    handle_razorpay_payment_for_order,
    verify_and_process_razorpay_payment
)

logger = logging.getLogger(__name__)
```

---

## Backend API Implementation

### 1. Create Order Endpoint (Modified)
```python
@transaction.atomic
def create(self, request, *args, **kwargs):
    """
    Enhanced checkout with Razorpay support
    """
    user = request.user
    cart = Cart.objects.filter(user=user).first()
    
    if not cart or not cart.items.exists():
        return Response({'error': 'Cart is empty'}, status=400)

    # ... existing code for inventory checks, totals calculation ...
    
    # Payment method handling - UPDATED
    payment_method = (request.data.get('payment_method') or 'CARD').upper()
    
    if payment_method == 'COD':
        payment_status = 'pending'
        order_status = 'processing'
    elif payment_method == 'RAZORPAY':
        payment_status = 'pending'
        order_status = 'pending'  # Wait for verification
    else:
        payment_status = 'paid'
        order_status = 'processing'
    
    # Create order
    order = Order.objects.create(
        user=user,
        shipping_address=address,
        billing_address=address,
        total_amount=total_amount,
        tax_amount=tax_amount,
        shipping_cost=shipping_cost,
        discount_amount=discount_amount,
        coupon=coupon_obj,
        order_status=order_status,
        payment_status=payment_status,
        payment_method=payment_method
    )
    
    # ... create order items, clear cart ...
    
    # Handle Razorpay - NEW
    response_data = OrderSerializer(order).data
    
    if payment_method == 'RAZORPAY':
        try:
            razorpay_response = handle_razorpay_payment_for_order(order, total_amount)
            response_data['razorpay_order'] = razorpay_response
            logger.info(f"Razorpay order created for order {order.id}")
        except Exception as e:
            logger.error(f"Failed to create Razorpay order: {str(e)}")
            order.delete()
            return Response(
                {'error': f'Failed to initialize payment: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    return Response(response_data, status=status.HTTP_201_CREATED)
```

### 2. Verify Payment Endpoint (New)
```python
@action(detail=False, methods=['post'])
def verify_payment(self, request):
    """
    Verify Razorpay payment signature and mark order as paid.
    
    POST /api/v1/orders/verify_payment/
    {
        "order_id": "uuid",
        "razorpay_payment_id": "pay_xxx",
        "razorpay_order_id": "order_xxx",
        "razorpay_signature": "signature_xxx"
    }
    """
    order_id = request.data.get('order_id')
    razorpay_payment_id = request.data.get('razorpay_payment_id')
    razorpay_order_id = request.data.get('razorpay_order_id')
    razorpay_signature = request.data.get('razorpay_signature')
    
    # Validate required fields
    if not all([order_id, razorpay_payment_id, razorpay_order_id, razorpay_signature]):
        return Response(
            {'error': 'Missing required payment verification fields'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get the order
    try:
        order = Order.objects.get(id=order_id, user=request.user)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Only Razorpay orders should go through verification
    if order.payment_method != 'RAZORPAY':
        return Response(
            {'error': 'This order does not use Razorpay payment'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Verify payment signature and update order
    try:
        success, message = verify_and_process_razorpay_payment(
            order, razorpay_payment_id, razorpay_order_id, razorpay_signature
        )
        
        if success:
            return Response(
                {
                    'message': message,
                    'data': OrderSerializer(order).data
                },
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {'error': message},
                status=status.HTTP_400_BAD_REQUEST
            )
    except Exception as e:
        logger.error(f"Error verifying payment for order {order_id}: {str(e)}")
        return Response(
            {'error': f'Payment verification failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
```

---

## Razorpay Utility Module

### Location: `store/utils/razorpay_utils.py`

Key classes and functions:

```python
class RazorpayPaymentHandler:
    def __init__(self):
        """Initialize with API keys from settings"""
        self.client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )
    
    def create_razorpay_order(self, amount_in_paise, order_id, user_email, user_phone):
        """Create order on Razorpay"""
        razorpay_order = self.client.order.create(
            data={'amount': amount_in_paise, 'currency': 'INR', ...}
        )
        return razorpay_order
    
    def verify_payment_signature(self, razorpay_order_id, razorpay_payment_id, razorpay_signature):
        """Verify HMAC-SHA256 signature"""
        message = f"{razorpay_order_id}|{razorpay_payment_id}"
        computed_signature = hmac.new(
            self.key_secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        return computed_signature == razorpay_signature

def handle_razorpay_payment_for_order(order, total_amount_in_rupees):
    """Create Razorpay order and return data for frontend"""
    handler = RazorpayPaymentHandler()
    amount_in_paise = int(total_amount_in_rupees * 100)
    razorpay_order = handler.create_razorpay_order(
        amount_in_paise, str(order.id), order.user.email, order.user.phone or ''
    )
    order.razorpay_order_id = razorpay_order['id']
    order.save()
    return {
        'razorpay_order_id': razorpay_order['id'],
        'razorpay_key_id': handler.key_id,
        'amount': amount_in_paise,
        'currency': 'INR',
        ...
    }

def verify_and_process_razorpay_payment(order, razorpay_payment_id, razorpay_order_id, razorpay_signature):
    """Verify signature and mark order as paid"""
    handler = RazorpayPaymentHandler()
    if not handler.verify_payment_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
        return False, "Payment signature verification failed"
    
    order.razorpay_payment_id = razorpay_payment_id
    order.razorpay_signature = razorpay_signature
    order.payment_status = 'paid'
    order.order_status = 'processing'
    order.save()
    return True, "Payment verified successfully"
```

---

## Frontend Implementation

### 1. Razorpay Utilities (`src/lib/razorpay.js`)

```javascript
// Load Razorpay SDK dynamically
export const loadRazorpayScript = () => {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.head.appendChild(script);
  });
};

// Initialize and open payment modal
export const initializeRazorpayPayment = async (options) => {
  await loadRazorpayScript();
  const razorpayOptions = {
    key: options.razorpay_key_id,
    amount: options.amount,
    currency: options.currency,
    order_id: options.razorpay_order_id,
    prefill: {
      name: options.customer_name,
      email: options.customer_email,
      contact: options.customer_phone,
    },
    handler: (response) => {
      options.onSuccess({
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature,
      });
    },
  };
  const rzp = new window.Razorpay(razorpayOptions);
  rzp.open();
};

// Verify payment with backend
export const verifyRazorpayPayment = async (paymentDetails, orderId, apiClient) => {
  const response = await apiClient.post('orders/verify_payment/', {
    order_id: orderId,
    razorpay_payment_id: paymentDetails.razorpay_payment_id,
    razorpay_order_id: paymentDetails.razorpay_order_id,
    razorpay_signature: paymentDetails.razorpay_signature,
  });
  return response.data;
};
```

### 2. CheckoutPage Component (Modified)

```jsx
import { initializeRazorpayPayment, verifyRazorpayPayment } from '../lib/razorpay';

const handlePlaceOrder = async () => {
  if (!selectedAddress) {
    notifyError("Please select a delivery address");
    return;
  }

  setLoading(true);
  try {
    // Create order
    const response = await api.post('orders/', {
      shipping_address_id: selectedAddress,
      coupon_code: appliedCoupon ? appliedCoupon.code : null,
      payment_method: paymentMethod
    });

    const order = response.data;
    const orderId = order.id;

    // Handle Razorpay payment if selected
    if (paymentMethod === 'RAZORPAY' && order.razorpay_order) {
      const razorpayData = order.razorpay_order;
      
      try {
        // Initialize Razorpay payment
        await initializeRazorpayPayment({
          ...razorpayData,
          
          // Success callback
          onSuccess: async (paymentDetails) => {
            try {
              // Verify payment with backend
              const verifyResponse = await verifyRazorpayPayment(
                paymentDetails,
                orderId,
                api
              );

              // Success
              dispatch(clearCart());
              notifySuccess("Payment successful!");
              navigate('/profile?tab=orders');
            } catch (verifyError) {
              notifyError(verifyError.message || "Payment verification failed");
            } finally {
              setLoading(false);
            }
          },
          
          // Error callback
          onError: (error) => {
            notifyError(error.message || "Payment failed");
            setLoading(false);
          }
        });
      } catch (razorpayError) {
        notifyError(razorpayError.message || "Failed to initialize payment");
        setLoading(false);
      }
    } else {
      // For non-Razorpay payments - immediate success
      dispatch(clearCart());
      notifySuccess("Order placed successfully!");
      navigate('/profile?tab=orders');
      setLoading(false);
    }
  } catch (error) {
    notifyError(error.response?.data?.error || "Order placement failed");
    setLoading(false);
  }
};

// Payment method selection
<label className="flex items-center space-x-3">
  <input 
    type="radio" 
    name="payment" 
    value="RAZORPAY" 
    checked={paymentMethod === 'RAZORPAY'} 
    onChange={() => setPaymentMethod('RAZORPAY')} 
    className="h-4 w-4 text-black"
  />
  <span className="font-medium">Razorpay (Cards, UPI, NetBanking)</span>
</label>
```

---

## Database Migration

### File: `migrations/0011_add_razorpay_fields.py`

```python
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('store', '0010_category_show_on_home_product_show_on_home'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='razorpay_order_id',
            field=models.CharField(
                blank=True, 
                help_text='Razorpay Order ID', 
                max_length=100, 
                null=True
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='razorpay_payment_id',
            field=models.CharField(
                blank=True, 
                help_text='Razorpay Payment ID', 
                max_length=100, 
                null=True
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='razorpay_signature',
            field=models.CharField(
                blank=True, 
                help_text='Razorpay Payment Signature', 
                max_length=255, 
                null=True
            ),
        ),
    ]
```

---

## Requirements Update

### `requirements.txt` Addition
```
razorpay>=1.3.0
```

---

## Testing Requests

### 1. Create Order with Razorpay
```bash
curl -X POST http://localhost:8000/api/v1/orders/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shipping_address_id": 1,
    "payment_method": "RAZORPAY"
  }'
```

### 2. Verify Payment
```bash
curl -X POST http://localhost:8000/api/v1/orders/verify_payment/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "550e8400-e29b-41d4-a716-446655440000",
    "razorpay_payment_id": "pay_DBJOWzybf0sJbb",
    "razorpay_order_id": "order_DBJOWzybf0sJbb",
    "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d"
  }'
```

---

## Error Handling Examples

### Backend Error Response
```json
{
  "error": "Payment signature verification failed. Payment cannot be processed."
}
```

### Frontend Error Handling
```javascript
try {
  await initializeRazorpayPayment(options);
} catch (error) {
  console.error('Razorpay error:', error);
  notifyError(error.message || "Payment failed");
}
```

---

## Signature Verification Logic

```python
import hashlib
import hmac

def verify_signature(order_id, payment_id, signature, secret):
    """
    Verify Razorpay payment signature using HMAC-SHA256
    """
    message = f"{order_id}|{payment_id}"
    computed_signature = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return computed_signature == signature

# Example
is_valid = verify_signature(
    "order_DBJOWzybf0sJbb",
    "pay_DBJOWzybf0sJbb",
    "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d",
    "YOUR_RAZORPAY_SECRET"
)
```

---

## Summary

This integration provides:
1. ✅ Complete backend API for Razorpay integration
2. ✅ Frontend payment modal and verification
3. ✅ Signature verification for security
4. ✅ Database persistence of payment details
5. ✅ Error handling and logging
6. ✅ Transaction support for data integrity

All code is production-ready and follows best practices.
