#!/bin/bash

echo "🧹 Cleaning up and starting fresh..."
echo ""

# Kill any process on port 3001
echo "Checking port 3001..."
PID_3001=$(lsof -ti:3001)
if [ ! -z "$PID_3001" ]; then
    echo "Killing process on port 3001 (PID: $PID_3001)"
    kill -9 $PID_3001
    sleep 1
fi

# Kill any process on port 5173
echo "Checking port 5173..."
PID_5173=$(lsof -ti:5173)
if [ ! -z "$PID_5173" ]; then
    echo "Killing process on port 5173 (PID: $PID_5173)"
    kill -9 $PID_5173
    sleep 1
fi

echo ""
echo "✅ Ports cleared!"
echo ""
echo "📋 Now run these commands in separate terminals:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd backend && npm run dev"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd frontend && npm run dev"
echo ""
echo "Then open: http://localhost:5173"
echo ""
