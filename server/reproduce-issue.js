const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function run() {
    try {
        console.log('Testing query for performance-stats...');
        const query = `
            SELECT
                COUNT(*)::INT as "totalEmployees",
                COUNT(*) FILTER (WHERE status = 'Active')::INT as "activeEmployees",
                COUNT(*) FILTER (WHERE target_achievement >= 100)::INT as "starPerformers",
                COUNT(*) FILTER (WHERE target_achievement < 80)::INT as "attentionNeeded",
                ROUND(COALESCE(AVG(target_achievement), 0)::NUMERIC, 2)::FLOAT as "averageAchievement"
            FROM employees
        `;
        const res = await pool.query(query);
        console.log('Result:', res.rows[0]);
    } catch (err) {
        console.error('Error executing query:', err.message);
        console.error('Stack trace:', err.stack);
    } finally {
        await pool.end();
    }
}

run();
