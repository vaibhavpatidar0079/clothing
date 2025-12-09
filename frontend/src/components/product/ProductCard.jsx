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
      <div className="aspect-[3/4] w-full overflow-hidden bg-neutral-100 relative">
        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute top-3 left-3 z-20 bg-black text-white text-[10px] font-extrabold px-2 py-1 uppercase tracking-widest">
            -{discountPercent}%
          </div>
        )}
        
        {/* Wishlist Button (no background) - larger, premium look */}
        <button
          onClick={handleWishlistToggle}
          disabled={isToggling}
          aria-label="Toggle wishlist"
          className="absolute top-3 right-3 z-20 p-2 disabled:opacity-50"
        >
          <Heart
            size={20}
            fill={isInWishlist ? 'currentColor' : 'none'}
            stroke={isInWishlist ? 'currentColor' : 'currentColor'}
            className={isInWishlist ? 'text-red-500 scale-110 drop-shadow' : 'text-neutral-700'}
          />
        </button>

        {/* Main Product Image */}
        <img
          src={
            product.primary_image 
              ? (product.primary_image.startsWith('http') 
                  ? product.primary_image 
                  : `http://localhost:8000${product.primary_image}`)
              : 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80&w=600&auto=format&fit=crop'
          }
          alt={product.title}
          className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80&w=600&auto=format&fit=crop';
          }}
        />
        {/* Hover overlay: only 'Take a look' button should appear at bottom-center */}
        <div className="absolute left-1/2 bottom-3 z-10 transform -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button className="pointer-events-auto bg-black bg-opacity-75 text-white px-4 py-2 text-sm font-semibold uppercase tracking-wider rounded">
            Take a look
          </button>
        </div>
      </div>

      {/* Product Info - Centered Typography */}
      <div className="mt-4 space-y-1 text-left">
        <h3 className="text-xs text-neutral-600 uppercase tracking-widest font-semibold">{product.brand_name || 'Aura'}</h3>
        <h2 className="text-sm font-semibold text-neutral-900 line-clamp-2 group-hover:text-neutral-700 transition-colors">
          {product.title}
        </h2>
        <div className="flex items-baseline justify-start space-x-3 pt-1">
          <p className="text-base font-bold text-neutral-900">
            {product.final_price?.toLocaleString()}
          </p>
          {product.discount_price && (
            <p className="text-xs text-neutral-500 line-through">
              {product.price?.toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;