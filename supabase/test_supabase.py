import sys
import json

try:
    import requests
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests

SUPABASE_URL = "https://htpjibqladvxvhqixlim.supabase.co"
SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0cGppYnFsYWR2eHZocWl4bGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNTUxMDgsImV4cCI6MjA4NzgzMTEwOH0"
    ".tUCK4CAqM2sp9WYrmEy5dIp2mn-A7ATZyIlazbSeuN4"
)

HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
}

print(f"Testing Supabase connection: {SUPABASE_URL}\n")

# --- Test 1: REST API health ---
print("Test 1: REST API reachability")
try:
    resp = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=HEADERS, timeout=10)
    if resp.status_code in (200, 404):
        print(f"  [OK] REST API responded with HTTP {resp.status_code}")
    else:
        print(f"  [WARN] Unexpected status: {resp.status_code} - {resp.text[:200]}")
except requests.exceptions.RequestException as e:
    print(f"  [FAILED] REST API unreachable: {e}")
    sys.exit(1)

# --- Test 2: Auth health endpoint ---
print("\nTest 2: Auth service health")
try:
    resp = requests.get(f"{SUPABASE_URL}/auth/v1/health", headers=HEADERS, timeout=10)
    if resp.status_code == 200:
        print(f"  [OK] Auth service is healthy: {resp.json()}")
    else:
        print(f"  [WARN] Status {resp.status_code}: {resp.text[:200]}")
except requests.exceptions.RequestException as e:
    print(f"  [FAILED] Auth service error: {e}")

# --- Test 3: PostgREST schema (list tables) ---
print("\nTest 3: PostgREST schema (list tables)")
try:
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/",
        headers={**HEADERS, "Accept": "application/openapi+json"},
        timeout=10,
    )
    if resp.status_code == 200:
        paths = list(resp.json().get("paths", {}).keys())
        if paths:
            print(f"  [OK] Tables/views found: {paths[:10]}")
        else:
            print("  [OK] Schema endpoint reached (no public tables exposed yet).")
    else:
        print(f"  [INFO] Status {resp.status_code}: {resp.text[:200]}")
except Exception as e:
    print(f"  [INFO] Could not parse schema: {e}")

print("\n[DONE] Supabase connection test complete.")
