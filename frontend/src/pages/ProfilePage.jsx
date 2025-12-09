import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Package, MapPin, User as UserIcon, LogOut, Trash2, Edit2, 
  X, Plus, Star, Heart, ChevronRight, AlertCircle 
} from 'lucide-react';
import { notifySuccess, notifyError } from '../lib/notify';

import { logout, fetchUserProfile } from '../store/slices/authSlice';
import { fetchWishlist, toggleWishlist, removeFromWishlistOptimistic } from '../store/slices/wishlistSlice';
import api from '../lib/axios';

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

  // Local State
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false); // Generic loading for actions
  
  // Modals & Dialogs
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteAddressId, setDeleteAddressId] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  
  // Forms & Inputs
  const [selectedOrderItem, setSelectedOrderItem] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, title: '', comment: '' });
  const [returnData, setReturnData] = useState({ reason: '' });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameData, setEditNameData] = useState({ first_name: '', last_name: '' });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [editingAddress, setEditingAddress] = useState(null);

  // Initial Fetch
  useEffect(() => {
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'addresses') fetchAddresses();
    if (activeTab === 'wishlist') dispatch(fetchWishlist());
    
    if (user) {
      setEditNameData({ first_name: user.first_name || '', last_name: user.last_name || '' });
    }
  }, [activeTab, user, dispatch]);

  // Data Fetchers
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('orders/');
      setOrders(response.data.results || response.data);
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
      setAddresses(response.data.results || response.data);
    } catch (error) {
      console.error("Failed to fetch addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  // Actions
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleCancelOrder = async () => {
    setActionLoading(true);
    try {
      await api.post(`orders/${cancelOrderId}/cancel/`);
      notifySuccess("Order cancelled");
      setShowCancelDialog(false);
      fetchOrders();
    } catch (error) {
      notifyError(error.response?.data?.error || "Failed to cancel order");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAddress = async () => {
    setActionLoading(true);
    try {
      await api.delete(`addresses/${deleteAddressId}/`);
      notifySuccess("Address deleted");
      setShowDeleteDialog(false);
      fetchAddresses();
    } catch (error) {
      notifyError("Failed to delete address");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!editNameData.first_name.trim() || !editNameData.last_name.trim()) {
      notifyError("Name fields cannot be empty");
      return;
    }
    setActionLoading(true);
    try {
      await api.patch('auth/me/', editNameData);
      notifySuccess("Profile updated");
      setIsEditingName(false);
      dispatch(fetchUserProfile());
    } catch (error) {
      notifyError("Failed to update profile");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddressSubmit = async (formData) => {
    setLoading(true);
    try {
      if (editingAddressId) {
        await api.patch(`addresses/${editingAddressId}/`, formData);
        notifySuccess("Address updated");
      } else {
        await api.post('addresses/', formData);
        notifySuccess("Address added");
      }
      setShowAddressForm(false);
      setEditingAddressId(null);
      setEditingAddress(null);
      fetchAddresses();
    } catch (error) {
      notifyError("Failed to save address");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewData.title.trim() || !reviewData.comment.trim()) {
      notifyError("Please provide a title and comment");
      return;
    }
    setActionLoading(true);
    try {
      const order = orders.find(o => o.items.find(i => i.id === selectedOrderItem.id));
      await api.post(`orders/${order.id}/review_order/`, {
        order_item_id: selectedOrderItem.id,
        ...reviewData
      });
      notifySuccess("Review submitted");
      setShowReviewModal(false);
      fetchOrders();
    } catch (error) {
      notifyError(error.response?.data?.error || "Failed to submit review");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReturn = async () => {
    if (!returnData.reason.trim()) {
      notifyError("Reason is required");
      return;
    }
    setActionLoading(true);
    try {
      const order = orders.find(o => o.items.find(i => i.id === selectedOrderItem.id));
      await api.post(`orders/${order.id}/request_return/`, {
        order_item_id: selectedOrderItem.id,
        ...returnData
      });
      notifySuccess("Return requested");
      setShowReturnModal(false);
      fetchOrders();
    } catch (error) {
      notifyError(error.response?.data?.error || "Request failed");
    } finally {
      setActionLoading(false);
    }
  };

  const isReturnWindowOpen = (orderDate) => {
    if (!orderDate) return false;
    const deliveryTime = new Date(orderDate).getTime();
    const currentTime = new Date().getTime();
    return (currentTime - deliveryTime) / 1000 <= 70; // 70 seconds logic from backend
  };

  // --- RENDER HELPERS ---

  const TabButton = ({ id, icon: Icon, label }) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => setSearchParams({ tab: id })}
        className={`w-full flex items-center gap-4 px-4 py-3 text-sm transition-all duration-200 group rounded-sm
          ${isActive ? 'text-black font-semibold bg-gray-50' : 'text-gray-500 hover:text-black hover:bg-gray-50/50'}
        `}
      >
        <Icon size={18} className={isActive ? 'text-black' : 'text-gray-400 group-hover:text-black'} />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 md:px-6 py-12 lg:py-20">
        
        {/* Header */}
        <div className="mb-12 lg:mb-16">
          <h1 className="text-3xl lg:text-4xl font-serif font-bold text-gray-900 tracking-tight">
            My Account
          </h1>
          <p className="text-gray-500 mt-2">Welcome back, {user?.first_name}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          
          {/* Sidebar Navigation */}
          <aside className="w-full lg:w-64 shrink-0">
            <nav className="flex flex-col border-l border-gray-100 pl-2 lg:pl-0 lg:border-l-0 lg:border-r lg:pr-6 space-y-1">
              <TabButton id="profile" icon={UserIcon} label="Profile" />
              <TabButton id="orders" icon={Package} label="Orders" />
              <TabButton id="addresses" icon={MapPin} label="Addresses" />
              <TabButton id="wishlist" icon={Heart} label="Wishlist" />
              
              <div className="pt-6 mt-6 border-t border-gray-100">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-sm"
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              </div>
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            
            {/* --- PROFILE TAB --- */}
            {activeTab === 'profile' && (
              <div className="max-w-2xl animate-fade-in">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-serif font-bold">Personal Details</h2>
                  {!isEditingName && (
                    <button 
                      onClick={() => setIsEditingName(true)}
                      className="text-sm text-gray-500 hover:text-black underline decoration-gray-300 underline-offset-4"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {!isEditingName ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                    <div>
                      <span className="block text-xs uppercase tracking-wider text-gray-400 mb-1">First Name</span>
                      <p className="text-lg font-medium text-gray-900">{user?.first_name}</p>
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Last Name</span>
                      <p className="text-lg font-medium text-gray-900">{user?.last_name}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Email Address</span>
                      <p className="text-lg font-medium text-gray-900">{user?.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 bg-gray-50 p-6 rounded-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input
                        label="First Name"
                        value={editNameData.first_name}
                        onChange={(e) => setEditNameData({...editNameData, first_name: e.target.value})}
                        className="bg-white"
                      />
                      <Input
                        label="Last Name"
                        value={editNameData.last_name}
                        onChange={(e) => setEditNameData({...editNameData, last_name: e.target.value})}
                        className="bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <Button onClick={handleSaveName} isLoading={actionLoading}>Save Changes</Button>
                      <button 
                        onClick={() => {
                          setIsEditingName(false);
                          setEditNameData({ first_name: user?.first_name || '', last_name: user?.last_name || '' });
                        }} 
                        className="text-sm text-gray-500 hover:text-black px-4"
                        disabled={actionLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- ORDERS TAB --- */}
            {activeTab === 'orders' && (
              <div className="space-y-12 animate-fade-in">
                <h2 className="text-xl font-serif font-bold mb-8">Order History</h2>
                
                {loading ? (
                  <div className="space-y-4">
                    {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-sm" />)}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-20 bg-gray-50 rounded-sm border border-dashed border-gray-200">
                    <Package size={40} className="mx-auto text-gray-300 mb-4"/>
                    <p className="text-gray-500 mb-6">You haven't placed any orders yet.</p>
                    <Button onClick={() => navigate('/shop')}>Start Shopping</Button>
                  </div>
                ) : (
                  <div className="space-y-12">
                    {orders.map((order) => (
                      <div key={order.id} className="group border-b border-gray-100 pb-12 last:border-0">
                        {/* Order Header */}
                        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-bold text-lg">#{order.id.slice(0, 8)}</span>
                              <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-sm ${
                                order.order_status === 'delivered' ? 'bg-green-100 text-green-800' : 
                                order.order_status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {order.order_status}
                              </span>
                              <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-sm ${
                                order.payment_method === 'COD' 
                                  ? 'bg-gray-100 text-gray-700 border border-gray-300' 
                                  : order.payment_status === 'completed' 
                                  ? 'bg-gray-100 text-gray-700 border border-gray-300'
                                  : 'bg-gray-100 text-gray-700 border border-gray-300'
                              }`}>
                                {order.payment_method === 'COD' ? 'COD' : 'Paid Online'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              Placed on {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <p className="font-serif font-bold text-lg">₹{order.total_amount}</p>
                            {order.order_status === 'processing' && (
                              <button
                                onClick={() => { setCancelOrderId(order.id); setShowCancelDialog(true); }}
                                className="text-xs text-red-600 hover:text-red-800 mt-1 underline"
                              >
                                Cancel Order
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-4">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex gap-6 py-4 bg-gray-50/50 px-4 rounded-sm hover:bg-gray-50 transition-colors">
                              <div className="h-20 w-16 bg-gray-200 rounded-sm shrink-0 overflow-hidden">
                                {item.product_image && (
                                  <img src={item.product_image} alt="" className="h-full w-full object-cover" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-medium text-gray-900 truncate">{item.product_name}</h4>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                      {item.variant_name ? item.variant_name : 'Standard'} · Qty: {item.quantity}
                                    </p>
                                  </div>
                                  <p className="text-sm font-medium">₹{item.price_at_purchase}</p>
                                </div>

                                {/* Item Actions / Status */}
                                <div className="mt-3 flex flex-wrap gap-3">
                                  {item.reviews?.length > 0 && (
                                    <span className="inline-flex items-center text-xs text-amber-600 font-medium">
                                      <Star size={12} className="mr-1 fill-current" /> Reviewed
                                    </span>
                                  )}
                                  
                                  {item.return_requests?.length > 0 ? (
                                    item.return_requests.map(req => (
                                      <span key={req.id} className="inline-flex items-center text-xs text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded">
                                        Return {req.status}
                                      </span>
                                    ))
                                  ) : (
                                    order.order_status === 'delivered' && (
                                      <div className="flex gap-3 text-xs font-medium">
                                        {!item.reviews?.length && (
                                          <button 
                                            onClick={() => openReviewModal(item)}
                                            className="text-gray-600 hover:text-black underline decoration-gray-300"
                                          >
                                            Write Review
                                          </button>
                                        )}
                                        {isReturnWindowOpen(order.delivered_at) && (
                                          <button 
                                            onClick={() => openReturnModal(item)}
                                            className="text-gray-600 hover:text-red-600 underline decoration-gray-300"
                                          >
                                            Request Return
                                          </button>
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* --- ADDRESSES TAB --- */}
            {activeTab === 'addresses' && (
              <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-serif font-bold">Address Book</h2>
                  {!showAddressForm && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEditingAddressId(null);
                        setEditingAddress(null);
                        setShowAddressForm(true);
                      }}
                    >
                      <Plus size={16} className="mr-2" /> Add New
                    </Button>
                  )}
                </div>

                {showAddressForm ? (
                  <div className="bg-gray-50 p-6 lg:p-8 rounded-sm animate-in fade-in slide-in-from-bottom-2">
                    <AddressForm
                      onSubmit={handleAddressSubmit}
                      onCancel={() => setShowAddressForm(false)}
                      loading={loading}
                      initialAddress={editingAddress}
                      isEditing={!!editingAddressId}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {addresses.map((address) => (
                      <div key={address.id} className="border border-gray-200 p-6 rounded-sm hover:border-gray-300 transition-colors relative group">
                        {address.is_default && (
                          <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider bg-gray-900 text-white px-2 py-1 rounded-sm">
                            Default
                          </span>
                        )}
                        <div className="mb-4">
                          <h3 className="font-bold text-gray-900">{address.full_name}</h3>
                          <p className="text-xs uppercase tracking-wider text-gray-500 mt-1">{address.address_type}</p>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1 mb-6">
                          <p>{address.address_line_1}</p>
                          {address.address_line_2 && <p>{address.address_line_2}</p>}
                          <p>{address.city}, {address.state} - {address.pincode}</p>
                          <p>{address.country}</p>
                          <p className="mt-2 text-gray-900 font-medium">{address.phone}</p>
                        </div>
                        <div className="flex gap-4 pt-4 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingAddressId(address.id);
                              setEditingAddress(address);
                              setShowAddressForm(true);
                            }}
                            className="text-xs font-bold uppercase tracking-wide text-gray-900 hover:underline"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => {
                              setDeleteAddressId(address.id);
                              setShowDeleteDialog(true);
                            }}
                            className="text-xs font-bold uppercase tracking-wide text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {addresses.length === 0 && !loading && (
                      <div className="col-span-full text-center py-12 bg-gray-50 text-gray-500 rounded-sm">
                        <MapPin size={32} className="mx-auto mb-3 opacity-30" />
                        <p>No addresses saved.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* --- WISHLIST TAB --- */}
            {activeTab === 'wishlist' && (
              <div className="animate-fade-in">
                <h2 className="text-xl font-serif font-bold mb-8">My Wishlist</h2>
                
                {wishlistLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {[1,2,3].map(i => <div key={i} className="aspect-[3/4] bg-gray-100 animate-pulse rounded-sm" />)}
                  </div>
                ) : wishlistItems?.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-10 gap-x-6">
                    {wishlistItems.map(product => (
                      <div key={product.id} className="group relative">
                        <div className="aspect-[3/4] w-full bg-gray-100 overflow-hidden relative rounded-sm mb-4">
                          <img
                            src={product.primary_image || 'https://via.placeholder.com/400x600'}
                            alt={product.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              dispatch(removeFromWishlistOptimistic(product.id));
                              await dispatch(toggleWishlist(product.id)).unwrap();
                              toast.success('Removed from wishlist');
                            }}
                            className="absolute top-2 right-2 p-2 bg-white/90 rounded-full text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                          >
                            <X size={16} />
                          </button>
                          
                          {/* Quick Add Overlay */}
                          <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button 
                              onClick={() => navigate(`/product/${product.id}`)}
                              className="w-full bg-white text-black py-3 text-sm font-medium uppercase tracking-wide hover:bg-gray-100 shadow-lg"
                            >
                              View Product
                            </button>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            <a href={`/product/${product.id}`}>{product.title}</a>
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">₹{product.final_price?.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-gray-50 rounded-sm">
                    <Heart size={40} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 mb-6">Your wishlist is empty</p>
                    <Button onClick={() => navigate('/shop')}>Explore Collection</Button>
                  </div>
                )}
              </div>
            )}

          </main>
        </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* Generic Modal Wrapper */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-8 max-w-sm w-full rounded-sm shadow-xl">
            <h3 className="text-lg font-bold mb-2">Cancel Order?</h3>
            <p className="text-gray-600 mb-6 text-sm">This action cannot be undone. Are you sure?</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowCancelDialog(false)}>Keep</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 border-red-600" onClick={handleCancelOrder} isLoading={actionLoading}>Cancel Order</Button>
            </div>
          </div>
        </div>
      )}

      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-8 max-w-sm w-full rounded-sm shadow-xl">
            <h3 className="text-lg font-bold mb-2">Delete Address?</h3>
            <p className="text-gray-600 mb-6 text-sm">This address will be permanently removed from your account.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 border-red-600" onClick={handleDeleteAddress} isLoading={actionLoading}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {(showReviewModal || showReturnModal) && selectedOrderItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-8 max-w-md w-full rounded-sm shadow-xl relative">
            <button 
              onClick={() => { setShowReviewModal(false); setShowReturnModal(false); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-black"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-serif font-bold mb-1">
              {showReviewModal ? 'Write a Review' : 'Request Return'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">{selectedOrderItem.product_name}</p>

            {showReviewModal ? (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide mb-2">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button key={num} onClick={() => setReviewData({...reviewData, rating: num})}>
                        <Star size={24} className={num <= reviewData.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                      </button>
                    ))}
                  </div>
                </div>
                <Input
                  label="Title"
                  value={reviewData.title}
                  onChange={(e) => setReviewData({...reviewData, title: e.target.value})}
                  placeholder="Summary of your experience"
                />
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide mb-2">Review</label>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-black text-sm min-h-[100px]"
                    placeholder="Tell us what you liked or disliked..."
                    value={reviewData.comment}
                    onChange={(e) => setReviewData({...reviewData, comment: e.target.value})}
                  />
                </div>
                <Button onClick={handleSubmitReview} isLoading={actionLoading} className="w-full">Submit Review</Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide mb-2">Reason for Return</label>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-black text-sm min-h-[100px]"
                    placeholder="Why are you returning this item?"
                    value={returnData.reason}
                    onChange={(e) => setReturnData({...returnData, reason: e.target.value})}
                  />
                </div>
                <div className="bg-gray-50 p-3 rounded-sm text-xs text-gray-600 flex gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <p>Items must be returned in original condition with tags attached within 30 days.</p>
                </div>
                <Button onClick={handleSubmitReturn} isLoading={actionLoading} className="w-full">Submit Request</Button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfilePage;