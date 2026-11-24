import sys
import dulwich.porcelain as porcelain
from dulwich.repo import Repo

REPO_PATH = r"C:\Users\USER\.gemini\antigravity\scratch\hospital-classification"
REMOTE_URL = "https://github.com/savioursemakor24-hue/Hospital-synthetic-dataset-repo.git"

token = sys.argv[1] if len(sys.argv) > 1 else None

if token:
    token = token.strip().strip('"').strip("'")
    url = f"https://savioursemakor24-hue:{token}@github.com/savioursemakor24-hue/Hospital-synthetic-dataset-repo.git"
    print("Attempting authenticated push with token to Hospital-synthetic-dataset-repo...")
else:
    url = REMOTE_URL
    print("Attempting push to remote:", url)

try:
    porcelain.push(REPO_PATH, url, b"refs/heads/main")
    print(">>> PUSH_SUCCESSFUL! All commits successfully loaded to https://github.com/savioursemakor24-hue/Hospital-synthetic-dataset-repo")
except Exception as e:
    print(">>> PUSH_FAILED:", type(e).__name__, str(e))
