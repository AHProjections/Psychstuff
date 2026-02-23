#!/usr/bin/env bash
# Start the Flourish app (backend + frontend dev server)
set -e

echo "Installing dependencies..."
(cd server && npm install --silent)
(cd client && npm install --silent)

echo ""
echo "Starting Flourish..."
echo "  Backend  → http://localhost:3001"
echo "  Frontend → http://localhost:5173"
echo ""
echo "Demo accounts (password: demo)"
echo "  Provider: sarah@clinic.com / marcus@clinic.com"
echo "  Patient:  alex@patient.com / jamie@patient.com / riya@patient.com"
echo ""

# Start server in background
(cd server && node src/index.js) &
SERVER_PID=$!

# Start client
(cd client && npm run dev) &
CLIENT_PID=$!

# Handle Ctrl+C
trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit" INT TERM

wait
