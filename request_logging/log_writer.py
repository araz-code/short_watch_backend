"""Async batch writer for RequestLog.

The middleware enqueues lightweight dicts; a daemon thread drains the queue and
flushes them via ``bulk_create`` either every BATCH_SIZE items or FLUSH_INTERVAL
seconds — whichever comes first. Avoids blocking the request thread on a DB
write.

Trade-off: up to FLUSH_INTERVAL seconds of in-memory entries can be lost if the
worker is killed hard. Acceptable for a request log.
"""
import atexit
import queue
import threading
import time

BATCH_SIZE = 50
FLUSH_INTERVAL = 5.0  # seconds
QUEUE_MAX = 10_000  # cap memory if DB hangs

_queue: "queue.Queue[dict]" = queue.Queue(maxsize=QUEUE_MAX)
_started = False
_start_lock = threading.Lock()


def _flush(batch):
    if not batch:
        return
    # Imports kept local so this module is import-safe before Django apps load.
    from request_logging.models import RequestLog
    from errors.models import Error
    try:
        RequestLog.objects.bulk_create(
            [RequestLog(**entry) for entry in batch]
        )
    except Exception as e:  # noqa: BLE001 — best-effort logging, never propagate
        try:
            Error.objects.create(message=f'log_writer flush: {e}'[:500])
        except Exception:
            pass


def _worker():
    batch: list[dict] = []
    deadline = time.monotonic() + FLUSH_INTERVAL
    while True:
        timeout = max(0.0, deadline - time.monotonic())
        try:
            entry = _queue.get(timeout=timeout)
            batch.append(entry)
            if len(batch) >= BATCH_SIZE:
                _flush(batch)
                batch = []
                deadline = time.monotonic() + FLUSH_INTERVAL
        except queue.Empty:
            if batch:
                _flush(batch)
                batch = []
            deadline = time.monotonic() + FLUSH_INTERVAL


def _drain_on_exit():
    remaining: list[dict] = []
    while True:
        try:
            remaining.append(_queue.get_nowait())
        except queue.Empty:
            break
    _flush(remaining)


def _ensure_started():
    global _started
    if _started:
        return
    with _start_lock:
        if _started:
            return
        threading.Thread(target=_worker, daemon=True, name='RequestLogWriter').start()
        atexit.register(_drain_on_exit)
        _started = True


def enqueue(entry: dict) -> None:
    """Non-blocking enqueue. Drops entry if the queue is full."""
    _ensure_started()
    try:
        _queue.put_nowait(entry)
    except queue.Full:
        pass
