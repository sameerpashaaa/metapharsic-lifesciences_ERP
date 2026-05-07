#!/usr/bin/env bash
# Run load tests on the authentication system to measure performance

echo "=================================================="
echo "  Authentication Performance Test Suite"
echo "=================================================="
echo ""

# Configuration
BASE_URL="${1:-http://localhost:5000/api}"
NUM_REQUESTS=10
CONCURRENT=3

echo "Testing endpoint: $BASE_URL"
echo "Test credentials: admin/admin"
echo "Requests: $NUM_REQUESTS"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to test login
test_login() {
    local username="admin"
    local password="admin"
    local iteration=$1
    
    echo -n "[$iteration/$NUM_REQUESTS] Testing login..."
    
    START_TIME=$(date +%s%N)
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$username\",\"password\":\"$password\"}")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    END_TIME=$(date +%s%N)
    DURATION=$(( (END_TIME - START_TIME) / 1000000 ))
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e " ${GREEN}✓ ${DURATION}ms${NC}"
        echo "$DURATION"
    elif [ "$HTTP_CODE" = "202" ]; then
        echo -e " ${YELLOW}2FA Required ${DURATION}ms${NC}"
        echo "$DURATION"
    else
        echo -e " ${RED}✗ HTTP $HTTP_CODE (${DURATION}ms)${NC}"
        echo "$DURATION"
    fi
}

# Array to store results
declare -a TIMES

# Run tests
echo "Running sequential login tests..."
for ((i=1; i<=NUM_REQUESTS; i++)); do
    TIME=$(test_login $i)
    TIMES+=($TIME)
done

echo ""
echo "=================================================="
echo "  Performance Results"
echo "=================================================="
echo ""

# Calculate statistics
MIN=${TIMES[0]}
MAX=${TIMES[0]}
TOTAL=0

for TIME in "${TIMES[@]}"; do
    TOTAL=$((TOTAL + TIME))
    if [ "$TIME" -lt "$MIN" ]; then
        MIN=$TIME
    fi
    if [ "$TIME" -gt "$MAX" ]; then
        MAX=$TIME
    fi
done

AVG=$((TOTAL / NUM_REQUESTS))

echo "Average response time: ${AVG}ms"
echo "Min response time:     ${MIN}ms"
echo "Max response time:     ${MAX}ms"
echo "Total requests:        $NUM_REQUESTS"
echo ""

# Performance recommendations
echo "=================================================="
echo "  Performance Recommendations"
echo "=================================================="
echo ""

if [ "$AVG" -lt 100 ]; then
    echo -e "${GREEN}✓ Excellent performance (<100ms avg)${NC}"
elif [ "$AVG" -lt 200 ]; then
    echo -e "${YELLOW}⚠ Good performance (100-200ms avg)${NC}"
    echo "  - Consider using Redis for session caching"
    echo "  - Database indexing on username column"
else
    echo -e "${RED}✗ Slow performance (>200ms avg)${NC}"
    echo "  - Check database connection"
    echo "  - Verify BCRYPT_ROUNDS setting (should be 10)"
    echo "  - Monitor CPU usage during tests"
    echo "  - Consider connection pooling"
fi

echo ""
echo "Next: Run 'BCRYPT_ROUNDS=10 npm start' to use optimized rounds"
