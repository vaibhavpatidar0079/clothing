import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, SlidersHorizontal, ChevronDown } from 'lucide-react';
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
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
  }, [searchParams, sortBy]); // Re-fetch when URL params or sort changes

  // Keep local price state in sync when search params change externally
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
        // Flatten categories including children for the filter list
        const allCategories = [];
        const flattenCategories = (cats) => {
          if (!Array.isArray(cats)) {
            return;
          }
          cats.forEach(cat => {
            allCategories.push(cat);
            if (cat.children && Array.isArray(cat.children) && cat.children.length > 0) {
              flattenCategories(cat.children);
            }
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

  // Set up Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !loading) {
          loadMoreProducts();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoadingMore, loading]);

  // Close filters on Escape (mobile/desktop)
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isFilterOpen) {
        setIsFilterOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFilterOpen]);

  const fetchProducts = async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    }
    try {
      // If no explicit sort selected, use top_products to get top-rated/most-bought randomized batches.
      // If a sort is selected, fall back to the normal products listing with ordering.
      let response;
      if (!sortBy) {
        let query = `products/top_products/?page_size=10`;
        if (category) query += `&category__slug=${category}`;
        if (search) query += `&search=${search}`;
        if (searchParams.get('price_min')) query += `&price_min=${searchParams.get('price_min')}`;
        if (searchParams.get('price_max')) query += `&price_max=${searchParams.get('price_max')}`;
        response = await api.get(query);
      } else {
        let query = `products/?page_size=10&ordering=${sortBy}`;
        if (category) query += `&category__slug=${category}`;
        if (search) query += `&search=${search}`;
        if (searchParams.get('price_min')) query += `&price_min=${searchParams.get('price_min')}`;
        if (searchParams.get('price_max')) query += `&price_max=${searchParams.get('price_max')}`;
        response = await api.get(query);
      }
      
      const newProducts = response.data.results || [];
      setProducts(newProducts);
      setNextPageUrl(response.data.next);
      setHasMore(!!response.data.next);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
      setHasMore(false);
    } finally {
      if (isInitial) {
        setLoading(false);
      }
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
      console.error("Error loading more products:", error);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextPageUrl, isLoadingMore, hasMore]);

  const handleCategoryChange = (newCategory) => {
    if (newCategory) setSearchParams({ category: newCategory });
    else setSearchParams({});
    setIsFilterOpen(false); // Close mobile drawer
  };

  const updatePriceParams = (min, max) => {
    // set search params directly (merge with existing) — keep values as strings
    const paramsObj = Object.fromEntries([...searchParams]);
    paramsObj.price_min = String(min);
    paramsObj.price_max = String(max);
    // Use replace to avoid creating history entries for each slider movement
    setSearchParams(paramsObj, { replace: true });
  };

  // Debounce update triggered during slider interaction
  const priceDebounceRef = useRef(null);
  const schedulePriceParams = (min, max) => {
    if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current);
    // Slightly longer debounce to reduce rapid requests while dragging
    priceDebounceRef.current = setTimeout(() => {
      updatePriceParams(min, max);
      priceDebounceRef.current = null;
    }, 400);
  };

  // Clear any pending debounce on unmount to avoid stray updates
  useEffect(() => {
    return () => {
      if (priceDebounceRef.current) {
        clearTimeout(priceDebounceRef.current);
        priceDebounceRef.current = null;
      }
    };
  }, []);

  // Find category name from slug
  const getCategoryName = () => {
    if (!category) return 'All Collection';
    const foundCategory = categories.find(cat => cat.slug === category);
    return foundCategory ? foundCategory.name : category;
  };

  return (
    <div className="container mx-auto px-4 md:px-6 py-8">
      {/* Header & Mobile Filter Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">
            {getCategoryName()}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {products.length} Products Found
          </p>
        </div>

        <div className="flex w-full md:w-auto gap-4">
          <button 
            className="md:hidden flex items-center justify-center w-1/2 border border-gray-300 py-2 px-4 rounded-sm"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <Filter size={16} className="mr-2" /> Filters
          </button>
          
          <div className="relative w-full md:w-48" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className={`
          fixed inset-0 z-40 bg-white p-6 transition-transform duration-300 overflow-y-auto
          md:relative md:inset-auto md:z-0 md:bg-transparent md:p-0 md:w-64 md:flex-shrink-0 md:overflow-visible md:translate-x-0 shadow-xl md:shadow-none
          ${isFilterOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex justify-between md:hidden mb-6">
            <h2 className="text-xl font-bold">Filters</h2>
            <button onClick={() => setIsFilterOpen(false)} aria-label="Close filters">✕</button>
          </div>

          <div className="space-y-8">
            {/* Categories */}
            <div>
              <h3 className="font-bold mb-4 text-sm uppercase tracking-wide">Category</h3>
              {categoriesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-4 bg-gray-200 animate-pulse rounded"></div>
                  ))}
                </div>
              ) : (
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>
                    <button 
                      onClick={() => handleCategoryChange('')}
                      className={`hover:text-black ${!category ? 'text-black font-bold underline' : ''}`}
                    >
                      All Categories
                    </button>
                  </li>
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      <button 
                        onClick={() => handleCategoryChange(cat.slug)}
                        className={`hover:text-black ${category === cat.slug ? 'text-black font-bold underline' : ''} capitalize`}
                      >
                        {cat.name}
                        {cat.product_count !== undefined && (
                          <span className="text-gray-400 ml-2">({cat.product_count})</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Price Range */}
            <div>
               <h3 className="font-bold mb-4 text-sm uppercase tracking-wide">Price Range</h3>
               <DualRange
                 min={500}
                 max={50000}
                 step={500}
                 values={[priceMin, priceMax]}
                 onChange={(vals) => {
                   // update local UI immediately but debounce URL updates
                   setPriceMin(vals[0]);
                   setPriceMax(vals[1]);
                   schedulePriceParams(vals[0], vals[1]);
                 }}
                 onChangeEnd={(vals) => {
                   // make final, immediate update when user releases
                   updatePriceParams(vals[0], vals[1]);
                 }}
               />

               <div className="flex items-center gap-3 mt-3">
                 <div className="flex-1">
                   <label className="block text-xs text-gray-500">Min</label>
                   <input
                     type="number"
                     min={500}
                     max={priceMax - 500}
                     step={500}
                     value={priceMin}
                     onChange={(e) => {
                       const v = Math.max(500, Math.min(Number(e.target.value) || 500, priceMax - 500));
                       setPriceMin(v);
                       // immediate update for typed input
                       updatePriceParams(v, priceMax);
                     }}
                     className="w-full border border-gray-300 rounded-sm py-1 px-2 text-sm"
                   />
                 </div>

                 <div className="flex-1">
                   <label className="block text-xs text-gray-500">Max</label>
                   <input
                     type="number"
                     min={priceMin + 500}
                     max={50000}
                     step={500}
                     value={priceMax}
                     onChange={(e) => {
                       const v = Math.min(50000, Math.max(Number(e.target.value) || 50000, priceMin + 500));
                       setPriceMax(v);
                       // immediate update for typed input
                       updatePriceParams(priceMin, v);
                     }}
                     className="w-full border border-gray-300 rounded-sm py-1 px-2 text-sm"
                   />
                 </div>
               </div>
            </div>

            {/* Sort By */}
            <div>
              <h3 className="font-bold mb-4 text-sm uppercase tracking-wide">Sort By</h3>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded-sm leading-tight focus:outline-none focus:border-gray-500"
              >
                <option value="">Top Products (Recommended)</option>
                <option value="-created_at">Newest First</option>
                <option value="price">Price: Low to High</option>
                <option value="-price">Price: High to Low</option>
                <option value="-rating">Top Rated</option>
              </select>
            </div>
            
            {/* Clear Filters */}
            {(category || search) && (
              <button 
                onClick={() => setSearchParams({})}
                className="text-xs text-red-600 underline hover:text-red-800"
              >
                Clear All Filters
              </button>
            )}

            {/* Mobile: Close button at bottom for easier access */}
            <div className="md:hidden mt-6">
              <button
                onClick={() => setIsFilterOpen(false)}
                className="w-full py-3 bg-gray-100 text-sm font-medium border border-gray-300"
              >
                Close Filters
              </button>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="animate-pulse">
                  <div className="bg-gray-200 aspect-[3/4] mb-4"></div>
                  <div className="h-4 bg-gray-200 w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 w-1/4"></div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              
              {/* Infinite scroll observer target */}
              <div ref={observerTarget} className="pt-8 text-center">
                {isLoadingMore ? (
                  <div className="flex justify-center items-center gap-2">
                    <div className="w-2 h-2 bg-gray-900 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                ) : (
                  !hasMore && products.length > 0 && (
                    <p className="text-gray-500 text-sm">No more products to load</p>
                  )
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-20 bg-gray-50">
              <p className="text-gray-500">No products found matching your criteria.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setSearchParams({})}
              >
                Reset Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductListPage;