from django.core.management.base import BaseCommand
from store.models import Product, ProductVariant


class Command(BaseCommand):
    help = 'Display all products and their variant relationships'

    def handle(self, *args, **options):
        products = Product.objects.all()
        
        self.stdout.write("=== ALL PRODUCTS ===")
        for p in products:
            self.stdout.write(f"ID: {p.id}, Title: {p.title}")
        
        self.stdout.write("\n=== ALL VARIANTS ===")
        variants = ProductVariant.objects.all()
        for v in variants:
            self.stdout.write(
                f"ID: {v.id}, Product: {v.product.title} -> Variant: {v.variant_product.title if v.variant_product else 'None'}"
            )
        
        self.stdout.write("\n=== ANALYZING RELATIONSHIPS ===")
        for p in products:
            # Direct variants (this product as main)
            direct = ProductVariant.objects.filter(product=p, variant_product__isnull=False)
            # Indirect variants (this product as variant_product)
            indirect = ProductVariant.objects.filter(variant_product=p)
            
            if direct.exists() or indirect.exists():
                self.stdout.write(f"\nProduct: {p.title} (ID: {p.id})")
                if direct.exists():
                    self.stdout.write(f"  Direct variants (as main product):")
                    for v in direct:
                        self.stdout.write(f"    - {v.variant_product.title}")
                if indirect.exists():
                    self.stdout.write(f"  Indirect variants (this product is a variant of):")
                    for v in indirect:
                        self.stdout.write(f"    - Parent: {v.product.title}")
