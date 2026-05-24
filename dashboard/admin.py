from django.contrib import admin
from django.urls import path, reverse


class DashboardAdminSite(admin.AdminSite):
    def get_app_list(self, request, app_label=None):
        app_list = super().get_app_list(request, app_label)
        if not request.user.is_staff:
            return app_list

        # Inject a "Dashboard" section at the top of the sidebar so GA Dashboard
        # (and any future dashboard pages) have a proper home in the nav.
        if app_label is None or app_label == "dashboard":
            try:
                ga_url = reverse("admin:ga_dashboard")
            except Exception:
                ga_url = "#"
            dashboard_section = {
                "name": "Dashboard",
                "app_label": "dashboard",
                "app_url": ga_url,
                "has_module_perms": True,
                "models": [
                    {
                        "name": "GA Dashboard",
                        "object_name": "gadashboard",
                        "admin_url": ga_url,
                        "view_only": True,
                        "perms": {"view": True, "add": False, "change": False, "delete": False},
                    },
                ],
            }
            app_list.insert(0, dashboard_section)
        return app_list

    def each_context(self, request):
        context = super().each_context(request)
        return context

    def get_urls(self):
        from dashboard.views import ga_dashboard
        urls = super().get_urls()
        custom_urls = [
            path('ga-dashboard/', self.admin_view(ga_dashboard), name='ga_dashboard'),
        ]
        return custom_urls + urls
