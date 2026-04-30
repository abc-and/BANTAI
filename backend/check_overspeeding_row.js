const { Client } = require('pg');
require('dotenv').config();

async function checkOverspeedingRow() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    const res = await client.query(`
      SELECT * FROM overspeeding_violations LIMIT 1;
    `);
    console.log('Overspeeding row:', JSON.stringify(res.rows[0], null, 2));

  } catch (err) {
    console.error('Error checking row:', err);
  } finally {
    await client.end();
  }
}

checkOverspeedingRow();
