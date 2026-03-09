require('dotenv').config();

const { all } = require('../src/config/db');

const parseJsonObject = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return {};

  let current = value;
  for (let i = 0; i < 2; i += 1) {
    try {
      const parsed = JSON.parse(current);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
      if (typeof parsed === 'string') {
        current = parsed;
        continue;
      }
      return {};
    } catch {
      return {};
    }
  }

  return {};
};

async function main() {
  const requestedId = Number(process.argv[2]);
  const hasRequestedId = Number.isFinite(requestedId) && requestedId > 0;

  const rows = await all(
    `SELECT id, title, listing_kind, category_id, service_details, hostel_details, created_at, updated_at
     FROM marketplace_listings
     ${hasRequestedId ? 'WHERE id = $1' : ''}
     ORDER BY id DESC
     LIMIT ${hasRequestedId ? '1' : '20'}`,
    hasRequestedId ? [requestedId] : []
  );

  if (rows.length === 0) {
    console.log('No marketplace listings found for the given filter.');
    return;
  }

  const output = rows.map((row) => ({
    id: row.id,
    title: row.title,
    listing_kind: row.listing_kind,
    category_id: row.category_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    service_details_raw: row.service_details,
    hostel_details_raw: row.hostel_details,
    service_details_parsed: parseJsonObject(row.service_details),
    hostel_details_parsed: parseJsonObject(row.hostel_details),
  }));

  console.log(JSON.stringify(output, null, 2));
}

main()
  .catch((error) => {
    console.error('Failed to inspect marketplace details:', error);
    process.exitCode = 1;
  });
