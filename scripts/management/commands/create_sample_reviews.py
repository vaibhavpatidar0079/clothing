"""
Management command to create sample reviews for existing products.
Saved in the 'scripts' app to keep database logic separate.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from store.models import Product, Review
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Create sample reviews for products'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample reviews...')
        
        # Check if products exist
        products = Product.objects.filter(is_active=True)
        if not products.exists():
            self.stdout.write(self.style.WARNING('No products found. Please run create_sample_data first.'))
            return

        # Ensure we have at least one user to attach reviews to
        user = User.objects.first()
        if not user:
            user = User.objects.create_user(
                username='reviewer',
                email='reviewer@example.com',
                password='password123',
                first_name='Sarah',
                last_name='Jones'
            )
            self.stdout.write(f'Created user: {user.email}')

        # Sample review templates
        reviews_data = [
            {
                'title': 'Absolutely stunning!',
                'comment': 'The fabric quality is exceptional and the fit is perfect. I received so many compliments.',
                'rating': 5,
                'verified': True
            },
            {
                'title': 'Good value for money',
                'comment': 'Nice design, color matches the photos. Delivery was a bit slow though.',
                'rating': 4,
                'verified': True
            },
            {
                'title': 'Elegant and comfortable',
                'comment': 'I wore this to a wedding and it was comfortable throughout the day. Highly recommend!',
                'rating': 5,
                'verified': True
            },
            {
                'title': 'Okay, but size runs small',
                'comment': 'The material is good but I suggest ordering a size up.',
                'rating': 3,
                'verified': False
            }
        ]

        count = 0
        for product in products:
            # Add 2-4 random reviews per product
            num_reviews = random.randint(2, 4)
            selected_reviews = random.sample(reviews_data, num_reviews)
            
            for data in selected_reviews:
                # Check if review already exists to avoid duplicates on re-run
                if not Review.objects.filter(product=product, user=user, title=data['title']).exists():
                    Review.objects.create(
                        product=product,
                        user=user,
                        rating=data['rating'],
                        title=data['title'],
                        comment=data['comment'],
                        is_verified_purchase=data['verified']
                    )
                    count += 1
        
        self.stdout.write(self.style.SUCCESS(f'Successfully created {count} reviews!'))