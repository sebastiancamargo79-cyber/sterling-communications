const { neon } = require('@neondatabase/serverless');

const connectionString = process.env.DATABASE_URL;
const sql = neon(connectionString);

async function checkSchema() {
  try {
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'brand_kits'
      ORDER BY ordinal_position
    `;
    console.log('brand_kits columns:');
    result.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

checkSchema();
