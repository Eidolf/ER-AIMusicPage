from app.core.static_files import resolve_static_file


def test_resolve_static_file_serves_file_inside_static_root(tmp_path):
    static_root = tmp_path / "static"
    static_root.mkdir()
    asset = static_root / "asset.js"
    asset.write_text("asset")

    assert resolve_static_file(static_root, "asset.js") == asset


def test_resolve_static_file_rejects_paths_outside_static_root(tmp_path):
    static_root = tmp_path / "static"
    static_root.mkdir()
    secret = tmp_path / "secret.txt"
    secret.write_text("secret")
    (static_root / "linked-secret.txt").symlink_to(secret)
    (static_root / "index.html").symlink_to(secret)

    for path in ("../secret.txt", "linked-secret.txt", "index.html", "missing\x00file"):
        assert resolve_static_file(static_root, path) is None
