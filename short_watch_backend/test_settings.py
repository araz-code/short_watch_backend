"""Test-only settings: use SQLite in-memory so tests don't need MySQL CREATE privileges."""
from .settings import *  # noqa: F401,F403

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}


class _DisableMigrations:
    def __contains__(self, item):
        return True

    def __getitem__(self, item):
        return None


# Skip migrations — schema is built directly from models. Avoids data-default
# callables in migrations failing on a fresh DB.
MIGRATION_MODULES = _DisableMigrations()
