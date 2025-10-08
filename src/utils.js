/**
 * Shared utility helpers.
 */

/**
 * Simple logger that respects the deployment environment.
 *
 * @param {...any} args Values to log.
 */
function debugLog() {
  if (!isDev()) {
    return;
  }

  var message = Array.prototype.slice.call(arguments)
    .map(function(value) {
      return typeof value === 'string' ? value : JSON.stringify(value);
    })
    .join(' ');

  Logger.log('[GPT Sheets] ' + message);
}
