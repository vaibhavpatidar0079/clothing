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
# 3. CATALOG (Categories, Brands, Products)
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
        """Return full URL for category image"""
        try:
            if not obj or not obj.image:
                return None
                
            request = self.context.get('request')
            if request:
                try:
                    # Build absolute URL
                    url = request.build_absolute_uri(obj.image.url)
                    # Ensure it's a proper URL
                    if url.startswith('http'):
                        return url
                    # If build_absolute_uri didn't work properly, construct manually
                    return f"{request.scheme}://{request.get_host()}{obj.image.url}"
                except Exception as e:
                    # Fallback: construct URL manually
                    try:
                        if request:
                            return f"{request.scheme}://{request.get_host()}{obj.image.url}"
                    except:
                        pass
                    return obj.image.url
            # If no request context, return relative URL
            return obj.image.url
        except Exception as e:
            logger.error(f"Error getting image for category {obj.id if obj else 'None'}: {e}", exc_info=True)
        return None
    
    def get_product_count(self, obj):
        """Count products in this category and all its children"""
        if not obj:
            return 0
        try:
            # Count products directly in this category
            count = obj.products.filter(is_active=True).count()
            # Recursively count products in child categories
            def count_children(category):
                total = 0
                for child in category.children.all():
                    if child.is_active:
                        total += child.products.filter(is_active=True).count()
                        total += count_children(child)
                return total
            count += count_children(obj)
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
        """Return full URL for product image"""
        try:
            if not obj or not obj.image:
                return None
                
            request = self.context.get('request')
            if request:
                try:
                    # Build absolute URL
                    url = request.build_absolute_uri(obj.image.url)
                    # Ensure it's a proper URL
                    if url.startswith('http'):
                        return url
                    # If build_absolute_uri didn't work properly, construct manually
                    return f"{request.scheme}://{request.get_host()}{obj.image.url}"
                except Exception as e:
                    # Fallback: construct URL manually
                    try:
                        if request:
                            return f"{request.scheme}://{request.get_host()}{obj.image.url}"
                    except:
                        pass
                    return obj.image.url
            # If no request context, return relative URL
            return obj.image.url
        except Exception as e:
            logger.error(f"Error getting image for ProductImage {obj.id if obj else 'None'}: {e}", exc_info=True)
        return None

class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ('id', 'sku', 'size', 'color', 'stock_count', 'price_adjustment', 'is_active')

class ProductListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for Listing Pages (PLP).
    Excludes heavy descriptions and all variants.
    """
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    primary_image = serializers.SerializerMethodField()
    final_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    discount_percentage = serializers.IntegerField(read_only=True)
    # Annotated fields from view - must be explicitly defined as read-only
    average_rating = serializers.FloatField(read_only=True, allow_null=True)
    total_reviews = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = (
            'id', 'title', 'slug', 'brand_name', 'category_slug',
            'price', 'discount_price', 'final_price', 'discount_percentage',
            'primary_image', 'inventory_count', 'product_type', 'is_active', 
            'average_rating', 'total_reviews' # Annotations from View
        )
        # Using annotations for rating avoids N+1 queries

    def get_primary_image(self, obj):
        # Efficiently fetch primary image (prefetch_related used in view)
        try:
            if not obj:
                return None
                
            # Try to get primary image first
            img = None
            if hasattr(obj, 'images'):
                # Use prefetched images if available
                try:
                    img = next((i for i in obj.images.all() if i.is_primary), None)
                    if not img and obj.images.exists():
                        img = obj.images.first()
                except Exception:
                    # Fallback: query directly
                    try:
                        img = ProductImage.objects.filter(product=obj, is_primary=True).first()
                        if not img:
                            img = ProductImage.objects.filter(product=obj).first()
                    except Exception:
                        pass
            
            if img and hasattr(img, 'image') and img.image:
                request = self.context.get('request')
                if request:
                    try:
                        # Build absolute URL
                        url = request.build_absolute_uri(img.image.url)
                        # Ensure it's a proper URL (handle cases where MEDIA_URL might be relative)
                        if url.startswith('http'):
                            return url
                        # If build_absolute_uri didn't work properly, construct manually
                        return f"{request.scheme}://{request.get_host()}{img.image.url}"
                    except Exception as e:
                        # Fallback: construct URL manually
                        try:
                            if request:
                                return f"{request.scheme}://{request.get_host()}{img.image.url}"
                        except:
                            pass
                        return img.image.url
                # If no request context, return relative URL (frontend will need to prepend base URL)
                return img.image.url
            return None
        except Exception as e:
            # Log error but don't break the serializer
            logger.error(f"Error getting primary image for product {obj.id if obj else 'None'}: {e}", exc_info=True)
        return None

class ProductDetailSerializer(ProductListSerializer):
    """
    Heavy serializer for Product Detail Pages (PDP).
    Includes everything: Images, Variants, Reviews, Specs.
    """
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    
    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + (
            'description', 'short_description', 'fabric', 'pattern', 
            'fit', 'occasion', 'care_instructions', 'images', 'variants'
        )

# -----------------------------------------------------------------------------
# 4. CART
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
        """
        Industry-grade validation: Check stock availability accurately.
        """
        product = data.get('product')
        variant = data.get('variant')
        quantity = data.get('quantity', 1)

        # 1. Check Product Validity
        if not product.is_active:
             raise serializers.ValidationError("This product is no longer active.")

        # 2. Variant Logic
        if product.product_type == 'variable':
            if not variant:
                raise serializers.ValidationError("Please select a size/color variant.")
            
            if variant.product != product:
                raise serializers.ValidationError("Invalid variant for this product.")
            
            if variant.stock_count < quantity:
                raise serializers.ValidationError(f"Only {variant.stock_count} units available in this size.")
        
        else:
            # Simple Product
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
# 5. ORDERS & CHECKOUT
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
        # Try to get current image, fallback to placeholder if product deleted
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
    # We accept ID for creation, return object for reading
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

# -----------------------------------------------------------------------------
# 6. REVIEWS
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