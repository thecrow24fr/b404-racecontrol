from __future__ import annotations

import base64
import hashlib
import hmac
import os
import posixpath
import re
import stat
import sys
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
from typing import Iterable
from urllib.parse import unquote, urlsplit


PROTECTED_ROOT_NAMES = {"email.php", "config.php"}
LIVE_ENTRY_PAGES = (PurePosixPath("index.html"), PurePosixPath("live-timing/index.html"))
LIVE_TIMING_PAGE = PurePosixPath("live-timing/index.html")
CSS_URL_RE = re.compile(r"url\(\s*['\"]?([^'\")\s]+)")
STATIC_RSC_ASSET_RE = re.compile(r"(/_next/static/[^\"'\s<>]+)")


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


class _HtmlResourceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.references: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {name.lower(): value for name, value in attrs if value is not None}
        if tag == "script" and values.get("src"):
            self.references.append(values["src"])
        elif tag in {"img", "video", "source", "audio", "track", "iframe"}:
            self.references.extend(values[name] for name in ("src", "poster") if values.get(name))
        elif tag == "link":
            rel = set(values.get("rel", "").lower().split())
            if rel.intersection({"stylesheet", "icon", "preload", "modulepreload"}) and values.get("href"):
                self.references.append(values["href"])
        style = values.get("style")
        if style:
            self.references.extend(CSS_URL_RE.findall(style))


def _path_from_resource_url(value: str) -> PurePosixPath | None:
    parsed = urlsplit(value.strip())
    if parsed.scheme or parsed.netloc or not parsed.path.startswith("/"):
        return None
    decoded = unquote(parsed.path)
    if decoded in {"/", "/live-timing", "/live-timing/", "/live-timing/index.html"}:
        return None
    relative = PurePosixPath(decoded.lstrip("/"))
    if not relative.parts or any(part in {".", ".."} for part in relative.parts):
        raise ValueError(f"unsafe static asset reference: {value}")
    if relative.parts[0] == "api" or relative.suffix.lower() == ".html":
        return None
    return relative


def _live_entry_files(source_root: Path) -> set[PurePosixPath]:
    """Return only the home/Live Timing pages and their directly referenced assets."""
    root = source_root.resolve(strict=True)
    if not root.is_dir():
        raise ValueError("static export directory is missing")

    files: set[PurePosixPath] = set(LIVE_ENTRY_PAGES)
    pending = list(LIVE_ENTRY_PAGES)
    for page in LIVE_ENTRY_PAGES:
        if not (root / Path(*page.parts)).is_file():
            raise FileNotFoundError(root / Path(*page.parts))

    # Static App Router exports store client-navigation payloads alongside the
    # two HTML entry routes. Include only those route-local RSC files.
    rsc_files = [*root.glob("__next.*.txt")]
    if (root / "index.txt").is_file():
        rsc_files.append(root / "index.txt")
    live_route = root / "live-timing"
    if live_route.is_dir():
        rsc_files.extend(live_route.rglob("*.txt"))
    for path in rsc_files:
        if path.is_symlink():
            raise ValueError(f"symlinks are not allowed in static export: {path}")
        relative = PurePosixPath(path.relative_to(root).as_posix())
        files.add(relative)
        pending.append(relative)

    while pending:
        relative = pending.pop()
        path = root / Path(*relative.parts)
        if path.is_symlink():
            raise ValueError(f"symlinks are not allowed in static export: {relative}")
        content = path.read_text(encoding="utf-8", errors="replace")
        if relative.suffix.lower() == ".html":
            parser = _HtmlResourceParser()
            parser.feed(content)
            references = parser.references
        elif relative.suffix.lower() == ".css":
            references = CSS_URL_RE.findall(content)
        elif relative.suffix.lower() == ".txt":
            references = STATIC_RSC_ASSET_RE.findall(content)
        else:
            continue

        for reference in references:
            asset = _path_from_resource_url(reference)
            if asset is None or asset in files:
                continue
            asset_path = root / Path(*asset.parts)
            if not asset_path.is_file():
                raise FileNotFoundError(f"referenced asset is missing: {asset}")
            if asset_path.is_symlink():
                raise ValueError(f"symlinks are not allowed in static export: {asset}")
            files.add(asset)
            if asset.suffix.lower() == ".css":
                pending.append(asset)

    return files


