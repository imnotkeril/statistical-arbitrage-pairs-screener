"""
Script to install dependencies for backend and frontend
"""
import subprocess
import sys
import os
from pathlib import Path

def install_backend():
    """Install backend Python dependencies"""
    print("Installing backend dependencies...")
    backend_dir = Path(__file__).parent / "backend"
    os.chdir(backend_dir)
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])

def install_frontend():
    """Install frontend npm dependencies"""
    print("\nInstalling frontend dependencies...")
    frontend_dir = Path(__file__).parent / "frontend"
    os.chdir(frontend_dir)
    subprocess.run(["npm", "install"])

if __name__ == "__main__":
    try:
        install_backend()
        install_frontend()
        print("\n✅ All dependencies installed successfully!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

