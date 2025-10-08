/**
 * String and JSON helpers shared across modules.
 */

function safeJsonParse(value) {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
}
