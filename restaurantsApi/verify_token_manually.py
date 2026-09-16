import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'restaurant_management_system.settings')
django.setup()

from ninja_jwt.tokens import AccessToken
import jwt

# The token from the terminal logs
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzcxOTUwOTc5LCJpYXQiOjE3NzE5NTA2NzksImp0aSI6ImRiZmY1YmVjZTUwZTRjYTg5OGRiYmQxMjRkYWVmMWM4IiwidXNlcl9pZCI6N30.KuHsXmCh7ZDoArSPGoNL20QkOm9hrrFkYAMxaxfLWAw"

print(f"SECRET_KEY being used: {settings.SECRET_KEY}")

try:
    print("\n1. Attempting decode with ninja_jwt.tokens.AccessToken:")
    access = AccessToken(token)
    print(f"✅ Success! Payload: {access.payload}")
except Exception as e:
    print(f"❌ Failed: {type(e).__name__}: {str(e)}")

try:
    print("\n2. Attempting raw decode with pyjwt (HS256):")
    decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    print(f"✅ Success! Raw Payload: {decoded}")
except Exception as e:
    print(f"❌ Failed: {type(e).__name__}: {str(e)}")
