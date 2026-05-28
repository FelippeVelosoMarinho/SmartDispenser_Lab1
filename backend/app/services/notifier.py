"""Email notifier service utilizing Python smtplib."""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core import config


def send_email_notification(to_email: str, subject: str, html_body: str):
    """
    Synchronously send email notifications via Gmail SMTP.
    This should be run inside a FastAPI BackgroundTasks pool to prevent event loop blocks.
    """
    if not to_email:
        print("⚠️ Notifier: Destinatário de email não informado.")
        return

    if not config.SMTP_PASSWORD:
        print("⚠️ Notifier: Envio de e-mail desativado. APP_PASSWORD_GOOGLE não configurada no .env.")
        return

    print(f"📧 Notifier: Preparando envio de email para {to_email} com assunto: '{subject}'")

    # Setup the MIME message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = config.EMAIL_FROM
    msg["To"] = to_email

    msg.attach(MIMEText(html_body, "html"))

    try:
        # Connect and authenticate
        with smtplib.SMTP(config.SMTP_SERVER, config.SMTP_PORT) as server:
            print(f"🔌 Notifier: Conectando a {config.SMTP_SERVER}:{config.SMTP_PORT}...")
            server.starttls()  # Secure connection via TLS
            server.login(config.SMTP_USER, config.SMTP_PASSWORD)
            server.sendmail(config.EMAIL_FROM, to_email, msg.as_string())
            print(f"✅ Notifier: E-mail enviado com sucesso para {to_email}!")
    except Exception as e:
        print(f"❌ Notifier: Erro ao enviar e-mail para {to_email}: {e}")
