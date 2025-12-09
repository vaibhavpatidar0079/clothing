import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, ChevronDown, X, Grid, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/axios';
import ProductCard from '../components/product/ProductCard';
import Button from '../components/ui/Button';
import DualRange from '../components/ui/DualRange';

const ProductListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  
  // UI States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'editorial'
  const [isSortOpen, setIsSortOpen] = useState(false);
  
  // Pagination States
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextPageUrl, setNextPageUrl] = useState(null);
  const observerTarget = useRef(null);
  
  // Filter States
  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const priceParamMin = searchParams.get('price_min');
  const priceParamMax = searchParams.get('price_max');
  const [priceMin, setPriceMin] = useState(priceParamMin ? parseInt(priceParamMin) : 500);
  const [priceMax, setPriceMax] = useState(priceParamMax ? parseInt(priceParamMax) : 50000);
  const [sortBy, setSortBy] = useState('');

  // Reset products when filters change
  useEffect(() => {
    setProducts([]);
    setNextPageUrl(null);
    setHasMore(true);
    fetchProducts(true);
  }, [searchParams, sortBy]); 

  // Keep local price state in sync
  useEffect(() => {
    const pmin = searchParams.get('price_min');
    const pmax = searchParams.get('price_max');
    if (pmin) setPriceMin(parseInt(pmin));
    if (pmax) setPriceMax(parseInt(pmax));
  }, [searchParams]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('categories/');
        let categoriesData = response.data.results || response.data || [];
        if (!Array.isArray(categoriesData)) categoriesData = [];
        
        const allCategories = [];
        const flattenCategories = (cats) => {
          if (!Array.isArray(cats)) return;
          cats.forEach(cat => {
            allCategories.push(cat);
            if (cat.children?.length > 0) flattenCategories(cat.children);
          });
        };
        flattenCategories(categoriesData);
        setCategories(allCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !loading) {
          loadMoreProducts();
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current);
    };
  }, [hasMore, isLoadingMore, loading]);

  const fetchProducts = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      let query = `products/${!sortBy ? 'top_products/' : ''}?page_size=12`;
      if (sortBy) query += `&ordering=${sortBy}`;
      if (category) query += `&category__slug=${category}`;
      if (search) query += `&search=${search}`;
      if (searchParams.get('price_min')) query += `&price_min=${searchParams.get('price_min')}`;
      if (searchParams.get('price_max')) query += `&price_max=${searchParams.get('price_max')}`;
      
      const response = await api.get(query);
      const newProducts = response.data.results || [];
      setProducts(newProducts);
      setNextPageUrl(response.data.next);
      setHasMore(!!response.data.next);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
      setHasMore(false);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const loadMoreProducts = useCallback(async () => {
    if (!nextPageUrl || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const response = await api.get(nextPageUrl);
      const newProducts = response.data.results || [];
      setProducts(prev => [...prev, ...newProducts]);
      setNextPageUrl(response.data.next);
      setHasMore(!!response.data.next);
    } catch (error) {
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextPageUrl, isLoadingMore, hasMore]);

  const updatePriceParams = (min, max) => {
    const paramsObj = Object.fromEntries([...searchParams]);
    paramsObj.price_min = String(min);
    paramsObj.price_max = String(max);
    setSearchParams(paramsObj, { replace: true });
  };

  const priceDebounceRef = useRef(null);
  const schedulePriceParams = (min, max) => {
    if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current);
    priceDebounceRef.current = setTimeout(() => {
      updatePriceParams(min, max);
      priceDebounceRef.current = null;
    }, 400);
  };

  const getCategoryName = () => {
    if (!category) return 'All Collection';
    const foundCategory = categories.find(cat => cat.slug === category);
    return foundCategory ? foundCategory.name : category;
  };

  return (
    <div className="bg-white min-h-screen">
      
      {/* 1. Page Header (Scrolls away) */}
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-serif font-medium text-gray-900 capitalize leading-tight">
            {getCategoryName()}
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {products.length} Products
          </p>
        </div>
      </div>

      {/* 2. Sticky Controls Bar (Stays visible) */}
      <div className="sticky top-[56px] md:top-[64px] z-30 bg-white/95 backdrop-blur-md border-y border-gray-100">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-14 md:h-16">
            
            {/* Left: Filter Trigger */}
            <button 
              onClick={() => setIsFilterOpen(true)}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-gray-600 active:text-gray-900 transition-colors"
            >
              <Filter size={18} strokeWidth={1.5} />
              <span>Filter</span>
              {(priceParamMin || priceParamMax || category) && (
                <span className="flex h-1.5 w-1.5 rounded-full bg-black ml-1" />
              )}
            </button>

            {/* Right: Sort & View */}
            <div className="flex items-center gap-6">
              
              {/* Sort Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest hover:text-gray-600 active:text-gray-900 transition-colors"
                >
                  <span className="hidden sm:inline">Sort By</span>
                  <span className="sm:hidden">Sort</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isSortOpen && (
                    <>
                      {/* Invisible backdrop to close sort on click outside */}
                      <div 
                        className="fixed inset-0 z-30" 
                        onClick={() => setIsSortOpen(false)} 
                      />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-0 top-full mt-3 w-48 bg-white shadow-xl border border-gray-100 py-2 z-40 rounded-sm origin-top-right"
                      >
                        {[
                          { label: 'Recommended', value: '' },
                          { label: 'Newest In', value: '-created_at' },
                          { label: 'Price: Low to High', value: 'price' },
                          { label: 'Price: High to Low', value: '-price' },
                          { label: 'Top Rated', value: '-rating' }
                        ].map((option) => (
                          <button
                            key={option.label}
                            onClick={() => { setSortBy(option.value); setIsSortOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                              ${sortBy === option.value ? 'font-bold text-black bg-gray-50' : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'}
                            `}
                          >
                            {option.label}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 border-l border-gray-200 pl-6 ml-2">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-sm transition-colors ${viewMode === 'grid' ? 'text-black' : 'text-gray-300 hover:text-gray-500 active:text-black'}`}
                  aria-label="Grid View"
                >
                  <Grid size={18} strokeWidth={viewMode === 'grid' ? 2 : 1.5} />
                </button>
                <button 
                  onClick={() => setViewMode('editorial')}
                  className={`p-1.5 rounded-sm transition-colors ${viewMode === 'editorial' ? 'text-black' : 'text-gray-300 hover:text-gray-500 active:text-black'}`}
                  aria-label="Editorial View"
                >
                  <Square size={18} strokeWidth={viewMode === 'editorial' ? 2 : 1.5} />
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* FILTER DRAWER (Sliding Panel) */}
      <AnimatePresence>
        {isFilterOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl p-8 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-serif font-bold">Filters</h2>
                <button onClick={() => setIsFilterOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-12">
                {/* Categories */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-4">Categories</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => { setSearchParams({ category: '' }); setIsFilterOpen(false); }}
                      className={`text-left text-sm py-1 ${!category ? 'font-bold text-black underline' : 'text-gray-500 hover:text-black'}`}
                    >
                      All
                    </button>
                    {categories.map((cat) => (
                      <button 
                        key={cat.id}
                        onClick={() => { setSearchParams({ category: cat.slug }); setIsFilterOpen(false); }}
                        className={`text-left text-sm py-1 ${category === cat.slug ? 'font-bold text-black underline' : 'text-gray-500 hover:text-black'}`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-6">Price Range</h3>
                  <DualRange
                    min={500}
                    max={50000}
                    step={500}
                    values={[priceMin, priceMax]}
                    onChange={(vals) => {
                      setPriceMin(vals[0]);
                      setPriceMax(vals[1]);
                      schedulePriceParams(vals[0], vals[1]);
                    }}
                  />
                  <div className="flex justify-between mt-4 text-sm font-medium text-gray-900">
                    <span>₹{priceMin}</span>
                    <span>₹{priceMax}</span>
                  </div>
                </div>

                {/* Clear All */}
                <div className="pt-8 border-t border-gray-100">
                  <Button 
                    variant="outline" 
                    className="w-full uppercase text-xs tracking-widest font-bold"
                    onClick={() => { setSearchParams({}); setIsFilterOpen(false); }}
                  >
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* PRODUCT GRID */}
      <div className="container mx-auto px-4 md:px-6 py-8">
        {loading && !products.length ? (
          <div className={`grid gap-x-6 gap-y-12 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} className="animate-pulse">
                <div className="bg-gray-100 aspect-[3/4] mb-4"></div>
                <div className="h-3 bg-gray-100 w-2/3 mb-2"></div>
                <div className="h-3 bg-gray-100 w-1/3"></div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <motion.div 
              layout
              className={`grid gap-x-4 md:gap-x-8 gap-y-12 md:gap-y-16 ${
                viewMode === 'grid' 
                  ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
                  : 'grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto'
              }`}
            >
              {products.map((product) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={product.id}
                >
                  <ProductCard product={product} />
                  
                  {/* Scarcity Trigger (Simulated for Demo) */}
                  {(product.inventory_count > 0 && product.inventory_count < 5) && (
                    <p className="mt-2 text-[10px] text-red-700 uppercase tracking-widest font-medium animate-pulse">
                      Only {product.inventory_count} Left
                    </p>
                  )}
                </motion.div>
              ))}
            </motion.div>
            
            {/* Infinite scroll target */}
            <div ref={observerTarget} className="pt-20 pb-12 text-center">
              {isLoadingMore && (
                <div className="flex justify-center gap-1">
                  <span className="w-1.5 h-1.5 bg-black rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-black rounded-full animate-bounce delay-100"></span>
                  <span className="w-1.5 h-1.5 bg-black rounded-full animate-bounce delay-200"></span>
                </div>
              )}
              {!hasMore && products.length > 0 && (
                <span className="text-xs text-gray-400 uppercase tracking-widest">End of Collection</span>
              )}
            </div>
          </>
        ) : (
          <div className="min-h-[50vh] flex flex-col items-center justify-center text-center">
            <p className="text-2xl font-serif text-gray-400 mb-4">No pieces found</p>
            <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto">
              We couldn't find any items matching your filters. Try adjusting your search criteria.
            </p>
            <Button variant="outline" onClick={() => setSearchParams({})}>
              Reset Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductListPage;