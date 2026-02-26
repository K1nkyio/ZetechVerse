#!/bin/bash

# ZetechVerse Backend Setup Script

echo "🚀 Setting up ZetechVerse Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v16 or higher) first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | sed 's/v//')
REQUIRED_VERSION="16.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
    echo "✅ Node.js version $NODE_VERSION is compatible"
else
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to v16 or higher."
    exit 1
fi

# Navigate to backend directory
cd backend || {
    echo "❌ Could not find backend directory"
    exit 1
}

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Initialize database
echo "🗄️  Initializing database..."
npm run init-db

echo "🎉 Backend setup complete!"
echo ""
echo "Default admin account:"
echo "Email: admin@zetech.ac.ke"
echo "Password: admin123"
echo ""
echo "Next steps:"
echo "1. Start the backend server: npm start"
echo "2. The API will be available at http://localhost:3000"
echo "3. Set up the frontend next"
