const { Client } = require('pg');
require('dotenv').config();

async function addColumn() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');
    await client.query('ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS vehicle_type TEXT;');
    console.log('Column vehicle_type added successfully');
  } catch (err) {
    console.error('Error adding column:', err);
  } finally {
    await client.end();
  }
}

addColumn();
