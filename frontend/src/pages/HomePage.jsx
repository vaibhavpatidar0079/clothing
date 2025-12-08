import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, ShieldCheck, RefreshCw, MoveRight } from 'lucide-react';
import { motion } from 'framer-motion';
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
        const response = await api.get('products/?ordering=-created_at&page_size=4&show_on_home=true');
        setTrendingProducts(response.data.results || []);
      } catch (error) {
        console.error("Failed to fetch products", error);
        setTrendingProducts([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await api.get('categories/?show_on_home=true');
        let categoriesData = response.data;
        if (categoriesData && categoriesData.results) {
          categoriesData = categoriesData.results;
        }
        if (!Array.isArray(categoriesData)) categoriesData = [];
        
        // Filter out categories without images or products if needed, 
        // but for layout stability we take the top 3 populated ones
        setCategories(categoriesData.slice(0, 3));
      } catch (error) {
        console.error("Failed to fetch categories", error);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchTrending();
    fetchCategories();
  }, []);

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="flex flex-col w-full bg-white">
      
      {/* HERO SECTION */}
      <section className="relative h-[90vh] w-full bg-gray-900 overflow-hidden">
        {/* Background Image with Parallax-like feel (static for now) */}
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop" 
            alt="Aura Collection" 
            className="h-full w-full object-cover opacity-80"
          />
          {/* Gradient Overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>
        
        {/* Content */}
        <div className="relative h-full container mx-auto px-6 md:px-12 flex flex-col justify-end pb-24 md:justify-center md:pb-0">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="max-w-2xl text-white"
          >
            <span className="inline-block mb-4 px-3 py-1 border border-white/30 backdrop-blur-sm text-xs font-bold tracking-[0.2em] uppercase text-white/90">
              New Collection 2025
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-medium leading-none mb-6 tracking-tight">
              Timeless <br /> <span className="italic font-light">Elegance</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-200 leading-relaxed max-w-lg mb-8 font-light">
              Discover our handcrafted collection of premium wear, where heritage craftsmanship meets contemporary silhouettes.
            </p>
            <div className="flex gap-4">
              <Link to="/shop">
                <Button className="bg-white text-black border-white hover:bg-black hover:text-white hover:border-black transition-all duration-300 rounded-none px-10 py-4 uppercase tracking-widest text-xs font-bold">
                  Shop Now
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CURATED CATEGORIES (Asymmetrical Grid) */}
      <section className="py-20 md:py-28 px-4 md:px-12 container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-gray-100 pb-6">
          <div className="max-w-md">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Curated</span>
            <h2 className="text-3xl md:text-4xl font-serif font-medium text-gray-900">The Collections</h2>
          </div>
          <Link to="/categories" className="hidden md:flex items-center text-sm font-medium text-gray-900 hover:text-gray-500 transition-colors group">
            View All Categories <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        
        {categoriesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[600px] animate-pulse">
            <div className="bg-gray-100 w-full h-full"></div>
            <div className="flex flex-col gap-4 h-full">
              <div className="bg-gray-100 flex-1"></div>
              <div className="bg-gray-100 flex-1"></div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:h-[800px]">
            {/* Primary Category (Left, Full Height) */}
            {categories[0] && (
              <Link to={`/shop?category=${categories[0].slug}`} className="group relative w-full h-[400px] md:h-full overflow-hidden block bg-gray-100">
                <img 
                  src={categories[0].image || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=800&auto=format&fit=crop"}
                  alt={categories[0].name}
                  className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-500" />
                <div className="absolute bottom-8 left-8 text-white z-10">
                  <span className="text-xs uppercase tracking-widest mb-2 block opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">Explore</span>
                  <h3 className="text-3xl md:text-5xl font-serif font-medium">{categories[0].name}</h3>
                </div>
              </Link>
            )}

            <div className="flex flex-col gap-4 h-full">
              {/* Secondary Category (Right Top) */}
              {categories[1] && (
                <Link to={`/shop?category=${categories[1].slug}`} className="group relative flex-1 w-full overflow-hidden block bg-gray-100 h-[300px] md:h-auto">
                  <img 
                    src={categories[1].image || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop"}
                    alt={categories[1].name}
                    className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-500" />
                  <div className="absolute bottom-6 left-6 text-white z-10">
                    <h3 className="text-2xl md:text-3xl font-serif font-medium">{categories[1].name}</h3>
                  </div>
                </Link>
              )}
              
              {/* Tertiary Category (Right Bottom) */}
              {categories[2] && (
                <Link to={`/shop?category=${categories[2].slug}`} className="group relative flex-1 w-full overflow-hidden block bg-gray-100 h-[300px] md:h-auto">
                  <img 
                    src={categories[2].image || "https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?q=80&w=600&auto=format&fit=crop"}
                    alt={categories[2].name}
                    className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-500" />
                  <div className="absolute bottom-6 left-6 text-white z-10">
                    <h3 className="text-2xl md:text-3xl font-serif font-medium">{categories[2].name}</h3>
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}
        
        <div className="mt-8 text-center md:hidden">
          <Link to="/categories">
            <Button variant="outline" className="w-full">View All Categories</Button>
          </Link>
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <section className="py-20 bg-stone-50">
         <div className="container mx-auto px-4 md:px-12">
            <div className="text-center mb-16">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Just In</span>
              <h2 className="text-3xl md:text-4xl font-serif font-medium text-gray-900">New Arrivals</h2>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                {[1,2,3,4].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 aspect-[3/4] mb-4"></div>
                    <div className="h-4 bg-gray-200 w-2/3 mb-2"></div>
                    <div className="h-4 bg-gray-200 w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : (
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={staggerContainer}
                className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8"
              >
                {trendingProducts.map((product) => (
                  <motion.div key={product.id} variants={fadeInUp}>
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </motion.div>
            )}
            
            <div className="mt-16 text-center">
              <Link to="/shop">
                <Button variant="outline" className="min-w-[200px] border-black text-black hover:bg-black hover:text-white rounded-none uppercase text-xs tracking-widest font-bold">
                  View All Products
                </Button>
              </Link>
            </div>
         </div>
      </section>

      {/* BRAND STORY / EDITORIAL */}
      <section className="py-24 overflow-hidden bg-white">
         <div className="container mx-auto px-6 md:px-12">
            <div className="flex flex-col md:flex-row items-center gap-16 lg:gap-24">
               <div className="md:w-1/2 relative">
                  <div className="absolute top-0 left-0 w-full h-full bg-stone-100 transform -translate-x-4 -translate-y-4 -z-10" />
                  <img 
                    src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=2070&auto=format&fit=crop" 
                    alt="The Atelier" 
                    className="w-full h-auto object-cover transition-all duration-700 ease-in-out" 
                  />
               </div>
               <div className="md:w-1/2 space-y-8">
                  <span className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400">The Atelier</span>
                  <h2 className="text-4xl md:text-5xl font-serif font-medium leading-tight">
                    Craftsmanship in <br/>Every Detail
                  </h2>
                  <p className="text-gray-600 leading-relaxed font-light text-lg">
                     Every stitch tells a story. Our garments are crafted by master artisans using heritage techniques passed down through generations. We believe in slow fashion—creating pieces that are not just worn, but cherished.
                  </p>
                  <div className="pt-4">
                    <Link to="/about" className="inline-flex items-center text-sm font-bold uppercase tracking-widest border-b border-black pb-1 hover:text-gray-600 hover:border-gray-600 transition-all group">
                       Read Our Story <MoveRight className="ml-3 w-4 transition-transform group-hover:translate-x-2" />
                    </Link>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* FEATURES STRIP (Minimal) */}
      <section className="py-16 border-t border-gray-100">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div className="flex flex-col items-center gap-4 py-4 md:py-0">
              <Truck className="h-6 w-6 text-gray-900" strokeWidth={1.5} />
              <div>
                <h3 className="font-bold text-xs uppercase tracking-widest mb-1">Global Shipping</h3>
                <p className="text-sm text-gray-500 font-light">Free delivery on orders over ₹1000</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-4 py-4 md:py-0">
              <RefreshCw className="h-6 w-6 text-gray-900" strokeWidth={1.5} />
              <div>
                <h3 className="font-bold text-xs uppercase tracking-widest mb-1">Easy Returns</h3>
                <p className="text-sm text-gray-500 font-light">30-day seamless return policy</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-4 py-4 md:py-0">
              <ShieldCheck className="h-6 w-6 text-gray-900" strokeWidth={1.5} />
              <div>
                <h3 className="font-bold text-xs uppercase tracking-widest mb-1">Secure Checkout</h3>
                <p className="text-sm text-gray-500 font-light">100% protected payments</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="py-24 bg-black text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="container mx-auto px-6 relative z-10 text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-serif font-medium mb-6">Join the Aura List</h2>
          <p className="text-gray-400 mb-10 font-light text-lg">
            Sign up for early access to new collections, exclusive sales, and styling tips directly to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-0 max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="Enter your email address" 
              className="bg-white/10 border-b border-white/20 text-white placeholder:text-gray-500 px-4 py-4 focus:outline-none focus:border-white focus:bg-white/5 w-full transition-all"
            />
            <button className="bg-white text-black px-8 py-4 uppercase text-xs font-bold tracking-widest hover:bg-gray-200 transition-colors mt-4 sm:mt-0">
              Subscribe
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;