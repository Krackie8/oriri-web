/**
 * Production log suppressor.
 * Imported as the second side-effect module in main.tsx so it runs before
 * any app code. Silences console.log / console.debug / console.info in
 * production builds while keeping console.warn and console.error intact
 * for genuine issues.
 */

if (import.meta.env.PROD) {
  const noop = () => {};
  console.log = noop;
  console.debug = noop;
  console.info = noop;
}
