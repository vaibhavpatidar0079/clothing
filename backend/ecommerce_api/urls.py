from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

def api_root(request):
    """Simple root view showing API information"""
    return JsonResponse({
        'message': 'Aura Premium Fashion API',
        'version': '1.0.0',
        'endpoints': {
            'api': '/api/v1/',
            'admin': '/admin/',
            'api_docs': '/api/schema/swagger-ui/',
            'api_redoc': '/api/schema/redoc/',
            'api_schema': '/api/schema/',
        }
    })

urlpatterns = [
    path('', api_root, name='api-root'),
    path('admin/', admin.site.urls),
    path('api/v1/', include('store.urls')), # Versioning is good practice
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Serve static and media files in development
# Always serve media files in development (even if DEBUG is False, we check explicitly)
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
urlpatterns += staticfiles_urlpatterns()
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)