const db = require('./db');
db.query("SELECT * FROM products LIMIT 1")
  .then(r => {
    console.log('Columns:', Object.keys(r.rows[0]));
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
