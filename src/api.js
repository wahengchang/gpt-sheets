/**
 * Thin wrapper around UrlFetchApp for the GPT API.
 */

/**
 * Fetches a completion from the configured model.
 *
 * @param {string} prompt The prepared prompt text.
 * @returns {string} Placeholder response until the API is wired.
 */
function fetchCompletion(prompt) {
  if (!prompt) {
    throw new Error('Prompt is required to request a completion.');
  }

  if (!hasApiKey()) {
    return '⚠️ Add your OpenAI API key via GPT for Sheets → Open Settings.';
  }

  // Real implementation will call UrlFetchApp; for now just echo the prompt.
  return 'GPT placeholder response for:\n' + prompt;
}
