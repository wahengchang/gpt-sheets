/**
 * Entry points for GPT for Sheets custom functions.
 */

/**
 * @customfunction
 * Placeholder implementation that will call the GPT backend.
 *
 * @param {any} input The cell value or range to process.
 * @param {string} [instruction] Optional modifier for the prompt.
 * @returns {string} Temporary response for wiring verification.
 */
function GPT(input, instruction) {
  var prompt = buildPrompt(input, instruction);
  var result = fetchCompletion(prompt);
  return result;
}

/**
 * @customfunction
 * Example stub for a JSON-returning variant.
 *
 * @param {any} input The cell value or range to process.
 * @param {string} [instruction] Optional modifier for the prompt.
 * @returns {string} JSON string placeholder.
 */
function GPTJSON(input, instruction) {
  var prompt = buildPrompt(input, instruction);
  var result = fetchCompletion(prompt);
  return JSON.stringify({ data: result });
}
