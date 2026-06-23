"""
deploy_rules.py
Deploy Firestore Security Rules to Firebase via REST API.

Usage:
  python deploy_rules.py --token YOUR_OAUTH_TOKEN

Or set GOOGLE_OAUTH_TOKEN env variable and run without --token.
"""
import sys
import json
import argparse
import urllib.request
import urllib.error

PROJECT_ID = "sutsmartbus-495306"
DATABASE_ID = "ai-studio-28114784-a066-482c-9738-dfb6c9d68ce0"
RULES_FILE = "firestore.rules"
BASE_URL = "https://firebaserules.googleapis.com/v1"


def read_rules():
    with open(RULES_FILE, "r", encoding="utf-8") as f:
        return f.read()


def make_request(url, method, payload, token):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"[HTTP ERROR {e.code}] {e.reason}")
        print(body)
        sys.exit(1)


def deploy(token):
    rules_source = read_rules()
    print(f"[1/3] Creating ruleset for project '{PROJECT_ID}'...")

    ruleset_payload = {
        "source": {
            "files": [{"name": "firestore.rules", "content": rules_source}]
        }
    }
    create_url = f"{BASE_URL}/projects/{PROJECT_ID}/rulesets"
    result = make_request(create_url, "POST", ruleset_payload, token)
    ruleset_name = result.get("name")
    print(f"      Ruleset created: {ruleset_name}")

    print(f"[2/3] Releasing ruleset to database '{DATABASE_ID}'...")
    release_name = f"projects/{PROJECT_ID}/releases/cloud.firestore/{DATABASE_ID}"
    release_payload = {
        "name": release_name,
        "rulesetName": ruleset_name,
    }
    release_url = f"{BASE_URL}/projects/{PROJECT_ID}/releases"
    
    # Try PATCH first (update existing release), then POST (create new)
    try:
        rel_result = make_request(
            f"{release_url}/{urllib.parse.quote(release_name, safe='')}",
            "PATCH",
            release_payload,
            token,
        )
    except SystemExit:
        # Release doesn't exist yet, create it
        import urllib.parse
        rel_result = make_request(release_url, "POST", release_payload, token)

    print(f"      Release name: {rel_result.get('name')}")
    print(f"[3/3] Deployed! Rules are now live on Firebase.")


if __name__ == "__main__":
    import os
    import urllib.parse

    parser = argparse.ArgumentParser(description="Deploy Firestore Security Rules via REST API")
    parser.add_argument("--token", default=os.environ.get("GOOGLE_OAUTH_TOKEN", ""), help="OAuth 2.0 Bearer token")
    args = parser.parse_args()

    if not args.token:
        print("ERROR: Provide --token YOUR_OAUTH_TOKEN or set GOOGLE_OAUTH_TOKEN env variable.")
        print()
        print("  To get a token:")
        print("  1. Open Google Cloud Shell: https://shell.cloud.google.com")
        print("  2. Run: gcloud auth print-access-token")
        print("  3. Copy the output token and pass it here.")
        sys.exit(1)

    deploy(args.token)
