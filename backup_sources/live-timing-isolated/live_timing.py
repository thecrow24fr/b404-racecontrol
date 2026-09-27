"""Synthetic-only Live Timing contract used by the isolated test harness.

This module is deliberately not connected to any B404 application.  Its source
configuration accepts loopback URLs only, so the test suite cannot accidentally
probe the VM, the physical host, or a public endpoint.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from html import escape
import json
from time import time
from typing import Any, Callable, Mapping
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


_ALLOWED_HOSTS = {"127.0.0.1", "localhost", "::1"}
_SOURCE_DEFINITIONS = (
    ("s1_vm", "S1 — VM — B404 Porte Ouverte", "vm"),
    ("s1_host", "S1 — PC hôte", "host"),
    ("s2_host", "S2 — PC hôte", "host"),
    ("s8_host", "S8 — PC hôte", "host"),
)


class AdapterError(RuntimeError):
    """Sanitized read-only source failure; raw HTTP bodies are never retained."""

    def __init__(self, category: str, status: int | None = None):
        self.category = category
        self.status = status
        message = category if status is None else f"{category}:{status}"
        super().__init__(message)

    def public(self) -> dict[str, Any]:
        result: dict[str, Any] = {"category": self.category}
        if self.status is not None:
            result["status"] = self.status
        return result


@dataclass(frozen=True)
class SourceConfig:
    """One explicit source; only a loopback fake endpoint is valid here."""

    source_id: str
    label: str
    base_url: str
    source_group: str

    def __post_init__(self) -> None:
        parsed = urlparse(self.base_url)
        if parsed.scheme != "http" or parsed.hostname not in _ALLOWED_HOSTS:
            raise ValueError("isolated harness accepts HTTP loopback endpoints only")
        if parsed.port is None:
            raise ValueError("isolated harness requires an explicit port")
        if not self.source_id or "/" in self.source_id:
            raise ValueError("invalid source identifier")

    def url(self, path: str) -> str:
        return f"{self.base_url.rstrip('/')}/{path.lstrip('/')}"


def build_source_configs(fake_server_base_url: str) -> tuple[SourceConfig, ...]:
    """Build the fixed synthetic VM/host source allowlist."""

    return tuple(
        SourceConfig(
            source_id=source_id,
            label=label,
            base_url=f"{fake_server_base_url.rstrip('/')}/{source_id}",
            source_group=source_group,
        )
        for source_id, label, source_group in _SOURCE_DEFINITIONS
    )


def _phase_name(game_phase: Any) -> str:
    return {
        0: "garage",
        1: "formation",
        2: "countdown",
        3: "formation",
        4: "qualifying",
        5: "green",
        6: "checkered",
        7: "finished",
    }.get(game_phase, "unknown")


def _session_type(raw: Any) -> str:
    return {
        "PRACTICE1": "Practice",
        "QUALIFY1": "Qualification",
        "RACE1": "Race",
    }.get(raw, "Unknown")


def _driver_public(row: Mapping[str, Any]) -> dict[str, Any]:
    """Copy only the public display allowlist from one synthetic standings row."""

    return {
        "position": row.get("position"),
        "driver_name": row.get("driverName"),
        "vehicle_name": row.get("vehicleName"),
        "car_number": row.get("carNumber"),
        "laps_completed": row.get("lapsCompleted"),
        "best_lap_seconds": row.get("bestLapTime"),
        "last_lap_seconds": row.get("lastLapTime"),
        "gap_leader_seconds": row.get("timeBehindLeader"),
        "gap_next_seconds": row.get("timeBehindNext"),
        "laps_behind_leader": row.get("lapsBehindLeader"),
        "flag": row.get("flag"),
        "pit_state": row.get("pitState"),
        "pit_stops": row.get("pitstops"),
        "penalties": row.get("penalties"),
        "finish_status": row.get("finishStatus"),
    }


def _normalize(session: Mapping[str, Any], standings: list[Any], source_id: str) -> dict[str, Any]:
    public_drivers = [
        _driver_public(row)
        for row in standings
        if isinstance(row, Mapping)
    ]
    raw_session = session.get("session")
    return {
        "source_id": source_id,
        "stale": False,
        "server_name": session.get("serverName"),
        "session": {
            "track": session.get("trackName"),
            "type": _session_type(raw_session),
            "raw_type": raw_session,
            "phase": _phase_name(session.get("gamePhase")),
            "flag": session.get("yellowFlagState"),
            "connected_entries": session.get("numberOfVehicles"),
            "max_players": session.get("maxPlayers"),
            "maximum_laps": session.get("maximumLaps"),
            "ambient_temp": session.get("ambientTemp"),
            "track_temp": session.get("trackTemp"),
        },
        "drivers": public_drivers,
    }


class SourceAdapter:
    """Read exactly one configured source using two bounded GET requests."""

    def __init__(
        self,
        config: SourceConfig,
        *,
        timeout: float = 1.0,
        opener: Callable[..., Any] = urlopen,
    ) -> None:
        self.config = config
        self.timeout = timeout
        self.opener = opener

    def _get_json(self, path: str) -> Any:
        request = Request(
            self.config.url(path),
            method="GET",
            headers={"Accept": "application/json"},
        )
        try:
            with self.opener(request, timeout=self.timeout) as response:
                status = getattr(response, "status", 200)
                if status >= 400:
                    raise AdapterError("http_error", status)
                body = response.read(256 * 1024)
        except AdapterError:
            raise
        except HTTPError as error:
            # Deliberately do not read error.read(): error bodies stay private.
            raise AdapterError("http_error", error.code) from None
        except (TimeoutError, URLError, OSError):
            raise AdapterError("transport_error") from None
        try:
            return json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise AdapterError("json_error") from None

    def fetch(self) -> dict[str, Any]:
        session = self._get_json("rest/watch/sessionInfo")
        if not isinstance(session, Mapping):
            raise AdapterError("json_error")
        standings = self._get_json("rest/watch/standings")
        if not isinstance(standings, list):
            raise AdapterError("json_error")
        return _normalize(session, standings, self.config.source_id)


class LiveTimingService:
    """Explicit-source service with one independent in-memory cache per source."""

    def __init__(
        self,
        configs: tuple[SourceConfig, ...] | list[SourceConfig],
        *,
        stale_after: float = 10.0,
        clock: Callable[[], float] = time,
    ) -> None:
        self.configs = tuple(configs)
        self._by_id = {config.source_id: config for config in self.configs}
        if len(self._by_id) != len(self.configs):
            raise ValueError("source identifiers must be unique")
        self._adapters = {
            source_id: SourceAdapter(config)
            for source_id, config in self._by_id.items()
        }
        self._cache: dict[str, dict[str, Any]] = {
            source_id: {
                "snapshot": None,
                "last_success_at": None,
                "last_error": None,
                "status": "offline",
            }
            for source_id in self._by_id
        }
        self.stale_after = stale_after
        self.clock = clock

    def _require_source(self, source_id: str) -> SourceConfig:
        try:
            return self._by_id[source_id]
        except KeyError:
            raise KeyError(f"unknown explicit source: {source_id}") from None

    def source_options(self, selected_source_id: str | None = None) -> list[dict[str, Any]]:
        if selected_source_id is not None:
            self._require_source(selected_source_id)
        return [
            {
                "source_id": config.source_id,
                "label": config.label,
                "source_group": config.source_group,
                "selected": config.source_id == selected_source_id,
            }
            for config in self.configs
        ]

    def _state(self, source_id: str, *, status: str | None = None) -> dict[str, Any]:
        self._require_source(source_id)
        record = self._cache[source_id]
        snapshot = deepcopy(record["snapshot"])
        selected_status = status or record["status"]
        result: dict[str, Any] = {
            "source_id": source_id,
            "status": selected_status,
            "data": snapshot,
            "error": deepcopy(record["last_error"]),
            "source_options": self.source_options(source_id),
        }
        if record["last_success_at"] is not None:
            result["last_success_at"] = record["last_success_at"]
            result["age_seconds"] = max(0.0, self.clock() - record["last_success_at"])
        return result

    def refresh(self, source_id: str) -> dict[str, Any]:
        self._require_source(source_id)
        record = self._cache[source_id]
        try:
            snapshot = self._adapters[source_id].fetch()
        except AdapterError as error:
            record["last_error"] = error.public()
            if record["snapshot"] is None:
                record["status"] = "offline"
                return self._state(source_id)
            age = self.clock() - record["last_success_at"]
            record["status"] = "stale" if age > self.stale_after else "stale"
            stale_snapshot = deepcopy(record["snapshot"])
            stale_snapshot["stale"] = True
            result = self._state(source_id, status="stale")
            result["data"] = stale_snapshot
            return result
        record["snapshot"] = snapshot
        record["last_success_at"] = self.clock()
        record["last_error"] = None
        record["status"] = "online"
        return self._state(source_id)

    def view(self, source_id: str) -> dict[str, Any]:
        """Return cached state only; selecting a source never performs network I/O."""

        return self._state(source_id)


def _display(value: Any) -> str:
    if value is None:
        return "—"
    return escape(str(value), quote=True)


def render_live_timing(state: Mapping[str, Any]) -> str:
    """Render a small public view with escaped values and no raw source payload."""

    source_id = state.get("source_id")
    options = state.get("source_options") or [
        {
            "source_id": source_id,
            "label": source_id,
            "selected": True,
        }
    ]
    option_html = []
    for option in options:
        selected = " selected" if option.get("selected") else ""
        option_html.append(
            f'<option value="{_display(option.get("source_id"))}"{selected}>'
            f"{_display(option.get('label'))}</option>"
        )
    html_parts = [
        '<section id="live-timing">',
        '<label for="live-timing-source">Serveur</label>',
        '<select id="live-timing-source" name="source">',
        "".join(option_html),
        "</select>",
        f'<div class="live-status status-{_display(state.get("status"))}">'
        f"{_display(state.get('status'))}</div>",
    ]

    data = state.get("data")
    if not isinstance(data, Mapping):
        html_parts.append('<p class="live-empty">Données indisponibles.</p></section>')
        return "".join(html_parts)

    session = data.get("session") or {}
    html_parts.extend(
        [
            f"<h1>{_display(data.get('server_name'))}</h1>",
            f"<p class=\"session\">{_display(session.get('track'))} — "
            f"{_display(session.get('type'))} — { _display(session.get('flag')) }</p>",
            '<table><thead><tr><th>Pos.</th><th>Pilote</th><th>Voiture</th>'
            "<th>Tours</th><th>Meilleur</th><th>Dernier</th><th>Écart</th>"
            "<th>Stands</th><th>Pénalités</th></tr></thead><tbody>",
        ]
    )
    for driver in data.get("drivers", []):
        html_parts.append(
            "<tr>"
            f"<td>{_display(driver.get('position'))}</td>"
            f"<td>{_display(driver.get('driver_name'))}</td>"
            f"<td>{_display(driver.get('vehicle_name'))}</td>"
            f"<td>{_display(driver.get('laps_completed'))}</td>"
            f"<td>{_display(driver.get('best_lap_seconds'))}</td>"
            f"<td>{_display(driver.get('last_lap_seconds'))}</td>"
            f"<td>{_display(driver.get('gap_leader_seconds'))}</td>"
            f"<td>{_display(driver.get('pit_state'))}</td>"
            f"<td>{_display(driver.get('penalties'))}</td>"
            "</tr>"
        )
    html_parts.append("</tbody></table></section>")
    return "".join(html_parts)
