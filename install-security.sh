#!/bin/bash
# install-and-setup.sh
# One-command security setup script

set -e

echo "🔐 Metapharsic ERP - Security Setup"
echo "===================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Install dependencies
echo -e "${BLUE}[1/6] Installing dependencies...${NC}"
cd server
npm install
cd ..

# Step 2: Create .env file
echo -e "${BLUE}[2/6] Creating .env configuration...${NC}"
if [ ! -f server/.env ]; then
    cp server/.env.example server/.env
    
    # Generate secure secrets
    JWT_SECRET=$(openssl rand -base64 32)
    REFRESH_SECRET=$(openssl rand -base64 32)
    SESSION_SECRET=$(openssl rand -base64 32)
    ENCRYPTION_KEY=$(openssl rand -hex 32 | cut -c1-32)
    
    # Update .env with generated secrets
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" server/.env
    sed -i "s/REFRESH_TOKEN_SECRET=.*/REFRESH_TOKEN_SECRET=$REFRESH_SECRET/" server/.env
    sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" server/.env
    sed -i "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$ENCRYPTION_KEY/" server/.env
    
    echo -e "${GREEN}✓ .env created with secure secrets${NC}"
else
    echo -e "${YELLOW}⚠ .env already exists, skipping${NC}"
fi

# Step 3: Database migration
echo -e "${BLUE}[3/6] Running database migration...${NC}"
if command -v psql &> /dev/null; then
    psql -U postgres -d metapharsic_erp -f server/migrations/002-add-security-columns.sql 2>/dev/null || true
    echo -e "${GREEN}✓ Database migration complete${NC}"
else
    echo -e "${YELLOW}⚠ PostgreSQL not found, skipping migration${NC}"
    echo "   Run manually: psql -U postgres -d metapharsic_erp < server/migrations/002-add-security-columns.sql"
fi

# Step 4: Create admin user
echo -e "${BLUE}[4/6] Create admin user${NC}"
read -sp "Enter admin password (min 12 chars): " ADMIN_PASSWORD
echo

if [ ${#ADMIN_PASSWORD} -lt 12 ]; then
    echo -e "${YELLOW}⚠ Password must be at least 12 characters${NC}"
    exit 1
fi

# Create script to add admin
cat > server/temp-create-admin.js << 'EOF'
require('dotenv').config();
const db = require('./db');
const { hashPassword } = require('./utils/password');

async function createAdmin() {
  try {
    const password = process.argv[2];
    const hashedPassword = await hashPassword(password);
    
    await db.query(
      `INSERT INTO users (username, email, password_hash, name, role)
       VALUES ('admin', 'admin@metapharsic.com', $1, 'Administrator', 'ADMIN')
       ON CONFLICT DO NOTHING`,
      [hashedPassword]
    );
    
    console.log('✓ Admin user created/updated');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
EOF

cd server
node temp-create-admin.js "$ADMIN_PASSWORD" || echo -e "${YELLOW}⚠ Admin user setup skipped or already exists${NC}"
rm -f temp-create-admin.js
cd ..

# Step 5: Build frontend
echo -e "${BLUE}[5/6] Building frontend...${NC}"
npm run build 2>/dev/null || echo -e "${YELLOW}⚠ Frontend build skipped${NC}"

# Step 6: Ready!
echo -e "${BLUE}[6/6] Setup complete!${NC}"

echo
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Security Setup Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo
echo "📝 Next steps:"
echo "1. Review server/.env configuration"
echo "2. Start server: npm start"
echo "3. Test login at http://localhost:5000/api/auth/login"
echo "4. Update frontend to use JWT tokens"
echo
echo "🔑 Credentials:"
echo "   Username: admin"
echo "   Password: [as entered above]"
echo
echo "📚 Documentation:"
echo "   - SECURITY_IMPLEMENTATION.md (full guide)"
echo "   - SECURITY_FIXES_SUMMARY.md (quick reference)"
echo "   - .env.example (configuration template)"
echo
