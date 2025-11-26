# MSW Mock Handlers

This directory contains MSW (Mock Service Worker) setup for mocking API calls.

## Files

- `handlers.ts` - All API mock handlers (used by both browser and server)
- `browser.ts` - Browser setup for development
- `server.ts` - Node.js setup for testing
- `apiFixtures.ts` - Mock data fixtures

## Usage

### Development

MSW automatically starts when you run `npm start` in development mode.

### Testing

MSW is automatically configured in `src/test/setup.ts` for Vitest tests.

### Disabling MSW

Set `VITE_USE_MSW=false` in your `.env` file to disable MSW.

## Adding New Handlers

Edit `handlers.ts` to add new API mocks. See `MSW_SETUP.md` for examples.

