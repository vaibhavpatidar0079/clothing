"""
Razorpay Payment Gateway Utilities.
Handles order creation, payment verification, and signature validation.
"""

import razorpay
import hashlib
import hmac
from django.conf import settings
from django.db import transaction
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class RazorpayPaymentHandler:
    """
    Handles all Razorpay payment operations.
    Provides methods for order creation and payment verification.
    """
    
    def __init__(self):
        """Initialize Razorpay client with API keys from settings."""
        if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
            raise ValueError(
                "Razorpay credentials not configured. "
                "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables."
            )
        
        self.client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )
        self.key_id = settings.RAZORPAY_KEY_ID
        self.key_secret = settings.RAZORPAY_KEY_SECRET
    
    def create_razorpay_order(self, amount_in_paise, order_id, user_email, user_phone):
        """
        Create a Razorpay order for the given amount.
        
        Args:
            amount_in_paise (int): Amount in paise (₹100 = 10000 paise)
            order_id (str): Your application's order ID (UUID)
            user_email (str): Customer email
            user_phone (str): Customer phone number
        
        Returns:
            dict: Razorpay order response with 'id', 'amount', 'currency', etc.
        
        Raises:
            Exception: If Razorpay API call fails
        """
        try:
            razorpay_order = self.client.order.create(
                data={
                    'amount': amount_in_paise,
                    'currency': 'INR',
                    'receipt': str(order_id),  # Your order ID as receipt
                    'notes': {
                        'order_id': str(order_id),
                    }
                }
            )
            logger.info(f"Razorpay order created: {razorpay_order['id']}")
            return razorpay_order
        except Exception as e:
            logger.error(f"Failed to create Razorpay order: {str(e)}")
            raise Exception(f"Failed to create payment order: {str(e)}")
    
    def verify_payment_signature(self, razorpay_order_id, razorpay_payment_id, razorpay_signature):
        """
        Verify the Razorpay payment signature for security.
        
        This validates that the payment response came from Razorpay.
        
        Args:
            razorpay_order_id (str): Order ID from Razorpay
            razorpay_payment_id (str): Payment ID from Razorpay
            razorpay_signature (str): Signature from Razorpay
        
        Returns:
            bool: True if signature is valid, False otherwise
        """
        try:
            # Create the message to verify (order_id|payment_id)
            message = f"{razorpay_order_id}|{razorpay_payment_id}"

            # Create HMAC-SHA256 signature using utf-8
            computed_signature = hmac.new(
                self.key_secret.encode('utf-8'),
                message.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()

            # Constant-time compare to mitigate timing attacks
            is_valid = hmac.compare_digest(computed_signature, razorpay_signature)
            
            if is_valid:
                logger.info(f"Payment signature verified for payment {razorpay_payment_id}")
            else:
                logger.warning(f"Invalid payment signature for payment {razorpay_payment_id}")
            
            return is_valid
        except Exception as e:
            logger.error(f"Error verifying payment signature: {str(e)}")
            return False
    
    def fetch_payment_details(self, razorpay_payment_id):
        """
        Fetch payment details from Razorpay API.
        
        Args:
            razorpay_payment_id (str): Payment ID to fetch details for
        
        Returns:
            dict: Payment details from Razorpay
        
        Raises:
            Exception: If API call fails
        """
        try:
            payment = self.client.payment.fetch(razorpay_payment_id)
            return payment
        except Exception as e:
            logger.error(f"Failed to fetch payment details: {str(e)}")
            raise Exception(f"Failed to fetch payment details: {str(e)}")


def handle_razorpay_payment_for_order(order, total_amount_in_rupees):
    """
    Create a Razorpay order for the given Order instance.
    
    Args:
        order: Order model instance
        total_amount_in_rupees (Decimal): Total amount in rupees
    
    Returns:
        dict: Razorpay order response with payment details for frontend
    
    Raises:
        Exception: If Razorpay order creation fails
    """
    handler = RazorpayPaymentHandler()
    
    # Convert rupees (Decimal or numeric) to paise (1 rupee = 100 paise)
    if not isinstance(total_amount_in_rupees, Decimal):
        total_amount_in_rupees = Decimal(str(total_amount_in_rupees))
    amount_in_paise = int((total_amount_in_rupees * Decimal('100')).to_integral_value())
    
    # Create Razorpay order
    razorpay_order = handler.create_razorpay_order(
        amount_in_paise=amount_in_paise,
        order_id=str(order.id),
        user_email=order.user.email,
        user_phone=order.user.phone or ''
    )
    
    # Save Razorpay order ID to the Order model
    with transaction.atomic():
        order.razorpay_order_id = razorpay_order['id']
        order.save(update_fields=['razorpay_order_id'])
    
    # Return response for frontend with all necessary data
    return {
        'razorpay_order_id': razorpay_order['id'],
        'razorpay_key_id': handler.key_id,
        'amount': amount_in_paise,
        'currency': 'INR',
        'customer_email': order.user.email,
        'customer_phone': order.user.phone or '',
        'customer_name': f"{order.user.first_name} {order.user.last_name}".strip(),
        'order_id': str(order.id),
    }


def verify_and_process_razorpay_payment(order, razorpay_payment_id, razorpay_order_id, razorpay_signature):
    """
    Verify Razorpay payment signature and mark order as paid if valid.
    
    Args:
        order: Order model instance
        razorpay_payment_id (str): Payment ID from Razorpay
        razorpay_order_id (str): Order ID from Razorpay
        razorpay_signature (str): Payment signature from Razorpay
    
    Returns:
        tuple: (success: bool, message: str)
    
    Raises:
        Exception: If verification process fails
    """
    handler = RazorpayPaymentHandler()
    
    # Basic checks: if order doesn't yet have a razorpay_order_id, store it;
    # otherwise ensure it matches the provided razorpay_order_id
    if not order.razorpay_order_id:
        logger.info(f"Order {order.id} missing razorpay_order_id; setting from payload: {razorpay_order_id}")
        order.razorpay_order_id = razorpay_order_id
        order.save(update_fields=['razorpay_order_id'])
    elif str(order.razorpay_order_id) != str(razorpay_order_id):
        logger.warning(f"Razorpay order id mismatch for order {order.id}: expected={order.razorpay_order_id} got={razorpay_order_id}")
        return False, "Payment order mismatch. Verification failed."

    # Verify signature
    if not handler.verify_payment_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
        logger.warning(f"Invalid signature for order {order.id}")
        return False, "Payment signature verification failed. Payment cannot be processed."

    # Idempotency: if already paid, accept silently
    if getattr(order, 'payment_status', '') == 'paid':
        logger.info(f"Order {order.id} already marked as paid; skipping re-processing")
        return True, "Payment already processed."

    # Fetch payment details from Razorpay and validate
    try:
        payment = handler.fetch_payment_details(razorpay_payment_id)
    except Exception as e:
        logger.error(f"Failed to fetch payment details for payment {razorpay_payment_id}: {e}")
        return False, "Failed to validate payment with provider."

    # Validate payment status and amount
    # Razorpay payment amount is in paise (integer)
    provider_status = payment.get('status')
    provider_amount = int(payment.get('amount') or 0)
    provider_order_id = payment.get('order_id')

    # Expected amount (paise)
    expected_amount_paise = None
    try:
        expected_amount_paise = int((order.total_amount * Decimal('100')).to_integral_value())
    except Exception:
        # Fallback: if order has 'total' or other field names, attempt graceful handling
        try:
            expected_amount_paise = int((Decimal(str(getattr(order, 'total', 0))) * Decimal('100')).to_integral_value())
        except Exception:
            expected_amount_paise = None

    if provider_status != 'captured':
        logger.warning(f"Payment {razorpay_payment_id} not captured: status={provider_status}")
        return False, "Payment not captured. Please complete the payment in the payment gateway."

    if expected_amount_paise is not None and provider_amount != expected_amount_paise:
        logger.error(f"Payment amount mismatch for order {order.id}: expected={expected_amount_paise} got={provider_amount}")
        return False, "Payment amount mismatch. Verification failed."

    if provider_order_id != razorpay_order_id:
        logger.error(f"Payment order_id mismatch: payment.{razorpay_payment_id}.order_id={provider_order_id} vs {razorpay_order_id}")
        return False, "Payment belongs to a different order. Verification failed."

    # All checks passed; update order with payment details
    with transaction.atomic():
        order.razorpay_payment_id = razorpay_payment_id
        order.razorpay_signature = razorpay_signature
        order.payment_status = 'paid'
        order.order_status = 'processing'  # Move to processing after payment
        order.save(update_fields=['razorpay_payment_id', 'razorpay_signature', 'payment_status', 'order_status'])

    logger.info(f"Order {order.id} payment verified and marked as paid")
    return True, "Payment verified successfully. Order is now being processed."
