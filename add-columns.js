const { neon } = require('@neondatabase/serverless');

const connectionString = process.env.DATABASE_URL;
const sql = neon(connectionString);

async function addColumns() {
  try {
    console.log('Adding missing columns to brand_kits...');
    
    await sql`
      ALTER TABLE brand_kits
      ADD COLUMN IF NOT EXISTS bg_color text,
      ADD COLUMN IF NOT EXISTS accent_color text,
      ADD COLUMN IF NOT EXISTS text_color text,
      ADD COLUMN IF NOT EXISTS font_heading_name text,
      ADD COLUMN IF NOT EXISTS font_body_name text,
      ADD COLUMN IF NOT EXISTS heading_font_size text,
      ADD COLUMN IF NOT EXISTS body_font_size text,
      ADD COLUMN IF NOT EXISTS card_border_radius text,
      ADD COLUMN IF NOT EXISTS layout_density text
    `;
    
    console.log('✓ Columns added successfully');
    
    // Verify
    const result = await sql`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'brand_kits'
      ORDER BY ordinal_position
    `;
    console.log(`\nVerification: brand_kits now has ${result.length} columns`);
    result.forEach(col => console.log(`  - ${col.column_name}`));
    
  } catch (e) {
    console.error('Error:', e.message);
  }
}

addColumns();
