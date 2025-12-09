import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Star, Truck, Shield, Ruler, User, ThumbsUp, CheckCircle2, ChevronRight, X, Heart, Share2 } from 'lucide-react';
import { notifySuccess, notifyError, notify } from '../lib/notify';
import api from '../lib/axios';
import { addToCart } from '../store/slices/cartSlice';
import Button from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [adding, setAdding] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await api.get(`products/${id}/`);
        const productData = response.data;
        setProduct(productData);
        
        // Auto-select size if there's only one option
        if (productData.sizes && productData.sizes.length === 1) {
          setSelectedSize(productData.sizes[0].size);
        } else if (!productData.sizes && productData.size && productData.size.trim() !== '') {
          setSelectedSize(productData.size);
        }
      } catch (error) {
         console.error("Fetch failed", error);
         notifyError("Could not load product");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;
    
    // Check if sizes are available and none selected
    const hasSizes = product.sizes && product.sizes.length > 0;
    const hasSize = product.size && product.size.trim() !== '';
    const requiresSizeSelection = hasSizes || hasSize;
    
      if (requiresSizeSelection && !selectedSize) {
      notifyError('Please select a size');
      return;
    }

    setAdding(true);
    try {
      // Find size ID if selected
      const selectedSizeObj = hasSizes 
        ? product.sizes.find(s => s.size === selectedSize) 
        : null;

      await dispatch(addToCart({
        product_id: product.id,
        size_id: selectedSizeObj ? selectedSizeObj.id : null,
        quantity: 1
      })).unwrap();

      notifySuccess('Added to bag');
    } catch (error) {
      // If 401, redirect to login
      if (error?.code === 'token_not_valid' || error?.detail?.includes('Authentication')) {
      notifyError("Please login to shop");
         navigate('/login');
      } else {
      notifyError(error.error || 'Failed to add to cart');
      }
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!product) return <div className="h-screen flex items-center justify-center">Product not found</div>;

  // Helper to ensure image URLs are absolute
  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    // If relative URL, prepend backend URL
    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1/', '') || 'http://localhost:8000';
    return `${baseUrl}${url}`;
  };

  const images = product.images && product.images.length > 0 
    ? product.images.map(img => getImageUrl(img.image)).filter(Boolean)
    : product.primary_image ? [getImageUrl(product.primary_image)] : [];

  // Calculate actual ratings from reviews if available, else fallback to product average
  const reviews = product.reviews || [];
  const reviewCount = reviews.length;
  const averageRating = product.average_rating || 0;

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 pb-24 md:pb-12 font-sans text-gray-900">
      {/* Product Main Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24 mb-20">
        
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-[3/4] w-full overflow-hidden bg-gray-50 rounded-sm">
            {images[selectedImage] ? (
            <img 
              src={images[selectedImage]} 
              alt={product.title} 
              className="h-full w-full object-cover object-center transition-opacity duration-300"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80&w=600&auto=format&fit=crop';
              }}
            />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-300 font-light">
                No image available
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`relative flex-shrink-0 h-24 w-20 overflow-hidden rounded-sm border-2 transition-all duration-300 ${
                    selectedImage === idx ? 'border-gray-900 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img 
                    src={img} 
                    alt="" 
                    className="h-full w-full object-cover"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80&w=600&auto=format&fit=crop'; }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col h-fit">
          <div className="mb-3">
             <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">{product.brand_name || 'Aura Premium'}</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-medium text-gray-900 mb-6 leading-tight tracking-tight">{product.title}</h1>
          
          <div className="flex items-baseline gap-4 mb-8 pb-8 border-b border-gray-100">
             <span className="text-2xl font-medium text-gray-900">₹{product.final_price?.toLocaleString()}</span>
             {product.discount_price && (
               <>
                 <span className="text-lg text-gray-400 line-through font-light">₹{product.price?.toLocaleString()}</span>
                 <span className="text-[10px] font-bold text-white bg-gray-900 px-2 py-1 rounded-sm uppercase tracking-wider">
                    {Math.round(((product.price - product.discount_price)/product.price)*100)}% OFF
                 </span>
               </>
             )}
          </div>

          <div className="flex items-center gap-2 mb-8 text-sm">
            <div className="flex text-gray-900">
               {[...Array(5)].map((_, i) => (
                 <Star key={i} size={14} fill={i < Math.round(averageRating) ? "currentColor" : "none"} strokeWidth={1.5} />
               ))}
            </div>
            <a href="#reviews" className="text-gray-500 hover:text-black hover:underline transition-colors decoration-gray-300 underline-offset-4 font-light">
              ({reviewCount} {reviewCount === 1 ? 'Review' : 'Reviews'})
            </a>
          </div>

          {/* Color Display - Only when no variants */}
          {(!product.variants || product.variants.length === 0) && product.color && (
            <div className="mb-10">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3 block">Colour</span>
              <span className="text-base text-gray-600 font-light">{product.color}</span>
            </div>
          )}

          {/* Size Selector */}
          {(product.sizes && product.sizes.length > 0) || product.size ? (
            <div className="mb-10">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">Select Size</span>
                <button 
                  onClick={() => setShowSizeGuide(true)}
                  className="text-xs text-gray-500 underline decoration-gray-300 underline-offset-4 flex items-center gap-1 hover:text-black transition-colors"
                >
                  <Ruler size={14} strokeWidth={1.5}/> Find My Fit
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {product.sizes && product.sizes.length > 0 ? (
                  // Show sizes from ProductSize model
                  product.sizes
                    .filter(size => size.is_active)
                    .map((size) => (
                      <button
                        key={size.id}
                        onClick={() => setSelectedSize(size.size)}
                        disabled={size.stock_count === 0}
                        className={`
                          h-12 min-w-[3.5rem] px-3 flex items-center justify-center border text-sm font-medium transition-all duration-200
                          ${selectedSize === size.size 
                            ? 'bg-gray-900 text-white border-gray-900' 
                            : 'bg-white text-gray-900 border-gray-200 hover:border-gray-900'}
                          ${size.stock_count === 0 ? 'opacity-40 cursor-not-allowed bg-gray-50 line-through decoration-gray-400' : ''}
                        `}
                      >
                        {size.size}
                      </button>
                    ))
                ) : (
                  // Show product size if no sizes but size field exists
                  product.size && (
                    <button
                      onClick={() => setSelectedSize(product.size)}
                      className={`
                        h-12 min-w-[3.5rem] px-3 flex items-center justify-center border text-sm font-medium transition-all duration-200
                        ${selectedSize === product.size 
                          ? 'bg-gray-900 text-white border-gray-900' 
                          : 'bg-white text-gray-900 border-gray-200 hover:border-gray-900'}
                      `}
                    >
                      {product.size}
                    </button>
                  )
                )}
              </div>
            </div>
          ) : null}

          {/* Variant Products - All Related Variants */}
          {product.variants && product.variants.length > 0 && (
            <div className="mb-10">
              <div className="mb-4">
                <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">Related Variants</span>
              </div>
              <div className="flex flex-wrap gap-4">
                {product.variants
                  .filter(variant => variant.is_active && variant.variant_product)
                  .map((variant) => {
                    const variantProduct = variant.variant_product;
                    const variantImage = variant.variant_image || variantProduct?.primary_image;
                    const isCurrentProduct = variantProduct.id === product.id;
                    const getImageUrl = (url) => {
                      if (!url) return null;
                      if (url.startsWith('http')) return url;
                      const baseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1/', '') || 'http://localhost:8000';
                      return `${baseUrl}${url}`;
                    };
                    
                    return (
                      <button
                        key={variant.id}
                        onClick={() => navigate(`/product/${variantProduct.id}`)}
                        className={`group relative flex flex-col items-center gap-2 p-1 border rounded-sm transition-all duration-200 ${
                          isCurrentProduct 
                            ? 'border-gray-900' 
                            : 'border-transparent hover:border-gray-300'
                        }`}
                        title={isCurrentProduct ? 'Currently viewing' : 'View variant'}
                      >
                        {variantImage && (
                          <div className="relative w-16 h-20 overflow-hidden rounded-sm bg-gray-50">
                            <img
                              src={getImageUrl(variantImage)}
                              alt={variantProduct.title}
                              className={`w-full h-full object-cover group-hover:scale-105 transition-transform ${isCurrentProduct ? 'brightness-100' : 'opacity-90'}`}
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80&w=600&auto=format&fit=crop';
                              }}
                            />
                            {isCurrentProduct && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <span className="text-white text-[10px] font-bold uppercase tracking-widest">Active</span>
                              </div>
                            )}
                          </div>
                        )}
                        {variant.difference && (
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${
                            isCurrentProduct 
                              ? 'text-gray-900' 
                              : 'text-gray-500'
                          }`}>
                            {variant.difference}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Actions (Desktop) */}
          <div className="hidden md:flex flex-col gap-4 mb-8">
            <Button 
              size="lg" 
              className="w-full h-14 text-sm uppercase tracking-widest font-bold bg-gray-900 hover:bg-black rounded-none transition-colors duration-300" 
              onClick={handleAddToCart}
              isLoading={adding}
              disabled={
                product.inventory_count === 0 && 
                (!product.sizes || product.sizes.every(s => s.stock_count === 0))
              }
            >
              {product.inventory_count === 0 && 
               (!product.sizes || product.sizes.every(s => s.stock_count === 0))
                ? 'Out of Stock' 
                : 'Add to Bag'}
            </Button>
            <p className="text-[10px] text-center text-gray-500 uppercase tracking-widest flex items-center justify-center gap-2 mt-2 font-medium">
              <Truck size={14} strokeWidth={1.5} /> Free shipping on orders over ₹1,000.
            </p>
          </div>

          {/* Details Accordion style */}
          <div className="space-y-8 text-sm text-gray-600 border-t border-gray-100 pt-8">
             <div className="bg-gray-50 p-6 rounded-sm">
                <h3 className="font-bold text-gray-900 mb-2 uppercase tracking-widest text-xs">Description</h3>
                <p className="leading-relaxed font-light">{product.description}</p>
             </div>
             
             <div className="grid grid-cols-2 gap-y-6 gap-x-8">
               <div>
                 <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Fabric</span>
                 <span className="font-light">{product.fabric || 'Cotton Blend'}</span>
               </div>
               <div>
                 <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Care</span>
                 <span className="font-light">{product.care_instructions || 'Dry Clean Only'}</span>
               </div>
               <div>
                 <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Fit</span>
                 <span className="font-light">{product.fit || 'Regular Fit'}</span>
               </div>
               <div>
                 <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Occasion</span>
                 <span className="font-light">{product.occasion || 'Casual'}</span>
               </div>
             </div>

             <div className="flex gap-8 pt-4 border-t border-gray-100 text-[10px] uppercase tracking-widest font-bold text-gray-500">
                <div className="flex items-center gap-2">
                   <Truck size={16} strokeWidth={1.5}/> <span>Fast Delivery</span>
                </div>
                <div className="flex items-center gap-2">
                   <Shield size={16} strokeWidth={1.5}/> <span>100% Authentic</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div id="reviews" className="border-t border-gray-100 pt-20 mt-20 max-w-4xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
          <div>
            <h2 className="text-2xl font-serif font-medium text-gray-900 mb-2">Customer Reviews</h2>
            <div className="flex items-center gap-3">
              <div className="flex text-gray-900">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill={i < Math.round(averageRating) ? "currentColor" : "none"} strokeWidth={1.5} />
                ))}
              </div>
              <p className="text-sm font-light text-gray-500">
                {averageRating ? averageRating.toFixed(1) : '0.0'} based on {reviewCount} reviews
              </p>
            </div>
          </div>
          
          <Button variant="outline" size="sm" className="uppercase text-xs tracking-widest font-bold border-gray-300 hover:border-gray-900 rounded-none">
            Write a Review
          </Button>
        </div>

        {reviews.length === 0 ? (
          <div className="bg-gray-50 rounded-sm p-12 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white mb-4 shadow-sm">
              <Star className="h-8 w-8 text-gray-400" fill="currentColor" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-serif font-medium text-gray-900 mb-2">No reviews yet</h3>
            <p className="text-gray-500 mb-6 font-light">Be the first to review this product and let others know what you think.</p>
            <Button size="sm" className="uppercase text-xs tracking-widest font-bold bg-gray-900 hover:bg-black rounded-none">Write First Review</Button>
          </div>
        ) : (
          <div className="grid gap-12">
            {reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-100 pb-12 last:border-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    {/* User Avatar */}
                    {review.user_avatar ? (
                      <img src={review.user_avatar} alt={review.user_name} className="h-10 w-10 rounded-full object-cover bg-gray-100" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <User size={20} strokeWidth={1.5} />
                      </div>
                    )}
                    
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-sm text-gray-900">{review.user_name || 'Anonymous'}</span>
                        {review.is_verified_purchase && (
                          <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-green-700 bg-green-50 px-2 py-0.5 tracking-wider border border-green-100">
                            <CheckCircle2 size={10} /> Verified
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 font-light">
                        {new Date(review.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex text-gray-900 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} strokeWidth={1.5} />
                  ))}
                </div>

                <h3 className="font-bold text-base text-gray-900 mb-2">{review.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-6 font-light text-base">
                  {review.comment}
                </p>

                {/* Helpful count mockup */}
                <button className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-900 transition-colors group uppercase tracking-wider font-medium">
                  <ThumbsUp size={14} className="group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                  <span>Helpful</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MOBILE FLOATING CTA */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4 z-50 safe-area-bottom shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        <Button 
          size="lg" 
          className="w-full h-12 text-xs uppercase tracking-widest font-bold bg-gray-900 text-white rounded-none" 
          onClick={handleAddToCart}
          isLoading={adding}
          disabled={
            product.inventory_count === 0 && 
            (!product.sizes || product.sizes.every(s => s.stock_count === 0))
          }
        >
          Add to Bag — ₹{product.final_price?.toLocaleString()}
        </Button>
      </div>

      {/* SIZE GUIDE MODAL */}
      <AnimatePresence>
        {showSizeGuide && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowSizeGuide(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: 50, scale: 0.95 }} 
              transition={{ duration: 0.2 }}
              className="bg-white w-full max-w-md p-8 relative z-10 shadow-2xl"
            >
              <button 
                onClick={() => setShowSizeGuide(false)}
                className="absolute top-6 right-6 p-2 hover:bg-gray-50 rounded-full transition-colors"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
              
              <h3 className="text-xl font-serif font-medium mb-2 text-gray-900">Find Your Perfect Fit</h3>
              <p className="text-sm text-gray-500 mb-8 font-light leading-relaxed">
                Enter your measurements below and our algorithm will recommend the best size for this specific garment.
              </p>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-900 block mb-2">Height (cm)</label>
                  <input type="number" className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-gray-900 transition-colors text-sm font-light placeholder:text-gray-300" placeholder="e.g. 165" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-900 block mb-2">Weight (kg)</label>
                  <input type="number" className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-gray-900 transition-colors text-sm font-light placeholder:text-gray-300" placeholder="e.g. 55" />
                </div>
                
                <Button className="w-full mt-8 h-12 uppercase text-xs tracking-widest font-bold bg-gray-900 rounded-none hover:bg-black">
                  Calculate Size
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ProductDetailPage;