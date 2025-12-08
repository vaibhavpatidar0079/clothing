import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator
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
    Uses MPTT for efficient tree traversal.
    """
    name = models.CharField(_("Name"), max_length=100)
    slug = models.SlugField(unique=True)
    parent = TreeForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    image = models.ImageField(upload_to='categories/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
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
    
    # Inventory
    product_type = models.CharField(max_length=20, choices=PRODUCT_TYPES, default='variable')
    inventory_count = models.PositiveIntegerField(default=0, help_text="Only for simple products")
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    
    # Attributes for Filtering
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

    def __str__(self):
        return self.title


class ProductVariant(models.Model):
    """
    Handles Size and Color variations.
    Each variant has its own stock and optional price override.
    """
    product = models.ForeignKey(Product, related_name='variants', on_delete=models.CASCADE)
    sku = models.CharField(max_length=50, unique=True, null=True, blank=True)
    
    size = models.CharField(max_length=50, blank=True)  # S, M, L, XL
    color = models.CharField(max_length=50, blank=True) # Red, Blue
    
    stock_count = models.PositiveIntegerField(default=0)
    price_adjustment = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Add/Subtract from base product price")
    
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('product', 'size', 'color')

    def __str__(self):
        return f"{self.product.title} - {self.size}/{self.color}"


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
    variant = models.ForeignKey(ProductVariant, null=True, blank=True, on_delete=models.SET_NULL)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['added_at']

    @property
    def total_price(self):
        price = self.product.final_price
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
    order_status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='pending')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=50, default='CARD') # UPI, CARD, COD
    payment_id = models.CharField(max_length=100, blank=True, help_text="Stripe/Razorpay Payment Intent ID")
    
    tracking_number = models.CharField(max_length=100, blank=True)
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order {self.id}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
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
            self.product_name = self.product.title
        if not self.price_at_purchase:
            base = self.product.final_price
            if self.variant:
                base += self.variant.price_adjustment
                self.variant_name = f"{self.variant.size} {self.variant.color}"
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
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    title = models.CharField(max_length=100)
    comment = models.TextField()
    
    is_verified_purchase = models.BooleanField(default=False)
    helpful_votes = models.PositiveIntegerField(default=0)
    
    class Meta:
        unique_together = ('user', 'product')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.rating}* - {self.title}"


class Wishlist(models.Model):
    user = models.ForeignKey(User, related_name='wishlist', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'product')