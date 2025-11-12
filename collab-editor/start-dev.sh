#!/bin/bash

# Collaborative Text Editor - Development Startup Script

echo "🚀 Starting Collaborative Text Editor..."
echo ""

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "❌ MongoDB is not running!"
    echo "Please start MongoDB first:"
    echo "  brew services start mongodb-community"
    echo ""
    exit 1
fi

echo "✅ MongoDB is running"

# Check if dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo "✅ Dependencies installed"
echo ""
echo "Starting services..."
echo "  Backend:  http://localhost:3001"
echo "  Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 2

echo "✅ Services started!"
echo ""
echo "📝 Logs:"
echo "  Backend:  tail -f backend.log"
echo "  Frontend: tail -f frontend.log"
echo ""
echo "🌐 Open http://localhost:5173 in your browser"
echo ""

# Keep script running
wait
