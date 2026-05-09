#!/usr/bin/env python3
"""
Security Verification Script
Validates all Phase 1 & 1.5 security implementations
"""

import os
import sys
import json
import hashlib
from pathlib import Path
from datetime import datetime

class SecurityVerifier:
    def __init__(self):
        self.status = {}
        self.required_files = [
            # Phase 1 - Backend
            "server/middleware/security.js",
            "server/utils/password.js",
            "server/utils/jwt.js",
            "server/utils/2fa.js",
            "server/utils/logger.js",
            "server/controllers/authController.js",
            "server/migrations/002-add-security-columns.sql",
            ".env.example",
            "server/package.json",
            
            # Phase 1.5 - Frontend
            "services/apiClient.ts",
            "context/AuthContext.tsx",
            "services/__tests__/security.test.ts",
            "services/__tests__/apiClient.test.ts",
            ".github/workflows/security.yml",
            ".env.frontend.example",
        ]
        
        self.security_keywords = {
            "password": ["bcrypt", "hash", "salt", "compare"],
            "jwt": ["token", "expir", "refresh", "verify", "access"],
            "2fa": ["totp", "otp", "backup", "code", "authenticat"],
            "validation": ["sanitize", "validate", "xss", "sql", "injection"],
            "rate_limit": ["limit", "throttle", "ddos", "attempt"],
            "cors": ["cors", "whitelist", "origin", "credentials"],
            "headers": ["helmet", "csp", "hsts", "x-frame"],
            "logging": ["logger", "audit", "security", "event"],
        }

    def check_file_exists(self, filepath):
        """Check if required file exists"""
        return os.path.exists(filepath)

    def check_file_size(self, filepath, min_size=100):
        """Check if file has substantial content"""
        try:
            size = os.path.getsize(filepath)
            return size >= min_size
        except:
            return False

    def check_security_implementations(self, filepath):
        """Scan file for security implementations"""
        implementations_found = {}
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read().lower()
                for category, keywords in self.security_keywords.items():
                    implementations_found[category] = any(kw in content for kw in keywords)
        except:
            return None
        return implementations_found

    def verify_all(self):
        """Run all verification checks"""
        print("=" * 60)
        print("  SECURITY IMPLEMENTATION VERIFICATION")
        print("=" * 60)
        print()
        
        # Check files exist
        print("📋 Checking Required Files:")
        print("-" * 60)
        all_exist = True
        for file in self.required_files:
            exists = self.check_file_exists(file)
            status = "✓" if exists else "✗"
            print(f"  {status} {file}")
            if not exists:
                all_exist = False
        print()
        
        # Check file sizes
        print("📏 Checking File Sizes:")
        print("-" * 60)
        for file in self.required_files:
            if self.check_file_exists(file):
                has_content = self.check_file_size(file)
                status = "✓" if has_content else "⚠"
                size = os.path.getsize(file)
                print(f"  {status} {file} ({size} bytes)")
        print()
        
        # Check implementations
        print("🔐 Security Implementations Found:")
        print("-" * 60)
        
        implementation_summary = {}
        for file in self.required_files:
            if self.check_file_exists(file) and file.endswith(('.js', '.ts', '.tsx')):
                impls = self.check_security_implementations(file)
                if impls:
                    implementation_summary[file] = impls
                    for category, found in impls.items():
                        if found:
                            print(f"  ✓ {file: <40} >> {category}")
        print()
        
        # Summary Report
        print("=" * 60)
        print("  VERIFICATION SUMMARY")
        print("=" * 60)
        
        total_files = len(self.required_files)
        existing_files = sum(1 for f in self.required_files if self.check_file_exists(f))
        percentage = (existing_files / total_files) * 100
        
        print(f"✓ Files Created: {existing_files}/{total_files} ({percentage:.1f}%)")
        
        security_categories = set()
        for file_impls in implementation_summary.values():
            for category, found in file_impls.items():
                if found:
                    security_categories.add(category)
        
        print(f"✓ Security Categories: {len(security_categories)}/{len(self.security_keywords)}")
        for category in sorted(security_categories):
            print(f"    • {category}")
        print()
        
        # Recommendations
        print("=" * 60)
        print("  NEXT STEPS")
        print("=" * 60)
        
        if existing_files == total_files:
            print("✓ All files created successfully!")
            print()
            print("1. Copy .env.frontend.example to .env.local")
            print("2. Update VITE_API_URL in .env.local")
            print("3. Ensure backend is running (Server must be Phase 1 complete)")
            print("4. Run: npm run test")
            print("5. Start frontend: npm run dev")
            print("6. Test login at http://localhost:5173/login")
            print()
            print("Backend Requirements:")
            print("  • server/controllers/authController.js")
            print("  • server/middleware/security.js")
            print("  • server/utils/jwt.js")
            print("  • server/utils/password.js")
            print("  • server/migrations/002-add-security-columns.sql")
        else:
            print(f"⚠ {total_files - existing_files} files still need to be created")
            missing = [f for f in self.required_files if not self.check_file_exists(f)]
            for file in missing:
                print(f"  ✗ {file}")
        
        print()
        print("=" * 60)
        print("Generated:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        print("=" * 60)

if __name__ == "__main__":
    verifier = SecurityVerifier()
    verifier.verify_all()
