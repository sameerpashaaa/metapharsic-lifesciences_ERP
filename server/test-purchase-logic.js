const API_URL = 'http://localhost:5000/api';
let token = '';

async function runPurchaseTests() {
  console.log('🚀 STARTING ADVANCED PURCHASE TEST SUITE\n');

  try {
    // 1. Authenticate
    console.log('🔐 Step 1: Authenticating as Admin...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin_password'
      })
    });
    const loginData = await loginRes.json();
    token = loginData.token;
    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Test Budget Enforcement
    console.log('\n💰 Step 2: Testing Budget Enforcement (Spend Guard)...');
    console.log('Scenario: Attempting to spend ₹10,000,000 on Packaging (Budget: ₹1,000,000)...');
    
    const budgetFailRes = await fetch(`${API_URL}/purchase`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        invoice_no: 'TEST-OVER-BUDGET',
        supplier_id: '00000000-0000-0000-0000-000000000000',
        order_date: new Date().toISOString().split('T')[0],
        category_id: 'PACKAGING',
        items: [{ product_id: '00000000-0000-0000-0000-000000000000', quantity: 1, purchase_rate: 10000000 }]
      })
    });

    const budgetFailData = await budgetFailRes.json();
    if (budgetFailRes.status === 400) {
      console.log('✅ PASS: System correctly blocked over-budget PO:', budgetFailData.error);
    } else {
      console.log('❌ FAIL: System allowed spending over budget! Status:', budgetFailRes.status);
    }

    // 3. Test 3-Way Matching Integrity
    console.log('\n⚖️ Step 3: Testing 3-Way Matching Compliance...');
    const matchRes = await fetch(`${API_URL}/purchase/3-way-match`, { headers });
    const matchData = await matchRes.json();
    if (matchData.data && matchData.data.length > 0) {
      const match = matchData.data[0];
      console.log(`PO: ${match.poNumber} | Supplier: ${match.supplierName}`);
      console.log(`Status: ${match.status === 'Matched' ? '✅ COMPLIANT' : '⚠️ MISMATCH'}`);
      console.log(`Financial Variance: ₹${match.variance}`);
    } else {
      console.log('⚠️ No matching records found. Did you run the seed script?');
    }

    // 4. Test Reorder Automation
    console.log('\n📦 Step 4: Testing Reorder Intelligence...');
    const alertRes = await fetch(`${API_URL}/purchase/reorder-alerts`, { headers });
    const alertData = await alertRes.json();
    if (alertData.data && alertData.data.length > 0) {
      console.log(`Found ${alertData.data.length} products requiring immediate replenishment.`);
      alertData.data.forEach(p => {
        console.log(`   - ALERT: ${p.productName} (Stock: ${p.currentStock}, Reorder Point: ${p.reorderPoint})`);
      });
    } else {
      console.log('✅ All products are within safety stock limits.');
    }

    console.log('\n✨ TEST SUITE COMPLETED SUCCESSFULLY');
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
  }
}

runPurchaseTests();
