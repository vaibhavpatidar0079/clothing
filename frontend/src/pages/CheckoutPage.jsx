import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { notifySuccess, notifyError } from '../lib/notify';
import { Check, Plus } from 'lucide-react';
import api from '../lib/axios';
import { clearCart } from '../store/slices/cartSlice';
import Button from '../components/ui/Button';
import AddressForm from '../components/forms/AddressForm';
import { initializeRazorpayPayment, verifyRazorpayPayment } from '../lib/razorpay';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { items, totalPrice } = useSelector((state) => state.cart);
  
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [editingAddress, setEditingAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
      return;
    }
    fetchAddresses();
    // Check if editing an address from URL
    const editId = searchParams.get('edit');
    if (editId) {
      setEditingAddressId(parseInt(editId));
      setShowAddressForm(true);
    }
  }, [items, navigate, searchParams]);

  const fetchAddresses = async () => {
    try {
      const response = await api.get('addresses/');
      // Handle both paginated and non-paginated responses
      const addressList = response.data.results || response.data;
      setAddresses(addressList);
      
      // Handle URL parameter for editing
      const editId = searchParams.get('edit');
      if (editId) {
        const addressToEdit = addressList.find(a => a.id === parseInt(editId));
        if (addressToEdit) {
          setEditingAddress(addressToEdit);
          setEditingAddressId(parseInt(editId));
        }
      } else {
        if (addressList.length > 0) {
          // Auto select default or first
          const def = addressList.find(a => a.is_default);
          setSelectedAddress(def ? def.id : addressList[0].id);
        } else {
          setShowAddressForm(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch addresses:", error);
    }
  };

  const handleAddressSubmit = async (formData) => {
    setLoading(true);
    try {
      if (editingAddressId) {
        // Update existing address
        const response = await api.patch(`addresses/${editingAddressId}/`, formData);
        setAddresses(addresses.map(a => a.id === editingAddressId ? response.data : a));
        notifySuccess("Address updated successfully");
      } else {
        // Create new address
        const response = await api.post('addresses/', formData);
        const createdAddress = response.data;
        setAddresses([...addresses, createdAddress]);
        setSelectedAddress(createdAddress.id);
        notifySuccess("Address added successfully");
      }
      setShowAddressForm(false);
      setEditingAddressId(null);
      setEditingAddress(null);
    } catch (error) {
      console.error("Address submission error:", error);
      const errorMsg = error.response?.data?.detail || 
                       Object.values(error.response?.data || {}).flat().join(', ') ||
                       "Failed to save address";
      notifyError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      notifyError("Please select a delivery address");
      return;
    }

    setLoading(true);
    try {
      // 1. Create Order
      // Use Razorpay for all online payment methods (CARD, GPAY, etc.)
      const response = await api.post('orders/', {
        shipping_address_id: selectedAddress,
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
        payment_method: paymentMethod === 'COD' ? 'COD' : 'RAZORPAY'
      });

      const order = response.data;
      const orderId = order.id;

      // 2. Handle Razorpay Payment if backend returned razorpay order data
      if (order.razorpay_order) {
        const razorpayData = order.razorpay_order;
        // Debug: log backend order payload so we can inspect the values
        // eslint-disable-next-line no-console
        console.debug('Order created:', order);
        // eslint-disable-next-line no-console
        console.debug('Razorpay payload from backend:', razorpayData);
        
        try {
          // Initialize Razorpay payment
          await initializeRazorpayPayment({
            razorpay_key_id: razorpayData.razorpay_key_id,
            razorpay_order_id: razorpayData.razorpay_order_id,
            amount: razorpayData.amount,
            currency: razorpayData.currency,
            customer_name: razorpayData.customer_name,
            customer_email: razorpayData.customer_email,
            customer_phone: razorpayData.customer_phone,
            order_id: orderId,
            
            // Success callback
            onSuccess: async (paymentDetails) => {
              // eslint-disable-next-line no-console
              console.debug('Razorpay onSuccess paymentDetails:', paymentDetails);
              try {
                // Verify payment with backend
                const verifyResponse = await verifyRazorpayPayment(
                  paymentDetails,
                  orderId,
                  api
                );

                // Clear cart and redirect
                dispatch(clearCart());
                notifySuccess("Payment successful! Your order is being processed.");
                navigate('/profile?tab=orders');
              } catch (verifyError) {
                console.error('Payment verification error:', verifyError);
                notifyError(verifyError.message || "Payment verification failed");
              } finally {
                setLoading(false);
              }
            },
            
            // Error callback
            onError: (error) => {
              // eslint-disable-next-line no-console
              console.error('Razorpay error:', error);
              notifyError(error.message || "Payment failed. Please try again.");
              setLoading(false);
            }
          });
        } catch (razorpayError) {
          console.error('Razorpay initialization error:', razorpayError);
          notifyError(razorpayError.message || "Failed to initialize payment");
          setLoading(false);
        }
      } else {
        // For COD (or any non-online) payments - immediate success
        dispatch(clearCart());
        notifySuccess("Order placed successfully!");
        navigate('/profile?tab=orders');
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      notifyError(error.response?.data?.error || "Order placement failed");
      setLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) {
      notifyError('Enter a coupon code');
      return;
    }
    setLoading(true);
    try {
      const resp = await api.post('orders/validate_coupon/', { coupon_code: couponCode });
      if (resp.data && resp.data.valid) {
        setAppliedCoupon({ code: couponCode, discount: parseFloat(resp.data.discount) });
        notifySuccess('Coupon applied');
      } else {
        setAppliedCoupon(null);
        notifyError(resp.data?.error || 'Invalid coupon');
      }
    } catch (err) {
      console.error(err);
      setAppliedCoupon(null);
      notifyError(err.response?.data?.error || 'Failed to validate coupon');
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const shipping = totalPrice > 1000 ? 0 : 99;
  const tax = Math.round(totalPrice * 0.18);
  const discountAmount = appliedCoupon ? Number(appliedCoupon.discount || 0) : 0;
  const finalTotal = parseFloat(totalPrice) + shipping + tax - discountAmount;

  return (
    <div className="container mx-auto px-4 md:px-6 py-8">
      <h1 className="text-3xl font-serif font-bold mb-8">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Address Section */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center justify-between">
              <span>Shipping Address</span>
              {!showAddressForm && (
                <button 
                  onClick={() => setShowAddressForm(true)}
                  className="text-sm font-normal text-blue-600 hover:underline flex items-center"
                >
                  <Plus size={16} className="mr-1"/> Add New
                </button>
              )}
            </h2>

            {showAddressForm ? (
              <AddressForm
                onSubmit={handleAddressSubmit}
                onCancel={() => {
                  setShowAddressForm(false);
                  setEditingAddressId(null);
                  setEditingAddress(null);
                }}
                loading={loading}
                initialAddress={editingAddress}
                isEditing={!!editingAddressId}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map(addr => (
                  <div 
                    key={addr.id}
                    onClick={() => setSelectedAddress(addr.id)}
                    className={`
                      cursor-pointer p-4 rounded-sm border-2 transition-all relative
                      ${selectedAddress === addr.id ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}
                    `}
                  >
                    {selectedAddress === addr.id && (
                      <div className="absolute top-2 right-2 bg-black text-white rounded-full p-1">
                        <Check size={12} />
                      </div>
                    )}
                    <p className="font-bold">{addr.full_name}</p>
                    <p className="text-sm text-gray-600 mt-1">{addr.address_line_1}</p>
                    <p className="text-sm text-gray-600">{addr.city}, {addr.pincode}</p>
                    <p className="text-sm text-gray-600 mt-2 font-medium">Phone: {addr.phone}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Payment Method */}
          <section>
            <h2 className="text-xl font-bold mb-4">Payment Method</h2>
            <div className="p-4 border border-gray-200 rounded-sm bg-gray-50 space-y-3">
              <label className="flex items-center space-x-3">
                <input type="radio" name="payment" value="CARD" checked={paymentMethod === 'CARD'} onChange={() => setPaymentMethod('CARD')} className="h-4 w-4 text-black focus:ring-black" />
                <span className="font-medium">Credit / Debit Card (Simulated)</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="radio" name="payment" value="GPAY" checked={paymentMethod === 'GPAY'} onChange={() => setPaymentMethod('GPAY')} className="h-4 w-4 text-black focus:ring-black" />
                <span className="font-medium">GPay / UPI (Simulated)</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="radio" name="payment" value="RAZORPAY" checked={paymentMethod === 'RAZORPAY'} onChange={() => setPaymentMethod('RAZORPAY')} className="h-4 w-4 text-black focus:ring-black" />
                <span className="font-medium">Razorpay (Cards, UPI, NetBanking)</span>
              </label>
              <label className="flex items-center space-x-3">
                <input type="radio" name="payment" value="COD" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} className="h-4 w-4 text-black focus:ring-black" />
                <span className="font-medium">Cash on Delivery (COD)</span>
              </label>

              {paymentMethod === 'CARD' && (
                <div className="mt-4 pl-7">
                  <div className="bg-white p-3 border border-gray-200 rounded text-sm text-gray-500">
                    <p>Card ending in 4242 (demo)</p>
                    <p>Expiry: 12/25</p>
                  </div>
                </div>
              )}

              {paymentMethod === 'RAZORPAY' && (
                <div className="mt-4 pl-7">
                  <div className="bg-white p-3 border border-gray-200 rounded text-sm text-gray-600">
                    <p className="font-medium">You will be redirected to Razorpay's secure payment gateway.</p>
                    <p className="text-gray-500 mt-1">Supported: Credit Cards, Debit Cards, Net Banking, UPI, Wallets</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Summary */}
        <div className="h-fit space-y-6">
          <div className="bg-gray-50 p-6 rounded-sm">
            <h3 className="text-lg font-bold mb-4">Order Summary</h3>
            <div className="space-y-4 max-h-60 overflow-auto mb-6 pr-2">
              {items.map(item => (
                <div key={item.id} className="flex gap-4 text-sm">
                   <div className="h-16 w-12 bg-gray-200 flex-shrink-0">
                      <img 
                        src={
                          item.product?.primary_image 
                            ? (item.product.primary_image.startsWith('http') 
                                ? item.product.primary_image 
                                : `http://localhost:8000${item.product.primary_image}`)
                            : "https://via.placeholder.com/150"
                        }
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/150";
                        }}
                      />
                   </div>
                   <div className="flex-1">
                      <p className="font-medium line-clamp-1">{item.product?.title}</p>
                      <p className="text-gray-500">Qty: {item.quantity}</p>
                   </div>
                   <p className="font-medium">₹{item.subtotal}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>₹{totalPrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span>{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Taxes</span>
                <span>₹{tax}</span>
              </div>
            </div>

            {/* Coupon Input */}
            <div className="mt-4 mb-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Coupon code"
                  className="flex-1 p-2 border rounded-sm"
                />
                <button onClick={handleApplyCoupon} className="px-4 py-2 bg-black text-white rounded-sm">Apply</button>
              </div>
              {appliedCoupon && (
                <div className="text-sm text-green-700 mt-2">Applied: {appliedCoupon.code} - ₹{appliedCoupon.discount}</div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>₹{finalTotal}</span>
            </div>

            <Button 
              className="w-full mt-6 py-4" 
              onClick={handlePlaceOrder}
              isLoading={loading}
              disabled={!selectedAddress}
            >
              Pay ₹{finalTotal}
            </Button>
            
            <p className="text-xs text-center text-gray-500 mt-4">
              By placing an order, you agree to our Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;