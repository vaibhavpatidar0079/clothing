import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from mptt.models import MPTTModel, TreeForeignKey

# -----------------------------------------------------------------------------
# 1. ABSTRACT BASE MODELS
# -----------------------------------------------------------------------------

class TimeStampedModel(models.Model):
    """
    An abstract base class model that provides self-updating
    'created_at' and 'updated_at' fields.
    """
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Created At"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Updated At"))

    class Meta:
        abstract = True


# -----------------------------------------------------------------------------
# 2. USER & AUTHENTICATION
# -----------------------------------------------------------------------------

class User(AbstractUser):
    """
    Custom User model to allow easier extension in the future.
    Uses email as the primary login identifier if configured in backend.
    """
    GENDER_CHOICES = [
        ('F', _('Female')),
        ('M', _('Male')),
        ('O', _('Other')),
        ('N', _('Prefer not to say')),
    ]
    
    email = models.EmailField(_('email address'), unique=True)
    phone = models.CharField(_("Phone Number"), max_length=15, blank=True, null=True)
    gender = models.CharField(_("Gender"), max_length=1, choices=GENDER_CHOICES, default='F')
    is_verified = models.BooleanField(_("Is Verified"), default=False)
    
    # We can add an Avatar field if needed
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    class Meta:
        verbose_name = _("User")
        verbose_name_plural = _("Users")

    def __str__(self):
        return self.email


