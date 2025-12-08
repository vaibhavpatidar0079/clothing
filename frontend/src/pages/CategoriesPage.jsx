import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import api from '../lib/axios';
import ProductCard from '../components/product/ProductCard';

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [categoryProducts, setCategoryProducts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all categories
        const categoriesResponse = await api.get('categories/');
        // Handle paginated response (results) or direct array
        let categoriesData = categoriesResponse.data;
        if (categoriesData && categoriesData.results) {
          categoriesData = categoriesData.results;
        }
        // Ensure it's an array
        if (!Array.isArray(categoriesData)) {
          console.warn("Categories response is not an array:", categoriesData);
          categoriesData = [];
        }
        const allCategories = [];
        
        // Flatten categories including children
        const flattenCategories = (cats) => {
          if (!Array.isArray(cats)) {
            return;
          }
          cats.forEach(cat => {
            // Include all active categories (even if they have 0 products)
            if (cat.is_active !== false) {
              allCategories.push(cat);
            }
            if (cat.children && Array.isArray(cat.children) && cat.children.length > 0) {
              flattenCategories(cat.children);
            }
          });
        };
        flattenCategories(categoriesData);
        setCategories(allCategories);

        // Fetch sample products for each category (first 4 products)
        const productsMap = {};
        for (const category of allCategories) {
          try {
            const productsResponse = await api.get(`products/?category__slug=${category.slug}&page_size=4`);
            productsMap[category.slug] = productsResponse.data.results || [];
          } catch (error) {
            console.error(`Error fetching products for ${category.name}:`, error);
            productsMap[category.slug] = [];
          }
        }
        setCategoryProducts(productsMap);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="animate-pulse space-y-12">
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div className="h-8 bg-gray-200 w-64 mb-6"></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(j => (
                  <div key={j} className="bg-gray-200 aspect-[3/4]"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">All Categories</h1>
        <p className="text-gray-600">Browse our complete collection organized by category</p>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">No categories available</p>
        </div>
      ) : (
        <div className="space-y-16">
          {categories.map((category) => {
            const products = categoryProducts[category.slug] || [];
            
            return (
              <section key={category.id} className="border-b border-gray-100 pb-12 last:border-0">
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">
                      {category.name}
                    </h2>
                    {category.product_count > 0 && (
                      <p className="text-gray-500">
                        {category.product_count} {category.product_count === 1 ? 'Product' : 'Products'}
                      </p>
                    )}
                  </div>
                  <Link 
                    to={`/shop?category=${category.slug}`}
                    className="text-sm font-medium text-gray-900 hover:text-gray-600 flex items-center gap-2"
                  >
                    View All <ArrowRight size={16} />
                  </Link>
                </div>

                {products.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {products.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-sm">
                    <p className="text-gray-500">No products available in this category</p>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
