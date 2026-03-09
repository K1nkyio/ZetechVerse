const { all, get } = require('./src/config/db');

async function debugMarketplaceDetails() {
  try {
    console.log('🔍 Fetching marketplace listings with service/hostel details...\n');
    
    const listings = await all(`
      SELECT 
        id, 
        title, 
        listing_kind, 
        service_details, 
        hostel_details,
        category_id
      FROM marketplace_listings 
      WHERE listing_kind IN ('service', 'hostel')
      ORDER BY id DESC
      LIMIT 10
    `);

    if (!listings || listings.length === 0) {
      console.log('❌ No service or hostel listings found.');
      return;
    }

    console.log(`✅ Found ${listings.length} service/hostel listings:\n`);

    listings.forEach((listing, idx) => {
      console.log(`\n${idx + 1}. ID: ${listing.id}`);
      console.log(`   Title: ${listing.title}`);
      console.log(`   Kind: ${listing.listing_kind}`);
      console.log(`   Category ID: ${listing.category_id}`);
      
      if (listing.listing_kind === 'service') {
        console.log(`   Service Details (RAW): ${listing.service_details}`);
        try {
          const parsed = JSON.parse(listing.service_details);
          console.log(`   Service Details (PARSED):`, parsed);
          console.log(`     - pricing_model: ${parsed.pricing_model || 'MISSING'}`);
          console.log(`     - service_area: ${parsed.service_area || 'MISSING'}`);
          console.log(`     - availability: ${parsed.availability || 'MISSING'}`);
        } catch (e) {
          console.log(`   ❌ Failed to parse service_details:`, e.message);
        }
      }

      if (listing.listing_kind === 'hostel') {
        console.log(`   Hostel Details (RAW): ${listing.hostel_details}`);
        try {
          const parsed = JSON.parse(listing.hostel_details);
          console.log(`   Hostel Details (PARSED):`, parsed);
          console.log(`     - room_type: ${parsed.room_type || 'MISSING'}`);
          console.log(`     - beds_available: ${parsed.beds_available || 'MISSING'}`);
          console.log(`     - gender_policy: ${parsed.gender_policy || 'MISSING'}`);
          console.log(`     - amenities: ${parsed.amenities ? JSON.stringify(parsed.amenities) : 'MISSING'}`);
        } catch (e) {
          console.log(`   ❌ Failed to parse hostel_details:`, e.message);
        }
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }

  process.exit(0);
}

debugMarketplaceDetails();
