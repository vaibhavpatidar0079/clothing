import resend
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# Configure Resend with the API key from settings
resend.api_key = settings.RESEND_API_KEY

def send_otp_email(to_email, otp_code):
    """
    Sends an OTP code to the specified email using Resend.
    """
    try:
        # Check if API key is configured
        if not settings.RESEND_API_KEY:
            logger.warning("RESEND_API_KEY not configured. Printing OTP to console.")
            print(f"--- OTP for {to_email}: {otp_code} ---")
            return {"id": "mock-id", "success": True}

        params = {
            "from": "Aura Fashion <onboarding@resend.dev>",  # Use onboarding domain if not verified
            "to": [to_email],
            "subject": "Reset Your Password - Aura Fashion",
            "html": f"""
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Password Reset Request</h2>
                    <p>You requested a password reset for your Aura Fashion account.</p>
                    <p>Your One-Time Password (OTP) is:</p>
                    <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #000;">{otp_code}</span>
                    </div>
                    <p>This code is valid for <strong>10 minutes</strong>.</p>
                    <p style="color: #666; font-size: 14px;">If you did not request this reset, please ignore this email.</p>
                </div>
            """
        }

        email = resend.Emails.send(params)
        logger.info(f"OTP email sent to {to_email}: {email}")
        return email

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        # In development, print to console as fallback
        if settings.DEBUG:
            print(f"--- FAILED TO SEND EMAIL. OTP for {to_email}: {otp_code} ---")
        return None