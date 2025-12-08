from django.core.management.base import BaseCommand
from store.models import ProductVariant, Product


class Command(BaseCommand):
    help = 'Synchronize variant relationships to be bidirectional (all variants relate to each other)'

    def handle(self, *args, **options):
        created_count = 0
        related_count = 0
        
        # Step 1: Create bidirectional variant relationships
        # If Product A is a variant of Product B, create a variant relationship where Product B is a variant of Product A
        variants = ProductVariant.objects.all()
        
        for variant in variants:
            # For each variant where product X has variant_product Y
            # Check if there's already a reverse relationship where Y has X as a variant
            if variant.variant_product:
                reverse_exists = ProductVariant.objects.filter(
                    product=variant.variant_product,
                    variant_product=variant.product
                ).exists()
                
                if not reverse_exists:
                    # Create the reverse relationship
                    ProductVariant.objects.create(
                        product=variant.variant_product,
                        variant_product=variant.product,
                        difference=variant.difference,
                        sort_order=variant.sort_order,
                        is_active=variant.is_active
                    )
                    created_count += 1
                    self.stdout.write(
                        f'Created reverse variant: {variant.variant_product.title} -> {variant.product.title}'
                    )
        
        # Step 2: Synchronize related_variants M2M relationships
        # Get all variants and build relationships between them
        variants = ProductVariant.objects.filter(variant_product__isnull=False)
        
        for variant in variants:
            # Get all variants that should be related to this one
            # These are variants that link the same pair of products (in both directions)
            related_variants = ProductVariant.objects.filter(
                variant_product__isnull=False
            ).exclude(id=variant.id)
            
            # For each potential related variant
            for other in related_variants:
                # Check if they form a bidirectional pair
                # (this variant: A->B and other variant: B->A)
                if (variant.product == other.variant_product and 
                    variant.variant_product == other.product):
                    variant.related_variants.add(other)
                    related_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {created_count} reverse relationships and added {related_count} related variant relationships'
            )
        )



