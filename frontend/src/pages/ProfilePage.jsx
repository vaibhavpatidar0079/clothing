import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, MapPin, User as UserIcon, LogOut, Trash2, Edit2, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../store/slices/authSlice';
import api from '../lib/axios';
import { toast } from 'react-hot-toast';
import Button from '../components/ui/Button';

const ProfilePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);

  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteAddressId, setDeleteAddressId] = useState(null);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'addresses') {
      fetchAddresses();
    }
  }, [activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('orders/');
      // Handle both paginated and non-paginated responses
      const ordersList = response.data.results || response.data;
      setOrders(ordersList);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const response = await api.get('addresses/');
      // Handle both paginated and non-paginated responses
      const addressList = response.data.results || response.data;
      setAddresses(addressList);
    } catch (error) {
      console.error("Failed to fetch addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    try {
      await api.post(`orders/${cancelOrderId}/cancel/`);
      toast.success("Order cancelled successfully");
      setShowCancelDialog(false);
      setCancelOrderId(null);
      fetchOrders();
    } catch (error) {
      console.error("Failed to cancel order:", error);
      const errorMsg = error.response?.data?.error || "Failed to cancel order";
      toast.error(errorMsg);
    }
  };

  const handleDeleteAddress = async () => {
    setDeleting(true);
    try {
      const response = await api.delete(`addresses/${deleteAddressId}/`);
      console.log("Delete response:", response);
      toast.success("Address deleted successfully");
      setShowDeleteDialog(false);
      setDeleteAddressId(null);
      fetchAddresses();
    } catch (error) {
      console.error("Failed to delete address:", error.response?.data || error.message);
      // Handle both detail field and direct error messages
      let errorMsg = "Failed to delete address";
      
      if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (typeof error.response?.data === 'string') {
        errorMsg = error.response.data;
      } else {
        const errors = Object.values(error.response?.data || {});
        if (errors.length > 0) {
          errorMsg = errors.flat().join(', ');
        }
      }
      
      toast.error(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <h1 className="text-3xl font-serif font-bold mb-8">My Account</h1>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white border border-gray-100 rounded-sm shadow-sm overflow-hidden">
            <button 
              onClick={() => setSearchParams({ tab: 'profile' })}
              className={`w-full text-left px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors ${activeTab === 'profile' ? 'bg-gray-50 font-bold border-l-4 border-black' : ''}`}
            >
              <UserIcon size={18} /> Profile
            </button>
            <button 
              onClick={() => setSearchParams({ tab: 'orders' })}
              className={`w-full text-left px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors ${activeTab === 'orders' ? 'bg-gray-50 font-bold border-l-4 border-black' : ''}`}
            >
              <Package size={18} /> Orders
            </button>
            <button 
              onClick={() => setSearchParams({ tab: 'addresses' })}
              className={`w-full text-left px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors ${activeTab === 'addresses' ? 'bg-gray-50 font-bold border-l-4 border-black' : ''}`}
            >
              <MapPin size={18} /> Addresses
            </button>
            <button 
              onClick={handleLogout}
              className="w-full text-left px-6 py-4 flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
            >
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
             <div className="bg-white border border-gray-100 p-8 rounded-sm">
                <h2 className="text-xl font-bold mb-6">Personal Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                      <label className="block text-sm text-gray-500 mb-1">Full Name</label>
                      <p className="font-medium text-lg">{user?.first_name} {user?.last_name}</p>
                   </div>
                   <div>
                      <label className="block text-sm text-gray-500 mb-1">Email</label>
                      <p className="font-medium text-lg">{user?.email}</p>
                   </div>
                </div>
                <div className="mt-8">
                   <Button variant="outline">Edit Profile</Button>
                </div>
             </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Order History</h2>
              {loading ? (
                <p>Loading orders...</p>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-sm">
                  <Package size={48} className="mx-auto text-gray-300 mb-4"/>
                  <p className="text-gray-500">No orders yet</p>
                  <Button variant="link" onClick={() => navigate('/shop')}>Start Shopping</Button>
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="bg-white border border-gray-200 rounded-sm overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4">
                      <div className="flex gap-8 text-sm">
                        <div>
                           <span className="block text-gray-500 text-xs uppercase">Order Placed</span>
                           <span className="font-medium">{new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                        <div>
                           <span className="block text-gray-500 text-xs uppercase">Total</span>
                           <span className="font-medium">₹{order.total_amount}</span>
                        </div>
                        <div>
                           <span className="block text-gray-500 text-xs uppercase">Ship To</span>
                           <span className="font-medium">{order.shipping_address?.full_name}</span>
                        </div>
                      </div>
                      <div className="text-sm">
                         <span className="text-gray-500">Order # {order.id}</span>
                      </div>
                    </div>
                    
                    <div className="p-6">
                       <div className="flex justify-between items-start mb-4">
                         <h3 className="font-bold text-lg capitalize text-green-700">
                            {order.order_status}
                         </h3>
                         {order.order_status === 'processing' && (
                           <button
                             onClick={() => {
                               setCancelOrderId(order.id);
                               setShowCancelDialog(true);
                             }}
                             className="text-red-600 hover:text-red-800 font-medium text-sm"
                           >
                             Cancel Order
                           </button>
                         )}
                       </div>
                       <div className="space-y-4">
                          {order.items.map((item, idx) => (
                             <div key={idx} className="flex gap-4 items-center">
                                <div className="h-16 w-12 bg-gray-100 rounded-sm flex-shrink-0">
                                   {/* Placeholder for order item image, ideally needs serializer update to include image url */}
                                   <div className="w-full h-full bg-gray-200"></div>
                                </div>
                                <div>
                                   <p className="font-medium">{item.product_name}</p>
                                   <p className="text-sm text-gray-500">
                                      Qty: {item.quantity} {item.variant_info && `| Size: ${item.variant_info}`}
                                   </p>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ADDRESSES TAB */}
          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Saved Addresses</h2>
                <Button onClick={() => navigate('/checkout')}>Add New Address</Button>
              </div>
              
              {loading ? (
                <p>Loading addresses...</p>
              ) : addresses.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-sm">
                  <MapPin size={48} className="mx-auto text-gray-300 mb-4"/>
                  <p className="text-gray-500 mb-4">No saved addresses yet</p>
                  <Button onClick={() => navigate('/checkout')}>Add First Address</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((address) => (
                    <div key={address.id} className="bg-white border border-gray-200 rounded-sm p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg">{address.full_name}</h3>
                          <p className="text-sm text-gray-500 capitalize">{address.address_type}</p>
                        </div>
                        <div className="flex gap-2">
                          {address.is_default && (
                            <span className="bg-black text-white text-xs px-2 py-1 rounded">Default</span>
                          )}
                          <button
                            onClick={() => navigate(`/checkout?edit=${address.id}`)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Edit address"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteAddressId(address.id);
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Delete address"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p>{address.address_line_1}</p>
                        {address.address_line_2 && <p>{address.address_line_2}</p>}
                        <p>{address.city}, {address.state} {address.pincode}</p>
                        <p>{address.country}</p>
                        <p className="font-medium mt-3">Phone: {address.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cancel Order Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Cancel Order</h3>
              <button onClick={() => setShowCancelDialog(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to cancel this order? This action cannot be undone.</p>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Keep Order</Button>
              <Button onClick={handleCancelOrder} className="bg-red-600 hover:bg-red-700">Cancel Order</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Address Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Delete Address</h3>
              <button onClick={() => setShowDeleteDialog(false)} className="text-gray-500 hover:text-gray-700" disabled={deleting}>
                <X size={24} />
              </button>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this address? This action cannot be undone.</p>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>Keep Address</Button>
              <Button onClick={handleDeleteAddress} className="bg-red-600 hover:bg-red-700" isLoading={deleting}>Delete Address</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;