/**
 * Entry points for GPT for Sheets custom functions.
 */

/**
 * @customfunction
 */
function GPT(text, system_message, model, max_tokens, temperature, tool) {
  return Core.generate('text', arguments);
}

/**
 * @customfunction
 */
function GPT_LIST(text, system_message, model, max_tokens, temperature, tool) {
  return Core.generate('list', arguments);
}

/**
 * @customfunction
 */
function GPT_RECORD(text, schema, system_message, model, max_tokens, temperature, tool) {
  return Core.generate('record', arguments);
}

/**
 * @customfunction
 */
function GPT_RECORD_LIST(text, schema, system_message, model, max_tokens, temperature, tool) {
  return Core.generate('record_list', arguments);
}
