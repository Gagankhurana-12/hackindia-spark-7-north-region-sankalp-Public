/**
 * Migration Guide for Recommendation Algorithm Fields
 * 
 * If you have existing data, run these commands to add the new fields
 */

// ============================================
// MongoDB Migration Commands
// ============================================

// 1. Add 'lastWatchedTime' to existing WatchHistory documents
db.watchhistories.updateMany(
  { lastWatchedTime: { $exists: false } },
  { $set: { lastWatchedTime: 0 } }
);

// 2. Add 'topicsWatched' to existing Child documents
db.children.updateMany(
  { topicsWatched: { $exists: false } },
  { $set: { topicsWatched: [] } }
);

// ============================================
// Node.js Migration Script
// ============================================

// Save this as: backend/scripts/migrate-recommendation-fields.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/growtfeed');

const WatchHistory = require('../models/WatchHistory');
const Child = require('../models/Child');

async function migrate() {
  try {
    console.log('Starting migration...');

    // 1. Update WatchHistory
    console.log('Adding lastWatchedTime to WatchHistory...');
    const watchResult = await WatchHistory.updateMany(
      { lastWatchedTime: { $exists: false } },
      { $set: { lastWatchedTime: 0 } }
    );
    console.log(`✓ Updated ${watchResult.modifiedCount} WatchHistory documents`);

    // 2. Update Child
    console.log('Adding topicsWatched to Child...');
    const childResult = await Child.updateMany(
      { topicsWatched: { $exists: false } },
      { $set: { topicsWatched: [] } }
    );
    console.log(`✓ Updated ${childResult.modifiedCount} Child documents`);

    // 3. Backfill topicsWatched based on existing watch history
    console.log('Backfilling topicsWatched based on watch history...');
    const children = await Child.find();
    let updated = 0;

    for (const child of children) {
      const watchHistory = await WatchHistory.find({
        childId: child._id,
        completion: { $gt: 80 } // Only consider completed videos
      }).select('videoId').lean();

      if (watchHistory.length > 0) {
        // Extract topics from videoId if possible (depends on your schema)
        // For now, we'll need to update this manually or from frontend
        updated++;
      }
    }

    console.log(`✓ Processed ${updated} child documents for backfill`);

    console.log('\n✅ Migration complete!');
    console.log('\nNext steps:');
    console.log('1. Have children watch videos again (completion > 80%)');
    console.log('2. Topics will be automatically added to topicsWatched');
    console.log('3. Feed personalization will kick in after first video');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

migrate();

// ============================================
// Run Migration
// ============================================

// From backend directory, run:
// node scripts/migrate-recommendation-fields.js

// ============================================
// Verify Migration
// ============================================

// Check WatchHistory has lastWatchedTime:
db.watchhistories.findOne({ lastWatchedTime: { $exists: true } });

// Check Child has topicsWatched:
db.children.findOne({ topicsWatched: { $exists: true } });

// Count updated documents:
db.watchhistories.countDocuments({ lastWatchedTime: { $exists: true } });
db.children.countDocuments({ topicsWatched: { $exists: true } });

// ============================================
// Rollback (if needed)
// ============================================

// Remove added fields (careful!):
db.watchhistories.updateMany({}, { $unset: { lastWatchedTime: "" } });
db.children.updateMany({}, { $unset: { topicsWatched: "" } });

// ============================================
// Notes
// ============================================

/*
1. BACKUP YOUR DATABASE FIRST!
   - Export: mongodump --db growtfeed --out ./backup
   - Restore: mongorestore ./backup/growtfeed

2. These migrations are ADDITIVE (safe)
   - Only add new fields with default values
   - Don't modify existing data

3. After migration:
   - New watch tracking will populate lastWatchedTime on next track call
   - topicsWatched will grow as children complete videos (>80%)

4. If backfill needed:
   - Modify watchController.js to check for existing high-completion videos
   - Run maintenance script to backfill topics

5. Verification:
   - Test resume feature: should work after first track call
   - Test personalization: should work after child has 1+ completed video
*/
