import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

const ProductCard = ({ product }) => {
  if (!product) return null;

  // Calculate discount percentage if not provided
  const discountPercent = product.discount_price 
    ? Math.round(((product.price - product.discount_price) / product.price) * 100)
    : 0;

  return (
    <div className="group relative">
      <div className="aspect-[3/4] w-full overflow-hidden rounded-sm bg-gray-100 relative">
        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute top-2 left-2 z-10 bg-black text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider">
            -{discountPercent}%
          </div>
        )}
        
        {/* Wishlist Button */}
        <button className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white text-gray-900">
          <Heart size={18} />
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

        {/* Quick Add Overlay (Optional, simple version here) */}
        <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Link to={`/product/${product.id}`} className="block w-full">
            <button className="w-full bg-white text-black py-3 text-sm font-medium uppercase tracking-wide hover:bg-gray-100 shadow-lg">
              View Product
            </button>
          </Link>
        </div>
      </div>

      {/* Product Info */}
      <div className="mt-4 space-y-1">
        <h3 className="text-xs text-gray-500 uppercase tracking-wide">{product.brand_name || 'Aura'}</h3>
        <Link to={`/product/${product.id}`}>
          <h2 className="text-sm font-medium text-gray-900 line-clamp-1 group-hover:text-gray-600 transition-colors">
            {product.title}
          </h2>
        </Link>
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
    </div>
  );
};

export default ProductCard;