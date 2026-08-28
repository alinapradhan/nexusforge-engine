#!/usr/bin/env node
/** 
 * NexusForge Engine — CLI
 * ========================
 * Usage:
 *   nexusforge start     Start the NexusForge Engine server
 *   nexusforge seed      Seed the in-memory database
 *   nexusforge status    Show engine status info
 *   nexusforge help      Show this help message
 */

const command = process.argv[2] || 'help';

const BANNER = `
  ⚡ NexusForge Engine CLI v1.0.0
  ────────────────────────────────
`;

switch (command) {
  case 'start':
    console.log(BANNER);
    console.log('  Starting NexusForge Engine...\n');
    require('../src/server');
    break;

  case 'seed':
    console.log(BANNER);
    const store = require('../database/store');
    store.seed();
    console.log('  ✓ Database seeded successfully.');
    console.log(`  ✓ ${store.count('products')} products`);
    console.log(`  ✓ ${store.count('users')} users`);
    console.log(`  ✓ ${store.count('subscriptionPlans')} subscription plans`);
    console.log(`  ✓ ${store.count('subscriptions')} subscriptions`);
    console.log(`  ✓ ${store.count('analyticsEvents')} analytics events`);
    console.log('');
    break;

  case 'status':
    console.log(BANNER);
    console.log('  Engine:    NexusForge Engine');
    console.log('  Version:   1.0.0');
    console.log(`  Node:      ${process.version}`);
    console.log(`  Platform:  ${process.platform}`);
    console.log(`  Memory:    ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    console.log('');
    break;

  case 'help':
  default:
    console.log(BANNER);
    console.log('  Commands:');
    console.log('    start    Start the NexusForge Engine server');
    console.log('    seed     Seed the in-memory database');
    console.log('    status   Show engine status info');
    console.log('    help     Show this help message');
    console.log('');
    console.log('  Examples:');
    console.log('    node bin/nexusforge.js start');
    console.log('    node bin/nexusforge.js seed');
    console.log('');
    break;
}
