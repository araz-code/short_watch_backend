import threading


class Cache:
    _instance = None
    cache_data = {}
    lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Cache, cls).__new__(cls)
        return cls._instance

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
