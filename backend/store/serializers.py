from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import (
    Address, Category, Brand, Product, ProductImage, ProductVariant,
    Wishlist, Cart, CartItem, Order, OrderItem, Review, Coupon
)
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

# -----------------------------------------------------------------------------
# 1. UTILITY FIELDS
# -----------------------------------------------------------------------------

class RecursiveField(serializers.Serializer):
    """
    Serializer to handle recursive category trees (Category > Sub-Category).
    """
    def to_representation(self, value):
        serializer = self.parent.parent.__class__(value, context=self.context)
        return serializer.data

# -----------------------------------------------------------------------------
# 2. USER & ADDRESS
# -----------------------------------------------------------------------------

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone', 'gender', 'avatar', 'is_verified')
        read_only_fields = ('email', 'is_verified', 'avatar') # Email change requires specific flow

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = (
            'id', 'full_name', 'phone', 'address_line_1', 'address_line_2',
            'city', 'state', 'pincode', 'country', 'address_type', 'is_default'
        )
        read_only_fields = ('user',)

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

# -----------------------------------------------------------------------------
# 3. REVIEWS (Moved up to be accessible by ProductDetail)
# -----------------------------------------------------------------------------

class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.first_name')
    user_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = (
            'id', 'user_name', 'user_avatar', 'rating', 
            'title', 'comment', 'created_at', 'is_verified_purchase'
        )
        read_only_fields = ('is_verified_purchase', 'helpful_votes')

    def get_user_avatar(self, obj):
        if obj.user.avatar:
             request = self.context.get('request')
             return request.build_absolute_uri(obj.user.avatar.url) if request else obj.user.avatar.url
        return None
    
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['user'] = request.user
        
        # Check if user actually bought this product
        has_bought = OrderItem.objects.filter(
            order__user=request.user,
            product=validated_data['product'],
            order__payment_status='paid'
        ).exists()
        
        validated_data['is_verified_purchase'] = has_bought
        return super().create(validated_data)

# -----------------------------------------------------------------------------
# 4. CATALOG (Categories, Brands, Products)
# -----------------------------------------------------------------------------

class CategorySerializer(serializers.ModelSerializer):
    children = RecursiveField(many=True, read_only=True)
    product_count = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(read_only=True)
    image = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ('id', 'name', 'slug', 'image', 'is_active', 'product_count', 'children')
    
    def get_image(self, obj):
        try:
            if not obj or not obj.image: return None
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        except Exception:
            return None
    
    def get_product_count(self, obj):
        if not obj: return 0
        try:
            count = obj.products.filter(is_active=True).count()
            for child in obj.children.all():
                if child.is_active:
                    count += child.products.filter(is_active=True).count()
            return count
        except Exception:
            return 0

class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ('id', 'name', 'slug', 'logo')

class ProductImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductImage
        fields = ('id', 'image', 'alt_text', 'is_primary')
    
    def get_image(self, obj):
        try:
            if not obj or not obj.image: return None
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        except Exception:
            return None

class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ('id', 'sku', 'size', 'color', 'stock_count', 'price_adjustment', 'is_active')

class ProductListSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    primary_image = serializers.SerializerMethodField()
    final_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    discount_percentage = serializers.IntegerField(read_only=True)
    average_rating = serializers.FloatField(read_only=True, allow_null=True)
    total_reviews = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = (
            'id', 'title', 'slug', 'brand_name', 'category_slug',
            'price', 'discount_price', 'final_price', 'discount_percentage',
            'primary_image', 'inventory_count', 'product_type', 'is_active', 
            'average_rating', 'total_reviews'
        )

    def get_primary_image(self, obj):
        try:
            if not obj: return None
            img = None
            if hasattr(obj, 'images'):
                img = next((i for i in obj.images.all() if i.is_primary), None)
                if not img and obj.images.exists():
                    img = obj.images.first()
            
            if img and img.image:
                request = self.context.get('request')
                return request.build_absolute_uri(img.image.url) if request else img.image.url
            return None
        except Exception:
            return None

class ProductDetailSerializer(ProductListSerializer):
    """
    Heavy serializer for Product Detail Pages (PDP).
    """
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True) # Added Reviews
    
    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + (
            'description', 'short_description', 'fabric', 'pattern', 
            'fit', 'occasion', 'care_instructions', 'images', 'variants', 'reviews'
        )

# -----------------------------------------------------------------------------
# 5. CART
# -----------------------------------------------------------------------------

class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_active=True), 
        write_only=True, 
        source='product'
    )
    variant = ProductVariantSerializer(read_only=True)
    variant_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductVariant.objects.all(), 
        write_only=True, 
        required=False, 
        allow_null=True,
        source='variant'
    )
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, source='total_price')

    class Meta:
        model = CartItem
        fields = ('id', 'product', 'product_id', 'variant', 'variant_id', 'quantity', 'subtotal')

    def validate(self, data):
        product = data.get('product')
        variant = data.get('variant')
        quantity = data.get('quantity', 1)

        if not product.is_active:
             raise serializers.ValidationError("This product is no longer active.")

        if product.product_type == 'variable':
            if not variant:
                raise serializers.ValidationError("Please select a size/color variant.")
            if variant.product != product:
                raise serializers.ValidationError("Invalid variant for this product.")
            if variant.stock_count < quantity:
                raise serializers.ValidationError(f"Only {variant.stock_count} units available in this size.")
        else:
            if product.inventory_count < quantity:
                raise serializers.ValidationError(f"Only {product.inventory_count} units available.")

        return data

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Cart
        fields = ('id', 'items', 'total_price', 'updated_at')

# -----------------------------------------------------------------------------
# 6. ORDERS & CHECKOUT
# -----------------------------------------------------------------------------

class OrderItemSerializer(serializers.ModelSerializer):
    product_slug = serializers.ReadOnlyField(source='product.slug')
    product_image = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        fields = (
            'product_name', 'product_slug', 'product_image',
            'variant_name', 'price_at_purchase', 'quantity', 'total'
        )
    
    def get_product_image(self, obj):
        try:
            img = obj.product.images.filter(is_primary=True).first()
            if img:
                request = self.context.get('request')
                return request.build_absolute_uri(img.image.url) if request else img.image.url
        except:
            return None
        return None

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    shipping_address = AddressSerializer(read_only=True)
    shipping_address_id = serializers.PrimaryKeyRelatedField(
        queryset=Address.objects.all(), write_only=True, source='shipping_address'
    )

    class Meta:
        model = Order
        fields = (
            'id', 'created_at', 'order_status', 'payment_status', 'payment_method',
            'total_amount', 'shipping_cost', 'tax_amount', 'discount_amount',
            'shipping_address', 'shipping_address_id', 'items'
        )
        read_only_fields = (
            'order_status', 'payment_status', 'total_amount', 
            'shipping_cost', 'tax_amount', 'discount_amount'
        )