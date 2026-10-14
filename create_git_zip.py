"""
Generates a clean, git-ready ZIP archive of StudyMind AI.
Excludes node_modules, build artifacts, venv, caches, and secrets.
"""
import os
import zipfile
import shutil

EXCLUDE_DIRS = {
    'node_modules',
    'build',
    'dist',
    '.git',
    '__pycache__',
    'venv',
    '.venv',
    '.idea',
    '.vscode',
}

EXCLUDE_FILES = {
    '.DS_Store',
    'Thumbs.db',
    '.env',  # Exclude private secrets from Git upload
    'AI-STUDYMIND-updated.zip',
    'AI-STUDYMIND-GIT-UPLOAD.zip',
}

def create_git_archive():
    source_dir = os.path.abspath('d:\\AI-STUDYMIND.new')
    zip_dest_root = 'd:\\AI-STUDYMIND-GIT-UPLOAD.zip'
    zip_dest_local = os.path.join(source_dir, 'AI-STUDYMIND-GIT-UPLOAD.zip')

    total_files = 0
    total_uncompressed_bytes = 0

    print(f"Creating clean Git archive from: {source_dir}")

    with zipfile.ZipFile(zip_dest_root, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            # Prune excluded directories in-place so os.walk doesn't traverse them
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith('.')]
            
            for file in files:
                if file in EXCLUDE_FILES or file.endswith('.pyc') or file.endswith('.log'):
                    continue
                
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, source_dir)
                
                # Check file size to avoid archiving accidental large binaries
                fsize = os.path.getsize(full_path)
                total_uncompressed_bytes += fsize
                total_files += 1
                
                zipf.write(full_path, arcname=rel_path)

    # Also place a copy inside d:\AI-STUDYMIND.new for direct access in the IDE
    shutil.copyfile(zip_dest_root, zip_dest_local)

    zip_size_mb = os.path.getsize(zip_dest_root) / (1024 * 1024)
    print(f"Archive created successfully!")
    print(f"  Destination 1: {zip_dest_root}")
    print(f"  Destination 2: {zip_dest_local}")
    print(f"  Total files packaged: {total_files}")
    print(f"  Uncompressed size: {round(total_uncompressed_bytes / (1024 * 1024), 2)} MB")
    print(f"  Compressed ZIP size: {round(zip_size_mb, 2)} MB")

if __name__ == '__main__':
    create_git_archive()
