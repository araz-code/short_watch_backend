"""Synchronous ntfy.sh push notifications.

PythonAnywhere constraints rule out daemon threads, so we POST inline from the
view. Failures are swallowed silently because a notification problem must
never break a user-facing form submission.
"""
import logging
from typing import Iterable, Optional

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 5  # seconds


def send_ntfy(
    title: str,
    message: str,
    *,
    tags: Optional[Iterable[str]] = None,
    priority: str = 'default',
    click_url: Optional[str] = None,
) -> bool:
    """Send a push notification via ntfy.

    Returns True on success, False otherwise. Never raises.
    """
    topic = getattr(settings, 'NTFY_TOPIC', '')
    if not topic:
        return False

    url = f"{settings.NTFY_URL.rstrip('/')}/{topic}"
    headers = {
        # Title and Tags need to be latin-1-safe HTTP header values; we encode
        # via the X-Title / X-Tags variants so ntfy treats them as UTF-8.
        'X-Title': title,
        'Priority': priority,
    }
    if tags:
        headers['Tags'] = ','.join(tags)
    if click_url:
        headers['Click'] = click_url

    try:
        resp = requests.post(
            url,
            data=message.encode('utf-8'),
            headers=headers,
            timeout=DEFAULT_TIMEOUT,
        )
        if resp.status_code >= 400:
            logger.warning('ntfy POST failed: status=%s body=%s', resp.status_code, resp.text[:200])
            return False
        return True
    except Exception as exc:
        logger.warning('ntfy POST exception: %s', exc)
        return False
