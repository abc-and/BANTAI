const { Client } = require('pg');
require('dotenv').config();

async function checkViolationCols() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    const resCap = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'overcapacity_violations';
    `);
    console.log('Overcapacity columns:', resCap.rows.map(r => r.column_name));

    const resSpeed = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'overspeeding_violations';
    `);
    console.log('Overspeeding columns:', resSpeed.rows.map(r => r.column_name));

  } catch (err) {
    console.error('Error checking columns:', err);
  } finally {
    await client.end();
  }
}

checkViolationCols();
