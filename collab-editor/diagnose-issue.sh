#!/bin/bash

echo "🔍 Diagnosing Access Control Issue"
echo ""

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "❌ MongoDB is not running!"
    exit 1
fi

echo "✅ MongoDB is running"
echo ""

# Check the most recent document
echo "📄 Checking most recent document in database:"
echo ""
mongosh collab-editor --quiet --eval "
  const doc = db.documents.findOne({}, {sort: {createdAt: -1}});
  if (doc) {
    print('Document ID:', doc._id);
    print('Title:', doc.title);
    print('Owner:', doc.owner);
    print('Owner Type:', typeof doc.owner);
    print('Permissions:', JSON.stringify(doc.permissions));
    print('Is Public:', doc.isPublic);
    print('');
  } else {
    print('No documents found');
  }
"

# Check the most recent user
echo "👤 Checking most recent user in database:"
echo ""
mongosh collab-editor --quiet --eval "
  const user = db.users.findOne({}, {sort: {createdAt: -1}});
  if (user) {
    print('User ID:', user._id);
    print('Username:', user.username);
    print('Email:', user.email);
    print('');
  } else {
    print('No users found');
  }
"

echo "🔍 Comparing IDs:"
echo ""
mongosh collab-editor --quiet --eval "
  const doc = db.documents.findOne({}, {sort: {createdAt: -1}});
  const user = db.users.findOne({}, {sort: {createdAt: -1}});
  
  if (doc && user) {
    print('Document Owner ID:', doc.owner.toString());
    print('User ID:          ', user._id.toString());
    print('IDs Match:        ', doc.owner.toString() === user._id.toString());
  }
"

echo ""
echo "📋 If IDs don't match, that's the problem!"
echo ""
