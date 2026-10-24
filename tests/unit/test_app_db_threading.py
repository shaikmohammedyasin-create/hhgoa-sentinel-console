"""
The app database must be usable while a run is writing.

A single module-level SQLite connection was shared by every thread: the
orchestrator wrote from its worker thread while the console polled from others,
raising `sqlite3.InterfaceError: bad parameter or other API misuse` and turning
reads into 500s. Connections are now per-thread.
"""
from __future__ import annotations

import sqlite3
import threading

from backend import db as app_db
from backend.config import settings


def test_concurrent_reader_and_writer_do_not_share_a_connection(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "app_db", tmp_path / "app.db")

    errors: list[BaseException] = []
    stop = threading.Event()

    def writer() -> None:
        try:
            for i in range(60):
                app_db.save_investigation("CASE-900", "running", {"evidence": [{"i": i}]})
        except BaseException as exc:  # noqa: BLE001 - the assertion reports it
            errors.append(exc)

    def reader() -> None:
        try:
            while not stop.is_set():
                app_db.load_investigation("CASE-900")
                app_db.list_investigations()
        except BaseException as exc:  # noqa: BLE001
            errors.append(exc)

    reader_thread = threading.Thread(target=reader)
    writer_thread = threading.Thread(target=writer)
    reader_thread.start()
    writer_thread.start()
    writer_thread.join(timeout=30)
    stop.set()
    reader_thread.join(timeout=30)

    assert not writer_thread.is_alive(), "writer deadlocked"
    assert not errors, f"database misuse under concurrency: {errors[:3]}"


def test_each_thread_gets_its_own_handle(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "app_db", tmp_path / "app.db")
    handles: list[sqlite3.Connection] = []
    lock = threading.Lock()

    def grab() -> None:
        conn = app_db.get_db()
        # Keep the object alive: comparing id() on a collected connection can
        # reuse addresses and make this test flaky.
        with lock:
            handles.append(conn)

    threads = [threading.Thread(target=grab) for _ in range(3)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=10)

    assert len(handles) == 3
    assert len({id(conn) for conn in handles}) == 3
