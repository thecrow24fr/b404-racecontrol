@echo off
cd /d "%~dp0web2py"
start "" web2py.exe --no_gui -a "<recycle>" -i 0.0.0.0 -p 8000
