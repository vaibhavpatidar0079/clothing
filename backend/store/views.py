from django.shortcuts import get_object_or_404
from django.db import transaction, models
from django.db.models import F, Q, Avg, Count
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.utils import timezone
from decimal import Decimal
from rest_framework import viewsets, status, generics, permissions, filters, mixins
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    User, Address, Category, Brand, Product, ProductSize, ProductVariant,
    Cart, CartItem, Order, OrderItem, Review, Coupon, Wishlist
)
from .serializers import (
    UserSerializer, AddressSerializer,
    CategorySerializer, BrandSerializer,
    ProductListSerializer, ProductDetailSerializer,
    CartSerializer, CartItemSerializer,
    OrderSerializer, ReviewSerializer
)

# -----------------------------------------------------------------------------
# 1. AUTHENTICATION & USERS
# -----------------------------------------------------------------------------

class AuthViewSet(viewsets.ViewSet):
    """
    Handles Registration and Manual Login/Refresh logic.
    Rate limited to prevent abuse.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    @action(detail=False, methods=['post'])
    def register(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')

        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            user = User.objects.create_user(
                username=email, # Use email as username
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )
            
            # Auto-create a cart for the new user
            Cart.objects.create(user=user)

            # Generate Tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def login(self, request):
        """
        Login endpoint that returns user data and JWT tokens.
        """
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'error': 'Email and password are required.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Authenticate user
        user = authenticate(request, username=email, password=password)
        
        if user is None:
            return Response(
                {'error': 'Invalid email or password.'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': 'User account is disabled.'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Generate Tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def refresh(self, request):
        """
        Refresh JWT token endpoint.
        """
        refresh_token = request.data.get('refresh')

        if not refresh_token:
            return Response(
                {'error': 'Refresh token is required.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            refresh = RefreshToken(refresh_token)
            access_token = refresh.access_token
            
            return Response({
                'access': str(access_token),
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': 'Invalid or expired refresh token.'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )


class UserViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        if request.method == 'GET':
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)
        
        elif request.method == 'PATCH':
            serializer = self.get_serializer(request.user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Optimization: Only fetch addresses for current user
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(user=self.request.user)
    
    def perform_destroy(self, instance):
        # Ensure user can only delete their own addresses
        if instance.user != self.request.user:
            raise PermissionDenied("You can only delete your own addresses")
        
        try:
            instance.delete()
        except Exception as e:
            # Check if it's a protected foreign key error
            error_str = str(e)
            if "protected foreign keys" in error_str or "PROTECT" in error_str:
                # Get orders using this address
                orders_using_address = Order.objects.filter(
                    user=self.request.user,
                    shipping_address=instance
                ).exclude(order_status__in=['delivered', 'cancelled', 'refunded'])
                
                if orders_using_address.exists():
                    raise PermissionDenied(
                        "This address cannot be deleted because it's used for your active orders. "
                        "Please wait for orders to be delivered or cancelled before deleting this address."
                    )
            raise


# -----------------------------------------------------------------------------
# 2. CATALOG (High Performance Read-Only)
# -----------------------------------------------------------------------------

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Cached ViewSet for Categories.
    Only shows active categories with their product counts.
    """
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    throttle_classes = []  # Disable throttling for category endpoints in development
    pagination_class = None  # Disable pagination for categories (small tree structure)
    
    def get_queryset(self):
        """Filter to only show active categories and their active children"""
        # Get all top-level categories (parent=None) that are active
        # Also include their active children
        qs = Category.objects.filter(
            parent=None, 
            is_active=True
        ).prefetch_related(
            'children__children',
            'products'
        ).select_related()  # Optimize queries
        
        return qs
    
    def get_serializer_context(self):
        """Ensure request context is passed to serializer for image URLs"""
        context = super().get_serializer_context()
        # Always include request if available
        if hasattr(self, 'request'):
            context['request'] = self.request
        elif hasattr(self, 'action') and hasattr(self, 'request'):
            context['request'] = self.request
        return context
    
    # Cache list for 15 minutes - disabled for debugging
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Advanced Product Catalog.
    Includes filtering, sorting, and optimization.
    """
    queryset = Product.objects.filter(is_active=True).select_related('brand', 'category') \
        .prefetch_related('images', 'sizes', 'variants__variant_product', 'reviews') \
        .annotate(average_rating=Avg('reviews__rating'), total_reviews=Count('reviews')) \
        .order_by('-created_at')
        
    permission_classes = [AllowAny]
    throttle_classes = []  # Disable throttling for product endpoints in development
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    filterset_fields = {
        'category__slug': ['exact'],
        'brand__slug': ['exact'],
        'price': ['gte', 'lte'],
        'product_type': ['exact'],
    }
    search_fields = ['title', 'description', 'brand__name']
    ordering_fields = ['price', 'created_at', 'average_rating']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductListSerializer
    
    def get_serializer_context(self):
        """Ensure request context is passed to serializer for image URLs"""
        context = super().get_serializer_context()
        # Request is always available in ViewSet actions
        if self.request:
            context['request'] = self.request
        return context
    
    def list(self, request, *args, **kwargs):
        """Override to ensure request context is passed"""
        response = super().list(request, *args, **kwargs)
        return response
    
    def retrieve(self, request, *args, **kwargs):
        """Override to ensure request context is passed"""
        response = super().retrieve(request, *args, **kwargs)
        return response

    @action(detail=False, methods=['get'])
    def trending(self, request):
        # Optimized query for "Trending" (e.g. high rating + recent)
        # If no high-rated products, fallback to recent products
        trending = self.queryset.filter(average_rating__gte=4.0)
        if not trending.exists():
            trending = self.queryset
        trending = trending.order_by('?')[:8]
        # Ensure request context is passed
        context = self.get_serializer_context()
        context['request'] = request
        serializer = self.get_serializer(trending, many=True, context=context)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def similar(self, request, pk=None):
        product = self.get_object()
        # Logic: Same Category, excluding self
        similar = Product.objects.filter(category=product.category, is_active=True) \
            .exclude(id=product.id).select_related('brand') \
            .prefetch_related('images') \
            .annotate(average_rating=Avg('reviews__rating'), total_reviews=Count('reviews')) \
            .order_by('?')[:4]
        
        # Ensure request context is passed
        context = self.get_serializer_context()
        context['request'] = request
        serializer = ProductListSerializer(similar, many=True, context=context)
        return Response(serializer.data)


# -----------------------------------------------------------------------------
# 3. SHOPPING CART
# -----------------------------------------------------------------------------

class CartViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _get_cart(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        return cart

    def list(self, request):
        cart = self._get_cart(request)
        # Prefetch to minimize DB hits when serializing items
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def add(self, request):
        cart = self._get_cart(request)
        serializer = CartItemSerializer(data=request.data, context={'cart': cart})
        
        if serializer.is_valid():
            product = serializer.validated_data['product']
            selected_size = serializer.validated_data.get('selected_size')
            variant_product = serializer.validated_data.get('variant_product')
            variant = serializer.validated_data.get('variant')  # Backward compatibility
            quantity = serializer.validated_data['quantity']

            # Update existing item or create new
            # Match by product, size, and variant_product
            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                product=product,
                selected_size=selected_size,
                variant_product=variant_product,
                variant=variant,  # Backward compatibility
                defaults={'quantity': 0}
            )
            
            # Validation logic is inside serializer, but double check stock here if needed
            cart_item.quantity += quantity
            cart_item.save()
            
            # Return full updated cart
            return Response(CartSerializer(cart, context={'request': request}).data)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def update_item(self, request):
        item_id = request.data.get('item_id')
        quantity = int(request.data.get('quantity', 1))
        
        cart_item = get_object_or_404(CartItem, id=item_id, cart__user=request.user)
        
        if quantity < 1:
            return Response({'error': 'Quantity must be at least 1'}, status=400)
            
        # Check Stock Limit
        stock_limit = cart_item.variant.stock_count if cart_item.variant else cart_item.product.inventory_count
        if quantity > stock_limit:
             return Response({'error': f'Only {stock_limit} units available'}, status=400)

        cart_item.quantity = quantity
        cart_item.save()
        
        return Response(CartSerializer(cart_item.cart, context={'request': request}).data)

    @action(detail=False, methods=['post'])
    def remove_item(self, request):
        item_id = request.data.get('item_id')
        cart_item = get_object_or_404(CartItem, id=item_id, cart__user=request.user)
        cart = cart_item.cart
        cart_item.delete()
        return Response(CartSerializer(cart, context={'request': request}).data)


# -----------------------------------------------------------------------------
# 4. ORDER & CHECKOUT (CRITICAL)
# -----------------------------------------------------------------------------

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head'] # No PUT/PATCH allowed on orders for safety

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user) \
            .prefetch_related('items__product', 'items__variant') \
            .select_related('shipping_address') \
            .order_by('-created_at')

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an order if it's in processing status"""
        order = self.get_object()
        
        # Only allow cancellation for processing orders
        if order.order_status != 'processing':
            return Response(
                {'error': f'Order cannot be cancelled. Current status: {order.order_status}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order.order_status = 'cancelled'
        order.save()
        
        return Response(
            {'message': 'Order cancelled successfully', 'data': OrderSerializer(order).data},
            status=status.HTTP_200_OK
        )

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Transactional Checkout Process:
        1. Validate Cart
        2. Lock Inventory Rows (select_for_update)
        3. Create Order
        4. Create OrderItems
        5. Deduct Stock
        6. Clear Cart
        """
        user = request.user
        cart = Cart.objects.filter(user=user).first()
        
        if not cart or not cart.items.exists():
            return Response({'error': 'Cart is empty'}, status=400)

        shipping_address_id = request.data.get('shipping_address_id')
        address = get_object_or_404(Address, id=shipping_address_id, user=user)

        # 1. Prepare Totals
        subtotal = 0
        order_items_payload = []

        # Iterate items
        cart_items = cart.items.select_related('product', 'variant').all()
        
        for item in cart_items:
            # LOCKING: Get fresh product/variant instance with lock
            if item.variant:
                # Lock the variant row
                variant = ProductVariant.objects.select_for_update().get(id=item.variant.id)
                product = item.product # No need to lock product if tracking stock on variant
                stock = variant.stock_count
            else:
                # Lock the product row
                product = Product.objects.select_for_update().get(id=item.product.id)
                variant = None
                stock = product.inventory_count
            
            # Check Stock again inside lock
            if item.quantity > stock:
                transaction.set_rollback(True) # Force rollback
                return Response({'error': f'Out of stock: {product.title}'}, status=400)

            # Calculate Line Price
            price = product.final_price
            if variant:
                price += variant.price_adjustment
            
            subtotal += (price * item.quantity)
            
            order_items_payload.append({
                'product': product,
                'variant': variant,
                'price': price,
                'quantity': item.quantity
            })

        # 2. Financials
        shipping_cost = Decimal('0') if subtotal > Decimal('1000') else Decimal('99')
        tax_amount = subtotal * Decimal('0.18') # 18% GST Simplified
        discount_amount = Decimal('0')
        
        # Coupon Logic (Simplified)
        coupon_code = request.data.get('coupon_code')
        coupon_obj = None
        if coupon_code:
            try:
                coupon_obj = Coupon.objects.get(code=coupon_code, active=True, valid_to__gte=timezone.now())
                # ... advanced validation ...
                # Assuming valid for demo
                discount_amount = Decimal('100') # Mock calculation
            except Coupon.DoesNotExist:
                pass
        
        total_amount = subtotal + tax_amount + shipping_cost - discount_amount

        # 3. Create Order
        order = Order.objects.create(
            user=user,
            shipping_address=address,
            billing_address=address, # Simplified
            total_amount=total_amount,
            tax_amount=tax_amount,
            shipping_cost=shipping_cost,
            discount_amount=discount_amount,
            coupon=coupon_obj,
            order_status='pending',
            payment_status='paid' # Mocking Payment Gateway Success
        )

        # 4. Create Items & Deduct Stock
        for payload in order_items_payload:
            OrderItem.objects.create(
                order=order,
                product=payload['product'],
                variant=payload['variant'],
                quantity=payload['quantity'],
                price_at_purchase=payload['price']
            )
            
            # Deduct Stock (Already locked)
            if payload['variant']:
                payload['variant'].stock_count = F('stock_count') - payload['quantity']
                payload['variant'].save()
            else:
                payload['product'].inventory_count = F('inventory_count') - payload['quantity']
                payload['product'].save()

        # 5. Clear Cart
        cart.items.all().delete()

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


# -----------------------------------------------------------------------------
# 5. REVIEWS
# -----------------------------------------------------------------------------

class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        product_id = self.request.query_params.get('product_id')
        if product_id:
            return Review.objects.filter(product_id=product_id).select_related('user')
        return Review.objects.all()

    def perform_create(self, serializer):
        # Validation handled in Serializer
        serializer.save()