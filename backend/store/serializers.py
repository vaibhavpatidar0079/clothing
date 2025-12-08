from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import (
    Address, Category, Brand, Product, ProductImage, ProductSize, ProductVariant,
    Wishlist, Cart, CartItem, Order, OrderItem, Review, Coupon, ReturnRequest
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
        read_only_fields = ('id', 'user')

# -----------------------------------------------------------------------------
# 3. REVIEWS (Moved up to be accessible by ProductDetail)
# -----------------------------------------------------------------------------

class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.first_name')
    user_avatar = serializers.SerializerMethodField()
    product_name = serializers.ReadOnlyField(source='product.title')

    class Meta:
        model = Review
        fields = (
            'id', 'product', 'product_name', 'order_item',
            'user_name', 'user_avatar', 'rating', 
            'title', 'comment', 'created_at', 'is_verified_purchase', 'helpful_votes'
        )
        read_only_fields = ('is_verified_purchase', 'helpful_votes', 'user', 'product')

    def get_user_avatar(self, obj):
        if obj.user.avatar:
             request = self.context.get('request')
             return request.build_absolute_uri(obj.user.avatar.url) if request else obj.user.avatar.url
        return None
    
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['user'] = request.user
        
        # Set product from order_item if not provided
        order_item = validated_data.get('order_item')
        if order_item:
            validated_data['product'] = order_item.product
        
        # Check if user actually bought this product (for 'Verified Purchase' badge)
        product = validated_data['product']
        has_bought = OrderItem.objects.filter(
            order__user=request.user,
            product=product,
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

class ProductSizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductSize
        fields = ('id', 'size', 'stock_count', 'is_active', 'sort_order')

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

class ProductVariantSerializer(serializers.ModelSerializer):
    """
    Serializer for product variants that link to full Product instances.
    Includes variant product image and difference indicator.
    Includes all related variants (many-to-many relationship).
    """
    variant_product = ProductListSerializer(read_only=True)
    variant_product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_active=True),
        write_only=True,
        source='variant_product',
        required=False,
        allow_null=True
    )
    variant_image = serializers.SerializerMethodField()
    related_variants = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductVariant
        fields = ('id', 'variant_product', 'variant_product_id', 'variant_image', 
                 'difference', 'is_active', 'sort_order', 'related_variants')
    
    def get_variant_image(self, obj):
        """Get the primary image of the variant product"""
        if obj and obj.variant_product:
            try:
                img = obj.variant_product.images.filter(is_primary=True).first()
                if not img and obj.variant_product.images.exists():
                    img = obj.variant_product.images.first()
                
                if img and img.image:
                    request = self.context.get('request')
                    return request.build_absolute_uri(img.image.url) if request else img.image.url
            except Exception:
                pass
        return None
    
    def get_related_variants(self, obj):
        """Get all related variants with their details (without recursion)"""
        if not obj:
            return []
        
        related = obj.related_variants.filter(is_active=True).distinct()
        
        # Use a simple serializer without related_variants to prevent recursion
        serializer = ProductVariantSerializer(
            related, 
            many=True, 
            context=self.context,
            read_only=True,
            exclude_related=True  # Pass flag to exclude related_variants
        )
        return serializer.data
    
    def __init__(self, *args, exclude_related=False, **kwargs):
        super().__init__(*args, **kwargs)
        # Conditionally remove the related_variants field to prevent recursion
        if exclude_related and 'related_variants' in self.fields:
            self.fields.pop('related_variants')

class ProductDetailSerializer(ProductListSerializer):
    """
    Heavy serializer for Product Detail Pages (PDP).
    Includes reviews, sizes (independent), and variants (related products).
    """
    images = ProductImageSerializer(many=True, read_only=True)
    sizes = ProductSizeSerializer(many=True, read_only=True)  # Independent sizes
    variants = serializers.SerializerMethodField()  # Related product variants
    reviews = ReviewSerializer(many=True, read_only=True) 
    
    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + (
            'description', 'short_description', 'fabric', 'pattern', 
            'fit', 'occasion', 'care_instructions', 'images', 'sizes', 'variants', 'reviews', 'size'
        )
    
    def get_variants(self, obj):
        """Get all variants for this product (both direct and indirect)"""
        if not obj:
            return []
        
        # Get all variants using the model method
        all_variants = obj.get_all_variants().filter(is_active=True).distinct()
        
        return ProductVariantSerializer(
            all_variants,
            many=True,
            context=self.context,
            read_only=True
        ).data

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
    # Size selection (independent)
    selected_size = ProductSizeSerializer(read_only=True)
    size_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductSize.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
        source='selected_size'
    )
    # Variant product (full product instance)
    variant_product = ProductListSerializer(read_only=True)
    variant_product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_active=True),
        write_only=True,
        required=False,
        allow_null=True,
        source='variant_product'
    )
    # Backward compatibility
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
        fields = ('id', 'product', 'product_id', 'selected_size', 'size_id', 
                 'variant_product', 'variant_product_id', 'variant', 'variant_id', 
                 'quantity', 'subtotal')

    def validate(self, data):
        product = data.get('product')
        selected_size = data.get('selected_size')
        variant_product = data.get('variant_product')
        quantity = data.get('quantity', 1)

        if not product.is_active:
             raise serializers.ValidationError("This product is no longer active.")

        # Check stock based on size if size is selected
        if selected_size:
            if selected_size.product != product:
                raise serializers.ValidationError("Invalid size for this product.")
            if selected_size.stock_count < quantity:
                raise serializers.ValidationError(f"Only {selected_size.stock_count} units available in size {selected_size.size}.")
        # Check variant product stock if variant is selected
        elif variant_product:
            if variant_product.inventory_count < quantity:
                raise serializers.ValidationError(f"Only {variant_product.inventory_count} units available.")
        # Check main product stock if no size/variant selected
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

class ReturnRequestSerializer(serializers.ModelSerializer):
    order_item_product_name = serializers.ReadOnlyField(source='order_item.product_name')
    
    class Meta:
        model = ReturnRequest
        fields = (
            'id', 'order', 'order_item', 'order_item_product_name',
            'reason', 'status', 'admin_notes', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'status', 'admin_notes', 'created_at', 'updated_at')
    
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['user'] = request.user
        return super().create(validated_data)


class OrderItemSerializer(serializers.ModelSerializer):
    product_slug = serializers.ReadOnlyField(source='product.slug')
    product_image = serializers.SerializerMethodField()
    reviews = ReviewSerializer(many=True, read_only=True)
    return_requests = ReturnRequestSerializer(many=True, read_only=True)
    
    class Meta:
        model = OrderItem
        fields = (
            'id', 'product_name', 'product_slug', 'product_image',
            'variant_name', 'price_at_purchase', 'quantity', 'total',
            'reviews', 'return_requests'
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
    return_requests = ReturnRequestSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'created_at', 'updated_at', 'delivered_at', 'order_status', 'payment_status', 'payment_method',
            'total_amount', 'shipping_cost', 'tax_amount', 'discount_amount',
            'shipping_address', 'shipping_address_id', 'items', 'return_requests'
        )
        read_only_fields = (
            'order_status', 'payment_status', 'total_amount', 
            'shipping_cost', 'tax_amount', 'discount_amount', 'delivered_at'
        )