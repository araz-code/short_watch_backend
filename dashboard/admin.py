from django.contrib import admin


class DashboardAdminSite(admin.AdminSite):
    def get_app_list(self, request):
        app_list = super().get_app_list(request)

        return app_list

    def each_context(self, request):
        context = super().each_context(request)
        return context
