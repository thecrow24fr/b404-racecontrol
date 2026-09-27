import json
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from live_timing import (
    LiveTimingService,
    SourceConfig,
    build_source_configs,
    render_live_timing,
)


ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "fixtures"


def load_fixture(name):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


class FakeHttpServer:
    """Local-only synthetic rFactor 2 HTTP server used by this test suite."""

    def __init__(self):
        self.responses = {}
        self.requests = []
        self._httpd = None
        self._thread = None

    def __enter__(self):
        owner = self

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):  # noqa: N802 - BaseHTTPRequestHandler API
                owner.requests.append({"method": "GET", "path": urlparse(self.path).path})
                response = owner.responses.get(urlparse(self.path).path)
                if response is None:
                    status, payload = 404, {"error": "synthetic route not configured"}
                else:
                    status, payload = response
                body = json.dumps(payload).encode("utf-8")
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *_args):
                return

        self._httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self._thread = threading.Thread(target=self._httpd.serve_forever, daemon=True)
        self._thread.start()
        self.base_url = f"http://127.0.0.1:{self._httpd.server_port}"
        return self

    def __exit__(self, *_exc):
        self._httpd.shutdown()
        self._httpd.server_close()
        self._thread.join(timeout=2)

    def set_source(self, source_id, fixture):
        self.responses[f"/{source_id}/rest/watch/sessionInfo"] = (200, fixture["sessionInfo"])
        self.responses[f"/{source_id}/rest/watch/standings"] = (200, fixture["standings"])

    def set_error(self, source_id, status=503):
        self.responses[f"/{source_id}/rest/watch/sessionInfo"] = (
            status,
            {"error": "synthetic outage body must not escape the adapter"},
        )
        self.responses.pop(f"/{source_id}/rest/watch/standings", None)


class FakeClock:
    def __init__(self, value=100.0):
        self.value = value

    def now(self):
        return self.value

    def advance(self, seconds):
        self.value += seconds


