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


if __name__ == "__main__":
    unittest.main()
