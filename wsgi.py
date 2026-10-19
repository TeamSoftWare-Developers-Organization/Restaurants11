import os
import sys
from pathlib import Path

# Add restaurantsApi directory to sys.path
ROOT_DIR = Path(__file__).resolve().parent
API_DIR = ROOT_DIR / "restaurantsApi"

if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'restaurant_management_system.settings')

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
