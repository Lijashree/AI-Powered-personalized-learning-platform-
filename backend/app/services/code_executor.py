import subprocess
import tempfile
import os
import shutil
import time
import sys

def _prepare_stdin(input_data: str) -> str:
    """
    Ensure stdin has safe newline termination, and if empty, provide a safe
    newline buffer so basic input() calls do not crash with EOFError.
    """
    if input_data is None:
        return "\n" * 10
    
    clean = str(input_data)
    if clean.strip() == "":
        return "\n" * 10
    
    return clean if clean.endswith("\n") else clean + "\n"


def execute_python(code: str, input_data: str = "") -> dict:
    start_time = time.time()
    temp_file = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
            f.write(code)
            temp_file = f.name
            
        stdin_payload = _prepare_stdin(input_data)

        process = subprocess.run(
            [sys.executable, temp_file],
            input=stdin_payload,
            text=True,
            encoding='utf-8',
            errors='replace',
            capture_output=True,
            timeout=8
        )
        
        end_time = time.time()
        stderr = process.stderr or ""
        
        # Add friendly diagnostic hint if EOFError occurs
        if "EOFError" in stderr:
            stderr += "\n💡 [StudyMind Hint]: Your code called input(), but ran out of input in stdin. Enter your input values in the 'Custom Input / stdin' box before running."
        
        return {
            "status": "success" if process.returncode == 0 else "runtime_error",
            "output": process.stdout,
            "error": stderr,
            "execution_time": round(end_time - start_time, 3)
        }
    except subprocess.TimeoutExpired:
        return {
            "status": "timeout",
            "output": "",
            "error": "Execution timed out (limit: 8s). Ensure your code does not contain infinite loops.",
            "execution_time": 8.0
        }
    except Exception as e:
        return {
            "status": "runtime_error",
            "output": "",
            "error": str(e),
            "execution_time": 0.0
        }
    finally:
        if temp_file and os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except Exception:
                pass

def execute_java(code: str, input_data: str = "") -> dict:
    start_time = time.time()
    temp_dir = tempfile.mkdtemp()
    file_path = os.path.join(temp_dir, 'Main.java')
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(code)
            
        # Compile
        compile_process = subprocess.run(
            ['javac', file_path],
            text=True,
            encoding='utf-8',
            errors='replace',
            capture_output=True,
            timeout=8
        )
        
        if compile_process.returncode != 0:
            return {
                "status": "compilation_error",
                "output": "",
                "error": "Compilation Error:\n" + (compile_process.stderr or ""),
                "execution_time": round(time.time() - start_time, 3)
            }
            
        # Execute
        stdin_payload = _prepare_stdin(input_data)
        run_process = subprocess.run(
            ['java', '-cp', temp_dir, 'Main'],
            input=stdin_payload,
            text=True,
            encoding='utf-8',
            errors='replace',
            capture_output=True,
            timeout=8
        )
        
        end_time = time.time()
        stderr = run_process.stderr or ""
        
        if "NoSuchElementException" in stderr:
            stderr += "\n💡 [StudyMind Hint]: Your Java code requested input via Scanner/System.in, but no input was provided in 'Custom Input / stdin'."
        
        return {
            "status": "success" if run_process.returncode == 0 else "runtime_error",
            "output": run_process.stdout,
            "error": stderr,
            "execution_time": round(end_time - start_time, 3)
        }
    except subprocess.TimeoutExpired:
        return {
            "status": "timeout",
            "output": "",
            "error": "Execution timed out (limit: 8s). Ensure your code does not contain infinite loops.",
            "execution_time": 8.0
        }
    except Exception as e:
        return {
            "status": "runtime_error",
            "output": "",
            "error": str(e),
            "execution_time": 0.0
        }
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

