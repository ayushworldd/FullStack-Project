#!/bin/bash

echo "🔄 Restarting Backend Server"
echo ""

# Find process on port 3001
PID=$(lsof -ti:3001)

if [ -z "$PID" ]; then
    echo "✅ No process running on port 3001"
else
    echo "🛑 Stopping process on port 3001 (PID: $PID)"
    kill -9 $PID
    sleep 1
    echo "✅ Process stopped"
fi

echo ""
echo "🚀 Starting backend server..."
echo ""

cd backend
npm run dev
