const { Client } = require('pg');
require('dotenv').config();

async function checkIncidentCols() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    const res = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'incident';
    `);
    console.log('Incident columns:', res.rows.map(r => r.column_name));

  } catch (err) {
    console.error('Error checking columns:', err);
  } finally {
    await client.end();
  }
}

checkIncidentCols();
