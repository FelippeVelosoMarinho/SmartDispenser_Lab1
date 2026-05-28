"""Script to test SMTP email connectivity using app configuration."""

import sys
import os

# Adjust Python path to allow app imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core import config
from app.services.notifier import send_email_notification
from app.services.templates import get_welcome_email_template

def main():
    print("🧪 Smart Dispenser - SMTP Connection Test")
    print("-----------------------------------------")
    print(f"SMTP Server: {config.SMTP_SERVER}")
    print(f"SMTP Port:   {config.SMTP_PORT}")
    print(f"Sender User: {config.SMTP_USER}")
    print(f"Password Loaded: {'Yes (Length: ' + str(len(config.SMTP_PASSWORD)) + ')' if config.SMTP_PASSWORD else 'No ❌'}")
    print(f"From Header: {config.EMAIL_FROM}")
    
    if not config.SMTP_PASSWORD:
        print("\n❌ Error: APP_PASSWORD_GOOGLE is not set in backend/.env!")
        sys.exit(1)

    # Get target email
    to_email = input("\nEnter recipient email address for the test: ").strip()
    if not to_email:
        print("❌ Error: Recipient email address cannot be empty.")
        sys.exit(1)

    print(f"\n📧 Generating template and sending email to {to_email}...")
    
    subject = "🧪 Teste de Conectividade SMTP - Smart Dispenser"
    html_body = get_welcome_email_template(
        full_name="Usuário de Teste",
        username="test_user"
    )

    try:
        send_email_notification(
            to_email=to_email,
            subject=subject,
            html_body=html_body
        )
        print("\n🎉 Done! Check the recipient's inbox and spam folder.")
    except Exception as e:
        print(f"\n❌ Execution failed: {e}")

if __name__ == "__main__":
    main()
