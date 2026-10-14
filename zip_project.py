import os
import zipfile

def zipdir(path, ziph):
    for root, dirs, files in os.walk(path):
        if 'node_modules' in root or '.git' in root or '__pycache__' in root or '.venv' in root or 'build' in root:
            continue
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, os.path.dirname(path))
            ziph.write(file_path, arcname)

if __name__ == '__main__':
    zip_path = 'd:\\AI-STUDYMIND-updated.zip'
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        zipdir('d:\\AI-STUDYMIND.new', zipf)
    print("Project zipped successfully to", zip_path)
