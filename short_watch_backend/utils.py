def get_client_ip(request):
    """Return the originating client IP, honouring X-Forwarded-For / X-Real-IP."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')

    if x_forwarded_for:
        return x_forwarded_for.split(',')[0]
    if request.META.get('HTTP_X_REAL_IP'):
        return request.META.get('HTTP_X_REAL_IP')
    return request.META.get('REMOTE_ADDR')
