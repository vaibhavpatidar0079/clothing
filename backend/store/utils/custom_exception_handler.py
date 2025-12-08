"""
Custom exception handler for DRF API.
Provides consistent error response format across the API.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns consistent error responses.
    
    Args:
        exc: The exception that was raised
        context: Dictionary containing any additional context
    
    Returns:
        Response object with standardized error format
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # If response is None, it means DRF doesn't handle this exception
    # We'll create a generic error response
    if response is None:
        # Log the exception for debugging
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        
        # Return a generic 500 error
        return Response(
            {
                'error': 'An unexpected error occurred',
                'detail': str(exc) if str(exc) else 'Internal server error'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Customize the response data structure
    custom_response_data = {
        'error': True,
        'message': 'An error occurred',
        'detail': response.data
    }
    
    # If it's a validation error, format it nicely
    if isinstance(response.data, dict):
        # Check for common error patterns
        if 'detail' in response.data:
            custom_response_data['message'] = response.data['detail']
            custom_response_data['detail'] = None
        elif 'non_field_errors' in response.data:
            custom_response_data['message'] = response.data['non_field_errors'][0] if response.data['non_field_errors'] else 'Validation error'
            custom_response_data['detail'] = response.data
        else:
            # Multiple field errors
            custom_response_data['message'] = 'Validation error'
            custom_response_data['detail'] = response.data
    
    response.data = custom_response_data
    
    return response
