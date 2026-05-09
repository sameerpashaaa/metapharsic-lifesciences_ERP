const db = require('./db');

async function seedOMS() {
  try {
    console.log('🌱 Seeding Order Management System (OMS) data...');

    // 1. Get some distributors (Parties of type 'Debtor')
    const distributorsResult = await db.query("SELECT id, name FROM parties WHERE type = 'Debtor' LIMIT 5");
    let distributors = distributorsResult.rows;

    if (distributors.length === 0) {
      console.log('⚠️ No distributors found. Creating mock distributor...');
      const newParty = await db.query(
        "INSERT INTO parties (name, type, gstin, status) VALUES ($1, $2, $3, $4) RETURNING id, name",
        ['Global Health Distributors', 'Debtor', '27ABCDE1234F1Z5', 'Active']
      );
      distributors = [newParty.rows[0]];
    }

    // 2. Get some products
    const productsResult = await db.query('SELECT id, name FROM products LIMIT 5');
    const products = productsResult.rows;

    if (products.length === 0) {
      console.log('❌ No products found. Please seed inventory first.');
      return;
    }

    // 3. Create Orders
    const orders = [
      {
        distributor: distributors[0],
        status: 'Pending Approval',
        priority: 'Normal',
        items: [
          { product: products[0], quantity: 100, rate: 150 },
          { product: products[1 % products.length], quantity: 50, rate: 85 }
        ]
      },
      {
        distributor: distributors[distributors.length - 1],
        status: 'Shipped',
        priority: 'High',
        items: [
          { product: products[2 % products.length], quantity: 200, rate: 120 }
        ]
      }
    ];

    for (const order of orders) {
      const totalAmount = order.items.reduce((sum, i) => sum + (i.quantity * i.rate), 0);
      
      const res = await db.query(
        `INSERT INTO orders (distributor_id, distributor_name, total_amount, status, priority)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [order.distributor.id, order.distributor.name, totalAmount, order.status, order.priority]
      );
      
      const orderId = res.rows[0].id;

      for (const item of order.items) {
        await db.query(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity, approved_quantity, rate, amount)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [orderId, item.product.id, item.product.name, item.quantity, item.quantity, item.rate, item.quantity * item.rate]
        );
      }
    }

    console.log('✅ OMS Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedOMS();
