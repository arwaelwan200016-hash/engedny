const path = require('path');
const Database = require('better-sqlite3');

const tables = ['services', 'users', 'providers', 'requests', 'favorites', 'messages', 'presence', 'notifications', 'reviews', 'payments', 'invoices'];
const identityTables = ['services', 'users', 'providers', 'requests', 'messages', 'notifications', 'reviews', 'payments', 'invoices'];
// Supabase SQL Editor has a query-size limit. Keep the useful app data, while
// leaving very large local-only avatar and attachment payloads behind.
const excludedColumns = {
  users: new Set(['avatar_data']),
  messages: new Set(['attachment_data']),
};

const quoteIdentifier = value => `"${value.replaceAll('"', '""')}"`;

function literal(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'bigint') return String(value);
  if (Buffer.isBuffer(value)) return `decode('${value.toString('hex')}', 'hex')`;
  return `'${String(value).replaceAll("'", "''")}'`;
}

function createSqlExport() {
  const sqlite = new Database(path.join(__dirname, '..', 'engedny-local.db'), { readonly: true });
  try {
    const output = [
      '-- Engedny local data export for Supabase.',
      '-- Run this once in Supabase: SQL Editor > New query > Run.',
      '-- This replaces the current data in the Engedny tables.',
      'begin;',
      `truncate ${tables.map(quoteIdentifier).join(', ')} restart identity cascade;`,
    ];

    for (const table of tables) {
      const rows = sqlite.prepare(`SELECT * FROM ${quoteIdentifier(table)}`).all();
      if (!rows.length) continue;
      const columns = Object.keys(rows[0]).filter(column => !excludedColumns[table]?.has(column));
      output.push(`insert into ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(', ')}) values`);
      output.push(`${rows.map(row => `  (${columns.map(column => literal(row[column])).join(', ')})`).join(',\n')};`);
    }

    for (const table of identityTables) {
      output.push(`select setval(pg_get_serial_sequence('${table}', 'id'), coalesce((select max(id) from ${quoteIdentifier(table)}), 1), true);`);
    }
    output.push('commit;');
    return output.join('\n\n');
  } finally {
    sqlite.close();
  }
}

module.exports = { createSqlExport };
