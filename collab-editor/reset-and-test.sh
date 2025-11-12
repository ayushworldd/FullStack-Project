#!/bin/bash

echo "🧹 Resetting Collaborative Editor for Fresh Start"
echo ""

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "❌ MongoDB is not running!"
    echo "Please start MongoDB first:"
    echo "  brew services start mongodb-community"
    exit 1
fi

echo "✅ MongoDB is running"
echo ""

# Clear MongoDB database
echo "🗑️  Clearing old database..."
mongosh collab-editor --eval "db.dropDatabase()" --quiet

echo "✅ Database cleared"
echo ""

echo "📝 Instructions:"
echo ""
echo "1. Open your browser to: http://localhost:5173"
echo "2. Open DevTools (F12) and go to Console tab"
echo "3. Run this command in the console:"
echo ""
echo "   localStorage.clear(); location.reload();"
echo ""
echo "4. This will:"
echo "   - Clear your saved login token"
echo "   - Reload the page"
echo "   - Take you to the login page"
echo ""
echo "5. Then:"
echo "   - Register a NEW account (or login if you want)"
echo "   - Create a NEW document"
echo "   - It should work now!"
echo ""
echo "Press Enter when you've done the above steps..."
read

echo ""
echo "✅ Ready to test!"
echo ""
echo "If you still have issues, check:"
echo "  - Backend logs: tail -f backend/logs/combined.log"
echo "  - Browser console for errors"
echo ""
