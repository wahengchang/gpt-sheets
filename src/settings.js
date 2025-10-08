/**
 * Opens the settings sidebar.
 */
function openSettingsSidebar() {
  var html = HtmlService.createTemplateFromFile('sidebar')
    .evaluate()
    .setTitle('GPT for Sheets Settings')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Returns the current settings payload for the sidebar UI.
 *
 * @returns {Object} Settings payload.
 */
function getSettings() {
  var userProps = PropertiesService.getUserProperties();
  var docProps = PropertiesService.getDocumentProperties();
  var defaults = getSettingsDefaults();

  var apiKey = userProps.getProperty(USER_API_KEY_PROPERTY);
  var hasApiKey = Boolean(apiKey);
  var masked = hasApiKey ? maskApiKey(apiKey) : '';

  var model = docProps.getProperty(DOC_MODEL_PROPERTY) || defaults.model;
  var temperatureRaw = docProps.getProperty(DOC_TEMPERATURE_PROPERTY);
  var maxTokensRaw = docProps.getProperty(DOC_MAX_TOKENS_PROPERTY);

  return {
    hasApiKey: hasApiKey,
    apiKeyMasked: masked,
    model: model,
    temperature: parseFloat(temperatureRaw || defaults.temperature),
    maxTokens: parseInt(maxTokensRaw || defaults.maxTokens, 10),
    defaults: defaults
  };
}

/**
 * Saves settings posted from the sidebar.
 *
 * @param {Object} payload Settings from client.
 * @returns {{message: string}} Confirmation message.
 */
function saveSettings(payload) {
  if (!payload) {
    throw new Error('No settings payload received.');
  }

  var userProps = PropertiesService.getUserProperties();
  var docProps = PropertiesService.getDocumentProperties();
  var trimmedKey = (payload.apiKey || '').trim();
  var retainsExistingKey = Boolean(payload.retainExistingKey);
  var hasExistingKey = Boolean(userProps.getProperty(USER_API_KEY_PROPERTY));

  if (trimmedKey && !isValidApiKeyFormat(trimmedKey)) {
    throw new Error('Enter a valid OpenAI API key (starts with "sk-").');
  }

  if (trimmedKey) {
    userProps.setProperty(USER_API_KEY_PROPERTY, trimmedKey);
  } else if (!retainsExistingKey) {
    // User cleared the key intentionally.
    userProps.deleteProperty(USER_API_KEY_PROPERTY);
  } else if (!hasExistingKey && !trimmedKey) {
    throw new Error('Add your OpenAI API key before saving.');
  }

  var defaults = getSettingsDefaults();
  var model = (payload.model || defaults.model).trim();
  if (!model) {
    model = defaults.model;
  }

  var temperature = normalizeTemperature(payload.temperature, defaults.temperature);
  var maxTokens = normalizeMaxTokens(payload.maxTokens, defaults.maxTokens);

  docProps.setProperty(DOC_MODEL_PROPERTY, model);
  docProps.setProperty(DOC_TEMPERATURE_PROPERTY, String(temperature));
  docProps.setProperty(DOC_MAX_TOKENS_PROPERTY, String(maxTokens));

  return { message: 'Settings saved successfully.' };
}

/**
 * Tests the API key against OpenAI.
 *
 * @param {Object} payload Keys that might include a transient apiKey override.
 * @returns {{success: boolean, message: string}} Result.
 */
function testConnection(payload) {
  var candidateKey = payload && payload.apiKey ? payload.apiKey.trim() : '';
  var keyToTest = candidateKey || getStoredApiKey();

  if (!keyToTest) {
    return {
      success: false,
      message: 'Add your OpenAI API key before testing.'
    };
  }

  try {
    var response = UrlFetchApp.fetch('https://api.openai.com/v1/models', {
      method: 'get',
      muteHttpExceptions: true,
      headers: {
        Authorization: 'Bearer ' + keyToTest
      }
    });

    var code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      return {
        success: true,
        message: 'API key is valid.'
      };
    }

    var errorMessage = 'Invalid API key. Please double-check and try again.';
    try {
      var body = JSON.parse(response.getContentText());
      if (body && body.error && body.error.message) {
        errorMessage = body.error.message;
      }
    } catch (e) {
      // Ignore JSON parse issues.
    }

    return {
      success: false,
      message: errorMessage
    };
  } catch (err) {
    return {
      success: false,
      message: 'Unable to contact OpenAI: ' + err.message
    };
  }
}

function getSettingsDefaults() {
  return {
    model: resolveDefaultModel(),
    temperature: resolveDefaultTemperature(),
    maxTokens: resolveDefaultMaxTokens()
  };
}

function normalizeTemperature(value, fallback) {
  var parsed = parseFloat(value);
  if (isNaN(parsed)) {
    return fallback;
  }
  if (parsed < 0) {
    return 0;
  }
  if (parsed > 2) {
    return 2;
  }
  return Math.round(parsed * 100) / 100;
}

function normalizeMaxTokens(value, fallback) {
  var parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    return fallback;
  }
  if (parsed < 1) {
    return 1;
  }
  if (parsed > 32768) {
    return 32768;
  }
  return parsed;
}

function maskApiKey(key) {
  if (!key) {
    return '';
  }

  var visibleSuffix = key.slice(-4);
  var maskedLength = Math.max(0, key.length - 4);
  return new Array(maskedLength + 1).join('*') + visibleSuffix;
}

function isValidApiKeyFormat(key) {
  return /^sk-[A-Za-z0-9]{20,}$/.test(key);
}
