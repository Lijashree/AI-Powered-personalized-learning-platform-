"""
Automated Test Suite for StudyMind AI.
Tests backend startup, database connectivity, authentication, module endpoints, and data isolation.
Run via: python backend/test_suite.py
"""
import sys
import os
import asyncio
import time
import httpx

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, backend_dir)

from app.main import app
from app.database import get_db, safe_object_id

PASS = "[PASS]"
FAIL = "[FAIL]"

test_results = []

def record(test_name: str, passed: bool, message: str = ""):
    status = PASS if passed else FAIL
    test_results.append((test_name, passed, message))
    print(f"{status} {test_name}: {message}", flush=True)


async def run_all_tests():
    print("=" * 70, flush=True)
    print("STUDYMIND AI - COMPREHENSIVE AUTOMATED VERIFICATION SUITE", flush=True)
    print("=" * 70, flush=True)

    # Use unique test email per run to avoid collision
    unique_suffix = int(time.time())
    test_email = f"qa_student_{unique_suffix}@example.com"
    test_password = "SecurePassword123!"
    test_name = "QA Verification Student"

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health & Server Endpoints
        try:
            res = await client.get("/api/")
            assert res.status_code == 200, f"Status: {res.status_code}"
            assert res.json().get("version") == "1.0.0"
            record("API Root Endpoint (/api/)", True, "Returns status 200 and version 1.0.0")
        except Exception as e:
            record("API Root Endpoint (/api/)", False, str(e))

        try:
            res = await client.get("/api/health")
            assert res.status_code == 200, f"Status: {res.status_code}"
            assert res.json().get("status") == "ok"
            record("Server Health Endpoint (/api/health)", True, "Reports healthy status")
        except Exception as e:
            record("Server Health Endpoint (/api/health)", False, str(e))

        try:
            res = await client.get("/api/health/db")
            assert res.status_code == 200, f"Status: {res.status_code}"
            data = res.json()
            assert data.get("connected") is True, f"DB not connected: {data}"
            record("Database Health Endpoint (/api/health/db)", True, f"Connected to {data.get('mode')} (DB: {data.get('database')})")
        except Exception as e:
            record("Database Health Endpoint (/api/health/db)", False, str(e))

        try:
            res = await client.get("/api/topics")
            assert res.status_code == 200
            topics = res.json()
            assert isinstance(topics, list) and len(topics) >= 5
            record("Topics Endpoint (/api/topics)", True, f"Returns {len(topics)} academic topics")
        except Exception as e:
            record("Topics Endpoint (/api/topics)", False, str(e))

        # 2. Authentication: Signup Flow
        token = None
        user_id = None
        try:
            res = await client.post("/api/auth/signup", json={
                "name": test_name,
                "email": test_email,
                "password": test_password
            })
            assert res.status_code == 200, f"Status {res.status_code}: {res.text}"
            body = res.json()
            assert "token" in body and body["token"], "Missing token"
            assert "user" in body, "Missing user object"
            assert body["user"]["email"] == test_email.lower()
            token = body["token"]
            user_id = body["user"]["id"]
            record("User Registration / Signup (/api/auth/signup)", True, f"Successfully created user {user_id}")
        except Exception as e:
            record("User Registration / Signup (/api/auth/signup)", False, str(e))

        # 3. Verify Database Persistence & Password Hashing
        try:
            db = get_db()
            db_user = await db.users.find_one({"email": test_email.lower()})
            assert db_user is not None, "User not found in MongoDB"
            assert db_user["password_hash"] != test_password, "Password stored as plaintext!"
            assert db_user["password_hash"].startswith("$2b$") or db_user["password_hash"].startswith("$2a$"), "Password hash not bcrypt format"
            record("Database Record Verification & Password Hashing", True, "User stored in MongoDB with secure bcrypt hash")
        except Exception as e:
            record("Database Record Verification & Password Hashing", False, str(e))

        # 4. Duplicate Registration Rejection
        try:
            res = await client.post("/api/auth/signup", json={
                "name": "Duplicate Tester",
                "email": test_email.upper(),  # test case-insensitive duplicate check
                "password": "AnotherPassword123"
            })
            assert res.status_code == 409, f"Expected 409, got {res.status_code}"
            record("Duplicate Email Registration Rejection", True, "Duplicate signup safely rejected with HTTP 409")
        except Exception as e:
            record("Duplicate Email Registration Rejection", False, str(e))

        # 5. Login Flow with Valid Credentials
        try:
            res = await client.post("/api/auth/login", json={
                "email": test_email,
                "password": test_password
            })
            assert res.status_code == 200, f"Status: {res.status_code}"
            login_data = res.json()
            assert "token" in login_data and login_data["token"]
            assert login_data["user"]["email"] == test_email.lower()
            token = login_data["token"] # Refresh token
            record("User Login with Valid Credentials (/api/auth/login)", True, "Login returns HTTP 200 with JWT token")
        except Exception as e:
            record("User Login with Valid Credentials (/api/auth/login)", False, str(e))

        # 6. Login Rejection with Invalid Credentials
        try:
            res = await client.post("/api/auth/login", json={
                "email": test_email,
                "password": "WrongPassword999!"
            })
            assert res.status_code == 401, f"Expected 401, got {res.status_code}"
            record("Invalid Password Login Rejection", True, "Rejected with HTTP 401 Unauthorized")
        except Exception as e:
            record("Invalid Password Login Rejection", False, str(e))

        try:
            res = await client.post("/api/auth/login", json={
                "email": "nonexistent_student_9999@example.com",
                "password": "AnyPassword123!"
            })
            assert res.status_code == 401, f"Expected 401, got {res.status_code}"
            record("Non-existent User Login Rejection", True, "Rejected with HTTP 401 Unauthorized")
        except Exception as e:
            record("Non-existent User Login Rejection", False, str(e))

        # 7. Authenticated User Profile (/api/auth/me)
        auth_headers = {"Authorization": f"Bearer {token}"} if token else {}
        try:
            res = await client.get("/api/auth/me", headers=auth_headers)
            assert res.status_code == 200, f"Status {res.status_code}: {res.text}"
            profile = res.json()
            assert profile["email"] == test_email.lower()
            record("Protected Route (/api/auth/me) with Token", True, f"Returns profile for {profile['name']}")
        except Exception as e:
            record("Protected Route (/api/auth/me) with Token", False, str(e))

        # 8. Unauthenticated Access Rejection
        try:
            res = await client.get("/api/auth/me")
            assert res.status_code == 401, f"Expected 401, got {res.status_code}"
            record("Unauthenticated Request Rejection", True, "Rejected with HTTP 401 Not authenticated")
        except Exception as e:
            record("Unauthenticated Request Rejection", False, str(e))

        try:
            res = await client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.jwt.token"})
            assert res.status_code == 401, f"Expected 401, got {res.status_code}"
            record("Invalid Token Rejection", True, "Rejected with HTTP 401 Invalid token")
        except Exception as e:
            record("Invalid Token Rejection", False, str(e))

        # 9. Dashboard Stats
        try:
            res = await client.get("/api/dashboard/stats", headers=auth_headers)
            assert res.status_code == 200, f"Status: {res.status_code}"
            stats = res.json()
            assert "streak" in stats and "completed_topics_count" in stats
            record("Dashboard Stats Endpoint (/api/dashboard/stats)", True, f"Streak: {stats['streak']}, Topics: {stats['completed_topics_count']}")
        except Exception as e:
            record("Dashboard Stats Endpoint (/api/dashboard/stats)", False, str(e))

        # 10. Planner Goals (CRUD)
        goal_id = None
        try:
            res = await client.post("/api/planner/goals", headers=auth_headers, json={
                "title": "Master Binary Search Trees",
                "description": "Solve 5 medium LeetCode problems"
            })
            assert res.status_code == 200, f"Status: {res.status_code}"
            goal = res.json()
            assert "id" in goal
            goal_id = goal["id"]

            res_list = await client.get("/api/planner/goals", headers=auth_headers)
            assert res_list.status_code == 200
            goals = res_list.json()
            assert any(g["id"] == goal_id for g in goals)

            # Toggle completion
            res_toggle = await client.put(f"/api/planner/goals/{goal_id}", headers=auth_headers)
            assert res_toggle.status_code == 200 and res_toggle.json()["is_completed"] is True

            record("Planner Goals CRUD (/api/planner/goals)", True, f"Created, listed, and toggled goal {goal_id}")
        except Exception as e:
            record("Planner Goals CRUD (/api/planner/goals)", False, str(e))

        # 11. Code Runner (/api/coding/run)
        try:
            res = await client.post("/api/coding/run", headers=auth_headers, json={
                "language": "python",
                "code": "print(2 + 2)",
                "stdin": ""
            })
            assert res.status_code == 200, f"Status: {res.status_code}"
            run_data = res.json()
            assert run_data["status"] == "success"
            assert "4" in run_data["output"]

            # Test input() with empty stdin (must not throw EOFError)
            res_input_empty = await client.post("/api/coding/run", headers=auth_headers, json={
                "language": "python",
                "code": "s = input()\nprint('Input received:', repr(s))",
                "stdin": ""
            })
            assert res_input_empty.status_code == 200
            run_empty = res_input_empty.json()
            assert run_empty["status"] == "success", f"Failed with: {run_empty.get('error')}"

            # Test input() with provided stdin
            res_input_val = await client.post("/api/coding/run", headers=auth_headers, json={
                "language": "python",
                "code": "s = input()\nprint('Input received:', s)",
                "stdin": "StudyMind Rocks"
            })
            assert res_input_val.status_code == 200
            run_val = res_input_val.json()
            assert run_val["status"] == "success"
            assert "StudyMind Rocks" in run_val["output"]

            record("Code Execution Engine (/api/coding/run)", True, "Python code executed with math and input() (both empty and populated stdin)")
        except Exception as e:
            record("Code Execution Engine (/api/coding/run)", False, str(e))


        # 12. Code Save (/api/coding/save)
        try:
            res = await client.post("/api/coding/save", headers=auth_headers, json={
                "language": "python",
                "code": "print('hello')",
                "stdin": "",
                "title": "Two Sum Python",
                "topic": "Arrays"
            })
            assert res.status_code == 200
            record("Save Code Endpoint (/api/coding/save)", True, "Saved user code successfully")
        except Exception as e:
            record("Save Code Endpoint (/api/coding/save)", False, str(e))

        # 13. Unified History Archive (/api/history/all)
        try:
            res = await client.get("/api/history/all", headers=auth_headers)
            assert res.status_code == 200, f"Status: {res.status_code}"
            history_items = res.json()
            assert isinstance(history_items, list)
            record("Unified History Archive (/api/history/all)", True, f"Retrieved {len(history_items)} history items")
        except Exception as e:
            record("Unified History Archive (/api/history/all)", False, str(e))

        # 14. Doubt Solver - Pre-Check Topic (/api/doubts/check-topic)
        try:
            res = await client.get("/api/doubts/check-topic?topic=Binary+Search", headers=auth_headers)
            assert res.status_code == 200, f"Status: {res.status_code}"
            check_data = res.json()
            assert "already_studied" in check_data
            record("Doubt Solver Topic Check (/api/doubts/check-topic)", True, f"RAG status returned: already_studied={check_data['already_studied']}")
        except Exception as e:
            record("Doubt Solver Topic Check (/api/doubts/check-topic)", False, str(e))

        # Clean up test user & goal
        try:
            if user_id:
                db = get_db()
                await db.users.delete_one({"_id": safe_object_id(user_id)})
                await db.goals.delete_many({"user_id": user_id})
                await db.saved_codes.delete_many({"user_id": user_id})
        except Exception:
            pass

    print("=" * 70)
    passed_count = sum(1 for _, p, _ in test_results if p)
    total_count = len(test_results)
    print(f"TEST SUMMARY: {passed_count}/{total_count} PASSED")
    print("=" * 70)
    return passed_count == total_count

if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
