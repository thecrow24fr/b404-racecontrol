from pathlib import Path
import re
import unittest
from urllib.parse import unquote, urlsplit


REPO_ROOT = Path(__file__).resolve().parents[1]
EXPORT_ROOT = REPO_ROOT / "legacy" / "live-timing-49349" / "out"
ROUTE_PAGE = EXPORT_ROOT / "live-timing" / "index.html"
TEXT_SUFFIXES = {".html", ".js", ".txt", ".css"}


def route_export_text() -> str:
    page = ROUTE_PAGE.read_text(encoding="utf-8", errors="ignore")
    files = {ROUTE_PAGE}
    for reference in re.findall(r'''(?:src|href)=["']([^"']+)["']''', page):
        parsed = urlsplit(reference)
        if parsed.scheme or parsed.netloc:
            continue
        relative = unquote(parsed.path).lstrip("/")
        candidate = EXPORT_ROOT / relative
        if candidate.is_file() and candidate.suffix.lower() in TEXT_SUFFIXES:
            files.add(candidate)
    static_dir = EXPORT_ROOT / "_next" / "static"
    if static_dir.is_dir():
        files.update(
            path
            for path in static_dir.rglob("*")
            if path.is_file() and path.suffix.lower() in TEXT_SUFFIXES
        )
    route_dir = EXPORT_ROOT / "live-timing"
    if route_dir.is_dir():
        files.update(path for path in route_dir.rglob("*.txt") if path.is_file())
    return "\n".join(
        path.read_text(encoding="utf-8", errors="ignore") for path in sorted(files)
    )


class LiveTiming49349PublicExportTests(unittest.TestCase):
    def test_export_contains_the_validated_s20_track_map_contract(self):
        self.assertTrue(ROUTE_PAGE.is_file(), "49349 export is missing /live-timing/")
        page = ROUTE_PAGE.read_text(encoding="utf-8", errors="ignore")
        self.assertIn("Live Timing | B404", page)
        text = route_export_text()
        self.assertIn("Positions en piste", text)
        self.assertIn("s20_vm", text)
        self.assertIn("track-geometry", text)
        self.assertTrue((EXPORT_ROOT / "cars" / "david-depoorter-mercedes.png").is_file())

    def test_export_uses_the_public_api_not_the_local_49350_proxy(self):
        self.assertTrue(ROUTE_PAGE.is_file(), "49349 export is missing /live-timing/")
        static_dir = EXPORT_ROOT / "_next" / "static" / "chunks"
        bundles = [
            path.read_text(encoding="utf-8", errors="ignore")
            for path in static_dir.rglob("*.js")
        ]
        self.assertTrue(
            any(
                "api.b404ldc.fr" in bundle
                and "/api/public/live-timing" in bundle
                for bundle in bundles
            ),
            "public Live Timing API host/path must be compiled into the same route bundle",
        )
        text = route_export_text()
        self.assertNotIn("127.0.0.1:49350", text)
        self.assertNotIn("localhost:49350", text)


if __name__ == "__main__":
    unittest.main()
