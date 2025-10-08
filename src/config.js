/**
 * Configuration helpers for environment detection and secrets.
 */

var DEFAULT_API_BASE = 'https://api.openai.com/v1/chat/completions';

/**
 * Detects whether the project is running in a development deployment.
 *
 * @returns {boolean} True when dev indicators are detected.
 */
function isDev() {
  var property = PropertiesService.getScriptProperties().getProperty('ENVIRONMENT');
  return property === 'dev';
}

/**
 * Checks if the API key is available.
 *
 * @returns {boolean} Whether an API key is configured.
 */
function hasApiKey() {
  return Boolean(PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY'));
}

/**
 * Returns the configured API base URL.
 *
 * @returns {string} API base URL.
 */
function getApiBaseUrl() {
  var base = PropertiesService.getScriptProperties().getProperty('OPENAI_API_BASE');
  return base || DEFAULT_API_BASE;
}

/**
 * Returns the configured model or a safe default.
 *
 * @returns {string} Model name.
 */
function getConfiguredModel() {
  var model = PropertiesService.getScriptProperties().getProperty('OPENAI_MODEL');
  return model || 'gpt-4.1-mini';
}
