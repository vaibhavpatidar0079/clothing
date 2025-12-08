"""
Django settings for ecommerce_api project.

INDUSTRY GRADE SETUP:
- 12-Factor App compliant (Config in Environment)
- Enterprise Logging (JSON Formatting)
- Redis Caching & Throttling
- Security Hardening (HSTS, Secure Cookies)
- Celery Async Task Queue
- DRF Production Tuning
"""

import os
import sys
import logging
from pathlib import Path
from datetime import timedelta
import environ

# -----------------------------------------------------------------------------
# 1. ENVIRONMENT CONFIGURATION
# -----------------------------------------------------------------------------

# Initialize environment variables
env = environ.Env(
    # Set casting, default value
    DEBUG=(bool, True),  # Default to True for development
    SECRET_KEY=(str, 'unsafe-secret-key-change-in-production'),
    ALLOWED_HOSTS=(list, ['localhost', '127.0.0.1']),
    DATABASE_URL=(str, 'sqlite:///db.sqlite3'),
    REDIS_URL=(str, 'redis://localhost:6379/1'),
    CORS_ALLOWED_ORIGINS=(list, ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8000']),
    USE_S3=(bool, False),
    RESEND_API_KEY=(str, ''),
)

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Read .env file if it exists
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# -----------------------------------------------------------------------------
# 2. CORE SECURITY SETTINGS
# -----------------------------------------------------------------------------

SECRET_KEY = env('SECRET_KEY')
DEBUG = env('DEBUG')
ALLOWED_HOSTS = env('ALLOWED_HOSTS')

# Security Middleware Settings (Production Hardening)
if not DEBUG:
    SECURE_SSL_REDIRECT = False
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_HSTS_SECONDS = 0  
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'DENY'

# -----------------------------------------------------------------------------
# 3. APPLICATION DEFINITION
# -----------------------------------------------------------------------------

DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',           # API Framework
    'rest_framework_simplejwt', # JWT Auth
    'rest_framework_simplejwt.token_blacklist', # Token revocation
    'corsheaders',              # CORS handling
    'django_filters',           # Advanced filtering
    'drf_spectacular',          # OpenAPI 3.0 / Swagger
    'mptt',                     # Efficient Hierarchical Categories (Tree Structure)
    'phonenumber_field',        # International phone number validation
]

LOCAL_APPS = [
    'store.apps.StoreConfig',   # Main E-commerce logic
                    # New app for database scripts
    # In a real microservices-lite monorepo, you might split this:
    # 'users',
    # 'catalog',
    # 'orders',
    # 'payments',
    # 'analytics',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware', # Must be before CommonMiddleware
    'whitenoise.middleware.WhiteNoiseMiddleware', # Static file serving
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # Custom Middleware for Request Logging could go here
]

ROOT_URLCONF = 'ecommerce_api.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [], # Add global templates dir if needed
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'ecommerce_api.wsgi.application'

# -----------------------------------------------------------------------------
# 4. DATABASE
# -----------------------------------------------------------------------------

# Using dj-database-url via django-environ for robust DB configuration
DATABASES = {
    'default': env.db('DATABASE_URL')
}
# Optimize connection persistence for high traffic
DATABASES['default']['CONN_MAX_AGE'] = 600

# -----------------------------------------------------------------------------
# 5. CACHING & REDIS
# -----------------------------------------------------------------------------

# Try to use Redis if available, fallback to database cache for development
REDIS_AVAILABLE = False
try:
    import redis
    redis_client = redis.from_url(env('REDIS_URL'))
    redis_client.ping()
    REDIS_AVAILABLE = True
except Exception:
    # Redis not available - will use database fallback
    REDIS_AVAILABLE = False

if REDIS_AVAILABLE:
    # Redis is available - use it for caching and sessions
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': env('REDIS_URL'),
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                # Use compression to save memory on large cached objects (like product lists)
                "COMPRESSOR": "django_redis.compressors.zlib.ZlibCompressor",
            }
        }
    }
    SESSION_ENGINE = "django.contrib.sessions.backends.cache"
    SESSION_CACHE_ALIAS = "default"
