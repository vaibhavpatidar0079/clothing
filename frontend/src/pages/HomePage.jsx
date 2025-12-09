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

  // Premium Animation Variants (Slower, smoother)
  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { duration: 1, ease: [0.22, 1, 0.36, 1] } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  return (
    <div className="flex flex-col w-full bg-white font-sans text-gray-900">
      
      {/* HERO SECTION - Video Background */}
      <section className="relative h-screen w-full bg-gray-900 overflow-hidden">
        <div className="absolute inset-0">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="h-full w-full object-cover opacity-80"
            poster="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop"
          >
            <source src="https://cdn.coverr.co/videos/coverr-fashion-photoshoot-with-two-models-4372/1080p.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="absolute inset-0 bg-black/30" />
        </div>
        
        {/* Hero Content */}
        <div className="relative h-full container mx-auto px-6 md:px-12 flex flex-col justify-center items-center text-center">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="max-w-5xl text-white"
          >
            <span className="inline-block mb-8 px-4 py-1.5 border border-white/40 backdrop-blur-md text-[10px] font-bold tracking-[0.3em] uppercase text-white">
              Est. 2024 • Artisan Crafted
            </span>
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-serif font-medium leading-none mb-10 tracking-tighter mix-blend-overlay opacity-90">
              Timeless <br /> <span className="italic font-light">Elegance</span>
            </h1>
            
            <div className="flex justify-center gap-6 mt-8">
              <Link to="/shop">
                <button className="group relative px-12 py-4 bg-white text-black overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
                  <div className="absolute inset-0 w-full h-full bg-black scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left ease-[cubic-bezier(0.22,1,0.36,1)]" />
                  <span className="relative z-10 text-xs font-bold tracking-[0.2em] uppercase group-hover:text-white transition-colors duration-300">
                    Explore Collection
                  </span>
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 animate-bounce">
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
        </div>
      </section>

      {/* CURATED COLLECTIONS (Mosaic Grid) */}
      <section className="py-24 px-2 md:px-4 container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 pb-6 px-4 border-b border-gray-100">
          <div className="max-w-md">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Curated</span>
            <h2 className="text-4xl font-serif font-medium text-gray-900">The Collections</h2>
          </div>
          <Link to="/categories" className="hidden md:flex items-center text-xs font-bold uppercase tracking-widest text-gray-900 hover:text-gray-500 transition-colors group">
            View All <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-2" />
          </Link>
        </div>
        
        {categoriesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 h-[600px] animate-pulse">
            <div className="bg-gray-100 w-full h-full"></div>
            <div className="flex flex-col gap-1 h-full">
              <div className="bg-gray-100 flex-1"></div>
              <div className="bg-gray-100 flex-1"></div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:h-[900px]">
            {/* Primary Category - Left */}
            {categories[0] && (
              <Link to={`/shop?category=${categories[0].slug}`} className="group relative w-full h-[500px] md:h-full overflow-hidden block bg-gray-100">
                <img 
                  src={categories[0].image || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=800&auto=format&fit=crop"}
                  alt={categories[0].name}
                  className="h-full w-full object-cover transition-transform duration-[1.5s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-700" />
                <div className="absolute bottom-10 left-10 text-white z-10 mix-blend-difference">
                  <span className="text-[10px] uppercase tracking-[0.2em] mb-3 block opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700 delay-100">01 — Collection</span>
                  <h3 className="text-4xl md:text-6xl font-serif font-medium">{categories[0].name}</h3>
                </div>
              </Link>
            )}

            <div className="flex flex-col gap-1 h-full">
              {/* Secondary Category - Right Top */}
              {categories[1] && (
                <Link to={`/shop?category=${categories[1].slug}`} className="group relative flex-1 w-full overflow-hidden block bg-gray-100 h-[400px] md:h-auto">
                  <img 
                    src={categories[1].image || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop"}
                    alt={categories[1].name}
                    className="h-full w-full object-cover transition-transform duration-[1.5s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-700" />
                  <div className="absolute bottom-8 left-8 text-white z-10 mix-blend-difference">
                    <span className="text-[10px] uppercase tracking-[0.2em] mb-2 block opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700 delay-100">02 — Collection</span>
                    <h3 className="text-3xl md:text-4xl font-serif font-medium">{categories[1].name}</h3>
                  </div>
                </Link>
              )}
              
              {/* Tertiary Category - Right Bottom */}
              {categories[2] && (
                <Link to={`/shop?category=${categories[2].slug}`} className="group relative flex-1 w-full overflow-hidden block bg-gray-100 h-[400px] md:h-auto">
                  <img 
                    src={categories[2].image || "https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?q=80&w=600&auto=format&fit=crop"}
                    alt={categories[2].name}
                    className="h-full w-full object-cover transition-transform duration-[1.5s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-700" />
                  <div className="absolute bottom-8 left-8 text-white z-10 mix-blend-difference">
                    <span className="text-[10px] uppercase tracking-[0.2em] mb-2 block opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700 delay-100">03 — Collection</span>
                    <h3 className="text-3xl md:text-4xl font-serif font-medium">{categories[2].name}</h3>
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}
      </section>

      {/* NEW ARRIVALS */}
      <section className="py-24 bg-stone-50">
         <div className="container mx-auto px-4 md:px-12">
            <div className="flex justify-between items-end mb-12">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Just In</span>
                <h2 className="text-3xl md:text-4xl font-serif font-medium text-gray-900">New Arrivals</h2>
              </div>
              <Link to="/shop" className="hidden md:block text-xs font-bold uppercase tracking-widest border-b border-black pb-1 hover:text-gray-600 hover:border-gray-600 transition-all">
                Shop All
              </Link>
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
            
            <div className="mt-16 text-center md:hidden">
              <Link to="/shop">
                <Button variant="outline" className="w-full uppercase text-xs tracking-widest font-bold">
                  View All Products
                </Button>
              </Link>
            </div>
         </div>
      </section>

      {/* OUR HERITAGE (Editorial) */}
      <section className="py-32 overflow-hidden bg-white">
         <div className="container mx-auto px-6 md:px-12">
            <div className="flex flex-col md:flex-row items-center gap-16 lg:gap-32">
               <div className="md:w-5/12 relative">
                  <div className="aspect-[3/4] overflow-hidden bg-gray-100">
                    <img 
                      src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=2070&auto=format&fit=crop" 
                      alt="The Atelier" 
                      className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 ease-out" 
                    />
                  </div>
                  {/* Decorative Elements */}
                  <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-stone-100 -z-10" />
                  <div className="absolute -top-6 -left-6 w-24 h-24 border border-gray-200 -z-10" />
               </div>
               
               <div className="md:w-5/12 space-y-8">
                  <span className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400">Our Heritage</span>
                  <h2 className="text-4xl md:text-5xl font-serif font-medium leading-tight">
                    Craftsmanship in <br/>Every Detail
                  </h2>
                  <p className="text-gray-500 leading-loose font-light text-lg">
                     Every stitch tells a story. Our garments are crafted by master artisans using heritage techniques passed down through generations. We believe in slow fashion—creating pieces that are not just worn, but cherished as modern heirlooms.
                  </p>
                  
                  {/* Signature */}
                  <div className="pt-8">
                    <svg width="150" height="50" viewBox="0 0 200 60" className="text-gray-900 opacity-80">
                      <path d="M10,50 Q40,10 70,40 T130,40 T190,20" fill="none" stroke="currentColor" strokeWidth="2" />
                      <text x="10" y="55" fontFamily="serif" fontSize="12" fill="currentColor" className="opacity-50 tracking-widest uppercase">Founder, Aura</text>
                    </svg>
                  </div>

                  <div className="pt-4">
                    <Link to="/about" className="inline-flex items-center text-xs font-bold uppercase tracking-widest border-b border-black pb-1 hover:text-gray-500 hover:border-gray-300 transition-all group">
                       Read Our Story <MoveRight className="ml-3 w-4 transition-transform group-hover:translate-x-2" />
                    </Link>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* FEATURES STRIP */}
      <section className="py-20 border-t border-gray-100 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div className="flex flex-col items-center gap-4 group">
              <div className="p-4 rounded-full bg-stone-50 group-hover:bg-black transition-colors duration-300">
                <Truck className="h-6 w-6 text-gray-900 group-hover:text-white transition-colors" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-bold text-xs uppercase tracking-widest mb-2">Global Shipping</h3>
                <p className="text-sm text-gray-500 font-light leading-relaxed">Complimentary delivery on orders over ₹1000</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-4 group">
              <div className="p-4 rounded-full bg-stone-50 group-hover:bg-black transition-colors duration-300">
                <RefreshCw className="h-6 w-6 text-gray-900 group-hover:text-white transition-colors" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-bold text-xs uppercase tracking-widest mb-2">Seamless Returns</h3>
                <p className="text-sm text-gray-500 font-light leading-relaxed">30-day hassle-free return policy</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-4 group">
              <div className="p-4 rounded-full bg-stone-50 group-hover:bg-black transition-colors duration-300">
                <ShieldCheck className="h-6 w-6 text-gray-900 group-hover:text-white transition-colors" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-bold text-xs uppercase tracking-widest mb-2">Secure Checkout</h3>
                <p className="text-sm text-gray-500 font-light leading-relaxed">100% encrypted & protected payments</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REQUEST ACCESS (Newsletter) */}
      <section className="py-32 bg-black text-white relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10 text-center max-w-2xl">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50 mb-6 block">Exclusivity</span>
          <h2 className="text-4xl md:text-5xl font-serif font-medium mb-8 leading-tight">Request Access</h2>
          <p className="text-gray-400 mb-12 font-light text-lg leading-relaxed">
            Join the Aura List for early access to limited edition drops, private sales, and curated styling advice.
          </p>
          <div className="flex flex-col sm:flex-row gap-0 max-w-md mx-auto border-b border-white/20 focus-within:border-white transition-colors">
            <input 
              type="email" 
              placeholder="Enter your email address" 
              className="bg-transparent border-none text-white placeholder:text-gray-600 px-0 py-4 focus:ring-0 w-full transition-all text-center sm:text-left"
            />
            <button className="bg-transparent text-white px-8 py-4 uppercase text-[10px] font-bold tracking-[0.2em] hover:text-gray-300 transition-colors whitespace-nowrap">
              Join List
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;