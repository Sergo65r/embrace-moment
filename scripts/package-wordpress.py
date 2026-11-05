"""Build installable theme/plugin ZIPs without the database or site secrets."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
dist = root / "dist"
dist.mkdir(exist_ok=True)
packages = [
    ("embrace-theme.zip", "wordpress-theme/embrace", "themes/embrace"),
    ("embrace-tools.zip", "wordpress-plugin/embrace-tools", "plugins/embrace-tools"),
    ("embrace-journal.zip", "wordpress-plugin/embrace-journal", "plugins/embrace-journal"),
]
with ZipFile(dist / "embrace-wp-content.zip", "w", ZIP_DEFLATED) as bundle:
    for filename, source, target in packages:
        folder = root / source
        if not folder.is_dir():
            raise FileNotFoundError(folder)
        with ZipFile(dist / filename, "w", ZIP_DEFLATED) as archive:
            for file in sorted(folder.rglob("*")):
                if not file.is_file():
                    continue
                relative = file.relative_to(folder).as_posix()
                archive.write(file, f"{folder.name}/{relative}")
                bundle.write(file, f"wp-content/{target}/{relative}")
        print(dist / filename)
print(dist / "embrace-wp-content.zip")
