from __future__ import annotations

import base64
import hashlib
import hmac
import os
import posixpath
import stat
import sys
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Iterable


PROTECTED_ROOT_NAMES = {"email.php", "config.php"}


@dataclass
class DeploymentProgress:
    stage: str = "configuration"
    completed_files: int = 0
    current_file: str | None = None
    transfer_started: bool = False


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


def check_remote_target(sftp: object, remote_root: str) -> str:
    """Validate the remote target using SFTP stat calls only; never mutate it."""
    return verify_remote_root(sftp, remote_root)


def _ensure_remote_directory(sftp: object, remote_path: str) -> None:
    try:
        attributes = sftp.stat(remote_path)
    except (IOError, OSError):
        sftp.mkdir(remote_path)
        attributes = sftp.stat(remote_path)
    if not stat.S_ISDIR(attributes.st_mode):
        raise NotADirectoryError(remote_path)


def upload_static_tree(
    sftp: object,
    source_root: Path | str,
    remote_root: str,
    progress: DeploymentProgress | None = None,
) -> int:
    if progress is not None:
        progress.stage = "remote_root_validation"
    target_root = verify_remote_root(sftp, remote_root)

    uploaded = 0
    for local_path, relative in _local_files(Path(source_root)):
        if progress is not None:
            progress.stage = "remote_directory_prepare"
            progress.current_file = relative.as_posix()
        remote_parent = target_root
        for part in relative.parts[:-1]:
            remote_parent = posixpath.join(remote_parent, part)
            _ensure_remote_directory(sftp, remote_parent)
        remote_path = posixpath.join(target_root, relative.as_posix())
        if progress is not None:
            progress.stage = "file_transfer"
            progress.transfer_started = True
        sftp.put(str(local_path), remote_path, confirm=True)
        uploaded += 1
        if progress is not None:
            progress.completed_files = uploaded
            progress.current_file = None
            progress.transfer_started = False
    if progress is not None:
        progress.stage = "upload_complete"
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


def deploy_from_environment(
    *, preflight_only: bool = False, progress: DeploymentProgress | None = None
) -> int:
    progress = progress if progress is not None else DeploymentProgress()
    progress.stage = "configuration"
    config = _required_environment()
    progress.stage = "configuration_validation"
    try:
        port = int(config["OVH_PORT"])
    except ValueError as exc:
        raise ValueError("OVH_PORT must be an integer") from exc
    if not 1 <= port <= 65535:
        raise ValueError("OVH_PORT is outside the valid TCP port range")

    progress.stage = "static_export_validation"
    source_root = Path(__file__).resolve().parents[1] / "out"
    if not (source_root / "index.html").is_file():
        raise ValueError("static export out/index.html is missing")

    progress.stage = "paramiko_import"
    try:
        import paramiko
    except ImportError as exc:
        raise RuntimeError("paramiko is not installed") from exc

    progress.stage = "ssh_connection"
    transport = paramiko.Transport((config["OVH_HOST"], port))
    try:
        progress.stage = "ssh_handshake"
        transport.start_client(timeout=20)
        progress.stage = "host_key_verification"
        server_key = transport.get_remote_server_key()
        if not verify_host_fingerprint(server_key, config["OVH_SSH_HOST_KEY_SHA256"]):
            raise RuntimeError("OVH SSH host-key fingerprint does not match the pinned secret")
        progress.stage = "ssh_authentication"
        transport.auth_password(config["OVH_USERNAME"], config["OVH_PASSWORD"])
        if not transport.is_authenticated():
            raise RuntimeError("OVH SSH authentication failed")
        progress.stage = "sftp_session"
        sftp = paramiko.SFTPClient.from_transport(transport)
        try:
            if preflight_only:
                progress.stage = "remote_root_validation"
                check_remote_target(sftp, config["OVH_TARGET_DIR"])
                progress.stage = "preflight_complete"
                return 0
            return upload_static_tree(
                sftp, source_root, config["OVH_TARGET_DIR"], progress=progress
            )
        finally:
            sftp.close()
    finally:
        transport.close()


def format_failure(exc: Exception, progress: DeploymentProgress) -> str:
    if progress.stage == "host_key_verification" and isinstance(exc, RuntimeError):
        error_code = "host_key_fingerprint_mismatch"
    elif progress.stage == "ssh_authentication" and isinstance(exc, RuntimeError):
        error_code = "ssh_authentication_not_established"
    else:
        error_code = type(exc).__name__.lower()
    current_file = progress.current_file or "none"
    partial = "possible" if progress.transfer_started else "no"
    return (
        "OVH additive operation failed "
        f"stage={progress.stage} error_code={error_code} "
        f"exception_type={type(exc).__name__} "
        f"completed_files={progress.completed_files} "
        f"current_file={current_file} partial_current_file={partial}; "
        "no remote deletion or mirror operation is performed."
    )


def main(argv: list[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Additive RaceControl SFTP publisher")
    parser.add_argument(
        "--preflight-only",
        action="store_true",
        help="connect and validate the remote root without creating or uploading files",
    )
    args = parser.parse_args(argv)
    progress = DeploymentProgress()
    try:
        count = deploy_from_environment(preflight_only=args.preflight_only, progress=progress)
    except Exception as exc:  # Never include exception text or secret-bearing settings in CI logs.
        summary = format_failure(exc, progress)
        print(summary, file=sys.stderr)
        annotation = summary.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
        print(f"::error title=OVH additive operation failed::{annotation}", file=sys.stderr)
        return 1
    if args.preflight_only:
        print("OVH SFTP read-only preflight succeeded; 0 files transferred.")
        return 0
    print(f"Uploaded {count} static files additively; remote files were not deleted or mirrored.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
