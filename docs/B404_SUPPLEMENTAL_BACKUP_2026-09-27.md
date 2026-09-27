# B404 supplemental source backup — RaceControl — 2026-09-27

## Branch and base

- Repository: `thecrow24fr/b404-racecontrol`
- Branch: `backup/b404-sources-20260927-racecontrol`
- Base backup commit: `8823d8435e04a654f2b4c4ba59591cee2fd8c142`
- This branch is additive; it does not merge into `main` and does not replace the earlier full-backup branch.

## Sources added

148 source/documentation files, 868,928 bytes before commit:

| Origin | Files | Content |
|---|---:|---|
| `D:\B404\Apps\Proxy-API` | 3 | `proxy.mjs` and its two historical text snapshots; no runtime state |
| `D:\B404\Apps\B404-Timing` | 4 | `config.py`, `main.py`, `storage.py`, `tests/test_timing.py`; `data/timing.db` excluded |
| `D:\B404\Apps\B404-LiveTiming-IsolatedTest` | 3 | implementation, README and test; JSON fixtures excluded as test data/identifiers |
| `D:\B404\Site\b404-racecontrol` | 55 | source files unique to the local copy; generated `out.bak_*`, `.env*`, `next-env.d.ts` and builds excluded |
| `D:\B404\Backups` | 83 | unique historical RaceControl/Live source snapshots; deploy outputs, SSE/build trees and runtime data excluded |

Every file is stored below `backup_sources/<origin>/` with its original relative path. The source-selection JSON with SHA-256 values is retained locally at:

```text
D:\B404\Backups\b404_full_restore_20260927\source_selection_plan_20260927.json
```

## Exclusions

- No database, execution result, server profile, cache, virtual environment, build output, `.env`, key or credential was added.
- B404 Porte Ouverte is outside this branch and was not scanned or copied.
- No BAT in the active project was edited; any archived script copy is byte-for-byte copied under `backup_sources/`.
- Services on `3001`, `5354` and `8000` were not stopped, restarted or modified.

Local-only paths and their SHA-256 inventory are recorded in:

```text
D:\B404\Backups\b404_full_restore_20260927\LOCAL_ONLY_RESTORE_LEDGER_20260927.md
D:\B404\Backups\b404_full_restore_20260927\LOCAL_ONLY_SHA256_20260927.txt
```
