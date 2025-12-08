from django.core.management.base import BaseCommand
from store.models import ProductVariant


class Command(BaseCommand):
    help = 'Check and display variant relationships'

    def handle(self, *args, **options):
        variants = ProductVariant.objects.all()
        
        for v in variants:
            related_count = v.related_variants.count()
            variant_name = v.variant_product.title if v.variant_product else "None"
            self.stdout.write(
                f'{v.id}: {v.product.title} -> {variant_name}, Related: {related_count}'
            )
        
        self.stdout.write(
            self.style.SUCCESS(f'Total variants: {variants.count()}')
        )
