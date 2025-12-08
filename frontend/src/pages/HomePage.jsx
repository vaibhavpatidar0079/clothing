import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, ShieldCheck, RefreshCw } from 'lucide-react';
import ProductCard from '../components/product/ProductCard';
import Button from '../components/ui/Button';
import api from '../lib/axios';

const HomePage = () => {
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await api.get('products/?ordering=-created_at&page_size=4');
        console.log("Products API Response:", response.data);
        const products = response.data.results || [];
        console.log("Products count:", products.length);
        products.forEach(p => {
          console.log(`Product ${p.id}: ${p.title}`);
          console.log(`  primary_image: ${p.primary_image}`);
          console.log(`  images:`, p.images);
        });
        setTrendingProducts(products);
      } catch (error) {
        console.error("Failed to fetch products", error);
        console.error("Error details:", error.response?.data);
        setTrendingProducts([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await api.get('categories/');
        console.log("Categories API Response:", response.data);
        // Handle paginated response (results) or direct array
        let categoriesData = response.data;
        if (categoriesData && categoriesData.results) {
          categoriesData = categoriesData.results;
        }
        // Ensure it's an array
        if (!Array.isArray(categoriesData)) {
          console.warn("Categories response is not an array:", categoriesData);
          categoriesData = [];
        }
        console.log("Categories count:", categoriesData.length);
        categoriesData.forEach(cat => {
          console.log(`Category ${cat.id}: ${cat.name}, image: ${cat.image}, product_count: ${cat.product_count}`);
        });
        setCategories(categoriesData);
      } catch (error) {
        console.error("Failed to fetch categories", error);
        console.error("Error details:", error.response?.data);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchTrending();
    fetchCategories();
  }, []);

  return (
    <div className="flex flex-col gap-16 pb-16">
      
      {/* Hero Section */}
      <section className="relative h-[80vh] w-full bg-gray-900 overflow-hidden">
        {/* Background Image */}
        <img 
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop" 
          alt="Fashion Hero" 
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        
        {/* Content */}
        <div className="relative h-full container mx-auto px-4 md:px-6 flex items-center">
          <div className="max-w-xl text-white space-y-6">
            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-xs font-bold tracking-widest uppercase rounded-sm">
              New Collection 2024
            </span>
            <h1 className="text-5xl md:text-7xl font-serif font-bold leading-tight">
              Elegance in <br/> Every Stitch
            </h1>
            <p className="text-lg text-gray-200 leading-relaxed max-w-md">
              Discover our handcrafted collection of premium ethnic and western wear, designed for the modern woman.
            </p>
            <div className="pt-4 flex gap-4">
              <Link to="/shop">
                <Button size="lg" className="bg-white text-black hover:bg-gray-100 border-none">
                  Shop Collection
                </Button>
              </Link>
              {categories.length > 0 && (
                <Link to={`/shop?category=${categories[0].slug}`}>
                  <Button variant="outline" size="lg" className="text-white border-white hover:bg-white hover:text-black">
                    View {categories[0].name}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Banner */}
      <section className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12 border-y border-gray-100">
          <div className="flex items-center space-x-4 justify-center md:justify-start">
            <div className="p-3 bg-gray-50 rounded-full">
              <Truck className="h-6 w-6 text-gray-900" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">Free Shipping</h3>
              <p className="text-sm text-gray-500">On all orders above ₹1000</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 justify-center md:justify-start">
            <div className="p-3 bg-gray-50 rounded-full">
              <RefreshCw className="h-6 w-6 text-gray-900" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">Easy Returns</h3>
              <p className="text-sm text-gray-500">15-day return policy</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 justify-center md:justify-start">
            <div className="p-3 bg-gray-50 rounded-full">
              <ShieldCheck className="h-6 w-6 text-gray-900" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">Secure Payment</h3>
              <p className="text-sm text-gray-500">100% secure checkout</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="container mx-auto px-4 md:px-6">
        <div className="flex justify-between items-end mb-8">
          <h2 className="text-3xl font-serif font-bold text-gray-900">Shop by Category</h2>
          <Link to="/categories" className="text-sm font-medium text-gray-900 hover:text-gray-600 flex items-center">
            View All Categories <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>
        
        {categoriesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[600px]">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse bg-gray-200 rounded-sm"></div>
            ))}
          </div>
        ) : categories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[600px]">
            {/* First category - large */}
            {categories[0] && (
              <Link to={`/shop?category=${categories[0].slug}`} className="group relative h-full w-full overflow-hidden md:col-span-1 lg:col-span-1">
                <img 
                  src={
                    categories[0].image 
                      ? (categories[0].image.startsWith('http') 
                          ? categories[0].image 
                          : `http://localhost:8000${categories[0].image}`)
                      : "https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=800&auto=format&fit=crop"
                  }
                  alt={categories[0].name}
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=800&auto=format&fit=crop";
                  }} 
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                <div className="absolute bottom-8 left-8 text-white">
                  <h3 className="text-2xl font-serif font-bold">{categories[0].name}</h3>
                  {categories[0].product_count > 0 && (
                    <p className="text-sm text-gray-200 mt-1">{categories[0].product_count} Products</p>
                  )}
                  <span className="inline-block mt-2 text-sm border-b border-white pb-0.5">Shop Now</span>
                </div>
              </Link>
            )}

            <div className="grid grid-rows-2 gap-4 md:col-span-1 lg:col-span-2 h-full">
              {/* Second category - full width */}
              {categories[1] && (
                <Link to={`/shop?category=${categories[1].slug}`} className="group relative w-full h-full overflow-hidden">
                  <img 
                    src={
                      categories[1].image 
                        ? (categories[1].image.startsWith('http') 
                            ? categories[1].image 
                            : `http://localhost:8000${categories[1].image}`)
                        : "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop"
                    }
                    alt={categories[1].name}
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop";
                    }} 
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                  <div className="absolute bottom-6 left-6 text-white">
                    <h3 className="text-xl font-serif font-bold">{categories[1].name}</h3>
                    {categories[1].product_count > 0 && (
                      <p className="text-xs text-gray-200 mt-1">{categories[1].product_count} Products</p>
                    )}
                  </div>
                </Link>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                {/* Third and fourth categories */}
                {categories[2] && (
                  <Link to={`/shop?category=${categories[2].slug}`} className="group relative w-full h-full overflow-hidden">
                    <img 
                      src={
                        categories[2].image 
                          ? (categories[2].image.startsWith('http') 
                              ? categories[2].image 
                              : `http://localhost:8000${categories[2].image}`)
                          : "https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?q=80&w=600&auto=format&fit=crop"
                      }
                      alt={categories[2].name}
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?q=80&w=600&auto=format&fit=crop";
                      }} 
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                    <div className="absolute bottom-6 left-6 text-white">
                      <h3 className="text-xl font-serif font-bold">{categories[2].name}</h3>
                      {categories[2].product_count > 0 && (
                        <p className="text-xs text-gray-200 mt-1">{categories[2].product_count} Products</p>
                      )}
                    </div>
                  </Link>
                )}
                {categories[3] && (
                  <Link to={`/shop?category=${categories[3].slug}`} className="group relative w-full h-full overflow-hidden">
                    <img 
                      src={
                        categories[3].image 
                          ? (categories[3].image.startsWith('http') 
                              ? categories[3].image 
                              : `http://localhost:8000${categories[3].image}`)
                          : "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=600&auto=format&fit=crop"
                      }
                      alt={categories[3].name}
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=600&auto=format&fit=crop";
                      }} 
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                    <div className="absolute bottom-6 left-6 text-white">
                      <h3 className="text-xl font-serif font-bold">{categories[3].name}</h3>
                      {categories[3].product_count > 0 && (
                        <p className="text-xs text-gray-200 mt-1">{categories[3].product_count} Products</p>
                      )}
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No categories available</p>
          </div>
        )}
      </section>

      {/* Trending Products */}
      <section className="container mx-auto px-4 md:px-6">
         <div className="flex justify-between items-end mb-8">
          <h2 className="text-3xl font-serif font-bold text-gray-900">Trending Now</h2>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 aspect-[3/4] rounded-sm mb-4"></div>
                <div className="h-4 bg-gray-200 w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 w-1/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {trendingProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Newsletter */}
      <section className="container mx-auto px-4 md:px-6 pt-8">
        <div className="bg-black text-white rounded-sm p-12 text-center relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-4xl font-serif font-bold">Join the Aura List</h2>
            <p className="text-gray-400">
              Sign up for early access to new collections, exclusive sales, and style inspiration.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="bg-white/10 border border-white/20 text-white placeholder:text-gray-500 px-4 py-3 rounded-sm focus:outline-none focus:ring-1 focus:ring-white w-full sm:w-80"
              />
              <Button variant="secondary" className="whitespace-nowrap">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;