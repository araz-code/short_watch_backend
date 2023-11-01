from django.contrib.admin.apps import AdminConfig


class DashboardAdminConfig(AdminConfig):
    default_site = 'dashboard.admin.DashboardAdminSite'
