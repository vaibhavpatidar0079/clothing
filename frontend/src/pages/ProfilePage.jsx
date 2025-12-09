import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Package, MapPin, User as UserIcon, LogOut, Trash2, Edit2, 
  X, Plus, Star, Heart, ChevronRight, AlertCircle, ShoppingBag, ExternalLink, ArrowRight
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

  // --- LOCAL STATE ---
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // --- MODALS & DIALOGS ---
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteAddressId, setDeleteAddressId] = useState(null);
  
  // Profile Editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameData, setEditNameData] = useState({ first_name: '', last_name: '' });
  
  // Address Editing
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [editingAddress, setEditingAddress] = useState(null);

  // Reviews
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedOrderItemForReview, setSelectedOrderItemForReview] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, title: '', comment: '' });

  // --- EFFECTS ---
  useEffect(() => {
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'addresses') fetchAddresses();
    if (activeTab === 'wishlist') dispatch(fetchWishlist());
    
    if (user) {
      setEditNameData({ first_name: user.first_name || '', last_name: user.last_name || '' });
    }
  }, [activeTab, user, dispatch]);

  // --- FETCHERS ---
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

  // --- ACTIONS ---
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleDeleteAddress = async () => {
    setActionLoading(true);
    try {
      await api.delete(`addresses/${deleteAddressId}/`);
      notifySuccess("Address removed");
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
      notifySuccess("Profile updated successfully");
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

  const openReviewModal = (e, item, orderId) => {
    e.stopPropagation(); // Prevent navigation to detail page
    setSelectedOrderItemForReview({ ...item, orderId });
    setReviewData({ rating: 5, title: '', comment: '' });
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewData.title.trim() || !reviewData.comment.trim()) {
      notifyError("Please provide a title and comment");
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`orders/${selectedOrderItemForReview.orderId}/review_order/`, {
        order_item_id: selectedOrderItemForReview.id,
        ...reviewData
      });
      notifySuccess("Review submitted successfully");
      setShowReviewModal(false);
      // Refresh orders to show updated review status if we were to display it
      fetchOrders();
    } catch (error) {
      notifyError(error.response?.data?.error || "Failed to submit review");
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to flatten orders into items for the "My Purchases" view
  const getPurchasedItems = () => {
    if (!orders) return [];
    return orders.flatMap(order => 
      order.items.map(item => ({
        ...item,
        orderId: order.id,
        orderDate: order.created_at,
        orderStatus: order.order_status,
        paymentStatus: order.payment_status
      }))
    );
  };

  const getOrderItems = () => {
    return getPurchasedItems();
  };

  const TabButton = ({ id, icon: Icon, label }) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => setSearchParams({ tab: id })}
        className={`w-full flex items-center gap-4 px-6 py-4 text-sm transition-all duration-300 border-l-2
          ${isActive 
            ? 'border-black text-black font-medium bg-gray-50' 
            : 'border-transparent text-gray-500 hover:text-black hover:bg-gray-50'}
        `}
      >
        <Icon size={18} className={isActive ? 'text-black' : 'text-gray-400'} />
        <span className="tracking-wide">{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 md:px-6 py-16 lg:py-24">
        
        {/* Page Header */}
        <div className="mb-16 max-w-xl">
          <h1 className="text-3xl lg:text-4xl font-serif font-bold text-gray-900 tracking-tight mb-2">
            My Account
          </h1>
          <p className="text-gray-500 font-light text-lg">
            Welcome back, <span className="text-black font-medium">{user?.first_name}</span>. Manage your orders and preferences.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
          
          {/* Sidebar */}
          <aside className="w-full lg:w-64 shrink-0">
            <nav className="flex flex-col border-l border-gray-100 pl-4 space-y-1 sticky top-32">
              <TabButton id="profile" icon={UserIcon} label="Profile" />
              <TabButton id="orders" icon={Package} label="Orders" />
              <TabButton id="addresses" icon={MapPin} label="Addresses" />
              <TabButton id="wishlist" icon={Heart} label="Wishlist" />
              
              <div className="pt-8 mt-8 border-t border-gray-100">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 px-6 py-2 text-sm text-gray-400 hover:text-red-600 transition-colors"
                >
                  <LogOut size={18} />
                  <span className="font-medium tracking-wide">Sign Out</span>
                </button>
              </div>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            
            {/* --- PROFILE TAB --- */}
            {activeTab === 'profile' && (
              <div className="max-w-2xl animate-in fade-in duration-700 slide-in-from-bottom-4">
                <div className="flex items-end justify-between mb-12 border-b border-gray-100 pb-6">
                  <h2 className="text-3xl font-serif font-medium text-gray-900">Personal Details</h2>
                  {!isEditingName && (
                    <button 
                      onClick={() => setIsEditingName(true)}
                      className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {!isEditingName ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-12 gap-x-16">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">First Name</span>
                      <p className="text-xl font-light text-gray-900">{user?.first_name}</p>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Last Name</span>
                      <p className="text-xl font-light text-gray-900">{user?.last_name}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Email Address</span>
                      <p className="text-xl font-light text-gray-900">{user?.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 bg-gray-50 p-8 rounded-sm">
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
                    <div className="flex items-center gap-4 pt-2">
                      <Button onClick={handleSaveName} isLoading={actionLoading}>Save Changes</Button>
                      <button 
                        onClick={() => {
                          setIsEditingName(false);
                          setEditNameData({ first_name: user?.first_name || '', last_name: user?.last_name || '' });
                        }} 
                        className="text-sm font-medium text-gray-500 hover:text-black px-4"
                        disabled={actionLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- ORDERS TAB (PREMIUM UI) --- */}
            {activeTab === 'orders' && (
              <div className="animate-in fade-in duration-700 slide-in-from-bottom-4">
                <div className="flex items-end justify-between mb-12 border-b border-gray-100 pb-6">
                  <div>
                    <h2 className="text-3xl font-serif font-medium text-gray-900">Order History</h2>
                    <p className="text-sm text-gray-400 mt-2 font-light">Track, return, or buy things again</p>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{getOrderItems().length} Items</span>
                </div>
                
                {loading ? (
                  <div className="space-y-8">
                    {[1,2,3].map(i => (
                      <div key={i} className="flex gap-6 animate-pulse">
                        <div className="w-24 h-32 bg-gray-100 rounded-sm"></div>
                        <div className="flex-1 space-y-3 py-2">
                          <div className="h-4 bg-gray-100 w-1/3"></div>
                          <div className="h-3 bg-gray-100 w-1/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-32 border border-dashed border-gray-200 rounded-sm">
                    <ShoppingBag size={32} className="mx-auto text-gray-300 mb-6" strokeWidth={1} />
                    <h3 className="text-lg font-serif font-medium text-gray-900 mb-2">Your wardrobe is waiting</h3>
                    <p className="text-gray-400 mb-8 font-light">You haven't placed any orders yet.</p>
                    <Button onClick={() => navigate('/shop')} variant="outline" className="min-w-[200px]">Start Shopping</Button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {getPurchasedItems().map((item, idx) => (
                      <div 
                        key={`${item.orderId}-${item.id}`}
                        onClick={() => navigate(`/order/${item.orderId}`)}
                        className="group flex flex-col sm:flex-row gap-6 pb-8 border-b border-gray-100 cursor-pointer last:border-0 hover:opacity-80 transition-opacity"
                      >
                        {/* Image Container */}
                        <div className="w-full sm:w-28 aspect-[3/4] sm:aspect-[3/4] bg-gray-100 overflow-hidden relative self-start">
                          {item.product_image ? (
                            <img 
                              src={item.product_image} 
                              alt="" 
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Package size={20} strokeWidth={1} />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-serif text-xl font-medium text-gray-900 group-hover:underline decoration-gray-300 underline-offset-4 decoration-1 transition-all">{item.product_name}</h3>
                              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 ${
                                item.orderStatus === 'delivered' ? 'text-green-800 bg-green-50' : 
                                item.orderStatus === 'cancelled' ? 'text-red-800 bg-red-50' : 
                                'text-blue-800 bg-blue-50'
                              }`}>
                                {item.orderStatus === 'processing' ? 'Processing' : item.orderStatus}
                              </span>
                            </div>

                            <div className="text-sm text-gray-500 font-light space-y-1">
                              {(item.selected_size || item.variant_name) && (
                                <p>Size: <span className="text-gray-900">{item.selected_size || item.variant_name?.split(' ')[0] || 'Std'}</span></p>
                              )}
                              {item.product_color && (
                                <p>Color: <span className="text-gray-900">{item.product_color}</span></p>
                              )}
                              <p className="text-xs text-gray-400 mt-2">Ordered on {new Date(item.orderDate).toLocaleDateString()}</p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-6 mt-6 sm:mt-0">
                            {item.orderStatus === 'delivered' && !item.reviews?.length && (
                              <button
                                onClick={(e) => openReviewModal(e, item, item.orderId)}
                                className="text-xs font-bold uppercase tracking-widest text-gray-900 hover:text-gray-600 flex items-center gap-2 border-b border-gray-200 pb-0.5 hover:border-black transition-all"
                              >
                                Write Review
                              </button>
                            )}
                            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 group-hover:text-black flex items-center gap-2 transition-colors ml-auto sm:ml-0">
                              View Order <ArrowRight size={14} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* --- ADDRESSES TAB --- */}
            {activeTab === 'addresses' && (
              <div className="animate-in fade-in duration-700 slide-in-from-bottom-4">
                <div className="flex items-end justify-between mb-12 border-b border-gray-100 pb-6">
                  <h2 className="text-3xl font-serif font-medium text-gray-900">Address Book</h2>
                  {!showAddressForm && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEditingAddressId(null);
                        setEditingAddress(null);
                        setShowAddressForm(true);
                      }}
                      className="border-gray-200 text-xs uppercase tracking-widest font-bold px-6"
                    >
                      Add New
                    </Button>
                  )}
                </div>

                {showAddressForm ? (
                  <div className="bg-gray-50 p-8 rounded-sm animate-in slide-in-from-bottom-2 duration-500">
                    <AddressForm
                      onSubmit={handleAddressSubmit}
                      onCancel={() => setShowAddressForm(false)}
                      loading={loading}
                      initialAddress={editingAddress}
                      isEditing={!!editingAddressId}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {addresses.map((address) => (
                      <div key={address.id} className="group border border-gray-200 p-8 hover:border-black transition-all duration-500 relative bg-white min-h-[240px] flex flex-col justify-between">
                        {address.is_default && (
                          <span className="absolute top-8 right-8 text-[10px] font-bold uppercase tracking-widest bg-gray-900 text-white px-2 py-1">
                            Default
                          </span>
                        )}
                        <div>
                          <h3 className="font-serif text-xl text-gray-900 mb-1">{address.full_name}</h3>
                          <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-6">{address.address_type}</p>
                          <div className="text-sm text-gray-500 font-light leading-relaxed space-y-1">
                            <p>{address.address_line_1}</p>
                            {address.address_line_2 && <p>{address.address_line_2}</p>}
                            <p>{address.city}, {address.state} {address.pincode}</p>
                            <p>{address.country}</p>
                            <p className="mt-4 text-gray-900">{address.phone}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-6 border-t border-gray-100 pt-6 mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button 
                            onClick={() => {
                              setEditingAddressId(address.id);
                              setEditingAddress(address);
                              setShowAddressForm(true);
                            }}
                            className="text-xs font-bold uppercase tracking-widest text-gray-900 hover:text-gray-500 transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => {
                              setDeleteAddressId(address.id);
                              setShowDeleteDialog(true);
                            }}
                            className="text-xs font-bold uppercase tracking-widest text-red-600 hover:text-red-400 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {addresses.length === 0 && !loading && (
                      <div className="col-span-full text-center py-24 bg-gray-50 text-gray-400 rounded-sm">
                        <MapPin size={32} className="mx-auto mb-4 opacity-20" strokeWidth={1} />
                        <p className="font-light">No addresses saved yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* --- WISHLIST TAB --- */}
            {activeTab === 'wishlist' && (
              <div className="animate-in fade-in duration-700 slide-in-from-bottom-4">
                <div className="flex items-end justify-between mb-12 border-b border-gray-100 pb-6">
                  <h2 className="text-3xl font-serif font-medium text-gray-900">Saved Items</h2>
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{wishlistItems?.length || 0} Items</span>
                </div>
                
                {wishlistLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                    {[1,2,3].map(i => <div key={i} className="aspect-[3/4] bg-gray-50 animate-pulse" />)}
                  </div>
                ) : wishlistItems?.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-12 gap-x-8">
                    {wishlistItems.map(product => (
                      <div key={product.id} className="group relative cursor-pointer">
                        <div className="aspect-[3/4] w-full bg-gray-100 overflow-hidden relative mb-4">
                          <img
                            src={product.primary_image || 'https://via.placeholder.com/400x600'}
                            alt={product.title}
                            className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                          />
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              dispatch(removeFromWishlistOptimistic(product.id));
                              await dispatch(toggleWishlist(product.id)).unwrap();
                              notifySuccess('Removed from wishlist');
                            }}
                            className="absolute top-3 right-3 p-2 bg-white rounded-full text-gray-900 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-gray-100 shadow-sm"
                          >
                            <X size={16} />
                          </button>
                          
                          {/* Quick View Button */}
                          <div className="absolute inset-x-4 bottom-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                            <button 
                              onClick={() => navigate(`/product/${product.id}`)}
                              className="w-full bg-white/90 backdrop-blur-sm text-black py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-colors shadow-lg"
                            >
                              View Product
                            </button>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 truncate font-serif mb-1">
                            <a href={`/product/${product.id}`}>{product.title}</a>
                          </h3>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500 font-light">₹{product.final_price?.toLocaleString()}</p>
                            {product.brand_name && <span className="text-[10px] uppercase tracking-widest text-gray-300">{product.brand_name}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-32">
                    <Heart size={32} className="mx-auto text-gray-200 mb-6" strokeWidth={1} />
                    <h3 className="text-lg font-serif font-medium text-gray-900 mb-2">Your wishlist is empty</h3>
                    <p className="text-gray-400 mb-8 font-light">Save items you love here for later.</p>
                    <Button onClick={() => navigate('/shop')} variant="outline" className="min-w-[200px]">Explore Collection</Button>
                  </div>
                )}
              </div>
            )}

          </main>
        </div>
      </div>

      {/* --- MODALS --- */}
      
      {/* Delete Address Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white p-10 max-w-sm w-full shadow-2xl border border-gray-100">
            <h3 className="text-xl font-serif font-medium mb-3 text-center">Delete Address?</h3>
            <p className="text-gray-500 mb-8 text-sm leading-relaxed text-center font-light">
              This address will be permanently removed from your account. This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1 border-gray-200" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 border-red-600 text-white" onClick={handleDeleteAddress} isLoading={actionLoading}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white p-10 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setShowReviewModal(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors"
            >
              <X size={20} strokeWidth={1.5} />
            </button>

            <h3 className="text-2xl font-serif font-medium mb-2 text-center">Write a Review</h3>
            <p className="text-sm text-gray-400 mb-8 text-center font-light border-b border-gray-100 pb-6">{selectedOrderItemForReview?.product_name}</p>

            <div className="space-y-8">
              <div className="text-center">
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-4 text-gray-400">Overall Rating</label>
                <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button 
                      key={num} 
                      onClick={() => setReviewData({...reviewData, rating: num})}
                      className="transition-transform hover:scale-110 focus:outline-none"
                    >
                      <Star 
                        size={32} 
                        className={num <= reviewData.rating ? 'fill-black text-black' : 'text-gray-200'} 
                        strokeWidth={0}
                      />
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-6">
                <Input
                  label="Headline"
                  value={reviewData.title}
                  onChange={(e) => setReviewData({...reviewData, title: e.target.value})}
                  placeholder="Summarize your experience"
                  className="text-center placeholder:text-center font-light border-b border-t-0 border-x-0 rounded-none px-0 focus:ring-0 focus:border-black bg-transparent"
                />
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 text-center">Details</label>
                  <textarea
                    className="w-full p-4 bg-gray-50 border-0 text-sm min-h-[120px] resize-none focus:ring-0 text-gray-600 font-light text-center placeholder:text-gray-300"
                    placeholder="What did you like or dislike? How was the fit?"
                    value={reviewData.comment}
                    onChange={(e) => setReviewData({...reviewData, comment: e.target.value})}
                  />
                </div>
              </div>
              
              <Button onClick={handleSubmitReview} isLoading={actionLoading} className="w-full py-4 text-xs font-bold uppercase tracking-widest bg-black text-white hover:bg-gray-800">Submit Review</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfilePage;