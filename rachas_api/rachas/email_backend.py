import logging

import resend
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail.message import sanitize_address
from resend.http_client_requests import RequestsClient

logger = logging.getLogger(__name__)


class ResendEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        if not settings.RESEND_API_KEY:
            raise ImproperlyConfigured("RESEND_API_KEY is required to send emails with Resend.")

        resend.api_key = settings.RESEND_API_KEY
        resend.default_http_client = RequestsClient(timeout=settings.RESEND_TIMEOUT)
        sent_count = 0

        for message in email_messages:
            try:
                resend.Emails.send(self._build_payload(message))
                sent_count += 1
            except Exception:
                if not self.fail_silently:
                    raise
                logger.exception("Failed to send email with Resend")

        return sent_count

    def _build_payload(self, message):
        from_email = sanitize_address(message.from_email or settings.DEFAULT_FROM_EMAIL, "utf-8")
        payload = {
            "from": from_email,
            "to": self._sanitize_addresses(message.to),
            "subject": message.subject,
        }

        if message.cc:
            payload["cc"] = self._sanitize_addresses(message.cc)
        if message.bcc:
            payload["bcc"] = self._sanitize_addresses(message.bcc)

        html_body = self._get_html_body(message)
        if html_body:
            payload["html"] = html_body
            if message.body:
                payload["text"] = message.body
        else:
            payload["text"] = message.body

        if message.reply_to:
            payload["reply_to"] = self._sanitize_addresses(message.reply_to)

        return payload

    def _sanitize_addresses(self, addresses):
        return [
            sanitize_address(address, "utf-8")
            for address in addresses
        ]

    def _get_html_body(self, message):
        for content, mimetype in getattr(message, "alternatives", []):
            if mimetype == "text/html":
                return content
        return None
