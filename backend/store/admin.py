from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from django.urls import reverse
from django.db.models import Sum, Count
from mptt.admin import DraggableMPTTAdmin
from .models import (
    User, Address, Category, Brand, Product, ProductImage, ProductSize, ProductVariant,
    Wishlist, Cart, CartItem, Order, OrderItem, Review, Coupon, ReturnRequest
)

# -----------------------------------------------------------------------------
# 1. USER & AUTHENTICATION
# -----------------------------------------------------------------------------

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'username', 'first_name', 'last_name', 'is_verified', 'is_staff', 'date_joined')
    list_filter = ('is_verified', 'is_staff', 'is_active', 'date_joined', 'gender')
    search_fields = ('email', 'username', 'phone', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    
    # Simple, standard fieldsets structure
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name', 'email', 'phone', 'gender', 'avatar')}),
        (_('Permissions'), {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
        (_('Extra Info'), {'fields': ('is_verified',)}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'first_name', 'last_name', 'password1', 'password2', 'phone', 'gender'),
        }),
    )
    
    actions = ['verify_users']

    def verify_users(self, request, queryset):
        queryset.update(is_verified=True)
    verify_users.short_description = "Mark selected users as verified"


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('user', 'full_name', 'address_type', 'city', 'pincode', 'is_default')
    list_filter = ('address_type', 'is_default', 'city', 'state')
    search_fields = ('user__email', 'full_name', 'pincode', 'address_line_1')
    raw_id_fields = ('user',)


# -----------------------------------------------------------------------------
# 2. CATALOG MANAGEMENT
# -----------------------------------------------------------------------------

@admin.register(Category)
class CategoryAdmin(DraggableMPTTAdmin):
    mptt_indent_field = "name"
    list_display = ('tree_actions', 'indented_title', 'image_preview', 'slug', 'product_count', 'is_active')
    list_display_links = ('indented_title',)
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)
    readonly_fields = ('image_preview',)
    
    fieldsets = (
        (None, {
            'fields': ('name', 'slug', 'parent', 'is_active', 'image', 'image_preview', 'description')
        }),
    )
    
    def image_preview(self, obj):
        if obj and obj.image:
            try:
                return format_html(
                    '<img src="{}" style="width: 80px; height: 80px; object-fit: cover; border: 1px solid #ddd;" />', 
                    obj.image.url
                )
            except Exception:
                return "Image error"
        return "No image"
    image_preview.short_description = 'Image'
    
    def product_count(self, instance):
        if instance:
            return instance.products.filter(is_active=True).count()
        return 0
    product_count.short_description = 'Products'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.prefetch_related('products')


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ('logo_preview', 'name', 'slug', 'product_count')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.prefetch_related('products')

    def logo_preview(self, obj):
        if obj and obj.logo:
            try:
                return format_html('<img src="{}" style="width: 50px; height: auto;" />', obj.logo.url)
            except Exception:
                pass
        return "-"
    logo_preview.short_description = 'Logo'

    def product_count(self, obj):
        if obj:
            return obj.products.count()
        return 0
    product_count.short_description = 'Products'


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 3
    fields = ('image', 'image_preview', 'alt_text', 'is_primary', 'sort_order')
    readonly_fields = ('image_preview',)

    def image_preview(self, obj):
        if obj and obj.image:
            try:
                return format_html(
                    '<img src="{}" style="width: 100px; height: auto; object-fit: cover;" />', 
                    obj.image.url
                )
            except Exception:
                return "Image not found"
        return "No image"
    image_preview.short_description = 'Preview'


class ProductSizeInline(admin.TabularInline):
    """
    Independent size options for the product.
    Sizes are separate from variants and can be selected independently.
    """
    model = ProductSize
    extra = 3  # Show 3 empty forms by default
    min_num = 0  # Allow zero sizes
    can_delete = True  # Allow deletion of sizes
    fields = ('size', 'stock_count', 'is_active', 'sort_order')
    verbose_name = 'Size Option'
    verbose_name_plural = 'Size Options'


