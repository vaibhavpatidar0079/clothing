from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AuthViewSet, UserViewSet, AddressViewSet,
    ProductViewSet, CategoryViewSet,
    CartViewSet, OrderViewSet, ReviewViewSet, ReturnRequestViewSet, WishlistViewSet
)

# Create a router and register our viewsets with it.
router = DefaultRouter()

# Catalog
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')

# User & Profile
router.register(r'addresses', AddressViewSet, basename='address')

# Shopping
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'return-requests', ReturnRequestViewSet, basename='return-request')
router.register(r'wishlist', WishlistViewSet, basename='wishlist')

urlpatterns = [
    # Auth Custom Endpoints
    path('auth/register/', AuthViewSet.as_view({'post': 'register'}), name='register'),
    path('auth/login/', AuthViewSet.as_view({'post': 'login'}), name='login'),
    path('auth/refresh/', AuthViewSet.as_view({'post': 'refresh'}), name='refresh'),
    
    # Password Reset Endpoints
    path('auth/password/request-otp/', AuthViewSet.as_view({'post': 'request_password_reset'}), name='request-otp'),
    path('auth/password/verify-otp/', AuthViewSet.as_view({'post': 'verify_otp'}), name='verify-otp'),
    path('auth/password/reset/', AuthViewSet.as_view({'post': 'reset_password'}), name='reset-password'),
    
    # User Profile Custom Endpoint
    path('auth/me/', UserViewSet.as_view({'get': 'me', 'patch': 'me'}), name='user-me'),
    
    # Automated Router URLs
    path('', include(router.urls)),
]