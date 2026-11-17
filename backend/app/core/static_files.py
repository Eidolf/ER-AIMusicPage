from pathlib import Path


def resolve_static_file(static_root: Path, requested_path: str) -> Path | None:
    resolved_root = static_root.resolve()
    candidate = (resolved_root / requested_path).resolve()
    if candidate.is_relative_to(resolved_root) and candidate.is_file():
        return candidate
    return None
