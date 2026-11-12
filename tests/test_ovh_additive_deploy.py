import base64
import hashlib
import os
import stat
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.deploy_ovh_additive import (  # noqa: E402
    DeploymentProgress,
    check_remote_target,
    format_failure,
    upload_static_tree,
    validate_remote_root,
    verify_host_fingerprint,
)


class FakeSFTP:
    def __init__(self, root):
        self.dirs = {root, root + "/api"}
        self.files = {
            root + "/index.html": b"existing-index",
            root + "/api/contact.php": b"preserve-api",
            root + "/email.php": b"preserve-email",
            root + "/config.php": b"preserve-config",
            root + "/legacy/index.html": b"keep-legacy",
        }
        self.uploaded = []
        self.operations = []

    def stat(self, path):
        self.operations.append(("stat", path))
        if path in self.dirs:
            return SimpleNamespace(st_mode=stat.S_IFDIR | 0o755)
        if path in self.files:
            return SimpleNamespace(st_mode=stat.S_IFREG | 0o644, st_size=len(self.files[path]))
        raise FileNotFoundError(path)

    def mkdir(self, path):
        self.operations.append(("mkdir", path))
        parent = path.rsplit("/", 1)[0]
        if parent not in self.dirs:
            raise FileNotFoundError(parent)
        self.dirs.add(path)

    def put(self, local_path, remote_path, confirm=True):
        self.operations.append(("put", remote_path))
        payload = Path(local_path).read_bytes()
        self.files[remote_path] = payload
        self.uploaded.append(remote_path)
        return SimpleNamespace(st_size=len(payload))


class FingerprintKey:
    def asbytes(self):
        return b"non-secret-test-host-key"


