/**
 * OpenAI client wrapper around UrlFetchApp.
 */

var OpenAIClient = (function() {
  var API_URL = 'https://api.openai.com/v1/chat/completions';
  var RETRY_COUNT = 1;
  var TIMEOUT_MS = 15000;

  function chat(request) {
    var apiKey = getStoredApiKey();
    if (!apiKey) {
      throw new Error('#GPT_NO_KEY Add your OpenAI API key via the settings sidebar.');
    }

    var payload = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.max_tokens
    };

    var options = {
      method: 'post',
      muteHttpExceptions: true,
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + apiKey
      },
      payload: JSON.stringify(payload),
      followRedirects: true,
      validateHttpsCertificates: true,
      escaping: false,
      timeout: TIMEOUT_MS
    };

    var attempt = 0;
    var lastError = null;
    while (attempt <= RETRY_COUNT) {
      try {
        var response = UrlFetchApp.fetch(API_URL, options);
        if (!response) {
          throw new Error('Empty response from OpenAI.');
        }
        var status = response.getResponseCode();
        if (status >= 200 && status < 300) {
          var body = safeJsonParse(response.getContentText());
          if (!body || !body.choices || !body.choices.length) {
            throw new Error('#GPT_INTERNAL Unexpected response from OpenAI.');
          }
          var content = body.choices[0].message && body.choices[0].message.content;
          return {
            content: content || '',
            raw: body,
            usage: body.usage || null
          };
        }

        var errorBody = safeJsonParse(response.getContentText());
        var message = (errorBody && errorBody.error && errorBody.error.message) || 'Unknown error.';
        if (status === 429) {
          throw new Error('#GPT_RATE_LIMIT ' + message);
        }
        if (status === 408) {
          throw new Error('#GPT_TIMEOUT ' + message);
        }
        throw new Error('#GPT_INTERNAL ' + message);
      } catch (err) {
        lastError = err;
        if (attempt >= RETRY_COUNT) {
          throw err;
        }
        Utilities.sleep(600 * (attempt + 1));
        attempt++;
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error('#GPT_INTERNAL Unknown failure contacting OpenAI.');
  }

  return {
    chat: chat
  };
})();
