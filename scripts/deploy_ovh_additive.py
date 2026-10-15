from __future__ import annotations

import base64
import hashlib
import hmac
import os
import posixpath
import stat
import sys
from pathlib import Path, PurePosixPath
from typing import Iterable


PROTECTED_ROOT_NAMES = {"email.php", "config.php"}


def validate_remote_root(value: str) -> str:
    if not isinstance(value, str) or not value.startswith("/"):
        raise ValueError("remote target must be an absolute POSIX path")
    path = PurePosixPath(value)
    if any(part in {"..", "."} for part in path.parts) or str(path) == "/":
        raise ValueError("remote target path is unsafe")
    return str(path)


def verify_host_fingerprint(host_key: object, expected: str) -> bool:
    if not isinstance(expected, str) or not expected.startswith("SHA256:"):
        return False
    try:
        raw = host_key.asbytes()  # Paramiko PKey-compatible interface.
    except (AttributeError, TypeError):
        return False
    digest = base64.b64encode(hashlib.sha256(raw).digest()).decode("ascii").rstrip("=")
    return hmac.compare_digest("SHA256:" + digest, expected.strip())


def _local_files(source_root: Path) -> Iterable[tuple[Path, PurePosixPath]]:
    root = source_root.resolve(strict=True)
    if not root.is_dir():
        raise ValueError("static export directory is missing")
    for path in sorted(root.rglob("*")):
        relative = PurePosixPath(path.relative_to(root).as_posix())
        if relative.parts and relative.parts[0] == "api":
            continue
        if path.is_symlink():
            raise ValueError(f"symlinks are not allowed in static export: {relative}")
        if path.is_file():
            if path.name in PROTECTED_ROOT_NAMES:
                continue
            yield path, relative


def _require_directory(sftp: object, remote_path: str) -> None:
    attributes = sftp.stat(remote_path)
    if not stat.S_ISDIR(attributes.st_mode):
        raise NotADirectoryError(remote_path)


def verify_remote_root(sftp: object, remote_root: str) -> str:
    target_root = validate_remote_root(remote_root)
    _require_directory(sftp, target_root)
    _require_directory(sftp, posixpath.join(target_root, "api"))
    index_attributes = sftp.stat(posixpath.join(target_root, "index.html"))
    if not stat.S_ISREG(index_attributes.st_mode):
        raise FileNotFoundError(posixpath.join(target_root, "index.html"))
    return target_root


def _ensure_remote_directory(sftp: object, remote_path: str) -> None:
    try:
        attributes = sftp.stat(remote_path)
    except (IOError, OSError):
        sftp.mkdir(remote_path)
        attributes = sftp.stat(remote_path)
    if not stat.S_ISDIR(attributes.st_mode):
        raise NotADirectoryError(remote_path)


def upload_static_tree(sftp: object, source_root: Path | str, remote_root: str) -> int:
    target_root = verify_remote_root(sftp, remote_root)

    uploaded = 0
    for local_path, relative in _local_files(Path(source_root)):
        remote_parent = target_root
        for part in relative.parts[:-1]:
            remote_parent = posixpath.join(remote_parent, part)
            _ensure_remote_directory(sftp, remote_parent)
        remote_path = posixpath.join(target_root, relative.as_posix())
        sftp.put(str(local_path), remote_path, confirm=True)
        uploaded += 1
    return uploaded


def _required_environment() -> dict[str, str]:
    names = (
        "OVH_HOST",
        "OVH_PORT",
        "OVH_USERNAME",
        "OVH_PASSWORD",
        "OVH_TARGET_DIR",
        "OVH_SSH_HOST_KEY_SHA256",
    )
    missing = [name for name in names if not os.environ.get(name)]
    if missing:
        raise ValueError("missing required GitHub Actions secrets: " + ", ".join(missing))
    return {name: os.environ[name] for name in names}


def deploy_from_environment() -> int:
    config = _required_environment()
    try:
        port = int(config["OVH_PORT"])
    except ValueError as exc:
        raise ValueError("OVH_PORT must be an integer") from exc
    if not 1 <= port <= 65535:
        raise ValueError("OVH_PORT is outside the valid TCP port range")

    source_root = Path(__file__).resolve().parents[1] / "out"
    if not (source_root / "index.html").is_file():
        raise ValueError("static export out/index.html is missing")

    try:
        import paramiko
    except ImportError as exc:
        raise RuntimeError("paramiko is not installed") from exc

    transport = paramiko.Transport((config["OVH_HOST"], port))
    try:
        transport.start_client(timeout=20)
        server_key = transport.get_remote_server_key()
        if not verify_host_fingerprint(server_key, config["OVH_SSH_HOST_KEY_SHA256"]):
            raise RuntimeError("OVH SSH host-key fingerprint does not match the pinned secret")
        transport.auth_password(config["OVH_USERNAME"], config["OVH_PASSWORD"])
        if not transport.is_authenticated():
            raise RuntimeError("OVH SSH authentication failed")
        sftp = paramiko.SFTPClient.from_transport(transport)
        try:
            return upload_static_tree(sftp, source_root, config["OVH_TARGET_DIR"])
        finally:
            sftp.close()
    finally:
        transport.close()


def main() -> int:
    try:
        count = deploy_from_environment()
    except Exception as exc:  # Keep credential-bearing values out of CI logs.
        print(f"OVH additive upload failed ({type(exc).__name__}); no remote deletion is performed.", file=sys.stderr)
        return 1
    print(f"Uploaded {count} static files additively; remote files were not deleted or mirrored.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