def _live_timing_files(source_root: Path) -> set[PurePosixPath]:
    """Return only /live-timing/ and its route-local RSC/static dependencies."""
    root = source_root.resolve(strict=True)
    if not root.is_dir():
        raise ValueError("static export directory is missing")

    page_path = root / Path(*LIVE_TIMING_PAGE.parts)
    if not page_path.is_file():
        raise FileNotFoundError(page_path)

    files: set[PurePosixPath] = {LIVE_TIMING_PAGE}
    pending: list[PurePosixPath] = [LIVE_TIMING_PAGE]
    route_dir = root / "live-timing"
    for path in route_dir.rglob("*.txt"):
        if path.is_symlink():
            raise ValueError(f"symlinks are not allowed in static export: {path}")
        relative = PurePosixPath(path.relative_to(root).as_posix())
        files.add(relative)
        pending.append(relative)

    # Car thumbnails are selected from live API data after hydration, so they
    # are not necessarily present in the server-rendered HTML. Include only
    # this app's car-image directory in the route-scoped export.
    cars_dir = root / "cars"
    if cars_dir.is_dir():
        for path in cars_dir.rglob("*"):
            if not path.is_file():
                continue
            if path.is_symlink():
                raise ValueError(f"symlinks are not allowed in static export: {path}")
            files.add(PurePosixPath(path.relative_to(root).as_posix()))

    while pending:
        relative = pending.pop()
        path = root / Path(*relative.parts)
        if path.is_symlink():
            raise ValueError(f"symlinks are not allowed in static export: {relative}")
        content = path.read_text(encoding="utf-8", errors="replace")
        if relative.suffix.lower() == ".html":
            parser = _HtmlResourceParser()
            parser.feed(content)
            references = parser.references
        elif relative.suffix.lower() == ".css":
            references = CSS_URL_RE.findall(content)
        elif relative.suffix.lower() == ".txt":
            references = STATIC_RSC_ASSET_RE.findall(content)
        else:
            continue

        for reference in references:
            asset = _path_from_resource_url(reference)
            # The site-wide favicon is already served by the existing docroot;
            # never replace it as part of a single-route release.
            if asset is None or asset in files or asset == PurePosixPath("favicon.ico"):
                continue
            asset_path = root / Path(*asset.parts)
            if not asset_path.is_file():
                raise FileNotFoundError(f"referenced asset is missing: {asset}")
            if asset_path.is_symlink():
                raise ValueError(f"symlinks are not allowed in static export: {asset}")
            files.add(asset)
            if asset.suffix.lower() == ".css":
                pending.append(asset)

    return files


def _local_files(
    source_root: Path,
    *,
    live_entry_only: bool = False,
    live_timing_only: bool = False,
) -> Iterable[tuple[Path, PurePosixPath]]:
    root = source_root.resolve(strict=True)
    if not root.is_dir():
        raise ValueError("static export directory is missing")
    if live_entry_only and live_timing_only:
        raise ValueError("select only one deployment scope")
    if live_timing_only:
        selected = _live_timing_files(root)
    elif live_entry_only:
        selected = _live_entry_files(root)
    else:
        selected = None
    candidates = (
        (root / Path(*relative.parts) for relative in sorted(selected))
        if selected is not None
        else root.rglob("*")
    )
    for path in candidates:
        relative = PurePosixPath(path.relative_to(root).as_posix())
        if path.is_symlink():
            raise ValueError(f"symlinks are not allowed in static export: {relative}")
        if path.is_file():
            if relative.parts and relative.parts[0] == "api":
                continue
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
    *,
    live_entry_only: bool = False,
    live_timing_only: bool = False,
) -> int:
    # Validate and resolve the complete upload list before touching the remote root.
    local_files = list(
        _local_files(
            Path(source_root),
            live_entry_only=live_entry_only,
            live_timing_only=live_timing_only,
        )
    )
    if progress is not None:
        progress.stage = "remote_root_validation"
    target_root = verify_remote_root(sftp, remote_root)

    uploaded = 0
    for local_path, relative in local_files:
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
    *,
    preflight_only: bool = False,
    progress: DeploymentProgress | None = None,
    live_entry_only: bool = False,
    live_timing_only: bool = False,
    source_root: str | Path | None = None,
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
    if source_root is None:
        resolved_source_root = Path(__file__).resolve().parents[1] / "out"
    else:
        supplied_source_root = Path(source_root)
        if not supplied_source_root.is_absolute():
            supplied_source_root = Path(__file__).resolve().parents[1] / supplied_source_root
        resolved_source_root = supplied_source_root
    resolved_source_root = resolved_source_root.resolve(strict=True)
    if not resolved_source_root.is_dir():
        raise ValueError("static export directory is missing")
    if not live_timing_only and not (resolved_source_root / "index.html").is_file():
        raise ValueError("static export out/index.html is missing")
    if live_entry_only:
        _live_entry_files(resolved_source_root)
    if live_timing_only:
        _live_timing_files(resolved_source_root)

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
                sftp,
                resolved_source_root,
                config["OVH_TARGET_DIR"],
                progress=progress,
                live_entry_only=live_entry_only,
                live_timing_only=live_timing_only,
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
    parser.add_argument(
        "--live-entry-only",
        action="store_true",
        help="upload only the home page, /live-timing/, and resources they reference",
    )
    parser.add_argument(
        "--live-timing-only",
        action="store_true",
        help="upload only /live-timing/ and its route-local RSC/static resources; do not upload home",
    )
    parser.add_argument(
        "--source-root",
        help="static export root (absolute or relative to the repository root; defaults to out/)",
    )
    args = parser.parse_args(argv)
    if args.live_entry_only and args.live_timing_only:
        parser.error("choose only one of --live-entry-only or --live-timing-only")
    progress = DeploymentProgress()
    try:
        count = deploy_from_environment(
            preflight_only=args.preflight_only,
            progress=progress,
            live_entry_only=args.live_entry_only,
            live_timing_only=args.live_timing_only,
            source_root=args.source_root,
        )
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
