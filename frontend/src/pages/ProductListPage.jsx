import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, SlidersHorizontal, ChevronDown } from 'lucide-react';
import api from '../lib/axios';
import ProductCard from '../components/product/ProductCard';
import Button from '../components/ui/Button';

const ProductListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Filter States
  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const [priceRange, setPriceRange] = useState(50000);
  const [sortBy, setSortBy] = useState('-created_at');

  useEffect(() => {
    fetchProducts();
  }, [searchParams, sortBy]); // Re-fetch when URL params or sort changes

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

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let query = `products/?ordering=${sortBy}`;
      if (category) query += `&category__slug=${category}`;
      if (search) query += `&search=${search}`;
      
      const response = await api.get(query);
      setProducts(response.data.results || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (newCategory) => {
    if (newCategory) setSearchParams({ category: newCategory });
    else setSearchParams({});
    setIsFilterOpen(false); // Close mobile drawer
  };

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
          
          <div className="relative w-full md:w-48">
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full appearance-none bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded-sm leading-tight focus:outline-none focus:border-gray-500"
            >
              <option value="-created_at">Newest First</option>
              <option value="price">Price: Low to High</option>
              <option value="-price">Price: High to Low</option>
              <option value="-rating">Top Rated</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <ChevronDown size={14} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className={`
          fixed inset-0 z-40 bg-white p-6 transition-transform duration-300 md:relative md:translate-x-0 md:bg-transparent md:p-0 md:w-64 md:block shadow-xl md:shadow-none overflow-y-auto
          ${isFilterOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex justify-between md:hidden mb-6">
            <h2 className="text-xl font-bold">Filters</h2>
            <button onClick={() => setIsFilterOpen(false)}>✕</button>
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
               <h3 className="font-bold mb-4 text-sm uppercase tracking-wide">Max Price</h3>
               <input 
                type="range" 
                min="500" 
                max="50000" 
                step="500"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
               />
               <div className="flex justify-between text-xs text-gray-500 mt-2">
                 <span>₹500</span>
                 <span>₹{parseInt(priceRange).toLocaleString()}</span>
               </div>
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
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