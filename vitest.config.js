import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use Node environment for unit tests
    environment: 'node',
    
    // Global test setup
    setupFiles: ['./tests/setup.js'],
    
    // Include patterns
    include: ['tests/**/*.test.js'],
    
    // Exclude patterns
    exclude: ['node_modules', 'dist'],
    
    // Reporter
    reporters: ['verbose'],
    
    // Coverage (optional, run with --coverage)
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.js'],
      exclude: ['lib/*-worker.js']  // Workers have browser-specific deps
    },
    
    // Globals for browser APIs that don't exist in Node
    globals: true
  }
});
