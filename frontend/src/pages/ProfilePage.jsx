import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, MapPin, User as UserIcon, LogOut } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../store/slices/authSlice';
import api from '../lib/axios';
import Button from '../components/ui/Button';

const ProfilePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('orders/');
      setOrders(response.data);
    } catch (error) {
      console.error("Failed to fetch orders");
    } finally {
      setLoading(false);
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
                   <div>
                      <label className="block text-sm text-gray-500 mb-1">Phone</label>
                      <p className="font-medium text-lg">{user?.phone || 'Not provided'}</p>
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
                       <h3 className="font-bold text-lg mb-4 capitalize text-green-700">
                          {order.order_status}
                       </h3>
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

          {/* ADDRESSES TAB (Placeholder) */}
          {activeTab === 'addresses' && (
             <div className="bg-white border border-gray-100 p-8 rounded-sm text-center">
                <MapPin size={48} className="mx-auto text-gray-300 mb-4"/>
                <p className="text-gray-500 mb-4">Manage your saved addresses here.</p>
                <Button>Add New Address</Button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;