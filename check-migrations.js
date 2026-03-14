const { neon } = require('@neondatabase/serverless');

const connectionString = process.env.DATABASE_URL;
const sql = neon(connectionString);

async function checkMigrations() {
  try {
    const result = await sql`
      SELECT * FROM "__drizzle_migrations__"
      ORDER BY created_at
    `;
    console.log('Applied migrations:');
    result.forEach(m => console.log(`  - ${m.name}`));
  } catch (e) {
    console.error('Migrations table error:', e.message);
  }
}

checkMigrations();
