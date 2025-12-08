import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, MapPin, User as UserIcon, LogOut, Trash2, Edit2, X, Plus, Star, Heart } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout, fetchUserProfile } from '../store/slices/authSlice';
import { fetchWishlist, toggleWishlist, removeFromWishlistOptimistic } from '../store/slices/wishlistSlice';
import api from '../lib/axios';
import { toast } from 'react-hot-toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import AddressForm from '../components/forms/AddressForm';

const ProfilePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  const { items: wishlistItems, loading: wishlistLoading, wishlistItemIds } = useSelector(state => state.wishlist);

  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteAddressId, setDeleteAddressId] = useState(null);
  
  // Review & Return Request
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, title: '', comment: '' });
  const [returnData, setReturnData] = useState({ reason: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  
  // Name Editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameData, setEditNameData] = useState({ first_name: '', last_name: '' });
  const [savingName, setSavingName] = useState(false);
  
  // Address Form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [editingAddress, setEditingAddress] = useState(null);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'addresses') {
      fetchAddresses();
    } else if (activeTab === 'wishlist') {
      dispatch(fetchWishlist());
    }
    // Initialize edit name with current user data
    if (user) {
      setEditNameData({ first_name: user.first_name || '', last_name: user.last_name || '' });
    }
  }, [activeTab, user, dispatch]);

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

  const handleSaveName = async () => {
    if (!editNameData.first_name.trim() || !editNameData.last_name.trim()) {
      toast.error("Please fill in all name fields");
      return;
    }
    
    setSavingName(true);
    try {
      await api.patch('auth/me/', {
        first_name: editNameData.first_name,
        last_name: editNameData.last_name
      });
      toast.success("Name updated successfully");
      setIsEditingName(false);
      // Refresh user profile
      dispatch(fetchUserProfile());
    } catch (error) {
      console.error("Failed to update name:", error);
      const errorMsg = error.response?.data?.detail || 
                       Object.values(error.response?.data || {}).flat().join(', ') ||
                       "Failed to update name";
      toast.error(errorMsg);
    } finally {
      setSavingName(false);
    }
  };

  const handleAddressSubmit = async (formData) => {
    setLoading(true);
    try {
      if (editingAddressId) {
        // Update existing address
        await api.patch(`addresses/${editingAddressId}/`, formData);
        toast.success("Address updated successfully");
      } else {
        // Create new address
        await api.post('addresses/', formData);
        toast.success("Address added successfully");
      }
      setShowAddressForm(false);
      setEditingAddressId(null);
      setEditingAddress(null);
      fetchAddresses();
    } catch (error) {
      console.error("Address submission error:", error);
      const errorMsg = error.response?.data?.detail || 
                       Object.values(error.response?.data || {}).flat().join(', ') ||
                       "Failed to save address";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAddress = (address) => {
    setEditingAddressId(address.id);
    setEditingAddress(address);
    setShowAddressForm(true);
  };

  const openReviewModal = (orderItem) => {
    setSelectedOrderItem(orderItem);
    setReviewData({ rating: 5, title: '', comment: '' });
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewData.title.trim() || !reviewData.comment.trim()) {
      toast.error("Please fill in title and comment");
      return;
    }

    setSubmittingReview(true);
    try {
      const order = orders.find(o => o.items.find(i => i.id === selectedOrderItem.id));
      await api.post(`orders/${order.id}/review_order/`, {
        order_item_id: selectedOrderItem.id,
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment
      });
      toast.success("Review submitted successfully");
      setShowReviewModal(false);
      fetchOrders();
    } catch (error) {
      console.error("Failed to submit review:", error);
      const errorMsg = error.response?.data?.error || "Failed to submit review";
      toast.error(errorMsg);
    } finally {
      setSubmittingReview(false);
    }
  };

  const openReturnModal = (orderItem) => {
    setSelectedOrderItem(orderItem);
    setReturnData({ reason: '' });
    setShowReturnModal(true);
  };

  const handleSubmitReturn = async () => {
    if (!returnData.reason.trim()) {
      toast.error("Please provide a reason for return");
      return;
    }

    setSubmittingReturn(true);
    try {
      const order = orders.find(o => o.items.find(i => i.id === selectedOrderItem.id));
      await api.post(`orders/${order.id}/request_return/`, {
        order_item_id: selectedOrderItem.id,
        reason: returnData.reason
      });
      toast.success("Return request submitted successfully");
      setShowReturnModal(false);
      fetchOrders();
    } catch (error) {
      console.error("Failed to submit return request:", error);
      const errorMsg = error.response?.data?.error || "Failed to submit return request";
      toast.error(errorMsg);
    } finally {
      setSubmittingReturn(false);
    }
  };

  const isReturnWindowOpen = (orderDate) => {
    /**
     * Check if return request window is still open (70 seconds from delivery for debugging)
     */
    if (!orderDate) {
      return false; // No delivery date means window is closed
    }
    
    const deliveryTime = new Date(orderDate).getTime();
    if (isNaN(deliveryTime)) {
      return false; // Invalid date means window is closed
    }
    
    const currentTime = new Date().getTime();
    const secondsElapsed = (currentTime - deliveryTime) / 1000;
    return secondsElapsed <= 70;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 md:px-6 py-12">
        <h1 className="text-3xl font-serif font-bold mb-8">My Account</h1>

        <div className="flex flex-col md:flex-row gap-6 max-w-7xl">
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
              onClick={() => setSearchParams({ tab: 'wishlist' })}
              className={`w-full text-left px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors ${activeTab === 'wishlist' ? 'bg-gray-50 font-bold border-l-4 border-black' : ''}`}
            >
              <Heart size={18} /> Wishlist
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
        <div className="flex-1 min-w-0 w-full md:w-auto">
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
             <div className="bg-white border border-gray-100 p-8 rounded-sm">
                <h2 className="text-xl font-bold mb-6">Personal Information</h2>
                
                {!isEditingName ? (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">First Name</label>
                        <p className="font-medium text-lg">{user?.first_name}</p>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">Last Name</label>
                        <p className="font-medium text-lg">{user?.last_name}</p>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">Email</label>
                        <p className="font-medium text-lg">{user?.email}</p>
                      </div>
                    </div>
                    <Button onClick={() => setIsEditingName(true)} variant="outline">
                      <Edit2 size={16} className="mr-2" /> Edit Name
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="First Name"
                        type="text"
                        value={editNameData.first_name}
                        onChange={(e) => setEditNameData({...editNameData, first_name: e.target.value})}
                      />
                      <Input
                        label="Last Name"
                        type="text"
                        value={editNameData.last_name}
                        onChange={(e) => setEditNameData({...editNameData, last_name: e.target.value})}
                      />
                    </div>
                    <div className="flex gap-4">
                      <Button onClick={handleSaveName} isLoading={savingName} className="flex-1">
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setIsEditingName(false);
                        setEditNameData({ first_name: user?.first_name || '', last_name: user?.last_name || '' });
                      }} disabled={savingName} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
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
                           {order.order_status === 'pending' ? `Payment: ${order.payment_status}` : order.order_status}
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
                             <div key={idx} className="flex gap-4 items-start">
                                <div className="h-16 w-12 bg-gray-100 rounded-sm flex-shrink-0">
                                   {item.product_image ? (
                                     <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover rounded-sm" />
                                   ) : (
                                     <div className="w-full h-full bg-gray-200"></div>
                                   )}
                                </div>
                                <div className="flex-1">
                                   <p className="font-medium">{item.product_name}</p>
                                   <p className="text-sm text-gray-500">
                                      Qty: {item.quantity} {item.variant_name && `| ${item.variant_name}`}
                                   </p>
                                   <p className="text-sm text-gray-600 mt-1">₹{item.price_at_purchase}</p>
                                   
                                   {/* Show reviews if any */}
                                   {item.reviews && item.reviews.length > 0 && (
                                     <div className="mt-3 p-3 bg-blue-50 rounded">
                                       <p className="text-xs font-semibold text-blue-900 mb-1">Your Review</p>
                                       {item.reviews.map((review) => (
                                         <div key={review.id} className="text-sm">
                                           <div className="flex items-center gap-1 mb-1">
                                             {[...Array(5)].map((_, i) => (
                                               <Star key={i} size={14} className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                                             ))}
                                           </div>
                                           <p className="font-medium text-gray-900">{review.title}</p>
                                           <p className="text-gray-700 text-xs">{review.comment}</p>
                                         </div>
                                       ))}
                                     </div>
                                   )}

                                   {/* Show return requests if any */}
                                   {item.return_requests && item.return_requests.length > 0 && (
                                     <div className="mt-3 p-3 bg-orange-50 rounded">
                                       <p className="text-xs font-semibold text-orange-900 mb-1">Return Request</p>
                                       {item.return_requests.map((returnReq) => (
                                         <div key={returnReq.id} className="text-sm">
                                           <p className="text-gray-700"><strong>Status:</strong> <span className="capitalize font-medium">{returnReq.status}</span></p>
                                           <p className="text-gray-700 text-xs mt-1">{returnReq.reason}</p>
                                           {returnReq.admin_notes && (
                                             <p className="text-gray-600 text-xs mt-2"><strong>Admin Notes:</strong> {returnReq.admin_notes}</p>
                                           )}
                                         </div>
                                       ))}
                                     </div>
                                   )}

                                   {/* Show action buttons for delivered orders without review/return */}
                                   {order.order_status === 'delivered' && (
                                     <div className="flex gap-2 mt-3 flex-wrap">
                                       {(!item.reviews || item.reviews.length === 0) && (
                                         <button
                                           onClick={() => openReviewModal(item)}
                                           className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                                         >
                                           <Star size={12} className="inline mr-1" /> Write Review
                                         </button>
                                       )}
                                       {(!item.return_requests || item.return_requests.length === 0) && (
                                         <>
                                           {isReturnWindowOpen(order.delivered_at) ? (
                                             <button
                                               onClick={() => openReturnModal(item)}
                                               className="text-xs px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition"
                                             >
                                               Request Return
                                             </button>
                                           ) : (
                                             <span className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded" title="Return window has expired">
                                               Return Window Closed
                                             </span>
                                           )}
                                         </>
                                       )}
                                     </div>
                                   )}
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
                {!showAddressForm && (
                  <Button onClick={() => {
                    setEditingAddressId(null);
                    setEditingAddress(null);
                    setShowAddressForm(true);
                  }}>
                    <Plus size={16} className="mr-2" /> Add New Address
                  </Button>
                )}
              </div>

              {showAddressForm && (
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
              )}
              
              {loading && !showAddressForm ? (
                <p>Loading addresses...</p>
              ) : addresses.length === 0 && !showAddressForm ? (
                <div className="text-center py-12 bg-gray-50 rounded-sm">
                  <MapPin size={48} className="mx-auto text-gray-300 mb-4"/>
                  <p className="text-gray-500 mb-4">No saved addresses yet</p>
                  <Button onClick={() => setShowAddressForm(true)}>Add First Address</Button>
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
                            onClick={() => handleEditAddress(address)}
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

      {/* WISHLIST TAB */}
      {activeTab === 'wishlist' && (
        <div className="bg-white border border-gray-100 p-8 rounded-sm">
          <h2 className="text-xl font-bold mb-6">My Wishlist</h2>
          
          {wishlistLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 aspect-[3/4] rounded-sm mb-4"></div>
                  <div className="h-4 bg-gray-200 w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 w-1/4"></div>
                </div>
              ))}
            </div>
          ) : wishlistItems && wishlistItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {wishlistItems.map(product => (
                <div key={product.id} className="group relative bg-white rounded-sm overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
                  <div className="aspect-[3/4] w-full overflow-hidden bg-gray-100 relative">
                    <img
                      src={
                        product.primary_image 
                          ? (product.primary_image.startsWith('http') 
                              ? product.primary_image 
                              : `http://localhost:8000${product.primary_image}`)
                          : 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80&w=600&auto=format&fit=crop'
                      }
                      alt={product.title}
                      className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80&w=600&auto=format&fit=crop';
                      }}
                    />
                    
                    {/* Remove from wishlist button */}
                    <button
                      onClick={async () => {
                        try {
                          dispatch(removeFromWishlistOptimistic(product.id));
                          await dispatch(toggleWishlist(product.id)).unwrap();
                          toast.success('Removed from wishlist');
                        } catch (error) {
                          dispatch(fetchWishlist());
                          toast.error('Failed to remove from wishlist');
                        }
                      }}
                      className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white shadow-md hover:bg-gray-100 text-red-500"
                    >
                      <Heart 
                        size={18} 
                        fill={wishlistItemIds.has(product.id) ? 'currentColor' : 'none'}
                        className={wishlistItemIds.has(product.id) ? 'text-red-500' : 'text-gray-400'}
                      />
                    </button>
                  </div>
                  
                  <div className="p-4 space-y-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{product.brand_name || 'Aura'}</p>
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{product.title}</h3>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-semibold text-gray-900">
                        ₹{product.final_price?.toLocaleString()}
                      </p>
                      {product.discount_price && (
                        <p className="text-xs text-gray-500 line-through">
                          ₹{product.price?.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Button 
                      onClick={() => navigate(`/product/${product.id}`)}
                      className="w-full mt-4 bg-black text-white hover:bg-gray-800"
                    >
                      View Product
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-sm">
              <Heart size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">Your wishlist is empty</p>
              <Button variant="outline" onClick={() => navigate('/shop')}>
                Start Shopping
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedOrderItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Write a Review</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">{selectedOrderItem.product_name}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => setReviewData({...reviewData, rating: num})}
                      className="p-1"
                    >
                      <Star
                        size={24}
                        className={num <= reviewData.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Review Title"
                type="text"
                placeholder="e.g., Great quality product"
                value={reviewData.title}
                onChange={(e) => setReviewData({...reviewData, title: e.target.value})}
                disabled={submittingReview}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-black text-sm"
                  rows="4"
                  placeholder="Share your experience with this product..."
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({...reviewData, comment: e.target.value})}
                  disabled={submittingReview}
                />
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setShowReviewModal(false)} disabled={submittingReview}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitReview} isLoading={submittingReview}>
                  Submit Review
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Request Modal */}
      {showReturnModal && selectedOrderItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Request Return</h3>
              <button onClick={() => setShowReturnModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">{selectedOrderItem.product_name}</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Return</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-black text-sm"
                  rows="4"
                  placeholder="Please explain why you want to return this item..."
                  value={returnData.reason}
                  onChange={(e) => setReturnData({...returnData, reason: e.target.value})}
                  disabled={submittingReturn}
                />
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                <p className="font-medium mb-1">Return Policy:</p>
                <p>Items can be returned within 30 days of delivery. The item should be in original condition with all packaging intact.</p>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setShowReturnModal(false)} disabled={submittingReturn}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitReturn} isLoading={submittingReturn}>
                  Submit Request
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ProfilePage;