import dotenv from 'dotenv';

dotenv.config();

console.log('[Worker] Starting Epic AI Background Worker...');

// Keep the process alive
const main = async () => {
  console.log('[Worker] Worker initialized successfully.');
  console.log('[Worker] Listening for jobs... (Stub implementation)');
  
  // Prevent process exit
  process.stdin.resume();
  
  const cleanup = () => {
    console.log('[Worker] Shutting down...');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
};

main().catch((err) => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
