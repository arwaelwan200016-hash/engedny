const path = require('path');
const Database = require('better-sqlite3');
const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL || process.argv[2];
if (!connectionString) {
  console.error('DATABASE_URL is required. Paste your Supabase connection string when prompted.');
  process.exit(1);
}

const sqlite = new Database(path.join(__dirname, '..', 'engedny-local.db'), { readonly: true });
const sql = postgres(connectionString, { max: 1, prepare: false, ssl: 'require' });

const tables = [
  'services', 'users', 'providers', 'requests', 'favorites', 'messages',
  'presence', 'notifications', 'reviews', 'payments', 'invoices',
];
const identityTables = ['services', 'users', 'providers', 'requests', 'messages', 'notifications', 'reviews', 'payments', 'invoices'];

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function main() {
  try {
    await sql.begin(async transaction => {
      await transaction.unsafe(`TRUNCATE ${tables.map(quoteIdentifier).join(', ')} RESTART IDENTITY CASCADE`);

      for (const table of tables) {
        const rows = sqlite.prepare(`SELECT * FROM ${quoteIdentifier(table)}`).all();
        if (!rows.length) continue;

        const columns = Object.keys(rows[0]);
        const names = columns.map(quoteIdentifier).join(', ');
        const values = columns.map((_, index) => `$${index + 1}`).join(', ');
        const statement = `INSERT INTO ${quoteIdentifier(table)} (${names}) VALUES (${values})`;
        for (const row of rows) {
          await transaction.unsafe(statement, columns.map(column => row[column]));
        }
        console.log(`Imported ${rows.length} rows into ${table}.`);
      }

      for (const table of identityTables) {
        await transaction.unsafe(
          `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${quoteIdentifier(table)}), 1), true)`
        );
      }
    });
    console.log('Migration completed successfully.');
  } finally {
    sqlite.close();
    await sql.end({ timeout: 5 });
  }
}

main().catch(error => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
