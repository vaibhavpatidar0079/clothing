from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'List all database tables'

    def handle(self, *args, **options):
        cursor = connection.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        
        self.stdout.write("Database tables:")
        for table in tables:
            self.stdout.write(f"  - {table}")
        
        if 'cache_table' in tables:
            self.stdout.write(self.style.SUCCESS("✓ cache_table exists"))
        else:
            self.stdout.write(self.style.ERROR("✗ cache_table MISSING"))
