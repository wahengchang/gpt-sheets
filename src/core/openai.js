/**
 * OpenAI client wrapper around UrlFetchApp.
 */

var OpenAIClient = (function() {
  var API_URL = 'https://api.openai.com/v1/responses';
  var RETRY_COUNT = 1;
  var TIMEOUT_MS = 15000;

  function chat(request) {
    var apiKey = getStoredApiKey();
    if (!apiKey) {
      throw new Error('#GPT_NO_KEY Add your OpenAI API key via the settings sidebar.');
    }

    var payload = {
      model: request.model,
      input: buildResponseInput(request.messages)
    };

    if (typeof request.temperature === 'number') {
      payload.temperature = request.temperature;
    }

    if (request.max_tokens !== undefined && request.max_tokens !== null) {
      payload.max_output_tokens = request.max_tokens;
    }

    var toolPayload = null;
    if (request.tool) {
      toolPayload = buildToolPayload(request.tool);
      if (toolPayload) {
        payload.tools = [toolPayload];
      }
    }

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
          if (!body) {
            throw new Error('#GPT_INTERNAL Unexpected response from OpenAI.');
          }
          var content = extractTextFromResponse(body);
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
        if (toolPayload && isWebSearchUnsupportedError(err)) {
          debugLog('OpenAI rejected web_search tool, retrying without tool.');
          toolPayload = null;
          delete payload.tools;
          payload.input = buildResponseInput(request.messages);
          options.payload = JSON.stringify(payload);
          continue;
        }
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

  function buildToolPayload(tool) {
    if (!tool || !tool.name) {
      return null;
    }

    var name = String(tool.name).trim().toLowerCase();
    if (name !== 'web_search') {
      return null;
    }

    return { type: 'web_search' };
  }

  function isWebSearchUnsupportedError(err) {
    if (!err || !err.message) {
      return false;
    }

    var message = String(err.message);
    if (message.indexOf('web_search') === -1) {
      return false;
    }

    return (
      message.indexOf('Invalid value') !== -1 ||
      message.indexOf('Supported values are:') !== -1 ||
      message.indexOf('not enabled') !== -1
    );
  }

  function buildResponseInput(messages) {
    if (!messages || !messages.length) {
      return [{ role: 'user', content: [{ type: 'text', text: '' }] }];
    }

    var normalized = [];
    for (var i = 0; i < messages.length; i++) {
      var message = messages[i];
      if (!message) {
        continue;
      }

      var role = message.role || 'user';
      var content = normalizeMessageContent(message.content);
      if (!content.length) {
        continue;
      }

      normalized.push({
        role: role,
        content: content
      });
    }

    if (!normalized.length) {
      normalized.push({ role: 'user', content: [{ type: 'text', text: '' }] });
    }

    return normalized;
  }

  function normalizeMessageContent(content) {
    if (content === undefined || content === null) {
      return [{ type: 'text', text: '' }];
    }

    if (Array.isArray(content)) {
      return normalizeContentArray(content);
    }

    if (typeof content === 'object') {
      return normalizeContentObject(content);
    }

    return [{ type: 'text', text: String(content) }];
  }

  function normalizeContentArray(items) {
    var parts = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item === undefined || item === null) {
        continue;
      }
      if (typeof item === 'string') {
        parts.push({ type: 'text', text: item });
        continue;
      }
      if (typeof item === 'object') {
        var normalizedObject = normalizeContentObject(item);
        for (var j = 0; j < normalizedObject.length; j++) {
          parts.push(normalizedObject[j]);
        }
        continue;
      }
      parts.push({ type: 'text', text: String(item) });
    }

    if (!parts.length) {
      parts.push({ type: 'text', text: '' });
    }

    return parts;
  }

  function normalizeContentObject(item) {
    if (!item) {
      return [{ type: 'text', text: '' }];
    }

    if (typeof item === 'string') {
      return [{ type: 'text', text: item }];
    }

    if (item.type && item.text !== undefined) {
      if (item.type === 'output_text') {
        return [{ type: 'text', text: String(item.text) }];
      }
      if (item.type === 'text') {
        return [{ type: 'text', text: String(item.text) }];
      }
    }

    if (item.text !== undefined) {
      return [{ type: 'text', text: String(item.text) }];
    }

    return [{ type: 'text', text: JSON.stringify(item) }];
  }

  function extractTextFromResponse(body) {
    if (!body) {
      return '';
    }

    if (typeof body.output_text === 'string' && body.output_text) {
      return body.output_text;
    }

    if (Array.isArray(body.output)) {
      var collected = [];
      for (var i = 0; i < body.output.length; i++) {
        var entry = body.output[i];
        if (!entry || !entry.content || !entry.content.length) {
          continue;
        }
        for (var j = 0; j < entry.content.length; j++) {
          var chunk = entry.content[j];
          if (!chunk) {
            continue;
          }
          if (chunk.type === 'output_text' || chunk.type === 'text') {
            collected.push(chunk.text || '');
          }
        }
      }
      if (collected.length) {
        return collected.join('\n');
      }
    }

    if (body.choices && body.choices.length) {
      var choice = body.choices[0];
      if (choice && choice.message && choice.message.content) {
        return choice.message.content;
      }
    }

    return '';
  }

  return {
    chat: chat
  };
})();
