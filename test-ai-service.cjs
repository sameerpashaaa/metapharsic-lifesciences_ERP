const { generateAIResponse } = require('./server/services/aiService');
const db = require('./server/db');

async function test() {
  console.log('--- Testing Profit Inquiry ---');
  const profitResponse = await generateAIResponse({ activeTab: 'DASHBOARD' }, 'how much is the profit');
  console.log(JSON.stringify(profitResponse, null, 2));

  console.log('\n--- Testing Compliance Inquiry ---');
  const complianceResponse = await generateAIResponse({ activeTab: 'COMPLIANCE' }, 'how about compliance');
  console.log(JSON.stringify(complianceResponse, null, 2));

  console.log('\n--- Testing Inventory Inquiry ---');
  const inventoryResponse = await generateAIResponse({ activeTab: 'INVENTORY' }, 'how many medicines are there');
  console.log(JSON.stringify(inventoryResponse, null, 2));

  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
