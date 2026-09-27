@echo off
cd /d "%~dp0web2py"
start "" web2py.exe -S r2la -M -R applications/r2la/private/live_timing.py
start "" web2py.exe -i 192.168.1.102 -p 8000