else:
    # Redis not available - use database cache and sessions for development
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
            'LOCATION': 'cache_table',
        }
    }
    SESSION_ENGINE = "django.contrib.sessions.backends.db"  # Use database sessions

# -----------------------------------------------------------------------------
# 6. PASSWORD & AUTHENTICATION
# -----------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    { 'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator', },
]

AUTH_USER_MODEL = 'store.User'

# -----------------------------------------------------------------------------
# 7. INTERNATIONALIZATION
# -----------------------------------------------------------------------------

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata' # IST
USE_I18N = True
USE_TZ = True

# -----------------------------------------------------------------------------
# 8. STATIC & MEDIA FILES
# -----------------------------------------------------------------------------

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Resend API Key
RESEND_API_KEY = env('RESEND_API_KEY')

if env('USE_S3'):
    # AWS S3 Settings for Production
    AWS_ACCESS_KEY_ID = env('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = env('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = env('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = env('AWS_S3_REGION_NAME', default='ap-south-1')
    AWS_S3_SIGNATURE_VERSION = 's3v4'
    AWS_S3_FILE_OVERWRITE = False
    AWS_DEFAULT_ACL = None
    AWS_S3_VERIFY = True
    
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

# -----------------------------------------------------------------------------
# 9. REST FRAMEWORK CONFIGURATION (DRF)
# -----------------------------------------------------------------------------

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication', # Keep session for Admin panel
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    
    # Exception Handling
    'EXCEPTION_HANDLER': 'store.utils.custom_exception_handler.custom_exception_handler',
    
    # Throttling (Rate Limiting) - Critical for e-commerce security
    # More lenient for development, can be tightened in production
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '1000/hour',  # Increased for development
        'user': '10000/hour',  # Increased for development
        'burst': '100/min', # Custom scope for high-traffic endpoints
    },
    
    # Filtering
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    
    # Documentation
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# -----------------------------------------------------------------------------
# 10. JWT CONFIGURATION
# -----------------------------------------------------------------------------

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30), # Short lived
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),    # Long lived
    'ROTATE_REFRESH_TOKENS': True,                  # Security best practice
    'BLACKLIST_AFTER_ROTATION': True,               # Prevents reuse of old refresh tokens
    'UPDATE_LAST_LOGIN': True,
    
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# -----------------------------------------------------------------------------
# 11. CORS CONFIGURATION
# -----------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = env('CORS_ALLOWED_ORIGINS')
CORS_ALLOW_CREDENTIALS = True

# -----------------------------------------------------------------------------
# 12. SWAGGER / OPENAPI (Spectacular)
# -----------------------------------------------------------------------------

SPECTACULAR_SETTINGS = {
    'TITLE': 'Aura Premium Fashion API',
    'DESCRIPTION': 'Enterprise-grade API for Aura Clothing Platform',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'persistAuthorization': True,
        'displayOperationId': True,
    },
}

# -----------------------------------------------------------------------------
# 13. LOGGING CONFIGURATION
# -----------------------------------------------------------------------------

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
       # 'json': { 
             # In production, use a JSON formatter library here
           # 'format': '{ "timestamp": "{asctime}", "level": "{levelname}", "message": "{message}" }',
           # 'style': '{',
     #   }
    },
    'handlers': {
        'console': {
            'level': 'DEBUG' if DEBUG else 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple' if DEBUG else 'verbose',
        },
        'file': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'errors.log'),
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'propagate': True,
            'level': 'INFO',
        },
        'store': { # Application specific logger
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': True,
        }
    }
}

# -----------------------------------------------------------------------------
# 14. CELERY CONFIGURATION (Async Tasks)
# -----------------------------------------------------------------------------

CELERY_BROKER_URL = env('REDIS_URL')
CELERY_RESULT_BACKEND = env('REDIS_URL')
CELERY_ACCEPT_CONTENT = ['application/json']
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TASK_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Default Primary Key
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'