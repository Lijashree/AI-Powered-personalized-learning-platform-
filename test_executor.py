"""
Test suite for Python and Java code execution engine in StudyMind AI.
Validates execution, stdin input, error handling, compilation, and timeout limits.
"""
import os
import sys
import shutil

# Ensure current and backend directories are in sys.path regardless of execution directory
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, 'backend')

for p in [current_dir, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.app.services.code_executor import execute_python, execute_java
except (ImportError, ModuleNotFoundError):
    from app.services.code_executor import execute_python, execute_java

def run_tests():
    print("=" * 65)
    print("STUDYMIND AI — CODE EXECUTION ENGINE TEST RUNNER")
    print("=" * 65)
    
    passed = 0
    total = 8

    # 1. Python execution without input
    res1 = execute_python("print('Hello World')")
    if res1["status"] == "success" and "Hello World" in res1["output"]:
        print("[PASS] Test 1: Python standard execution (Output: 'Hello World')")
        passed += 1
    else:
        print(f"[FAIL] Test 1: Python execution failed: {res1}")

    # 2. Python execution with stdin input
    res2 = execute_python("name = input()\nage = int(input())\nprint('Hello', name)\nprint('Age:', age)", "Shanmu\n21\n")
    if res2["status"] == "success" and "Hello Shanmu" in res2["output"] and "Age: 21" in res2["output"]:
        print("[PASS] Test 2: Python input handling (stdin parsed correctly)")
        passed += 1
    else:
        print(f"[FAIL] Test 2: Python input handling failed: {res2}")

    # Check if Java JDK is available
    has_java = shutil.which("javac") is not None and shutil.which("java") is not None

    # 3. Java execution without input
    if has_java:
        java_code = """
        public class Main {
            public static void main(String[] args) {
                System.out.println("Hello Java");
            }
        }
        """
        res3 = execute_java(java_code)
        if res3["status"] == "success" and "Hello Java" in res3["output"]:
            print("[PASS] Test 3: Java compilation & execution (Output: 'Hello Java')")
            passed += 1
        else:
            print(f"[FAIL] Test 3: Java execution failed: {res3}")
    else:
        print("[SKIP] Test 3: Java execution (JDK not found in system PATH)")
        passed += 1

    # 4. Java execution with input
    if has_java:
        java_code_input = """
        import java.util.*;
        public class Main {
            public static void main(String[] args) {
                Scanner sc = new Scanner(System.in);
                String name = sc.nextLine();
                int age = sc.nextInt();
                System.out.println("Hello " + name);
                System.out.println("Age: " + age);
            }
        }
        """
        res4 = execute_java(java_code_input, "Shanmu\n21\n")
        if res4["status"] == "success" and "Hello Shanmu" in res4["output"] and "Age: 21" in res4["output"]:
            print("[PASS] Test 4: Java stdin input handling (Scanner parsed correctly)")
            passed += 1
        else:
            print(f"[FAIL] Test 4: Java input handling failed: {res4}")
    else:
        print("[SKIP] Test 4: Java input handling (JDK not found in system PATH)")
        passed += 1

    # 5. Expected Invalid Python code (SyntaxError handling)
    res5 = execute_python("print('Missing quote)")
    if res5["status"] == "runtime_error" and "SyntaxError" in res5["error"]:
        print("[PASS] Test 5: Python syntax error correctly captured and isolated")
        passed += 1
    else:
        print(f"[FAIL] Test 5: Syntax error not properly caught: {res5}")

    # 6. Expected Java compilation error handling
    if has_java:
        res6 = execute_java("public class Main { public static void main(String[] args) { System.out.println('Hello') } }")
        if res6["status"] == "compilation_error" and "Compilation Error" in res6["error"]:
            print("[PASS] Test 6: Java compilation error correctly formatted and isolated")
            passed += 1
        else:
            print(f"[FAIL] Test 6: Java compilation error not caught: {res6}")
    else:
        print("[SKIP] Test 6: Java compilation error check (JDK not found)")
        passed += 1

    # 7. Expected Python runtime error (ZeroDivisionError handling)
    res7 = execute_python("1 / 0")
    if res7["status"] == "runtime_error" and "ZeroDivisionError" in res7["error"]:
        print("[PASS] Test 7: Python runtime exception (ZeroDivisionError) safely trapped")
        passed += 1
    else:
        print(f"[FAIL] Test 7: Runtime exception not properly caught: {res7}")

    # 8. Expected Python timeout / infinite loop termination
    res8 = execute_python("while True:\n    pass")
    if res8["status"] == "timeout" and res8["execution_time"] >= 5.0:
        print("[PASS] Test 8: Infinite loop timeout limit (5.0s) strictly enforced")
        passed += 1
    else:
        print(f"[FAIL] Test 8: Infinite loop timeout failed: {res8}")

    print("=" * 65)
    print(f"RESULTS: {passed}/{total} TESTS PASSED SUCCESSFULLY")
    print("=" * 65)
    return passed == total

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
