from django.utils import timezone

from errors.models import Error
from request_logging.log_writer import enqueue
from short_watch_backend.utils import get_client_ip


class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            if request.path.startswith('/admin/') or (
                request.path.startswith('/stats/')
                and not request.path.startswith('/stats/clicked')
                and not request.path.startswith('/stats/visit/')
            ):
                return self.get_response(request)

            enqueue({
                'timestamp': timezone.now(),
                'client_ip': get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', "")[:255],
                'requested_url': request.build_absolute_uri(),
                'referer': request.META.get('HTTP_REFERER', '')[:255],
            })
            return self.get_response(request)
        except Exception as e:
            try:
                Error.objects.create(message=str(e)[:500])
            except Exception:
                pass
            return self.get_response(request)
