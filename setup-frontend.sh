#!/bin/bash

# ZetechVerse Frontend Setup Script

echo "🚀 Setting up ZetechVerse Frontend..."

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

# Navigate to user dashboard frontend
cd "ZetechVerse - User Dashboard - Frontend" || {
    echo "❌ Could not find User Dashboard Frontend directory"
    exit 1
}

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOL
# ZetechVerse User Dashboard Frontend Environment Variables
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=ZetechVerse
VITE_APP_VERSION=1.0.0
VITE_DEV_TOOLS=true
EOL
    echo "✅ .env file created"
else
    echo "ℹ️  .env file already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."
if command -v yarn &> /dev/null; then
    yarn install
else
    npm install
fi

echo "🎉 Frontend setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure the backend is running: cd ../backend && npm start"
echo "2. Start the frontend: npm run dev"
echo "3. Open http://localhost:5173 in your browser"
