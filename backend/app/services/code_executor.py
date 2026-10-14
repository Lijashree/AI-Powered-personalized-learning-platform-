import subprocess
import tempfile
import os
import shutil
import time
import sys

def execute_python(code: str, input_data: str = "") -> dict:
    start_time = time.time()
    temp_file = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
            f.write(code)
            temp_file = f.name
            
        process = subprocess.run(
            [sys.executable, temp_file],
            input=input_data or "",
            text=True,
            encoding='utf-8',
            errors='replace',
            capture_output=True,
            timeout=5
        )
        
        end_time = time.time()
        
        return {
            "status": "success" if process.returncode == 0 else "runtime_error",
            "output": process.stdout,
            "error": process.stderr,
            "execution_time": round(end_time - start_time, 3)
        }
    except subprocess.TimeoutExpired:
        return {
            "status": "timeout",
            "output": "",
            "error": "Execution timed out.",
            "execution_time": 5.0
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
            timeout=5
        )
        
        if compile_process.returncode != 0:
            return {
                "status": "compilation_error",
                "output": "",
                "error": "Compilation Error:\n" + compile_process.stderr,
                "execution_time": round(time.time() - start_time, 3)
            }
            
        # Execute
        run_process = subprocess.run(
            ['java', '-cp', temp_dir, 'Main'],
            input=input_data or "",
            text=True,
            encoding='utf-8',
            errors='replace',
            capture_output=True,
            timeout=5
        )
        
        end_time = time.time()
        
        return {
            "status": "success" if run_process.returncode == 0 else "runtime_error",
            "output": run_process.stdout,
            "error": run_process.stderr,
            "execution_time": round(end_time - start_time, 3)
        }
    except subprocess.TimeoutExpired:
        return {
            "status": "timeout",
            "output": "",
            "error": "Execution timed out.",
            "execution_time": 5.0
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
