const { Client } = require('pg');
require('dotenv').config();

async function fixDuplicates() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    const res = await client.query(`
      SELECT vehicle_id, vehicle_code, plate_number 
      FROM vehicle 
      WHERE vehicle_code = 'MPUJ-001';
    `);
    
    console.log('Found vehicles with code MPUJ-001:');
    res.rows.forEach(row => console.log(`- ID: ${row.vehicle_id}, Plate: ${row.plate_number}`));

    if (res.rows.length > 1) {
      const idToDelete = res.rows[0].vehicle_id; // Keep the second one, delete the first
      console.log(`Deleting duplicate ID: ${idToDelete}`);
      await client.query(`DELETE FROM vehicle WHERE vehicle_id = '${idToDelete}';`);
      console.log('Duplicate deleted successfully');
    }

  } catch (err) {
    console.error('Error fixing duplicates:', err);
  } finally {
    await client.end();
  }
}

fixDuplicates();
