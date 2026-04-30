const fetch = require('node-fetch');

async function testViolations() {
  const url = 'http://localhost:3000/api/violations';
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Overspeeding count:', data.overspeeding?.length);
    console.log('Overcapacity count:', data.overcapacity?.length);
    if (data.overspeeding?.length > 0) {
      console.log('First overspeeding:', data.overspeeding[0]);
    }
  } catch (err) {
    console.error('Error fetching violations:', err);
  }
}

testViolations();
