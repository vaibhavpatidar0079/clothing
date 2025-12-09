# Generated migration for Razorpay integration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0010_category_show_on_home_product_show_on_home'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='razorpay_order_id',
            field=models.CharField(blank=True, help_text='Razorpay Order ID', max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='razorpay_payment_id',
            field=models.CharField(blank=True, help_text='Razorpay Payment ID', max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='order',
            name='razorpay_signature',
            field=models.CharField(blank=True, help_text='Razorpay Payment Signature', max_length=255, null=True),
        ),
    ]