class LiveTimingSyntheticTests(unittest.TestCase):
    def setUp(self):
        self.clock = FakeClock()

    def make_service(self, server, stale_after=5.0):
        configs = build_source_configs(server.base_url)
        return LiveTimingService(configs, stale_after=stale_after, clock=self.clock.now)

    def test_selector_lists_each_explicit_vm_and_host_source(self):
        with FakeHttpServer() as server:
            service = self.make_service(server)
            options = service.source_options(selected_source_id="s1_vm")
            ids = [item["source_id"] for item in options]
            self.assertEqual(ids, ["s1_vm", "s1_host", "s2_host", "s8_host"])
            self.assertTrue(options[0]["selected"])
            self.assertFalse(options[1]["selected"])

            html = render_live_timing(service.view("s1_vm"))
            self.assertIn('value="s1_vm" selected', html)
            self.assertIn('value="s1_host"', html)
            self.assertIn('value="s2_host"', html)
            self.assertIn('value="s8_host"', html)

    def test_selecting_source_does_not_discover_or_query_other_sources(self):
        with FakeHttpServer() as server:
            service = self.make_service(server)
            selected = service.view("s2_host")
            self.assertEqual(selected["source_id"], "s2_host")
            self.assertEqual(server.requests, [])

    def test_online_snapshot_contains_requested_session_and_race_data(self):
        with FakeHttpServer() as server:
            server.set_source("s1_vm", load_fixture("s1_vm.json"))
            service = self.make_service(server)
            state = service.refresh("s1_vm")

            self.assertEqual(state["status"], "online")
            self.assertEqual(state["data"]["source_id"], "s1_vm")
            self.assertEqual(state["data"]["session"]["type"], "Practice")
            self.assertEqual(state["data"]["session"]["flag"], "NONE")
            self.assertEqual(state["data"]["session"]["connected_entries"], 2)

            first = state["data"]["drivers"][0]
            self.assertEqual(first["position"], 1)
            self.assertEqual(first["laps_completed"], 12)
            self.assertEqual(first["best_lap_seconds"], 98.321)
            self.assertEqual(first["last_lap_seconds"], 99.104)
            self.assertEqual(first["gap_leader_seconds"], 0.0)
            self.assertEqual(first["gap_next_seconds"], 1.245)
            self.assertEqual(first["pit_state"], "NONE")
            self.assertEqual(first["penalties"], 0)

    def test_session_labels_cover_qualification_and_race(self):
        with FakeHttpServer() as server:
            server.set_source("s1_host", load_fixture("s1_host.json"))
            server.set_source("s8_host", load_fixture("s8_host.json"))
            service = self.make_service(server)
            self.assertEqual(service.refresh("s1_host")["data"]["session"]["type"], "Race")
            self.assertEqual(
                service.refresh("s8_host")["data"]["session"]["type"],
                "Qualification",
            )

    def test_public_contract_excludes_steamid_ip_and_technical_identifiers(self):
        with FakeHttpServer() as server:
            server.set_source("s1_vm", load_fixture("s1_vm.json"))
            state = self.make_service(server).refresh("s1_vm")

            forbidden = {"steamID", "steam_id", "ip", "technicalId", "carId", "vehicleFilename"}

            def walk(value):
                if isinstance(value, dict):
                    for key, child in value.items():
                        self.assertNotIn(key, forbidden)
                        walk(child)
                elif isinstance(value, list):
                    for child in value:
                        walk(child)

            walk(state["data"])
            self.assertNotIn("STEAM_SYNTHETIC", json.dumps(state["data"]))
            self.assertNotIn("192.0.2.10", json.dumps(state["data"]))

    def test_html_escapes_driver_and_vehicle_names(self):
        with FakeHttpServer() as server:
            server.set_source("s1_vm", load_fixture("s1_vm.json"))
            state = self.make_service(server).refresh("s1_vm")
            html = render_live_timing(self.make_service(server).view("s1_vm"))
            # The service used for rendering has no cache; use a state-aware view instead.
            html = render_live_timing(state)
            self.assertNotIn("<script>alert(1)</script>", html)
            self.assertNotIn('<img src=x onerror=alert(2)>', html)
            self.assertIn("&lt;script&gt;alert(1)&lt;/script&gt;", html)
            self.assertIn("&lt;img src=x onerror=alert(2)&gt;", html)

    def test_offline_source_has_no_data_and_no_raw_error_body(self):
        with FakeHttpServer() as server:
            server.set_error("s2_host", status=503)
            state = self.make_service(server).refresh("s2_host")
            self.assertEqual(state["status"], "offline")
            self.assertIsNone(state["data"])
            self.assertEqual(state["error"]["category"], "http_error")
            self.assertNotIn("synthetic outage body", json.dumps(state))

    def test_failed_refresh_with_expired_cache_is_stale(self):
        with FakeHttpServer() as server:
            server.set_source("s8_host", load_fixture("s8_host.json"))
            service = self.make_service(server, stale_after=5.0)
            online = service.refresh("s8_host")
            self.assertEqual(online["status"], "online")
            old_track = online["data"]["session"]["track"]

            self.clock.advance(10.0)
            server.set_error("s8_host", status=503)
            stale = service.refresh("s8_host")
            self.assertEqual(stale["status"], "stale")
            self.assertTrue(stale["data"]["stale"])
            self.assertEqual(stale["data"]["session"]["track"], old_track)
            self.assertGreater(stale["age_seconds"], 5.0)

    def test_caches_are_independent_between_vm_and_host_sources(self):
        with FakeHttpServer() as server:
            server.set_source("s1_vm", load_fixture("s1_vm.json"))
            server.set_source("s1_host", load_fixture("s1_host.json"))
            service = self.make_service(server)
            vm = service.refresh("s1_vm")
            host = service.refresh("s1_host")
            self.assertEqual(vm["status"], "online")
            self.assertEqual(host["status"], "online")
            self.assertNotEqual(
                vm["data"]["session"]["track"], host["data"]["session"]["track"]
            )

            self.clock.advance(10.0)
            server.set_error("s1_vm", status=503)
            vm_after_failure = service.refresh("s1_vm")
            host_without_refresh = service.view("s1_host")
            self.assertEqual(vm_after_failure["status"], "stale")
            self.assertEqual(host_without_refresh["status"], "online")
            self.assertEqual(host_without_refresh["source_id"], "s1_host")
            self.assertEqual(host_without_refresh["data"]["stale"], False)

    def test_only_selected_source_paths_are_requested(self):
        with FakeHttpServer() as server:
            server.set_source("s1_vm", load_fixture("s1_vm.json"))
            service = self.make_service(server)
            service.refresh("s1_vm")
            paths = [request["path"] for request in server.requests]
            self.assertEqual(
                paths,
                ["/s1_vm/rest/watch/sessionInfo", "/s1_vm/rest/watch/standings"],
            )
            self.assertTrue(all("instances" not in path for path in paths))
            self.assertTrue(all(not path.startswith("/s1_host/") for path in paths))
            self.assertTrue(all(request["method"] == "GET" for request in server.requests))

    def test_non_loopback_source_is_rejected_by_isolated_harness(self):
        with self.assertRaises(ValueError):
            SourceConfig(
                source_id="real_host",
                label="must not be used",
                base_url="http://192.168.1.200:5297",
                source_group="host",
            )

    def test_unknown_source_is_rejected_without_network_access(self):
        with FakeHttpServer() as server:
            service = self.make_service(server)
            with self.assertRaises(KeyError):
                service.refresh("s99_host")
            self.assertEqual(server.requests, [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