class ProductVariantInline(admin.TabularInline):
    """
    Links to full Product instances as variants.
    Variants are complete products that can be related to the main product.
    """
    model = ProductVariant
    fk_name = 'product'  # Specify which ForeignKey to use (the main product, not variant_product)
    extra = 1  # Show 1 empty form by default
    min_num = 0  # Allow zero variants
    can_delete = True  # Allow deletion of variants
    classes = ('collapse',)  # Collapsed by default, can be expanded
    fields = ('variant_product', 'difference', 'is_active', 'sort_order')
    verbose_name = 'Related Product Variant'
    verbose_name_plural = 'Related Product Variants'
    raw_id_fields = ('variant_product',)  # Use raw ID field for better performance


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('thumbnail', 'title', 'sku', 'price', 'get_final_price', 'inventory_status', 'is_active', 'is_featured')
    list_filter = ('is_active', 'is_featured', 'brand', 'category', 'created_at')
    search_fields = ('title', 'sku', 'description')
    prepopulated_fields = {'slug': ('title',)}
    inlines = [ProductImageInline, ProductSizeInline, ProductVariantInline]
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        (_('Basic Info'), {
            'fields': ('title', 'slug', 'sku', 'brand', 'category', 'is_active', 'is_featured')
        }),
        (_('Pricing & Tax'), {
            'fields': ('price', 'discount_price', 'tax_percent')
        }),
        (_('Description'), {
            'fields': ('description', 'short_description', 'care_instructions')
        }),
        (_('Attributes'), {
            'fields': ('fabric', 'pattern', 'fit', 'occasion')
        }),
        (_('Simple Inventory'), {
            'fields': ('product_type', 'inventory_count', 'size'),
            'description': "Use this only if the product has no variants (sizes/colors). Size field allows manual size input (e.g. M, 42, 10-12)."
        }),
    )

    def thumbnail(self, obj):
        try:
            if obj:
                img = obj.images.filter(is_primary=True).first()
                if not img and obj.images.exists():
                    img = obj.images.first()
                if img and img.image:
                    try:
                        return format_html(
                            '<img src="{}" style="width: 60px; height: 80px; object-fit: cover; border: 1px solid #ddd;" />', 
                            img.image.url
                        )
                    except Exception:
                        return "Image error"
        except Exception as e:
            return f"Error: {str(e)}"
        return "-"
    thumbnail.short_description = 'Image'

    def get_final_price(self, obj):
        return f"₹{obj.final_price:,.2f}"
    get_final_price.short_description = 'Final Price'
    get_final_price.admin_order_field = 'price'

    def inventory_status(self, obj):
        try:
            if obj.product_type == 'simple':
                count = obj.inventory_count
            else:
                count = obj.variants.aggregate(total=Sum('stock_count'))['total'] or 0
            
            color = 'green' if count > 10 else 'orange' if count > 0 else 'red'
            return format_html('<span style="color: {}; font-weight: bold;">{} Units</span>', color, count)
        except Exception:
            return "-"
    inventory_status.short_description = 'Stock'


# -----------------------------------------------------------------------------
# 3. ORDER MANAGEMENT
# -----------------------------------------------------------------------------

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    readonly_fields = ('product_name', 'variant_name', 'price_at_purchase', 'tax_at_purchase', 'quantity')
    fields = ('product', 'variant', 'product_name', 'variant_name', 'price_at_purchase', 'quantity')
    
    def has_add_permission(self, request, obj=None):
        return False
    
    def get_total_display(self, obj):
        if obj:
            return f"₹{obj.total:,.2f}"
        return "-"
    get_total_display.short_description = 'Total'


