"""Compatibility entrypoint for FastAPI backend.

Run with:
    python -m backend.index
"""

import os
import sys
from pathlib import Path

import uvicorn


def main() -> None:
    # Resolve the directory containing index.py (i.e. 'backend')
    backend_dir = Path(__file__).resolve().parent
    parent_dir = backend_dir.parent
    
    # Change working directory to the parent folder so 'backend' is resolvable
    os.chdir(parent_dir)
    if str(parent_dir) not in sys.path:
        sys.path.insert(0, str(parent_dir))

    port = int(os.getenv("PORT", "5000"))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)


if __name__ == "__main__":
    main()
