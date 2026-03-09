import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL

// Create db instance, allowing build-time when DATABASE_URL or POSTGRES_URL is undefined
const sql = connectionString ? neon(connectionString) : (null as any)
export const db = sql ? drizzle(sql, { schema }) : (null as any)
