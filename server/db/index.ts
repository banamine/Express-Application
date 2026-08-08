import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import * as schema from '../../shared/schema';
import fs from 'fs';
import path from 'path';

let dbInstance: any = null;
let pgliteClient: PGlite | null = null;

export function getDb() {
  if (!dbInstance) {
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
      console.log('Using Neon Postgres');
      const sql = neon(process.env.DATABASE_URL);
      dbInstance = drizzleNeon(sql, { schema });
      
      // Auto-migrate for Neon
      try {
        const { execSync } = require('child_process');
        console.log('Pushing database schema to Neon...');
        execSync('npx drizzle-kit push', { encoding: 'utf-8', env: process.env });
        console.log('Database schema push complete.');
      } catch (e: any) {
        console.error('Failed to push database schema to Neon:', e.stdout || e.message);
      }
    } else {
      console.log('Using local PGlite fallback');
      pgliteClient = new PGlite('./pgdata');
      dbInstance = drizzlePglite(pgliteClient, { schema });
      
      // Auto-migrate (for local pglite)
      try {
        const sqlContent = fs.readFileSync(path.resolve(process.cwd(), 'drizzle/0000_sad_warbound.sql'), 'utf-8');
        // Simple way to handle "already exists" without crashing
        pgliteClient.exec(sqlContent).catch(e => {
          if (!e.message?.includes('already exists')) {
            console.error('Migration error:', e);
          }
        });
      } catch (e) {
        console.warn('Could not read migration file', e);
      }
    }
  }
  return dbInstance;
}
