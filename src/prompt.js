/**
 * Helpers for converting Sheets input into GPT-ready prompts.
 */

/**
 * Builds a prompt string from the provided input.
 *
 * @param {any} input The raw cell value or range.
 * @param {string} [instruction] Optional modifier to guide the response.
 * @returns {string} Placeholder prompt.
 */
function buildPrompt(input, instruction) {
  var renderedInput = normalizeInput(input);
  var parts = ['Explain the following value from Sheets:', renderedInput];

  if (instruction && instruction.trim()) {
    parts.push('Instruction: ' + instruction.trim());
  }

  return parts.join('\n\n');
}

/**
 * Converts Sheets input into a string that is safe for prompt usage.
 *
 * @param {any} input The cell value or range.
 * @returns {string} Normalized representation.
 */
function normalizeInput(input) {
  if (Array.isArray(input)) {
    return input
      .map(function(row) {
        return row.join('\t');
      })
      .join('\n');
  }

  if (input === undefined || input === null) {
    return '';
  }

  return String(input);
}
