import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Star, Truck, Shield, Ruler, User, ThumbsUp, CheckCircle2 } from 'lucide-react';
import { notifySuccess, notifyError, notify } from '../lib/notify';
import api from '../lib/axios';
import { addToCart } from '../store/slices/cartSlice';
import Button from '../components/ui/Button';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [adding, setAdding] = useState(false);

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
    <div className="container mx-auto px-4 md:px-6 py-12">
      {/* Product Main Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 mb-20">
        
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-[3/4] w-full overflow-hidden bg-gray-100 rounded-sm">
            {images[selectedImage] ? (
            <img 
              src={images[selectedImage]} 
              alt={product.title} 
              className="h-full w-full object-cover object-center"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80&w=600&auto=format&fit=crop';
              }}
            />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400">
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
                  className={`relative flex-shrink-0 h-24 w-20 overflow-hidden rounded-sm border-2 transition-all ${
                    selectedImage === idx ? 'border-black opacity-100' : 'border-transparent opacity-70 hover:opacity-100'
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
        <div className="flex flex-col">
          <div className="mb-2">
             <span className="text-sm text-gray-500 uppercase tracking-wider font-medium">{product.brand_name || 'Aura Premium'}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4">{product.title}</h1>
          
          <div className="flex items-baseline gap-4 mb-6">
             <span className="text-2xl font-medium">₹{product.final_price?.toLocaleString()}</span>
             {product.discount_price && (
               <>
                 <span className="text-lg text-gray-400 line-through">₹{product.price?.toLocaleString()}</span>
                 <span className="text-xs font-bold text-white bg-red-600 px-2 py-1 rounded-sm">
                    {Math.round(((product.price - product.discount_price)/product.price)*100)}% OFF
                 </span>
               </>
             )}
          </div>

          <div className="flex items-center gap-2 mb-8 text-sm">
            <div className="flex text-yellow-500">
               {[...Array(5)].map((_, i) => (
                 <Star key={i} size={16} fill={i < Math.round(averageRating) ? "currentColor" : "none"} />
               ))}
            </div>
            <a href="#reviews" className="text-gray-500 hover:text-black hover:underline transition-colors">
              ({reviewCount} {reviewCount === 1 ? 'Review' : 'Reviews'})
            </a>
          </div>

          <div className="h-px bg-gray-200 my-6"></div>

          {/* Size Selector */}
          {(product.sizes && product.sizes.length > 0) || product.size ? (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium text-gray-900">Select Size</span>
                <button className="text-xs text-gray-500 underline flex items-center gap-1 hover:text-black">
                  <Ruler size={14}/> Size Guide
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
                          h-12 min-w-[3rem] px-2 flex items-center justify-center border rounded-sm transition-all
                          ${selectedSize === size.size 
                            ? 'bg-black text-white border-black ring-2 ring-black ring-offset-1' 
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
                        h-12 min-w-[3rem] px-2 flex items-center justify-center border rounded-sm transition-all
                        ${selectedSize === product.size 
                          ? 'bg-black text-white border-black ring-2 ring-black ring-offset-1' 
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
            <div className="mb-8">
              <div className="mb-4">
                <span className="font-medium text-gray-900">Related Variants</span>
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
                        className={`group relative flex flex-col items-center gap-2 p-3 border rounded-sm transition-all ${
                          isCurrentProduct 
                            ? 'border-black bg-black/5 ring-2 ring-black ring-offset-1' 
                            : 'border-gray-200 hover:border-black'
                        }`}
                        title={isCurrentProduct ? 'Currently viewing' : 'View variant'}
                      >
                        {variantImage && (
                          <div className={`relative w-20 h-20 overflow-hidden rounded-sm bg-gray-100 ${isCurrentProduct ? 'ring-2 ring-black' : ''}`}>
                            <img
                              src={getImageUrl(variantImage)}
                              alt={variantProduct.title}
                              className={`w-full h-full object-cover group-hover:scale-105 transition-transform ${isCurrentProduct ? 'brightness-100' : ''}`}
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80&w=600&auto=format&fit=crop';
                              }}
                            />
                            {isCurrentProduct && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <span className="text-white text-xs font-bold uppercase tracking-widest">Active</span>
                              </div>
                            )}
                          </div>
                        )}
                        {variant.difference && (
                          <span className={`text-xs font-medium uppercase tracking-wide ${
                            isCurrentProduct 
                              ? 'text-black font-bold' 
                              : 'text-gray-600'
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

          {/* Actions */}
          <div className="flex flex-col gap-4 mb-8">
            <Button 
              size="lg" 
              className="w-full py-6 text-base" 
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
            <p className="text-xs text-center text-gray-500 flex items-center justify-center gap-1">
              <Truck size={14} /> Free shipping on orders over ₹1,000.
            </p>
          </div>

          {/* Details Accordion style */}
          <div className="space-y-6 text-sm text-gray-600">
             <div className="bg-gray-50 p-6 rounded-sm">
                <h3 className="font-bold text-gray-900 mb-2 uppercase tracking-wide text-xs">Description</h3>
                <p className="leading-relaxed">{product.description}</p>
             </div>
             
             <div className="grid grid-cols-2 gap-6 p-4 border border-gray-100 rounded-sm">
               <div>
                 <span className="block font-bold text-gray-900 mb-1 uppercase tracking-wide text-xs">Fabric</span>
                 <span>{product.fabric || 'Cotton Blend'}</span>
               </div>
               <div>
                 <span className="block font-bold text-gray-900 mb-1 uppercase tracking-wide text-xs">Care</span>
                 <span>{product.care_instructions || 'Dry Clean Only'}</span>
               </div>
               <div>
                 <span className="block font-bold text-gray-900 mb-1 uppercase tracking-wide text-xs">Fit</span>
                 <span>{product.fit || 'Regular Fit'}</span>
               </div>
               <div>
                 <span className="block font-bold text-gray-900 mb-1 uppercase tracking-wide text-xs">Occasion</span>
                 <span>{product.occasion || 'Casual'}</span>
               </div>
             </div>

             <div className="flex gap-6 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-green-700">
                   <Truck size={18}/> <span className="font-medium">Fast Delivery</span>
                </div>
                <div className="flex items-center gap-2 text-green-700">
                   <Shield size={18}/> <span className="font-medium">100% Authentic</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div id="reviews" className="border-t border-gray-200 pt-16 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h2 className="text-3xl font-serif font-bold text-gray-900">Customer Reviews</h2>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex text-yellow-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} fill={i < Math.round(averageRating) ? "currentColor" : "none"} />
                ))}
              </div>
              <p className="text-lg font-medium">
                {averageRating ? averageRating.toFixed(1) : '0.0'} 
                <span className="text-gray-500 font-normal ml-1">based on {reviewCount} reviews</span>
              </p>
            </div>
          </div>
          
          <Button variant="outline">Write a Review</Button>
        </div>

        {reviews.length === 0 ? (
          <div className="bg-gray-50 rounded-sm p-12 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white mb-4 shadow-sm">
              <Star className="h-8 w-8 text-yellow-400" fill="currentColor" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No reviews yet</h3>
            <p className="text-gray-500 mb-6">Be the first to review this product and let others know what you think.</p>
            <Button>Write First Review</Button>
          </div>
        ) : (
          <div className="grid gap-8">
            {reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-100 pb-8 last:border-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    {/* User Avatar */}
                    {review.user_avatar ? (
                      <img src={review.user_avatar} alt={review.user_name} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                        <User size={24} />
                      </div>
                    )}
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-base">{review.user_name || 'Anonymous'}</span>
                        {review.is_verified_purchase && (
                          <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full tracking-wider border border-green-100">
                            <CheckCircle2 size={10} /> Verified
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(review.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex text-yellow-500 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill={i < review.rating ? "currentColor" : "none"} />
                  ))}
                </div>

                <h3 className="font-bold text-lg text-gray-900 mb-2">{review.title}</h3>
                <p className="text-gray-600 leading-relaxed mb-4 text-base">
                  {review.comment}
                </p>

                {/* Helpful count mockup */}
                <button className="flex items-center gap-2 text-sm text-gray-400 hover:text-black transition-colors group">
                  <ThumbsUp size={16} className="group-hover:scale-110 transition-transform" />
                  <span>Helpful</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;