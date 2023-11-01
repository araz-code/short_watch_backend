import threading
import time


class Cache:
    _instance = None
    cache_data = {}
    lock = threading.Lock()

    CACHE_EXPIRATION = 600  # 10 min

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Cache, cls).__new__(cls)
            cls._start_cache_expiration_thread()
        return cls._instance

    @classmethod
    def _start_cache_expiration_thread(cls):
        cache_expiration_thread = threading.Thread(target=cls._cache_expiration_task)
        cache_expiration_thread.daemon = True
        cache_expiration_thread.start()

    @classmethod
    def _cache_expiration_task(cls):
        while True:
            time.sleep(cls.CACHE_EXPIRATION)
            cls.clear_all()

    def get(self, key):
        with self.lock:
            return self.cache_data.get(key)

    def add(self, key, value):
        with self.lock:
            self.cache_data[key] = value

    def remove(self, key):
        with self.lock:
            if key in self.cache_data:
                del self.cache_data[key]

    def clear_all(self):
        with self.lock:
            self.cache_data = {}
