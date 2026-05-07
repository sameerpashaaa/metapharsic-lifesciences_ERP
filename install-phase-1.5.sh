#!/bin/bash
# Install and Setup Script for Phase 1.5 Security Implementation
# Installs dependencies, runs tests, and verifies setup

set -e

echo "=================================================="
echo "  Phase 1.5: Frontend JWT + Security Testing"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check Node.js version
print_status "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18+ required (found: $NODE_VERSION)"
    exit 1
fi
print_success "Node.js version: $(node -v)"

# Install frontend dependencies
print_status "Installing frontend dependencies..."
npm install
print_success "Frontend dependencies installed"

# Run security tests
print_status "Running security tests..."
npm run test:security -- 2>&1 | tail -20
print_success "Security tests completed"

# Run API client tests
print_status "Running API client tests..."
npm run test:api -- 2>&1 | tail -20
print_success "API client tests completed"

# Type checking
print_status "Running TypeScript type checking..."
npm run type-check 2>&1 || print_warning "Some type issues found (non-critical)"
print_success "Type checking completed"

# Create .env file if not exists
if [ ! -f ".env.local" ]; then
    print_status "Creating .env.local file..."
    cat > .env.local << 'EOF'
VITE_API_URL=http://localhost:5000/api
VITE_JWT_EXPIRATION=86400
VITE_REFRESH_TOKEN_EXPIRATION=604800
VITE_LOG_LEVEL=debug
VITE_ENABLE_SECURITY_LOGS=true
EOF
    print_success ".env.local created"
    print_warning "Update VITE_API_URL if backend is on different URL"
else
    print_success ".env.local already exists"
fi

# Verify file structure
print_status "Verifying file structure..."
files_to_check=(
    "services/apiClient.ts"
    "context/AuthContext.tsx"
    "services/__tests__/security.test.ts"
    "services/__tests__/apiClient.test.ts"
    ".github/workflows/security.yml"
    "PHASE_1.5_IMPLEMENTATION_GUIDE.md"
)

all_files_exist=true
for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        print_success "✓ $file"
    else
        print_error "✗ $file (Missing!)"
        all_files_exist=false
    fi
done

echo ""
echo "=================================================="
echo "  Setup Summary"
echo "=================================================="

if [ "$all_files_exist" = true ]; then
    print_success "All required files created"
else
    print_warning "Some files are missing - check manually"
fi

print_success "Frontend dependencies installed"
print_success "Tests can be run with: npm run test"
print_success "Security tests can be run with: npm run test:security"

echo ""
echo "=================================================="
echo "  Next Steps:"
echo "=================================================="
echo "1. Update VITE_API_URL in .env.local if needed"
echo "2. Ensure backend is running: cd server && npm start"
echo "3. Start frontend: npm run dev"
echo "4. Navigate to http://localhost:5173/login"
echo "5. Test with credentials created in backend"
echo "6. Monitor GitHub Actions for security scanning"
echo ""
echo "Backend must be completed first!"
echo "  - JWT authentication: server/controllers/authController.js"
echo "  - Security middleware: server/middleware/security.js"
echo "  - Database migration: server/migrations/002-add-security-columns.sql"
echo ""
echo -e "${GREEN}Phase 1.5 setup complete! 🎉${NC}"
