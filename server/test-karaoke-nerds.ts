#!/usr/bin/env tsx
// Test script to verify Karaoke Nerds search functionality
import { searchKaraokeNerds } from './src/karaoke-nerds';

async function test() {
  console.log('Testing Karaoke Nerds search...');
  console.log('Searching for: "Hello"');
  
  const results = await searchKaraokeNerds('Hello');
  
  console.log(`\nFound ${results.length} results:`);
  results.slice(0, 5).forEach((track, idx) => {
    console.log(`${idx + 1}. ${track.title} - ${track.artist}`);
    console.log(`   URL: ${track.url}`);
  });
  
  if (results.length === 0) {
    console.log('\n⚠️  No results found. The scraper might need adjustment based on the actual HTML structure.');
    console.log('   You may need to inspect the Karaoke Nerds website and update the selectors in karaoke-nerds.ts');
  } else {
    console.log('\n✅ Search functionality is working!');
  }
}

test().catch(console.error);
