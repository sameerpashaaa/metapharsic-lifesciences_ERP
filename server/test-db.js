const { pool } = require('./db');

async function testDatabaseConnection() {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    console.log(`Database connection OK: ${result.rows[0].now}`);
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

testDatabaseConnection();
