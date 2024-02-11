from datetime import datetime, timedelta


class CacheControlMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path == '/favicon.png':
            return self.get_response(request)

        response = self.get_response(request)
        # response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        # response['Pragma'] = 'no-cache'
        # response['Expires'] = '0'

        response['Cache-Control'] = 'public, max-age=7200'
        response['Expires'] = (datetime.utcnow() + timedelta(seconds=7200)).strftime('%a, %d %b %Y %H:%M:%S GMT')
        return response
