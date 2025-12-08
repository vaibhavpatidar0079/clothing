import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleWishlist, checkWishlistItems, addToWishlistOptimistic, removeFromWishlistOptimistic } from '../../store/slices/wishlistSlice';
import { notifySuccess, notifyError } from '../../lib/notify';

const ProductCard = ({ product }) => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector(state => state.auth);
  const { wishlistItemIds } = useSelector(state => state.wishlist);
  
  const [isToggling, setIsToggling] = useState(false);
  
  // Directly compute from Redux state - no extra useState needed
  const isInWishlist = wishlistItemIds.has(product.id);

  if (!product) return null;

  // Calculate discount percentage if not provided
  const discountPercent = product.discount_price 
    ? Math.round(((product.price - product.discount_price) / product.price) * 100)
    : 0;

  const handleWishlistToggle = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!isAuthenticated) {
      notifyError('Please login to add items to wishlist');
      return;
    }

    setIsToggling(true);
    const previousInWishlist = isInWishlist;
    const willBeAdded = !isInWishlist;
    
    try {
      // Optimistic update
      if (willBeAdded) {
        dispatch(addToWishlistOptimistic(product.id));
      } else {
        dispatch(removeFromWishlistOptimistic(product.id));
      }
      
      // Make API call
      await dispatch(toggleWishlist(product.id)).unwrap();
      
      if (willBeAdded) {
        notifySuccess('Added to wishlist');
      } else {
        notifySuccess('Removed from wishlist');
      }
    } catch (error) {
      // Revert optimistic update on error
      if (previousInWishlist) {
        dispatch(addToWishlistOptimistic(product.id));
      } else {
        dispatch(removeFromWishlistOptimistic(product.id));
      }
      notifyError(error.message || 'Failed to update wishlist');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <Link to={`/product/${product.id}`} className="group relative block">
      <div className="aspect-[3/4] w-full overflow-hidden rounded-sm bg-gray-100 relative">
        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute top-2 left-2 z-10 bg-black text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider">
            -{discountPercent}%
          </div>
        )}
        
        {/* Wishlist Button */}
        <button 
          onClick={handleWishlistToggle}
          disabled={isToggling}
          className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/80 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-white text-gray-900 disabled:opacity-50"
        >
          <Heart 
            size={18} 
            fill={isInWishlist ? 'currentColor' : 'none'}
            stroke={isInWishlist ? 'currentColor' : 'currentColor'}
            className={isInWishlist ? 'text-red-500' : ''}
          />
        </button>

        {/* Image */}
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

        {/* Quick Add Overlay (Optional, simple version here) - hidden on mobile */}
        <div className="absolute inset-x-0 bottom-0 p-4 hidden sm:block opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
          <div className="block w-full">
            <div className="w-full bg-white text-black py-3 text-sm font-medium uppercase tracking-wide hover:bg-gray-100 shadow-lg text-center">
              View Product
            </div>
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="mt-4 space-y-1">
        <h3 className="text-xs text-gray-500 uppercase tracking-wide">{product.brand_name || 'Aura'}</h3>
        <h2 className="text-sm font-medium text-gray-900 line-clamp-1 group-hover:text-gray-600 transition-colors">
          {product.title}
        </h2>
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
      </div>
    </Link>
  );
};

export default ProductCard;