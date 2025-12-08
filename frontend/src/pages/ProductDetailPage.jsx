import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Star, Truck, Shield, Ruler } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../lib/axios';
import { addToCart } from '../store/slices/cartSlice';
import Button from '../components/ui/Button';

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    // In real app, fetch by slug. Using ID for demo simplicity if slug not setup perfectly in backend
    // Assuming backend supports slug lookup: api.get(`products/${slug}/`)
    // If using ID logic in url, parse it.
    
    // For this example, we'll try to fetch by ID from the slug if it's "id-slug" format, 
    // or just search.
    const fetchProduct = async () => {
      try {
        // Mocking the behavior: If slug is just an ID, use it.
        const response = await api.get(`products/${slug}/`);
        setProduct(response.data);
      } catch (error) {
         console.error("Fetch failed", error);
         toast.error("Could not load product");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  const handleAddToCart = async () => {
    if (!product) return;
    
    // Check if variants exist (e.g. sizes) and none selected
    const hasVariants = product.variants && product.variants.length > 0;
    if (hasVariants && !selectedSize) {
      toast.error('Please select a size');
      return;
    }

    setAdding(true);
    try {
      // Find variant ID if selected
      const variant = hasVariants 
        ? product.variants.find(v => v.size === selectedSize) 
        : null;

      await dispatch(addToCart({
        product_id: product.id,
        variant_id: variant ? variant.id : null,
        quantity: 1
      })).unwrap();

      toast.success('Added to bag');
    } catch (error) {
      // If 401, redirect to login
      if (error?.code === 'token_not_valid' || error?.detail?.includes('Authentication')) {
         toast.error("Please login to shop");
         navigate('/login');
      } else {
         toast.error(error.error || 'Failed to add to cart');
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

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
        
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
            <div className="flex gap-4 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`relative flex-shrink-0 h-24 w-20 overflow-hidden rounded-sm border-2 ${
                    selectedImage === idx ? 'border-black' : 'border-transparent'
                  }`}
                >
                  <img 
                    src={img} 
                    alt="" 
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80&w=600&auto=format&fit=crop';
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="mb-2">
             <span className="text-sm text-gray-500 uppercase tracking-wider">{product.brand_name}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4">{product.title}</h1>
          
          <div className="flex items-baseline gap-4 mb-6">
             <span className="text-2xl font-medium">₹{product.final_price?.toLocaleString()}</span>
             {product.discount_price && (
               <>
                 <span className="text-lg text-gray-400 line-through">₹{product.price?.toLocaleString()}</span>
                 <span className="text-sm font-bold text-green-700">
                    {Math.round(((product.price - product.discount_price)/product.price)*100)}% OFF
                 </span>
               </>
             )}
          </div>

          <div className="flex items-center gap-2 mb-8 text-sm">
            <div className="flex text-yellow-500">
               {[...Array(5)].map((_, i) => (
                 <Star key={i} size={16} fill={i < (product.average_rating || 4) ? "currentColor" : "none"} />
               ))}
            </div>
            <span className="text-gray-500">({product.reviews?.length || 12} Reviews)</span>
          </div>

          <div className="h-px bg-gray-200 my-6"></div>

          {/* Size Selector */}
          {product.variants && product.variants.length > 0 && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium text-gray-900">Select Size</span>
                <button className="text-xs text-gray-500 underline flex items-center gap-1">
                  <Ruler size={14}/> Size Guide
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedSize(variant.size)}
                    disabled={variant.stock_count === 0}
                    className={`
                      h-12 w-12 flex items-center justify-center border rounded-sm transition-all
                      ${selectedSize === variant.size 
                        ? 'bg-black text-white border-black' 
                        : 'bg-white text-gray-900 border-gray-200 hover:border-gray-900'}
                      ${variant.stock_count === 0 ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}
                    `}
                  >
                    {variant.size}
                  </button>
                ))}
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
              disabled={product.inventory_count === 0 && (!product.variants || product.variants.every(v => v.stock_count === 0))}
            >
              {product.inventory_count === 0 && (!product.variants || product.variants.every(v => v.stock_count === 0))
                ? 'Out of Stock' 
                : 'Add to Bag'}
            </Button>
            <p className="text-xs text-center text-gray-500">
              Free shipping on orders over ₹1,000.
            </p>
          </div>

          {/* Details Tabs/Accordion */}
          <div className="space-y-6 text-sm text-gray-600">
             <div className="bg-gray-50 p-4 rounded-sm">
                <h3 className="font-bold text-gray-900 mb-2">Description</h3>
                <p className="leading-relaxed">{product.description}</p>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <span className="block font-bold text-gray-900">Fabric</span>
                 <span>{product.fabric || 'Cotton Blend'}</span>
               </div>
               <div>
                 <span className="block font-bold text-gray-900">Care</span>
                 <span>{product.care_instructions || 'Dry Clean Only'}</span>
               </div>
             </div>

             <div className="flex gap-6 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                   <Truck size={18}/> <span>Fast Delivery</span>
                </div>
                <div className="flex items-center gap-2">
                   <Shield size={18}/> <span>Genuine Product</span>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;