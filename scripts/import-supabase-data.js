const path = require('path');
const Database = require('better-sqlite3');
const postgres = require('postgres');

const tables = ['services', 'users', 'providers', 'requests', 'favorites', 'messages', 'presence', 'notifications', 'reviews', 'payments', 'invoices'];
const identityTables = ['services', 'users', 'providers', 'requests', 'messages', 'notifications', 'reviews', 'payments', 'invoices'];
const quoteIdentifier = value => `"${value.replaceAll('"', '""')}"`;

async function migrate(connectionString, onProgress = () => {}) {
  if (!/^postgres(?:ql)?:\/\//i.test(String(connectionString || '').trim())) throw new Error('استخدمي رابط PostgreSQL الصحيح.');
  const sqlite = new Database(path.join(__dirname, '..', 'engedny-local.db'), { readonly: true });
  const sql = postgres(connectionString.trim(), { max: 1, prepare: false, ssl: 'require' });
  try {
    await sql.begin(async transaction => {
      await transaction.unsafe(`TRUNCATE ${tables.map(quoteIdentifier).join(', ')} RESTART IDENTITY CASCADE`);
      for (const table of tables) {
        const rows = sqlite.prepare(`SELECT * FROM ${quoteIdentifier(table)}`).all();
        if (!rows.length) continue;
        const columns = Object.keys(rows[0]);
        const statement = `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(', ')}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(', ')})`;
        for (const row of rows) await transaction.unsafe(statement, columns.map(column => row[column]));
        onProgress(table, rows.length);
      }
      for (const table of identityTables) await transaction.unsafe(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${quoteIdentifier(table)}), 1), true)`);
    });
  } finally {
    sqlite.close();
    await sql.end({ timeout: 5 });
  }
}

module.exports = { migrate };
