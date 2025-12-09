import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Package, MapPin, CreditCard, 
  Download, Phone, X, ChevronRight, MessageSquare, AlertCircle
} from 'lucide-react';
import api from '../lib/axios';
import Button from '../components/ui/Button.jsx';
import { notifySuccess, notifyError } from '../lib/notify';

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedItemForReturn, setSelectedItemForReturn] = useState(null);
  const [returnData, setReturnData] = useState({ reason: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`orders/${id}/`);
      setOrder(response.data);
    } catch (error) {
      console.error("Failed to fetch order", error);
      notifyError("Order not found or access denied");
      navigate('/profile?tab=orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    setActionLoading(true);
    try {
      await api.post(`orders/${id}/cancel/`);
      notifySuccess("Order cancelled successfully");
      setShowCancelDialog(false);
      fetchOrder(); 
    } catch (error) {
      notifyError(error.response?.data?.error || "Failed to cancel order");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnRequest = async () => {
    if (!returnData.reason.trim()) {
      notifyError("Reason is required");
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`orders/${id}/request_return/`, {
        order_item_id: selectedItemForReturn.id,
        ...returnData
      });
      notifySuccess("Return requested successfully");
      setShowReturnModal(false);
      fetchOrder();
    } catch (error) {
      notifyError(error.response?.data?.error || "Request failed");
    } finally {
      setActionLoading(false);
    }
  };

  const openReturnModal = (item) => {
    setSelectedItemForReturn(item);
    setReturnData({ reason: '' });
    setShowReturnModal(true);
  };

  const isReturnWindowOpen = (deliveredAt) => {
    if (!deliveredAt) return false;
    const deliveryTime = new Date(deliveredAt).getTime();
    const currentTime = new Date().getTime();
    return (currentTime - deliveryTime) / 1000 <= 70; 
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-2 border-gray-100 border-t-black rounded-full animate-spin"></div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Loading Order</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Navbar Placeholder */}
      <div className="sticky top-[72px] z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate('/profile?tab=orders')}
            className="group flex items-center text-sm font-medium text-gray-500 hover:text-black transition-colors"
          >
            <ArrowLeft size={16} className="mr-2 transition-transform group-hover:-translate-x-1" />
            Back to Orders
          </button>
          
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 hidden sm:inline-block">Order #{order.id.slice(0, 8)}</span>
            <div className={`h-2 w-2 rounded-full ${
              order.order_status === 'delivered' ? 'bg-green-500' :
              order.order_status === 'cancelled' ? 'bg-red-500' : 'bg-blue-500'
            }`} />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-12 max-w-6xl">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif font-medium text-gray-900 mb-2">
              {order.order_status === 'delivered' ? 'Delivered' : 
               order.order_status === 'cancelled' ? 'Cancelled' : 'In Progress'}
            </h1>
            <p className="text-gray-500 font-light">
              Order placed on {formatDate(order.created_at)}
            </p>
          </div>
          
          
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
          
          {/* LEFT: Items (8 cols) */}
          <div className="lg:col-span-8 space-y-12">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-8 border-b border-gray-100 pb-4">
                Items ({order.items.length})
              </h3>
              
              <div className="space-y-10">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-6 sm:gap-8 group">
                    {/* Image */}
                    <div 
                      className="w-24 h-32 sm:w-32 sm:h-40 bg-gray-100 overflow-hidden cursor-pointer relative"
                      onClick={() => navigate(`/product/${item.product_slug}`)}
                    >
                      {item.product_image ? (
                        <img 
                          src={item.product_image} 
                          alt="" 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Package size={24} strokeWidth={1} />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <h4 
                          className="font-serif text-xl text-gray-900 cursor-pointer hover:underline decoration-gray-300 underline-offset-4 decoration-1 truncate pr-4"
                          onClick={() => navigate(`/product/${item.product_slug}`)}
                        >
                          {item.product_name}
                        </h4>
                        <span className="font-medium text-gray-900 shrink-0">₹{item.price_at_purchase?.toLocaleString()}</span>
                      </div>
                      
                      <div className="text-sm text-gray-500 font-light space-y-1 mb-6">
                        <p>{item.variant_name || 'Standard'} {item.selected_size ? ` / ${item.selected_size}` : ''}</p>
                        <p>Qty: {item.quantity}</p>
                      </div>

                      {/* Item Actions */}
                      <div className="mt-auto flex flex-wrap gap-x-6 gap-y-2">
                        <button 
                          className="text-xs font-bold uppercase tracking-widest text-gray-900 hover:text-gray-600 transition-colors"
                          onClick={() => navigate(`/product/${item.product_slug}`)}
                        >
                          Buy Again
                        </button>
                        
                        {order.order_status === 'delivered' && isReturnWindowOpen(order.delivered_at) && !item.return_requests?.length && (
                          <button 
                            className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
                            onClick={() => openReturnModal(item)}
                          >
                            Return Item
                          </button>
                        )}

                        {item.return_requests?.map(req => (
                          <span key={req.id} className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                            Return {req.status}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Need Help Section */}
            <div className="border-t border-gray-100 pt-10 mt-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h4 className="font-serif text-lg text-gray-900 mb-1">Need assistance?</h4>
                  <p className="text-sm text-gray-500 font-light">Our concierge team is available to help.</p>
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" className="border-gray-200 text-xs uppercase tracking-widest px-6" onClick={() => window.location.href = 'mailto:support@aura.com'}>
                    <MessageSquare size={14} className="mr-2" /> Email Us
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Summary (4 cols) */}
          <div className="lg:col-span-4">
            <div className="bg-gray-50 p-8 lg:p-10 sticky top-32 space-y-10">
              
              {/* Shipping */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                  <MapPin size={14} /> Shipping To
                </h3>
                <div className="text-sm text-gray-900 font-light leading-relaxed">
                  <p className="font-medium mb-1">{order.shipping_address?.full_name}</p>
                  <p>{order.shipping_address?.address_line_1}</p>
                  {order.shipping_address?.address_line_2 && <p>{order.shipping_address?.address_line_2}</p>}
                  <p>{order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.pincode}</p>
                  <p className="mt-2 text-gray-500">{order.shipping_address?.phone}</p>
                </div>
              </div>

              {/* Payment */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                  <CreditCard size={14} /> Payment Method
                </h3>
                <div className="flex justify-between items-center text-sm font-light text-gray-900">
                  <span>{order.payment_method === 'COD' ? 'Cash on Delivery' : 'Online Payment'}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 ${
                    order.payment_status === 'paid' ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {order.payment_status}
                  </span>
                </div>
              </div>

              <div className="h-px bg-gray-200 w-full" />

              {/* Totals */}
              <div className="space-y-3 text-sm font-light text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{(Number(order.total_amount) - Number(order.shipping_cost) - Number(order.tax_amount) + Number(order.discount_amount)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{Number(order.shipping_cost) === 0 ? 'Free' : `₹${order.shipping_cost}`}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes</span>
                  <span>₹{order.tax_amount}</span>
                </div>
                {Number(order.discount_amount) > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount</span>
                    <span>-₹{order.discount_amount}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium text-lg text-gray-900 pt-3 border-t border-gray-200 mt-2 font-serif">
                  <span>Total</span>
                  <span>₹{order.total_amount}</span>
                </div>
              </div>

              {/* Cancel Link - Subtle Placement */}
              {order.order_status === 'processing' && (
                <div className="pt-4 text-center">
                  <button 
                    onClick={() => setShowCancelDialog(true)}
                    className="text-xs text-gray-400 hover:text-red-600 hover:underline transition-colors"
                  >
                    Cancel Order
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>

      {/* --- DIALOGS --- */}

      {/* Cancel Confirmation - Minimalist */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white p-10 max-w-sm w-full shadow-2xl border border-gray-100 text-center">
            <h3 className="text-xl font-serif font-medium mb-3">Cancel Order?</h3>
            <p className="text-gray-500 mb-8 text-sm font-light">
              This action cannot be undone. Funds will be refunded within 5-7 business days.
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => setShowCancelDialog(false)} className="w-full">Keep Order</Button>
              <button 
                onClick={handleCancelOrder}
                disabled={actionLoading}
                className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-red-600 py-3 transition-colors"
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal - Elegant */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white p-10 max-w-md w-full shadow-2xl border border-gray-100 relative">
            <button 
              onClick={() => setShowReturnModal(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors"
            >
              <X size={20} strokeWidth={1} />
            </button>

            <h3 className="text-2xl font-serif font-medium mb-1">Return Item</h3>
            <p className="text-sm text-gray-400 mb-8 font-light border-b border-gray-100 pb-4">
              {selectedItemForReturn?.product_name}
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Reason for Return</label>
                <textarea
                  className="w-full p-4 bg-gray-50 border-0 text-sm min-h-[120px] resize-none focus:ring-0 text-gray-900 font-light placeholder:text-gray-400"
                  placeholder="Please tell us why this didn't work out..."
                  value={returnData.reason}
                  onChange={(e) => setReturnData({...returnData, reason: e.target.value})}
                />
              </div>
              
              <div className="flex gap-3 text-xs text-gray-500 font-light items-start">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <p>Items must be returned in original condition with tags attached. Refunds are processed to the original payment method.</p>
              </div>
              
              <Button onClick={handleReturnRequest} isLoading={actionLoading} className="w-full py-4 text-xs font-bold uppercase tracking-widest bg-black text-white hover:bg-gray-800">
                Submit Request
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OrderDetailPage;