class PasswordResetOTP(models.Model):
    """
    Stores OTPs for password reset functionality.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_otps')
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def is_valid(self):
        """
        Check if OTP is not used and within 10 minutes validity.
        """
        from datetime import timedelta
        if self.is_used:
            return False
        # OTP valid for 10 minutes
        expiry_time = self.created_at + timedelta(minutes=10)
        return timezone.now() <= expiry_time

    def __str__(self):
        return f"{self.user.email} - {self.otp}"


class Address(TimeStampedModel):
    """
    Stores multiple addresses for a user (Shipping/Billing).
    """
    ADDRESS_TYPE_CHOICES = [
        ('home', _('Home')),
        ('work', _('Work')),
        ('other', _('Other')),
    ]

    user = models.ForeignKey(User, related_name='addresses', on_delete=models.CASCADE)
    full_name = models.CharField(_("Full Name"), max_length=255)
    phone = models.CharField(_("Phone Number"), max_length=20)
    
    address_line_1 = models.CharField(_("Address Line 1"), max_length=255)
    address_line_2 = models.CharField(_("Address Line 2"), max_length=255, blank=True)
    landmark = models.CharField(_("Landmark"), max_length=255, blank=True)
    
    city = models.CharField(_("City"), max_length=100)
    state = models.CharField(_("State"), max_length=100)
    pincode = models.CharField(_("Pincode"), max_length=10)
    country = models.CharField(_("Country"), max_length=100, default="India")
    
    address_type = models.CharField(max_length=10, choices=ADDRESS_TYPE_CHOICES, default='home')
    is_default = models.BooleanField(_("Is Default"), default=False)

    class Meta:
        verbose_name = _("Address")
        verbose_name_plural = _("Addresses")
        ordering = ['-is_default', '-created_at']

    def save(self, *args, **kwargs):
        # Ensure only one default address per user
        if self.is_default:
            Address.objects.filter(user=self.user, is_default=True).update(is_default=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.city})"


# -----------------------------------------------------------------------------
# 3. CATALOG & PRODUCT MANAGEMENT
# -----------------------------------------------------------------------------

class Category(MPTTModel):
    """
    Hierarchical Category System (e.g., Clothing -> Women -> Sarees).
    Uses MPPT for efficient tree traversal.
    """
    name = models.CharField(_("Name"), max_length=100)
    slug = models.SlugField(unique=True)
    parent = TreeForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    image = models.ImageField(upload_to='categories/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    show_on_home = models.BooleanField(default=False, help_text="Display this category on home page")
    description = models.TextField(blank=True)

    class MPTTMeta:
        order_insertion_by = ['name']

    class Meta:
        verbose_name = _("Category")
        verbose_name_plural = _("Categories")

    def __str__(self):
        return self.name


class Brand(TimeStampedModel):
    name = models.CharField(_("Brand Name"), max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    logo = models.ImageField(upload_to='brands/', blank=True, null=True)
    description = models.TextField(blank=True)
    website = models.URLField(blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(TimeStampedModel):
    """
    The core product container.
    Physical stock is tracked in ProductVariant if sizes/colors exist,
    otherwise in inventory_count here.
    """
    PRODUCT_TYPES = [
        ('simple', _('Simple Product')),
        ('variable', _('Variable Product')), # Has sizes/colors
    ]

    title = models.CharField(_("Product Title"), max_length=255)
    slug = models.SlugField(unique=True, max_length=255)
    sku = models.CharField(_("SKU"), max_length=50, unique=True, help_text="Stock Keeping Unit")
    
    brand = models.ForeignKey(Brand, related_name='products', on_delete=models.SET_NULL, null=True)
    category = models.ForeignKey(Category, related_name='products', on_delete=models.SET_NULL, null=True)
    
    description = models.TextField(_("Description"))
    short_description = models.TextField(_("Short Description"), blank=True, help_text="Shown in lists")
    
    # Pricing
    price = models.DecimalField(_("MRP"), max_digits=12, decimal_places=2)
    discount_price = models.DecimalField(_("Selling Price"), max_digits=12, decimal_places=2, null=True, blank=True)
    tax_percent = models.DecimalField(_("GST %"), max_digits=5, decimal_places=2, default=18.00)
    
    # Inventory & Size
    product_type = models.CharField(max_length=20, choices=PRODUCT_TYPES, default='variable')
    inventory_count = models.PositiveIntegerField(default=0, help_text="Only for simple products")
    
    # New Manual Size Field
    size = models.CharField(_("Size"), max_length=100, blank=True, help_text="Manual size input (e.g. M, 42, 10-12)")
    
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    show_on_home = models.BooleanField(default=False, help_text="Display this product on home page (new arrivals)")
    
    # Attributes for Filtering
    color = models.CharField(_("Color"), max_length=100, blank=True)
    fabric = models.CharField(max_length=100, blank=True)
    pattern = models.CharField(max_length=100, blank=True)
    fit = models.CharField(max_length=100, blank=True)
    occasion = models.CharField(max_length=100, blank=True)
    care_instructions = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['price']),
            models.Index(fields=['is_active']),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title) + "-" + str(uuid.uuid4())[:8]
        super().save(*args, **kwargs)

    @property
    def final_price(self):
        return self.discount_price if self.discount_price else self.price

    @property
    def discount_percentage(self):
        if self.discount_price and self.price > 0:
            return int(((self.price - self.discount_price) / self.price) * 100)
        return 0

    def get_all_variants(self):
        """
        Get all variants for this product.
        Includes both:
        1. Variants where this product is the main product
        2. Variants where this product is a variant_product (i.e., this product is a variant of another)
        """
        from django.db.models import Q
        # Variants of this product as main product
        direct_variants = ProductVariant.objects.filter(product=self)
        # Also get variants where this product is the variant_product (product is itself a variant)
        indirect_variants = ProductVariant.objects.filter(variant_product=self)
        
        # Combine and return distinct
        all_variant_ids = set(list(direct_variants.values_list('id', flat=True)) + 
                             list(indirect_variants.values_list('id', flat=True)))
        return ProductVariant.objects.filter(id__in=all_variant_ids)

    def __str__(self):
        return self.title


class ProductSize(models.Model):
    """
    Independent size options for a product.
    Sizes are separate from variants and can be selected independently.
    """
    product = models.ForeignKey(Product, related_name='sizes', on_delete=models.CASCADE)
    size = models.CharField(_("Size"), max_length=50)  # S, M, L, XL, 42, etc.
    stock_count = models.PositiveIntegerField(default=0, help_text="Stock available for this size")
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0, help_text="Order in which sizes appear")

    class Meta:
        unique_together = ('product', 'size')
        ordering = ['sort_order', 'size']

    def __str__(self):
        return f"{self.product.title} - {self.size}"


class ProductVariant(models.Model):
    """
    Links to full Product instances as variants.
    Variants are complete products that can be related to the main product.
    All variants in a group relate to each other (no parent-child hierarchy).
    """
    product = models.ForeignKey(Product, related_name='variants', on_delete=models.CASCADE, 
                                help_text="Main product this variant belongs to")
    variant_product = models.ForeignKey(Product, related_name='parent_variants', on_delete=models.CASCADE,
                                       help_text="The actual product variant (full product instance)",
                                       null=True, blank=True)  # Temporarily nullable for migration
    difference = models.CharField(max_length=50, blank=True, 
                                 help_text="One word describing the difference (e.g., Color, Style, Pattern)")
    sort_order = models.PositiveIntegerField(default=0, help_text="Order in which variants appear")
    is_active = models.BooleanField(default=True)
    # Many-to-many relationship to other variants (for grouping all related variants)
    related_variants = models.ManyToManyField(
        'self',
        symmetrical=True,
        blank=True,
        related_name='related_to_variants',
        help_text="All variants related to this one (no parent-child hierarchy)"
    )

    class Meta:
        unique_together = ('product', 'variant_product')
        ordering = ['sort_order']

    def __str__(self):
        if self.variant_product:
            return f"{self.product.title} -> {self.variant_product.title}"
        return f"{self.product.title} -> (No variant product)"


class ProductImage(models.Model):
    product = models.ForeignKey(Product, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='products/')
    alt_text = models.CharField(max_length=255, blank=True)
    is_primary = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order']

    def save(self, *args, **kwargs):
        if self.is_primary:
            ProductImage.objects.filter(product=self.product).update(is_primary=False)
        super().save(*args, **kwargs)


# -----------------------------------------------------------------------------
# 4. SHOPPING & ORDERS
# -----------------------------------------------------------------------------

class Coupon(models.Model):
    code = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=255, blank=True)
    discount_percent = models.PositiveIntegerField(default=0, validators=[MaxValueValidator(100)])
    flat_discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    min_purchase_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField()
    active = models.BooleanField(default=True)
    usage_limit = models.PositiveIntegerField(default=1000)
    used_count = models.PositiveIntegerField(default=0)

    def is_valid(self):
        from django.utils import timezone
        now = timezone.now()
        return self.active and self.valid_from <= now <= self.valid_to and self.used_count < self.usage_limit

    def __str__(self):
        return self.code


class Cart(TimeStampedModel):
    user = models.ForeignKey(User, related_name='cart', on_delete=models.CASCADE)
    # Could add 'session_key' here for guest checkout in future

    def __str__(self):
        return f"Cart for {self.user.email}"

    @property
    def total_price(self):
        return sum(item.total_price for item in self.items.all())


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    # Size is independent selection
    selected_size = models.ForeignKey('ProductSize', null=True, blank=True, on_delete=models.SET_NULL,
                                     help_text="Selected size (independent from variant)")
    # Variant is a full product instance
    variant_product = models.ForeignKey(Product, null=True, blank=True, related_name='cart_items_as_variant',
                                      on_delete=models.SET_NULL, help_text="Variant product (full product instance)")
    # Keep old variant field for backward compatibility during migration
    variant = models.ForeignKey(ProductVariant, null=True, blank=True, on_delete=models.SET_NULL)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['added_at']

    @property
    def total_price(self):
        # Use variant_product if selected, otherwise use main product
        product_to_price = self.variant_product if self.variant_product else self.product
        price = product_to_price.final_price
        
        # Backward compatibility: if old variant exists, use its price adjustment
        if self.variant:
            price += self.variant.price_adjustment
            
        return price * self.quantity


class Order(TimeStampedModel):
    ORDER_STATUS_CHOICES = [
        ('pending', _('Pending Payment')),
        ('processing', _('Processing')),
        ('shipped', _('Shipped')),
        ('delivered', _('Delivered')),
        ('cancelled', _('Cancelled')),
        ('refunded', _('Refunded')),
    ]
    PAYMENT_STATUS_CHOICES = [
        ('pending', _('Pending')),
        ('paid', _('Paid')),
        ('failed', _('Failed')),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, related_name='orders', on_delete=models.PROTECT)
    
    # Snapshot of address at time of order (In production, maybe copy fields to JSON or dedicated text fields)
    shipping_address = models.ForeignKey(Address, related_name='shipping_orders', on_delete=models.PROTECT)
    billing_address = models.ForeignKey(Address, related_name='billing_orders', on_delete=models.PROTECT, null=True)
    
    # Financials
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    coupon = models.ForeignKey(Coupon, null=True, blank=True, on_delete=models.SET_NULL)
    
    # Status
    # Default orders should start in 'processing' (not 'pending')
    order_status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='processing')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=50, default='CARD') # UPI, CARD, COD
    payment_id = models.CharField(max_length=100, blank=True, help_text="Stripe/Razorpay Payment Intent ID")
    
    # Razorpay Integration Fields
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True, help_text="Razorpay Order ID")
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True, help_text="Razorpay Payment ID")
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True, help_text="Razorpay Payment Signature")
    
    tracking_number = models.CharField(max_length=100, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp when order was marked as delivered")
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order {self.id}"

    def save(self, *args, **kwargs):
        """Override save to set delivered_at when order is marked as delivered"""
        # Check if order_status is changing to 'delivered'
        if self.order_status == 'delivered' and not self.delivered_at:
            self.delivered_at = timezone.now()
        super().save(*args, **kwargs)

    def can_request_return(self):
        """
        Check if return requests are allowed for this order.
        Returns are allowed for 70 seconds after delivery (for debugging).
        """
        from datetime import timedelta
        if self.order_status != 'delivered':
            return False
        
        if not self.delivered_at:
            return False
        
        # Allow returns within 70 seconds of delivery
        return timezone.now() <= self.delivered_at + timedelta(seconds=70)

class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    # Size snapshot
    selected_size = models.CharField(max_length=50, blank=True, help_text="Size selected at purchase")
    # Variant product snapshot
    variant_product = models.ForeignKey(Product, null=True, blank=True, related_name='order_items_as_variant',
                                       on_delete=models.SET_NULL, help_text="Variant product used")
    # Keep old variant for backward compatibility
    variant = models.ForeignKey(ProductVariant, null=True, blank=True, on_delete=models.SET_NULL)
    
    # Data Snapshot (Critical for history)
    product_name = models.CharField(max_length=255)
    variant_name = models.CharField(max_length=255, blank=True)
    price_at_purchase = models.DecimalField(max_digits=10, decimal_places=2)
    tax_at_purchase = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    quantity = models.PositiveIntegerField(default=1)

    def save(self, *args, **kwargs):
        # Auto-fill snapshot data if missing
        if not self.product_name:
            product_to_use = self.variant_product if self.variant_product else self.product
            self.product_name = product_to_use.title
        if not self.price_at_purchase:
            product_to_use = self.variant_product if self.variant_product else self.product
            base = product_to_use.final_price
            # Backward compatibility
            if self.variant:
                base += self.variant.price_adjustment
                self.variant_name = f"{self.variant.size} {self.variant.color}"
            elif self.selected_size:
                self.variant_name = f"Size: {self.selected_size}"
            self.price_at_purchase = base
        super().save(*args, **kwargs)

    @property
    def total(self):
        return self.price_at_purchase * self.quantity

    def __str__(self):
        return f"{self.quantity} x {self.product_name}"


# -----------------------------------------------------------------------------
# 5. USER INTERACTION
# -----------------------------------------------------------------------------

class Review(TimeStampedModel):
    product = models.ForeignKey(Product, related_name='reviews', on_delete=models.CASCADE)
    user = models.ForeignKey(User, related_name='reviews', on_delete=models.CASCADE)
    order_item = models.ForeignKey(OrderItem, related_name='reviews', on_delete=models.CASCADE, null=True, blank=True, help_text="The order item being reviewed")
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    title = models.CharField(max_length=100)
    comment = models.TextField()
    
    is_verified_purchase = models.BooleanField(default=False)
    helpful_votes = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['product', 'user']),
            models.Index(fields=['order_item']),
        ]

    def __str__(self):
        return f"{self.rating}* - {self.title}"


class Wishlist(models.Model):
    user = models.ForeignKey(User, related_name='wishlist', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'product')


class ReturnRequest(TimeStampedModel):
    STATUS_CHOICES = [
        ('requested', 'Requested'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey('Order', related_name='return_requests', on_delete=models.CASCADE)
    order_item = models.ForeignKey(OrderItem, related_name='return_requests', on_delete=models.CASCADE, null=True, blank=True, help_text="Specific item being returned")
    user = models.ForeignKey(User, related_name='return_requests', on_delete=models.CASCADE)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='requested')
    admin_notes = models.TextField(blank=True, help_text="Notes from admin on return request")

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['order', 'status']),
            models.Index(fields=['user', 'status']),
        ]

    def __str__(self):
        return f"ReturnRequest {self.id} for Order {self.order.id}"