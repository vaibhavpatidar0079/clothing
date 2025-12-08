from store.models import ProductVariant

variants = ProductVariant.objects.all()
for v in variants:
    related_count = v.related_variants.count()
    print(f'{v.id}: {v.product.title} -> {v.variant_product.title if v.variant_product else "None"}, Related: {related_count}')
