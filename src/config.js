/**
 * Configuration helpers for environment detection and secrets.
 */

var DEFAULT_API_BASE = 'https://api.openai.com/v1/chat/completions';
var DEFAULT_MODEL_FALLBACK = 'gpt-4.1-mini';
var DEFAULT_TEMPERATURE_FALLBACK = 0.7;
var DEFAULT_MAX_TOKENS_FALLBACK = 512;

var USER_API_KEY_PROPERTY = 'OPENAI_API_KEY';
var DOC_MODEL_PROPERTY = 'OPENAI_MODEL';
var DOC_TEMPERATURE_PROPERTY = 'OPENAI_TEMPERATURE';
var DOC_MAX_TOKENS_PROPERTY = 'OPENAI_MAX_TOKENS';

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
  return Boolean(getStoredApiKey());
}

/**
 * Returns the configured API base URL.
 *
 * @returns {string} API base URL.
 */
function getApiBaseUrl() {
  var scriptProps = PropertiesService.getScriptProperties();
  var docProps = PropertiesService.getDocumentProperties();

  var base = docProps.getProperty('OPENAI_API_BASE') || scriptProps.getProperty('OPENAI_API_BASE');
  return base || DEFAULT_API_BASE;
}

/**
 * Returns the configured model or a safe default.
 *
 * @returns {string} Model name.
 */
function getConfiguredModel() {
  var docProps = PropertiesService.getDocumentProperties();
  var model = docProps.getProperty(DOC_MODEL_PROPERTY);
  return model || resolveDefaultModel();
}

/**
 * Returns the configured temperature value.
 *
 * @returns {number} Temperature.
 */
function getConfiguredTemperature() {
  var docProps = PropertiesService.getDocumentProperties();
  var value = docProps.getProperty(DOC_TEMPERATURE_PROPERTY);
  if (value === null) {
    return resolveDefaultTemperature();
  }
  var parsed = parseFloat(value);
  return isNaN(parsed) ? resolveDefaultTemperature() : parsed;
}

/**
 * Returns the configured max token value.
 *
 * @returns {number} Max tokens.
 */
function getConfiguredMaxTokens() {
  var docProps = PropertiesService.getDocumentProperties();
  var value = docProps.getProperty(DOC_MAX_TOKENS_PROPERTY);
  if (value === null) {
    return resolveDefaultMaxTokens();
  }
  var parsed = parseInt(value, 10);
  return isNaN(parsed) ? resolveDefaultMaxTokens() : parsed;
}

/**
 * Retrieves the stored API key for the current user.
 *
 * @returns {string} API key or empty string.
 */
function getStoredApiKey() {
  return PropertiesService.getUserProperties().getProperty(USER_API_KEY_PROPERTY) || '';
}

function resolveDefaultModel() {
  var scriptValue = PropertiesService.getScriptProperties().getProperty('DEFAULT_MODEL');
  return scriptValue || DEFAULT_MODEL_FALLBACK;
}

function resolveDefaultTemperature() {
  var scriptValue = PropertiesService.getScriptProperties().getProperty('DEFAULT_TEMPERATURE');
  if (scriptValue !== null) {
    var parsed = parseFloat(scriptValue);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return DEFAULT_TEMPERATURE_FALLBACK;
}

function resolveDefaultMaxTokens() {
  var scriptValue = PropertiesService.getScriptProperties().getProperty('DEFAULT_MAX_TOKENS');
  var parsed = parseInt(scriptValue, 10);
  if (!isNaN(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_MAX_TOKENS_FALLBACK;
}
