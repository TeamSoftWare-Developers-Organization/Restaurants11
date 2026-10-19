import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
API_DIR = ROOT_DIR / "restaurantsApi"
TARGET_PKG = API_DIR / "restaurant_management_system"

if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

# Extend package __path__ so that Python can find settings, urls, etc. inside restaurantsApi/restaurant_management_system
__path__.append(str(TARGET_PKG))
