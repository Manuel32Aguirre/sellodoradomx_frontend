#!/usr/bin/env bash
# Sirve el frontend estático en el puerto 3000 (sin nginx).
cd "$(dirname "$0")"
echo "Frontend en http://0.0.0.0:3000"
echo "Asegúrate de editar js/config.js con la URL del backend."
python3 -m http.server 3000
