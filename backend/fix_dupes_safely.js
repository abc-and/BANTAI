const { Client } = require('pg');
require('dotenv').config();

async function fixDuplicatesSafely() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    const res = await client.query(`
      SELECT v.vehicle_id, v.vehicle_code, 
             (SELECT COUNT(*) FROM overcapacity_violations ov WHERE ov.vehicle_id = v.vehicle_id) as cap_count,
             (SELECT COUNT(*) FROM overspeeding_violations osv WHERE osv.vehicle_id = v.vehicle_id) as speed_count
      FROM vehicle v
      WHERE v.vehicle_code = 'MPUJ-001';
    `);
    
    console.log('Found vehicles with code MPUJ-001:');
    res.rows.forEach(row => console.log(`- ID: ${row.vehicle_id}, Violations: ${parseInt(row.cap_count) + parseInt(row.speed_count)}`));

    const withViolations = res.rows.filter(r => (parseInt(r.cap_count) + parseInt(r.speed_count)) > 0);
    const withoutViolations = res.rows.filter(r => (parseInt(r.cap_count) + parseInt(r.speed_count)) === 0);

    if (withoutViolations.length > 0 && withViolations.length > 0) {
      const idToDelete = withoutViolations[0].vehicle_id;
      console.log(`Deleting duplicate ID without violations: ${idToDelete}`);
      await client.query(`DELETE FROM vehicle WHERE vehicle_id = '${idToDelete}';`);
      console.log('Duplicate deleted successfully');
    } else if (res.rows.length > 1) {
      console.log('Both duplicates have violations or both have none. Taking safer approach.');
      // If both have none, delete the first one.
      // If both have violations... this is tricky. We'd need to reassign them.
      // For now, let's just delete one if it's safe.
      if (withoutViolations.length > 1) {
         const idToDelete = withoutViolations[0].vehicle_id;
         await client.query(`DELETE FROM vehicle WHERE vehicle_id = '${idToDelete}';`);
         console.log('Deleted one of the duplicates without violations.');
      }
    }

  } catch (err) {
    console.error('Error fixing duplicates:', err);
  } finally {
    await client.end();
  }
}

fixDuplicatesSafely();