class ReturnRequestInline(admin.TabularInline):
    model = ReturnRequest
    extra = 0
    readonly_fields = ('user', 'created_at', 'updated_at')
    fields = ('order_item', 'reason', 'status', 'admin_notes', 'created_at', 'updated_at')
    
    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'get_total_amount', 'order_status', 'payment_status', 'created_at')
    list_filter = ('order_status', 'payment_status', 'created_at')
    search_fields = ('id', 'user__email', 'tracking_number')
    readonly_fields = ('id', 'tax_amount', 'shipping_cost', 'discount_amount', 'created_at', 'updated_at')
    inlines = [OrderItemInline, ReturnRequestInline]
    
    fieldsets = (
        (_('Order Info'), {
            'fields': ('id', 'user', 'created_at', 'updated_at', 'order_status')
        }),
        (_('Payment'), {
            'fields': ('payment_status', 'payment_method', 'payment_id', 'total_amount', 'tax_amount', 'discount_amount')
        }),
        (_('Shipping'), {
            'fields': ('shipping_address', 'billing_address', 'shipping_cost', 'tracking_number')
        }),
        (_('Coupon'), {
            'fields': ('coupon',)
        }),
    )
    
    def get_total_amount(self, obj):
        return f"₹{obj.total_amount:,.2f}"
    get_total_amount.short_description = 'Total Amount'
    get_total_amount.admin_order_field = 'total_amount'
    
    actions = ['mark_processing', 'mark_shipped', 'mark_delivered']

    def mark_processing(self, request, queryset):
        queryset.update(order_status='processing')
    mark_processing.short_description = "Mark selected orders as processing"
    
    def mark_shipped(self, request, queryset):
        queryset.update(order_status='shipped')
    mark_shipped.short_description = "Mark selected orders as shipped"
    
    def mark_delivered(self, request, queryset):
        from django.utils import timezone
        # Use save() instead of update() so the save() method triggers and sets delivered_at
        for order in queryset:
            order.order_status = 'delivered'
            order.payment_status = 'paid'
            order.save()
    mark_delivered.short_description = "Mark selected orders as delivered"


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_percent', 'flat_discount', 'valid_to', 'usage_limit', 'used_count', 'active')
    list_filter = ('active', 'valid_to')
    search_fields = ('code',)


# -----------------------------------------------------------------------------
# 4. REVIEWS & WISHLIST
# -----------------------------------------------------------------------------

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('product', 'user', 'order_item', 'rating', 'is_verified_purchase', 'created_at')
    list_filter = ('rating', 'is_verified_purchase', 'created_at')
    search_fields = ('product__title', 'user__email', 'title', 'order_item__id')
    readonly_fields = ('user', 'is_verified_purchase', 'created_at', 'updated_at')


@admin.register(ReturnRequest)
class ReturnRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'order_item', 'user', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('order__id', 'user__email', 'reason', 'order_item__product_name')
    readonly_fields = ('user', 'created_at', 'updated_at')
    fields = ('order', 'order_item', 'user', 'reason', 'status', 'admin_notes', 'created_at', 'updated_at')
    
    actions = ['approve_returns', 'reject_returns']
    
    def approve_returns(self, request, queryset):
        queryset.update(status='approved')
    approve_returns.short_description = "Approve selected return requests"
    
    def reject_returns(self, request, queryset):
        queryset.update(status='rejected')
    reject_returns.short_description = "Reject selected return requests"


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ('user', 'product', 'added_at')
    search_fields = ('user__email', 'product__title')

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('user', 'item_count', 'get_total_price', 'created_at')
    readonly_fields = ()
    list_select_related = ('user',)
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.prefetch_related('items')
    
    def item_count(self, obj):
        if obj:
            return obj.items.count()
        return 0
    item_count.short_description = 'Items'
    
    def get_total_price(self, obj):
        if obj:
            try:
                return f"₹{obj.total_price:,.2f}"
            except Exception:
                return "₹0.00"
        return "₹0.00"
    get_total_price.short_description = 'Total Price'