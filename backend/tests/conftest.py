import sys
import os

_backend_dir = os.path.join(os.path.dirname(__file__), "..")
_repo_root = os.path.join(_backend_dir, "..")

# Add the backend directory so absolute imports like `import models` work
sys.path.insert(0, os.path.abspath(_backend_dir))
# Add the repo root so `from backend.models import ...` works in tests
sys.path.insert(0, os.path.abspath(_repo_root))
