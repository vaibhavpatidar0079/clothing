import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { fetchCart, removeFromCart, updateCartItem } from '../store/slices/cartSlice';
import Button from '../components/ui/Button';

const CartPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, totalPrice, loading } = useSelector((state) => state.cart);
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchCart());
    }
  }, [isAuthenticated, dispatch]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-serif">Your cart is waiting</h2>
        <p className="text-gray-500">Please login to view your cart items.</p>
        <Link to="/login">
          <Button>Login Now</Button>
        </Link>
      </div>
    );
  }

  if (items.length === 0 && !loading) {
    return (
       <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-serif">Your bag is empty</h2>
        <Link to="/shop">
          <Button variant="outline">Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  const shipping = totalPrice > 1000 ? 0 : 99;
  const tax = Math.round(totalPrice * 0.18); // 18% GST estimate
  const finalTotal = parseFloat(totalPrice) + shipping + tax;

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <h1 className="text-3xl font-serif font-bold mb-8">Shopping Bag</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Cart Items List */}
        <div className="lg:col-span-2 space-y-6">
          {items.map((item) => (
            <div key={item.id} className="flex gap-6 py-6 border-b border-gray-100">
              {/* Image */}
              <div className="h-32 w-24 flex-shrink-0 overflow-hidden rounded-sm bg-gray-100">
                <img 
                  src={
                    item.product?.primary_image 
                      ? (item.product.primary_image.startsWith('http') 
                          ? item.product.primary_image 
                          : `http://localhost:8000${item.product.primary_image}`)
                      : "https://via.placeholder.com/150"
                  }
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/150";
                  }} 
                  alt={item.product?.title}
                  className="h-full w-full object-cover object-center"
                />
              </div>

              {/* Details */}
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <div className="flex justify-between">
                    <div>
                      <h3 className="text-base font-medium text-gray-900">
                        <Link to={`/product/${item.product_id}`}>{item.product?.title}</Link>
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">{item.product?.brand_name}</p>
                      {item.variant_details && (
                         <p className="mt-1 text-sm text-gray-500">Size: {item.variant_details.size}</p>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900">₹{item.subtotal}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  {/* Quantity Control */}
                  <div className="flex items-center border border-gray-300 rounded-sm">
                    <button 
                      onClick={() => dispatch(updateCartItem({ item_id: item.id, quantity: item.quantity - 1 }))}
                      disabled={item.quantity <= 1}
                      className="p-2 hover:bg-gray-100 disabled:opacity-50"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="px-4 text-sm font-medium">{item.quantity}</span>
                    <button 
                       onClick={() => dispatch(updateCartItem({ item_id: item.id, quantity: item.quantity + 1 }))}
                       className="p-2 hover:bg-gray-100"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <button 
                    onClick={() => dispatch(removeFromCart(item.id))}
                    className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                  >
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 p-6 rounded-sm h-fit">
          <h2 className="text-lg font-bold mb-6">Order Summary</h2>
          
          <div className="space-y-4 text-sm text-gray-600 mb-6">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{totalPrice}</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Tax (18% GST)</span>
              <span>₹{tax}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4 flex justify-between font-bold text-lg mb-8">
            <span>Total</span>
            <span>₹{finalTotal}</span>
          </div>

          <Button 
            className="w-full py-4" 
            onClick={() => navigate('/checkout')}
          >
            Proceed to Checkout <ArrowRight size={16} className="ml-2"/>
          </Button>
          
          <div className="mt-4 flex gap-2 justify-center">
             <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-5 opacity-50" alt="paypal"/>
             <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-5 opacity-50" alt="mastercard"/>
             <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" className="h-5 opacity-50" alt="visa"/>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;