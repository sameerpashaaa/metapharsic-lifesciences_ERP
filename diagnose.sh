#!/usr/bin/env bash
# Diagnose login issues and show status of all components

echo "=================================================="
echo "  🔍 Metapharsic ERP - Diagnostic Check"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

section() {
    echo ""
    echo -e "${BLUE}▶${NC} $1"
    echo "─────────────────────────────────────────"
}

# Section 1: Backend
section "Backend Status"

# Check if backend is running
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    check_pass "Backend running on port 5000"
    HEALTH=$(curl -s http://localhost:5000/api/health)
    echo "  Response: $HEALTH"
else
    check_fail "Backend NOT running on port 5000"
    echo "  Fix: cd server && npm start"
fi

# Check if auth endpoint responds
if curl -s -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin"}' > /dev/null 2>&1; then
    check_pass "Auth endpoint responding"
    RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"admin"}')
    
    if echo "$RESPONSE" | grep -q "accessToken"; then
        check_pass "Login returns valid tokens"
    elif echo "$RESPONSE" | grep -q "Invalid credentials"; then
        check_fail "Admin user doesn't exist in database"
        echo "  Fix: cd server && node setup-admin.js"
    else
        check_warn "Unexpected response: $RESPONSE"
    fi
else
    check_fail "Auth endpoint not responding"
    echo "  Make sure backend is running"
fi

# Section 2: Database
section "Database Status"

# Try to connect to PostgreSQL
if psql -U postgres -d metapharsic_erp -c "SELECT 1" 2>/dev/null; then
    check_pass "PostgreSQL connected"
    
    # Check if users table exists
    if psql -U postgres -d metapharsic_erp -c "SELECT 1 FROM users LIMIT 1" 2>/dev/null; then
        check_pass "Users table exists"
        
        # Check if admin user exists
        ADMIN_COUNT=$(psql -U postgres -d metapharsic_erp -t -c "SELECT COUNT(*) FROM users WHERE username='admin';" 2>/dev/null | tr -d '[:space:]')
        if [ "$ADMIN_COUNT" = "1" ]; then
            check_pass "Admin user exists"
            ADMIN=$(psql -U postgres -d metapharsic_erp -t -c "SELECT username, role FROM users WHERE username='admin';" 2>/dev/null)
            echo "  User: $ADMIN"
        else
            check_fail "Admin user does NOT exist"
            echo "  Fix: cd server && node setup-admin.js"
        fi
    else
        check_fail "Users table does NOT exist"
        echo "  Fix: Run database migrations first"
    fi
else
    check_fail "Cannot connect to PostgreSQL"
    echo "  Make sure PostgreSQL is running"
    echo "  Check database credentials in server/.env"
fi

# Section 3: Frontend
section "Frontend Status"

if curl -s http://localhost:5173 > /dev/null 2>&1; then
    check_pass "Frontend running on port 5173"
else
    check_fail "Frontend NOT running on port 5173"
    echo "  Fix: npm run dev"
fi

if [ -f ".env.local" ]; then
    check_pass ".env.local file exists"
    API_URL=$(grep VITE_API_URL .env.local | cut -d'=' -f2)
    if [ "$API_URL" = "http://localhost:5000/api" ]; then
        check_pass "API URL configured correctly: $API_URL"
    else
        check_warn "API URL is: $API_URL (expected: http://localhost:5000/api)"
    fi
else
    check_fail ".env.local file NOT found"
    echo "  Fix: cp .env.frontend.example .env.local"
fi

if [ -f "services/apiClient.ts" ]; then
    check_pass "API Client exists (Phase 1.5)"
else
    check_fail "API Client NOT found"
fi

# Section 4: Network
section "Network Connectivity"

# Test backend from frontend perspective
if curl -s -H "Origin: http://localhost:5173" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    -X OPTIONS http://localhost:5000/api/auth/login 2>&1 | grep -i "access-control" > /dev/null; then
    check_pass "CORS enabled for localhost:5173"
else
    check_warn "CORS might be misconfigured"
fi

# Test DNS/network
if ping -c 1 8.8.8.8 2>/dev/null; then
    check_pass "Internet connection working"
else
    check_warn "No internet connection (might not be needed)"
fi

# Section 5: Dependencies
section "Dependencies"

if [ -d "node_modules" ]; then
    check_pass "Frontend dependencies installed"
else
    check_fail "Frontend dependencies NOT installed"
    echo "  Fix: npm install"
fi

if [ -d "server/node_modules" ]; then
    check_pass "Backend dependencies installed"
else
    check_fail "Backend dependencies NOT installed"
    echo "  Fix: cd server && npm install"
fi

# Section 6: Configuration
section "Environment Configuration"

if [ -f "server/.env" ]; then
    check_pass "server/.env exists"
    echo "  Database: $(grep DB_NAME server/.env | cut -d'=' -f2 || echo 'not set')"
    echo "  JWT Secret: $([ -z "$(grep JWT_SECRET server/.env | cut -d'=' -f2)" ] && echo 'NOT SET (dangerous!)' || echo 'set')"
else
    check_fail "server/.env NOT found"
fi

# Summary
section "Summary"

echo ""
echo "Login should work if all checks above are ✓ GREEN"
echo ""
echo "Common issues:"
echo "  1. Backend not running        → cd server && npm start"
echo "  2. Admin user missing         → cd server && node setup-admin.js"
echo "  3. Frontend not running       → npm run dev"
echo "  4. Wrong API URL              → Check .env.local VITE_API_URL"
echo "  5. Database not initialized   → Run migrations in server/migrations/"
echo ""
echo "Test login:"
echo "  1. Open http://localhost:5173/login"
echo "  2. Enter: admin / admin"
echo "  3. Click Sign In"
echo ""
echo "=================================================="
