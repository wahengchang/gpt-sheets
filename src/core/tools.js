/**
 * Tool registry and runner.
 */

var ToolRunner = (function() {
  function run(toolConfig, text, context) {
    if (!toolConfig) {
      return buildEmptyResult();
    }

    var name = normalizeToolName(toolConfig);
    if (name !== 'web_search') {
      throw new Error('#GPT_TOOL_UNKNOWN Unsupported tool: ' + name);
    }

    try {
      return prepareWebSearchTool(toolConfig, text, context);
    } catch (err) {
      debugLog('Tool failed, falling back without context:', err && err.message);
      return {
        contextText: buildFallbackContext(text),
        diagnostics: {
          tool_error: err && err.message,
          tool_used: 'web_search',
          tool_mode: 'stub'
        },
        toolSpec: null
      };
    }
  }

  function prepareWebSearchTool(toolConfig, text, context) {
    var sanitized = sanitizeWebSearchParameters(toolConfig && toolConfig.parameters, text);
    var queryForContext = sanitized.search_query || '';

    return {
      contextText: buildWebSearchContext(text, queryForContext, sanitized),
      diagnostics: {
        tool_used: 'web_search',
        tool_mode: 'openai',
        tool_query: queryForContext,
        tool_parameters: JSON.stringify(sanitized)
      },
      toolSpec: {
        name: 'web_search',
        parameters: sanitized
      }
    };
  }

  function sanitizeWebSearchParameters(rawParameters, promptText) {
    var params = clonePlainObject(rawParameters);
    var normalized = {};

    var queryCandidate = firstDefined(params.search_query, params.query, params.q);
    var sanitizedQuery = sanitizeSearchQuery(queryCandidate !== undefined ? queryCandidate : promptText);
    if (!sanitizedQuery) {
      sanitizedQuery = sanitizeSearchQuery(promptText);
    }
    if (sanitizedQuery) {
      normalized.search_query = sanitizedQuery;
    }

    if (Object.prototype.hasOwnProperty.call(params, 'max_results')) {
      var parsedMax = parseInt(params.max_results, 10);
      if (!isNaN(parsedMax)) {
        normalized.max_results = clamp(parsedMax, 1, 25);
      }
    }

    if (Object.prototype.hasOwnProperty.call(params, 'recency_filter')) {
      var recency = sanitizeString(params.recency_filter, 32);
      if (recency) {
        normalized.recency_filter = recency;
      }
    }

    if (Object.prototype.hasOwnProperty.call(params, 'include_images')) {
      normalized.include_images = Boolean(params.include_images);
    }

    // Copy any remaining primitive parameters that we haven't handled explicitly.
    for (var key in params) {
      if (!Object.prototype.hasOwnProperty.call(params, key)) {
        continue;
      }
      if (
        key === 'search_query' ||
        key === 'query' ||
        key === 'q' ||
        key === 'max_results' ||
        key === 'recency_filter' ||
        key === 'include_images'
      ) {
        continue;
      }
      var value = params[key];
      if (value === undefined) {
        continue;
      }
      if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  function buildWebSearchContext(promptText, query, parameters) {
    var sanitizedPrompt = sanitizeString(promptText, 300);
    var sanitizedQuery = sanitizeString(query, 200);
    if (!sanitizedPrompt && sanitizedQuery) {
      sanitizedPrompt = sanitizedQuery;
    }
    var contextParts = [
      'A live web search has been requested for real-time data.',
      'Query: "' + sanitizedQuery + '".'
    ];

    var parameterSummary = summarizeWebSearchParameters(parameters);
    if (parameterSummary) {
      contextParts.push('Preferences: ' + parameterSummary + '.');
    }

    contextParts.push(
      'If the web search tool is unavailable, rely on your general knowledge to answer the prompt: ' +
        sanitizedPrompt
    );

    return contextParts.join(' ');
  }

  function buildFallbackContext(promptText) {
    return (
      'Web search context could not be retrieved. Use your general knowledge to answer the prompt: ' +
      sanitizeString(promptText, 300)
    );
  }

  function buildEmptyResult() {
    return { contextText: '', diagnostics: {}, toolSpec: null };
  }

  function normalizeToolName(toolConfig) {
    if (!toolConfig) {
      return '';
    }
    if (typeof toolConfig === 'string') {
      return toolConfig.trim().toLowerCase();
    }
    if (typeof toolConfig === 'object' && toolConfig.name) {
      return String(toolConfig.name).trim().toLowerCase();
    }
    throw new Error('#GPT_TOOL_BAD_SPEC Unable to determine tool name.');
  }

  function sanitizeSearchQuery(value) {
    var str = value === undefined || value === null ? '' : String(value);
    var collapsed = str.replace(/\s+/g, ' ').trim();
    if (!collapsed) {
      return '';
    }
    if (collapsed.length > 400) {
      return collapsed.slice(0, 400);
    }
    return collapsed;
  }

  function sanitizeString(value, maxLength) {
    if (value === undefined || value === null) {
      return '';
    }
    var str = String(value);
    if (!maxLength) {
      return str;
    }
    if (str.length > maxLength) {
      return str.slice(0, maxLength);
    }
    return str;
  }

  function summarizeWebSearchParameters(parameters) {
    if (!parameters || typeof parameters !== 'object') {
      return '';
    }

    var parts = [];

    if (parameters.max_results !== undefined) {
      parts.push('max results ' + parameters.max_results);
    }

    if (parameters.recency_filter) {
      parts.push('recency filter ' + sanitizeString(parameters.recency_filter, 60));
    }

    if (parameters.include_images !== undefined) {
      parts.push(parameters.include_images ? 'include images' : 'text-only results');
    }

    for (var key in parameters) {
      if (!Object.prototype.hasOwnProperty.call(parameters, key)) {
        continue;
      }
      if (
        key === 'search_query' ||
        key === 'max_results' ||
        key === 'recency_filter' ||
        key === 'include_images'
      ) {
        continue;
      }
      var value = parameters[key];
      if (value === undefined || value === null || value === '') {
        continue;
      }
      parts.push(key + ': ' + sanitizeString(value, 60));
    }

    return parts.join(', ');
  }

  function firstDefined() {
    for (var i = 0; i < arguments.length; i++) {
      var candidate = arguments[i];
      if (candidate !== undefined && candidate !== null && candidate !== '') {
        return candidate;
      }
    }
    return undefined;
  }

  function clonePlainObject(value) {
    if (!value || typeof value !== 'object') {
      return {};
    }

    var clone = {};
    for (var key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        clone[key] = value[key];
      }
    }
    return clone;
  }

  function clamp(value, min, max) {
    if (typeof value !== 'number' || isNaN(value)) {
      return min;
    }
    if (value < min) {
      return min;
    }
    if (value > max) {
      return max;
    }
    return value;
  }

  return {
    run: run
  };
})();
