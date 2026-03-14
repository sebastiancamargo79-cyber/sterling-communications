import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './src/db/schema.ts'

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!connectionString) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const sql = neon(connectionString)
const db = drizzle(sql, { schema })

async function testEndpoints() {
  try {
    // Check if clients exist
    const clients = await db.query.clients.findMany()
    console.log('Clients found:', clients.length)
    
    if (clients.length > 0) {
      const client = clients[0]
      console.log(`First client: ${client.id} - ${client.name}`)
      
      // Check brand kit for this client
      const brandKit = await db.query.brandKits.findFirst({
        where: (table, { eq }) => eq(table.clientId, client.id)
      })
      console.log('Brand kit exists:', !!brandKit)
    } else {
      console.log('No clients found - need to create one first')
    }
    
    // Check schema
    console.log('\nBrand kits table columns check...')
  } catch (error) {
    console.error('Error:', error)
  }
}

testEndpoints()
