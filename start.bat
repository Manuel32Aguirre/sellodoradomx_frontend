@echo off
cd /d "%~dp0"
echo Frontend en http://localhost:3000
echo Edita js\config.js con la URL del backend.
python -m http.server 3000