class AdditiveDeployTests(unittest.TestCase):
    def test_read_only_remote_check_never_creates_or_uploads_files(self):
        remote_root = "/home/bldcffr/racecontrol"
        sftp = FakeSFTP(remote_root)

        self.assertEqual(check_remote_target(sftp, remote_root), remote_root)

        self.assertEqual(sftp.uploaded, [])
        self.assertFalse(any(operation in {"put", "mkdir"} for operation, _ in sftp.operations))

    def test_failure_summary_reports_phase_progress_without_exception_text(self):
        progress = DeploymentProgress(
            stage="file_transfer",
            completed_files=2,
            current_file="_next/static/chunks/app.js",
            transfer_started=True,
        )

        summary = format_failure(RuntimeError("OVH_PASSWORD=do-not-log"), progress)

        self.assertIn("stage=file_transfer", summary)
        self.assertIn("completed_files=2", summary)
        self.assertIn("current_file=_next/static/chunks/app.js", summary)
        self.assertIn("partial_current_file=possible", summary)
        self.assertNotIn("do-not-log", summary)
        self.assertNotIn("OVH_PASSWORD", summary)

    def test_failed_file_transfer_reports_completed_and_possibly_partial_file(self):
        remote_root = "/home/bldcffr/racecontrol"
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp)
            (source / "a.txt").write_text("first", encoding="utf-8")
            (source / "b.txt").write_text("second", encoding="utf-8")
            (source / "index.html").write_text("new-index", encoding="utf-8")
            sftp = FakeSFTP(remote_root)
            original_put = sftp.put

            def fail_on_second_file(local_path, remote_path, confirm=True):
                if remote_path.endswith("/b.txt"):
                    raise RuntimeError("sensitive transport detail")
                return original_put(local_path, remote_path, confirm=confirm)

            sftp.put = fail_on_second_file
            progress = DeploymentProgress()

            with self.assertRaises(RuntimeError):
                upload_static_tree(sftp, source, remote_root, progress=progress)

        self.assertEqual(progress.stage, "file_transfer")
        self.assertEqual(progress.completed_files, 1)
        self.assertEqual(progress.current_file, "b.txt")
        self.assertTrue(progress.transfer_started)
        self.assertEqual(sftp.files[remote_root + "/a.txt"], b"first")

    def test_uploads_static_files_without_touching_protected_or_unrelated_remote_files(self):
        remote_root = "/home/bldcffr/racecontrol"
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp)
            (source / "index.html").write_text("new-index", encoding="utf-8")
            (source / "contact").mkdir()
            (source / "contact/index.html").write_text("new-contact", encoding="utf-8")
            (source / "api").mkdir()
            (source / "api/health.html").write_text("must-not-upload", encoding="utf-8")
            (source / "api-diag").mkdir()
            (source / "api-diag/index.html").write_text("static-route", encoding="utf-8")
            (source / "email.php").write_text("must-not-upload", encoding="utf-8")
            (source / "config.php").write_text("must-not-upload", encoding="utf-8")

            sftp = FakeSFTP(remote_root)
            protected_before = {p: sftp.files[p] for p in [
                remote_root + "/api/contact.php",
                remote_root + "/email.php",
                remote_root + "/config.php",
                remote_root + "/legacy/index.html",
            ]}

            upload_static_tree(sftp, source, remote_root)

        self.assertEqual(set(sftp.uploaded), {
            remote_root + "/index.html",
            remote_root + "/contact/index.html",
            remote_root + "/api-diag/index.html",
        })
        self.assertEqual({p: sftp.files[p] for p in protected_before}, protected_before)
        self.assertEqual(sftp.files[remote_root + "/index.html"], b"new-index")

    def test_upload_refuses_a_directory_without_the_expected_api_subdirectory(self):
        remote_root = "/home/bldcffr/racecontrol"
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp)
            (source / "index.html").write_text("new-index", encoding="utf-8")
            sftp = FakeSFTP(remote_root)
            sftp.dirs.remove(remote_root + "/api")

            with self.assertRaises(FileNotFoundError):
                upload_static_tree(sftp, source, remote_root)
            self.assertEqual(sftp.uploaded, [])

    def test_remote_root_must_be_absolute_and_cannot_escape(self):
        self.assertEqual(validate_remote_root("/home/bldcffr/racecontrol/"), "/home/bldcffr/racecontrol")
        for unsafe in ("", "relative/path", "/home/../etc", "/home/x/../../etc"):
            with self.subTest(unsafe=unsafe), self.assertRaises(ValueError):
                validate_remote_root(unsafe)

    def test_host_fingerprint_is_pinned_and_mismatch_fails_closed(self):
        key = FingerprintKey()
        digest = base64.b64encode(hashlib.sha256(key.asbytes()).digest()).decode().rstrip("=")
        expected = "SHA256:" + digest
        self.assertTrue(verify_host_fingerprint(key, expected))
        self.assertFalse(verify_host_fingerprint(key, "SHA256:wrong"))

    def test_live_entry_scope_uploads_only_home_live_page_and_referenced_assets(self):
        remote_root = "/home/bldcffr/racecontrol"
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp)
            (source / "index.html").write_text(
                '<link rel="stylesheet" href="/_next/static/site.css"><script src="/_next/static/home.js"></script>'
                '<video src="/videos/hero.mp4"></video><a href="/admin/serveurs/">admin</a>',
                encoding="utf-8",
            )
            (source / "live-timing").mkdir()
            (source / "live-timing/index.html").write_text(
                '<link rel="stylesheet" href="/_next/static/site.css"><script src="/_next/static/live.js"></script>'
                '<a href="/">Accueil</a>',
                encoding="utf-8",
            )
            (source / "__next._tree.txt").write_text(
                '"/_next/static/root-rsc.js"', encoding="utf-8"
            )
            (source / "live-timing/__next._tree.txt").write_text(
                '"/_next/static/live-rsc.js"', encoding="utf-8"
            )
            (source / "live-timing/__next.live-timing").mkdir(parents=True)
            (source / "live-timing/__next.live-timing/__PAGE__.txt").write_text(
                '"/_next/static/live-page.js"', encoding="utf-8"
            )
            (source / "admin/serveurs").mkdir(parents=True)
            (source / "admin/serveurs/index.html").write_text("must-not-upload", encoding="utf-8")
            (source / "admin/serveurs/__next._tree.txt").write_text(
                '"/_next/static/admin-rsc.js"', encoding="utf-8"
            )
            (source / "test-api").mkdir()
            (source / "test-api/index.html").write_text("must-not-upload", encoding="utf-8")
            (source / "api").mkdir()
            (source / "api/health.html").write_text("must-not-upload", encoding="utf-8")
            (source / "videos").mkdir()
            (source / "videos/hero.mp4").write_bytes(b"video")
            (source / "_next/static").mkdir(parents=True)
            (source / "_next/static/site.css").write_text(
                'body{background:url("/_next/static/font.woff2")}', encoding="utf-8"
            )
            (source / "_next/static/home.js").write_text("home", encoding="utf-8")
            (source / "_next/static/live.js").write_text("live", encoding="utf-8")
            (source / "_next/static/root-rsc.js").write_text("root-rsc", encoding="utf-8")
            (source / "_next/static/live-rsc.js").write_text("live-rsc", encoding="utf-8")
            (source / "_next/static/live-page.js").write_text("live-page", encoding="utf-8")
            (source / "_next/static/admin-rsc.js").write_text("admin-rsc", encoding="utf-8")
            (source / "_next/static/font.woff2").write_bytes(b"font")
            (source / "_next/static/admin.js").write_text("admin", encoding="utf-8")

            sftp = FakeSFTP(remote_root)
            upload_static_tree(sftp, source, remote_root, live_entry_only=True)

        uploaded = {path.removeprefix(remote_root + "/") for path in sftp.uploaded}
        self.assertEqual(uploaded, {
            "index.html",
            "live-timing/index.html",
            "__next._tree.txt",
            "live-timing/__next._tree.txt",
            "live-timing/__next.live-timing/__PAGE__.txt",
            "videos/hero.mp4",
            "_next/static/site.css",
            "_next/static/home.js",
            "_next/static/live.js",
            "_next/static/root-rsc.js",
            "_next/static/live-rsc.js",
            "_next/static/live-page.js",
            "_next/static/font.woff2",
        })
        self.assertNotIn("admin/serveurs/index.html", uploaded)
        self.assertNotIn("test-api/index.html", uploaded)
        self.assertFalse(any(path.startswith("api/") for path in uploaded))

    def test_live_entry_scope_requires_both_public_entry_pages_before_upload(self):
        remote_root = "/home/bldcffr/racecontrol"
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp)
            (source / "index.html").write_text("home", encoding="utf-8")
            sftp = FakeSFTP(remote_root)

            with self.assertRaises(FileNotFoundError):
                upload_static_tree(sftp, source, remote_root, live_entry_only=True)

        self.assertEqual(sftp.uploaded, [])


if __name__ == "__main__":
    unittest.main()
