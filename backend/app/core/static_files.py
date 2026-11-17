import os
from pathlib import Path


def resolve_static_file(static_root: Path, requested_path: str) -> Path | None:
    if "\0" in requested_path:
        return None

    resolved_root = os.path.realpath(static_root)
    candidate = os.path.realpath(os.path.join(resolved_root, requested_path))
    if not candidate.startswith(resolved_root + os.sep):
        return None
    if os.path.isfile(candidate):
        return Path(candidate)
    return None
