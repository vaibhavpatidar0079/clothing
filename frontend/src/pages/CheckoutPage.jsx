import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';
import { Check, Plus } from 'lucide-react';
import api from '../lib/axios';
import { clearCart } from '../store/slices/cartSlice';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { items, totalPrice } = useSelector((state) => state.cart);
  
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // New Address Form State
  const [newAddress, setNewAddress] = useState({
    full_name: '',
    phone: '',
    address_line_1: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India'
  });

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
      return;
    }
    fetchAddresses();
  }, [items, navigate]);

  const fetchAddresses = async () => {
    try {
      const response = await api.get('addresses/');
      // Handle both paginated and non-paginated responses
      const addressList = response.data.results || response.data;
      setAddresses(addressList);
      if (addressList.length > 0) {
        // Auto select default or first
        const def = addressList.find(a => a.is_default);
        setSelectedAddress(def ? def.id : addressList[0].id);
      } else {
        setShowAddressForm(true);
      }
    } catch (error) {
      console.error("Failed to fetch addresses:", error);
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('addresses/', newAddress);
      // response.data is the created address object
      const createdAddress = response.data;
      setAddresses([...addresses, createdAddress]);
      setSelectedAddress(createdAddress.id);
      setShowAddressForm(false);
      toast.success("Address added successfully");
      // Reset form
      setNewAddress({
        full_name: '',
        phone: '',
        address_line_1: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      });
    } catch (error) {
      console.error("Address submission error:", error.response?.data || error.message);
      const errorMsg = error.response?.data?.detail || 
                       Object.values(error.response?.data || {}).flat().join(', ') || 
                       "Failed to add address";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error("Please select a delivery address");
      return;
    }

    setLoading(true);
    try {
      // 1. Create Order
      const response = await api.post('orders/', {
        shipping_address_id: selectedAddress,
        coupon_code: null // Implement coupon logic here if needed
      });

      // 2. Clear Local Cart
      dispatch(clearCart());
      
      // 3. Success & Redirect
      toast.success("Order placed successfully!");
      navigate('/profile?tab=orders');
      
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Order placement failed");
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const shipping = totalPrice > 1000 ? 0 : 99;
  const tax = Math.round(totalPrice * 0.18);
  const finalTotal = parseFloat(totalPrice) + shipping + tax;

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
              <form onSubmit={handleAddressSubmit} className="bg-gray-50 p-6 rounded-sm border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <Input 
                    label="Full Name" 
                    required 
                    value={newAddress.full_name}
                    onChange={e => setNewAddress({...newAddress, full_name: e.target.value})}
                  />
                  <Input 
                    label="Phone" 
                    required 
                    value={newAddress.phone}
                    onChange={e => setNewAddress({...newAddress, phone: e.target.value})}
                  />
                </div>
                <Input 
                  label="Address" 
                  className="mb-4"
                  required 
                  value={newAddress.address_line_1}
                  onChange={e => setNewAddress({...newAddress, address_line_1: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Input 
                    label="City" 
                    required 
                    value={newAddress.city}
                    onChange={e => setNewAddress({...newAddress, city: e.target.value})}
                  />
                  <Input 
                    label="Pincode" 
                    required 
                    value={newAddress.pincode}
                    onChange={e => setNewAddress({...newAddress, pincode: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <Input 
                    label="State" 
                    required 
                    value={newAddress.state}
                    onChange={e => setNewAddress({...newAddress, state: e.target.value})}
                  />
                  <Input 
                    label="Country" 
                    disabled
                    value={newAddress.country}
                  />
                </div>
                <div className="flex gap-4">
                  <Button type="submit" isLoading={loading}>Save Address</Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddressForm(false)}>Cancel</Button>
                </div>
              </form>
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

          {/* Payment Method (Mock) */}
          <section>
            <h2 className="text-xl font-bold mb-4">Payment Method</h2>
            <div className="p-4 border border-gray-200 rounded-sm bg-gray-50">
              <label className="flex items-center space-x-3">
                <input type="radio" checked readOnly className="h-4 w-4 text-black focus:ring-black" />
                <span className="font-medium">Credit / Debit Card (Simulated)</span>
              </label>
              <div className="mt-4 pl-7">
                <div className="bg-white p-3 border border-gray-200 rounded text-sm text-gray-500">
                  <p>Card ending in 4242</p>
                  <p>Expiry: 12/25</p>
                </div>
              </div>
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