/**
 * Entry points for GPT for Sheets custom functions.
 */

/**
 * Generates a single text response using the core GPT engine.
 *
 * @param {string} text The main prompt or instruction for the model.
 * @param {string=} system_message Optional system message that sets behavior (defaults to document setting or "").
 * @param {string=} model Optional OpenAI model name (defaults to `"gpt-4.1-mini"`).
 * @param {number=} max_tokens Optional maximum tokens for the completion (defaults to `512`).
 * @param {number=} temperature Optional temperature for randomness between `0` and `2` (defaults to `0.3`).
 * @param {string=} tool Optional tool identifier. Use `"web_search"` for search-augmented answers or leave blank.
 * @return {string[][]} A single-cell spill containing the generated text.
 * @customfunction
 */
function GPT(text, system_message, model, max_tokens, temperature, tool) {
  return Core.generate('text', arguments);
}

/**
 * Generates a vertical spill list of text items inferred from the prompt.
 *
 * @param {string} text The user prompt describing what items to list (quantity inferred automatically).
 * @param {string=} system_message Optional system message that guides style or persona.
 * @param {string=} model Optional OpenAI model name override (defaults to `"gpt-4.1-mini"`).
 * @param {number=} max_tokens Optional maximum tokens for the response (defaults to `512`).
 * @param {number=} temperature Optional creativity value between `0` and `2` (defaults to `0.3`).
 * @param {string=} tool Optional tool identifier, e.g., `"web_search"` to enrich results.
 * @return {string[][]} A single-column spill with one list item per row.
 * @customfunction
 */
function GPT_LIST(text, system_message, model, max_tokens, temperature, tool) {
  return Core.generate('list', arguments);
}

/**
 * Generates a structured record based on a schema definition.
 *
 * @param {string} text The user prompt describing the record to generate.
 * @param {string} schema Schema string formatted as `"field:type;"` (e.g., `"name:string;price:number;"`).
 * @param {string=} system_message Optional system message for additional guidance.
 * @param {string=} model Optional OpenAI model name override.
 * @param {number=} max_tokens Optional maximum tokens for the completion.
 * @param {number=} temperature Optional creativity value between `0` and `2`.
 * @param {string=} tool Optional tool identifier to augment the prompt, such as `"web_search"`.
 * @return {string[][]} A single-column spill where each row contains `field: value` text.
 * @customfunction
 */
function GPT_RECORD(text, schema, system_message, model, max_tokens, temperature, tool) {
  return Core.generate('record', arguments);
}

/**
 * Generates a list of structured records as newline-separated JSON values.
 *
 * @param {string} text The user prompt describing the collection of records to generate.
 * @param {string} schema Schema string formatted as `"field:type;"` describing each record field.
 * @param {string=} system_message Optional system message for model behavior.
 * @param {string=} model Optional OpenAI model name override.
 * @param {number=} max_tokens Optional maximum tokens allowed for the response.
 * @param {number=} temperature Optional creativity value between `0` and `2`.
 * @param {string=} tool Optional tool identifier such as `"web_search"` for search context.
 * @return {string[][]} A single-column spill of JSON strings, one record per row.
 * @customfunction
 */
function GPT_RECORD_LIST(text, schema, system_message, model, max_tokens, temperature, tool) {
  return Core.generate('record_list', arguments);
}
