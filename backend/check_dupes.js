const { Client } = require('pg');
require('dotenv').config();

async function checkDuplicates() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    console.log('\n--- Duplicate vehicle_code ---');
    const resVeh = await client.query(`
      SELECT vehicle_code, COUNT(*) 
      FROM vehicle 
      GROUP BY vehicle_code 
      HAVING COUNT(*) > 1;
    `);
    resVeh.rows.forEach(row => console.log(`${row.vehicle_code}: ${row.count}`));

    console.log('\n--- Duplicate operator_name ---');
    const resOp = await client.query(`
      SELECT operator_name, COUNT(*) 
      FROM operator 
      GROUP BY operator_name 
      HAVING COUNT(*) > 1;
    `);
    resOp.rows.forEach(row => console.log(`${row.operator_name}: ${row.count}`));

    console.log('\n--- Duplicate route_name ---');
    const resRoute = await client.query(`
      SELECT route_name, COUNT(*) 
      FROM route 
      GROUP BY route_name 
      HAVING COUNT(*) > 1;
    `);
    resRoute.rows.forEach(row => console.log(`${row.route_name}: ${row.count}`));

  } catch (err) {
    console.error('Error checking duplicates:', err);
  } finally {
    await client.end();
  }
}

checkDuplicates();
