// test-setup.js
// This file runs before all tests and provides necessary globals

// Define TextEncoder and TextDecoder globally for jsdom compatibility
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}

// Also set up AbortController if needed
if (typeof global.AbortController === 'undefined') {
  global.AbortController = require('abort-controller').AbortController;
}