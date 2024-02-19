from request_logging.models import RequestLog


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')

    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    elif request.META.get('HTTP_X_REAL_IP'):
        ip = request.META.get('HTTP_X_REAL_IP')
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            if request.path.startswith('/admin/') or request.path.startswith('/stats/') \
                    and not request.path.startswith('/stats/clicked'):
                response = self.get_response(request)
                return response
            client_ip = get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', "")[:255]
            referer = request.META.get('HTTP_REFERER', '')[:255]
            requested_url = request.build_absolute_uri()

            RequestLog.objects.create(client_ip=client_ip, user_agent=user_agent,
                                      requested_url=requested_url, referer=referer)

            response = self.get_response(request)
            return response
        except Exception:
            response = self.get_response(request)
            return response

