const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Load .env.local manually (no dotenv dependency)
try {
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.+)/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
} catch {}

async function migrate() {

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set. Check .env.local');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const schemaFiles = ['schema.sql', 'schema-w3.sql'];
  const schema = schemaFiles
    .map(f => { try { return fs.readFileSync(path.join(__dirname, f), 'utf-8'); } catch { return ''; } })
    .join('\n');

  // Strip comment lines then split by semicolons
  const cleaned = schema.split('\n').filter(line => !line.trim().startsWith('--')).join('\n');
  const statements = cleaned
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    try {
      await sql(stmt);
      const tableName = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
      if (tableName) console.log(`  ✓ ${tableName}`);
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`);
      console.error(`    Statement: ${stmt.slice(0, 80)}...`);
    }
  }

  console.log('\nMigration complete.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
