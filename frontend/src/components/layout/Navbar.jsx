import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ShoppingBag, User, Search, Menu, X, Heart, LogOut } from 'lucide-react';
import { logout } from '../../store/slices/authSlice';
import { fetchWishlist } from '../../store/slices/wishlistSlice';
import api from '../../lib/axios';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.cart);
  const { items: wishlistItems, wishlistItemIds } = useSelector((state) => state.wishlist);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);

  // Calculate Cart Quantity
  const cartCount = items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  const wishlistCount = wishlistItemIds?.size || 0;

  // Fetch wishlist on mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchWishlist());
    }
  }, [isAuthenticated, dispatch]);

  // Handle Scroll Effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsSearchOpen(false);
  }, [location]);

  // Fetch categories
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
        // Get top-level categories only for navigation (limit to 4-5 for navbar)
        const topCategories = categoriesData.slice(0, 5);
        setCategories(topCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setCategories([]);
      }
    };

    fetchCategories();
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
    }
  };

  return (
    <>
      <header 
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled || isMenuOpen ? 'bg-white shadow-md py-2' : 'bg-white/90 backdrop-blur-md py-4'
        }`}
      >
        <div className="container mx-auto px-4 md:px-6">
          <nav className="flex items-center justify-between h-12">
            
            {/* Mobile Menu Toggle */}
            <button 
              className="lg:hidden p-2 -ml-2 text-gray-900"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <span className={`font-serif font-bold tracking-tighter text-2xl ${scrolled ? 'text-black' : 'text-gray-900'}`}>
                AURA
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8 ml-12">
              <Link to="/shop" className="text-sm font-medium hover:text-gray-600 transition-colors">New Arrivals</Link>
              {categories.map((cat) => (
                <Link 
                  key={cat.id} 
                  to={`/shop?category=${cat.slug}`} 
                  className="text-sm font-medium hover:text-gray-600 transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Icons */}
            <div className="flex items-center gap-1 sm:gap-4">
              
              {/* Search Icon */}
              <button 
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
              >
                <Search size={20} />
              </button>

              {/* User Account */}
              <div className="relative group hidden sm:block">
                <Link to={isAuthenticated ? "/profile" : "/login"}>
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700">
                    <User size={20} />
                    </button>
                </Link>
                
                {/* Hover Dropdown (Desktop Only) */}
                {isAuthenticated && (
                  <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-56">
                    <div className="bg-white rounded-md shadow-xl ring-1 ring-black ring-opacity-5 py-1 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-xs text-gray-500">Signed in as</p>
                        <p className="text-sm font-bold truncate">{user?.first_name || 'User'}</p>
                      </div>
                      <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Profile</Link>
                      <Link to="/profile?tab=orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Orders</Link>
                      <Link to="/profile?tab=wishlist" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Wishlist</Link>
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut size={14} /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Wishlist (Desktop) */}
              {isAuthenticated && (
                <Link to="/profile?tab=wishlist" className="hidden sm:block p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700 relative group">
                  <Heart size={20} fill={wishlistCount > 0 ? 'currentColor' : 'none'} className={wishlistCount > 0 ? 'text-black' : ''} />
                  {wishlistCount > 0 && (
                    <span className="absolute top-0 right-0 bg-black text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
                      {wishlistCount > 9 ? '9+' : wishlistCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Cart */}
              <Link to="/cart" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700 relative group">
                <ShoppingBag size={20} />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 bg-black text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </nav>

          {/* Search Bar Overlay */}
          {isSearchOpen && (
            <div className="absolute top-full left-0 w-full bg-white border-t border-gray-100 shadow-lg p-4 animate-in slide-in-from-top-2">
              <form onSubmit={handleSearch} className="container mx-auto max-w-3xl relative">
                <input
                  type="text"
                  placeholder="Search for sarees, kurtis, brands..."
                  className="w-full pl-4 pr-12 py-3 bg-gray-50 border-none rounded-md focus:ring-2 focus:ring-black/5"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button 
                    type="submit" 
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-black"
                >
                    <Search size={20} />
                </button>
              </form>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <div 
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden ${
          isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`} 
        onClick={() => setIsMenuOpen(false)}
      />
      
      <div 
        className={`fixed top-0 left-0 bottom-0 w-4/5 max-w-sm bg-white z-50 shadow-2xl transition-transform duration-300 lg:hidden transform ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <span className="font-serif font-bold text-xl">Menu</span>
                <button onClick={() => setIsMenuOpen(false)} className="p-2">
                    <X size={24} />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-4 px-6 space-y-6">
                <div className="space-y-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Shop</p>
                    <Link to="/shop" className="block text-lg font-medium">New Arrivals</Link>
                    {categories.map((cat) => (
                      <Link 
                        key={cat.id} 
                        to={`/shop?category=${cat.slug}`} 
                        className="block text-lg font-medium"
                      >
                        {cat.name}
                      </Link>
                    ))}
                </div>

                <div className="border-t border-gray-100 pt-6 space-y-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account</p>
                    {isAuthenticated ? (
                        <>
                            <Link to="/profile" className="block text-lg font-medium">My Profile</Link>
                            <Link to="/profile?tab=orders" className="block text-lg font-medium">My Orders</Link>
                            <Link to="/profile?tab=wishlist" className="block text-lg font-medium">Wishlist</Link>
                            <button onClick={handleLogout} className="text-red-600 font-medium block mt-4">Sign Out</button>
                        </>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <Link to="/login" className="text-center py-2 border border-gray-300 rounded-sm">Log In</Link>
                            <Link to="/register" className="text-center py-2 bg-black text-white rounded-sm">Sign Up</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;