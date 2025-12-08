"""
Management command to find and fix orphaned image records.
Orphaned = database record exists but file doesn't exist on disk.
"""
from django.core.management.base import BaseCommand
from django.conf import settings
from pathlib import Path
from store.models import ProductImage, Category

class Command(BaseCommand):
    help = 'Find and optionally fix orphaned image records (database records without actual files)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Delete orphaned records (default: just report)',
        )
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Try to fix by finding similar filenames',
        )

    def handle(self, *args, **options):
        MEDIA_ROOT = Path(settings.MEDIA_ROOT)
        
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS('ORPHANED IMAGE DIAGNOSTIC'))
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(f'\nMEDIA_ROOT: {MEDIA_ROOT}')
        self.stdout.write(f'MEDIA_ROOT exists: {MEDIA_ROOT.exists()}\n')

        # Check ProductImages
        self.stdout.write(self.style.WARNING('PRODUCT IMAGES:'))
        self.stdout.write('-' * 70)
        
        product_images = ProductImage.objects.all()
        orphaned_images = []
        
        for img in product_images:
            if img.image:
                file_path = MEDIA_ROOT / img.image.name
                if not file_path.exists():
                    orphaned_images.append(img)
                    self.stdout.write(
                        self.style.ERROR(f'✗ ID {img.id}: {img.image.name} - MISSING')
                    )
                    self.stdout.write(f'    Product: {img.product.title} (ID: {img.product.id})')
                    self.stdout.write(f'    Expected: {file_path}')
                    
                    # Try to find similar files if --fix
                    if options['fix']:
                        filename = Path(img.image.name).name
                        base_name = filename.split('_')[0] if '_' in filename else filename.split('.')[0]
                        products_dir = MEDIA_ROOT / 'products'
                        if products_dir.exists():
                            similar = list(products_dir.glob(f"{base_name}*"))
                            if similar:
                                self.stdout.write(
                                    self.style.SUCCESS(f'    Found similar: {[f.name for f in similar]}')
                                )
                                # Optionally update the record
                                # img.image.name = f'products/{similar[0].name}'
                                # img.save()
                    self.stdout.write('')

        self.stdout.write(f'\nFound {len(orphaned_images)} orphaned ProductImage records')
        
        # Check Categories
        self.stdout.write(self.style.WARNING('\nCATEGORY IMAGES:'))
        self.stdout.write('-' * 70)
        
        categories = Category.objects.exclude(image='')
        orphaned_categories = []
        
        for cat in categories:
            if cat.image:
                file_path = MEDIA_ROOT / cat.image.name
                if not file_path.exists():
                    orphaned_categories.append(cat)
                    self.stdout.write(
                        self.style.ERROR(f'✗ Category {cat.id} ({cat.name}): {cat.image.name} - MISSING')
                    )

        self.stdout.write(f'\nFound {len(orphaned_categories)} orphaned Category images')

        # Summary
        total_orphaned = len(orphaned_images) + len(orphaned_categories)
        self.stdout.write(self.style.SUCCESS('\n' + '=' * 70))
        self.stdout.write(f'Total orphaned records: {total_orphaned}')
        self.stdout.write(self.style.SUCCESS('=' * 70))

        # Delete if requested
        if options['delete'] and orphaned_images:
            self.stdout.write(self.style.WARNING(f'\nDeleting {len(orphaned_images)} orphaned ProductImage records...'))
            for img in orphaned_images:
                self.stdout.write(f'  Deleting ProductImage {img.id} (Product: {img.product.title})')
            ProductImage.objects.filter(id__in=[img.id for img in orphaned_images]).delete()
            self.stdout.write(self.style.SUCCESS('Done!'))

        if options['delete'] and orphaned_categories:
            self.stdout.write(self.style.WARNING(f'\nClearing image field for {len(orphaned_categories)} categories...'))
            for cat in orphaned_categories:
                cat.image = None
                cat.save()
                self.stdout.write(f'  Cleared image for Category {cat.id} ({cat.name})')
            self.stdout.write(self.style.SUCCESS('Done!'))

        if not options['delete'] and total_orphaned > 0:
            self.stdout.write(self.style.WARNING(
                '\nTo delete orphaned records, run with --delete flag:'
            ))
            self.stdout.write('  python manage.py fix_orphaned_images --delete')
