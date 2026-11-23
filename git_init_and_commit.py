import os
import dulwich.porcelain as porcelain
from dulwich.repo import Repo

REPO_PATH = r"C:\Users\USER\.gemini\antigravity\scratch\hospital-classification"

# Init repository if not exists
if not os.path.exists(os.path.join(REPO_PATH, ".git")):
    repo = porcelain.init(REPO_PATH)
    print("Initialized new git repository at:", REPO_PATH)
else:
    repo = Repo(REPO_PATH)
    print("Existing git repository found at:", REPO_PATH)

# Collect all files to add (excluding .venv and __pycache__)
files_to_add = []
for root, dirs, files in os.walk(REPO_PATH):
    # Skip .venv and .git and __pycache__
    dirs[:] = [d for d in dirs if d not in ['.venv', '.git', '__pycache__']]
    for f in files:
        if f.endswith('.pyc'):
            continue
        full_path = os.path.join(root, f)
        rel_path = os.path.relpath(full_path, REPO_PATH).replace('\\', '/')
        files_to_add.append(rel_path)

print(f"Adding {len(files_to_add)} files to git index...")
porcelain.add(REPO_PATH, files_to_add)

# Commit
try:
    commit_sha = porcelain.commit(
        REPO_PATH,
        message=b"Initial commit: Hospital Synthetic Dataset classification pipeline, Vercel web app, and model artifacts",
        author=b"savioursemakor24-hue <savioursemakor24@users.noreply.github.com>",
        committer=b"savioursemakor24-hue <savioursemakor24@users.noreply.github.com>"
    )
    print("Commit created successfully! SHA:", commit_sha.decode('utf-8') if isinstance(commit_sha, bytes) else commit_sha)
except Exception as e:
    print("Commit status/error:", e)

# Ensure refs/heads/main exists
repo = Repo(REPO_PATH)
head_ref = repo.head()
print("Current HEAD commit:", head_ref)
repo.refs[b'refs/heads/main'] = head_ref
repo.refs.set_symbolic_ref(b'HEAD', b'refs/heads/main')
print("Active branch set to 'main'")
