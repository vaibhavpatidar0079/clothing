"""
Management command to create sample categories and products for testing
"""
from django.core.management.base import BaseCommand
from store.models import Category, Product, Brand, ProductImage
from django.utils.text import slugify


class Command(BaseCommand):
    help = 'Create sample categories and products'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample data...')
        
        # Create sample categories
        categories_data = [
            {'name': 'Sarees', 'description': 'Traditional Indian sarees'},
            {'name': 'Kurtis', 'description': 'Comfortable kurtis for daily wear'},
            {'name': 'Dresses', 'description': 'Western dresses'},
            {'name': 'Lehengas', 'description': 'Traditional lehengas'},
        ]
        
        created_categories = []
        for cat_data in categories_data:
            category, created = Category.objects.get_or_create(
                slug=slugify(cat_data['name']),
                defaults={
                    'name': cat_data['name'],
                    'description': cat_data['description'],
                    'is_active': True,
                    'parent': None  # Top-level categories
                }
            )
            created_categories.append(category)
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Created category: {category.name}'))
            else:
                self.stdout.write(f'  Category already exists: {category.name}')
                # Ensure it's active
                if not category.is_active:
                    category.is_active = True
                    category.save()
                    self.stdout.write(f'  Activated category: {category.name}')
        
        # Create a sample brand
        brand, created = Brand.objects.get_or_create(
            slug='aura-brand',
            defaults={
                'name': 'Aura',
                'description': 'Premium fashion brand'
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Created brand: {brand.name}'))
        
        # Create sample products
        if created_categories:
            sample_products = [
                {
                    'title': 'Silk Embroidered Saree',
                    'category': created_categories[0],  # Sarees
                    'price': 12000,
                    'discount_price': 10500,
                    'description': 'Beautiful silk saree with intricate embroidery work. Perfect for special occasions.',
                    'short_description': 'Premium silk saree',
                },
                {
                    'title': 'Cotton Printed Kurta',
                    'category': created_categories[1],  # Kurtis
                    'price': 2500,
                    'discount_price': 1999,
                    'description': 'Comfortable cotton kurta with modern print design. Ideal for daily wear.',
                    'short_description': 'Casual cotton kurta',
                },
                {
                    'title': 'Floral Summer Dress',
                    'category': created_categories[2],  # Dresses
                    'price': 3500,
                    'discount_price': 2999,
                    'description': 'Elegant floral summer dress perfect for casual outings.',
                    'short_description': 'Summer floral dress',
                },
            ]
            
            for prod_data in sample_products:
                product, created = Product.objects.get_or_create(
                    sku=f"SKU-{slugify(prod_data['title'])}",
                    defaults={
                        'title': prod_data['title'],
                        'slug': slugify(prod_data['title']),
                        'category': prod_data['category'],
                        'brand': brand,
                        'price': prod_data['price'],
                        'discount_price': prod_data['discount_price'],
                        'description': prod_data['description'],
                        'short_description': prod_data['short_description'],
                        'is_active': True,
                        'inventory_count': 10,
                        'product_type': 'simple',
                    }
                )
                if created:
                    self.stdout.write(self.style.SUCCESS(f'✓ Created product: {product.title}'))
                else:
                    self.stdout.write(f'  Product already exists: {product.title}')
                    if not product.is_active:
                        product.is_active = True
                        product.save()
        
        # Summary
        self.stdout.write(self.style.SUCCESS('\n=== SUMMARY ==='))
        self.stdout.write(f'Categories: {Category.objects.filter(is_active=True).count()} active')
        self.stdout.write(f'Products: {Product.objects.filter(is_active=True).count()} active')
        self.stdout.write(f'ProductImages: {ProductImage.objects.count()} total')
        self.stdout.write(self.style.SUCCESS('\nSample data creation completed!'))
