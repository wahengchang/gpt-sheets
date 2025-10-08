/**
 * Configuration resolution by merging user overrides with defaults.
 */

var DefaultsResolver = (function() {
  var INTERNAL_DEFAULTS = {
    model: 'gpt-4.1-mini',
    max_tokens: 512,
    temperature: 0.3,
    system_message: '',
    tool: '',
    default_inferred_count: 10,
    hard_count_cap: 200,
    strict: false
  };

  function resolve(parsedArgs) {
    var scriptProps = PropertiesService.getScriptProperties();
    var docProps = PropertiesService.getDocumentProperties();

    var cfg = parsedArgs.cfg || {};
    var resolved = {
      model: pickFirstDefined(
        cfg.model,
        docProps.getProperty('OPENAI_MODEL'),
        scriptProps.getProperty('DEFAULT_MODEL'),
        INTERNAL_DEFAULTS.model
      ),
      max_tokens: toNumberWithFallback(
        cfg.max_tokens,
        docProps.getProperty('OPENAI_MAX_TOKENS'),
        scriptProps.getProperty('DEFAULT_MAX_TOKENS'),
        INTERNAL_DEFAULTS.max_tokens
      ),
      temperature: toFloatWithFallback(
        cfg.temperature,
        docProps.getProperty('OPENAI_TEMPERATURE'),
        scriptProps.getProperty('DEFAULT_TEMPERATURE'),
        INTERNAL_DEFAULTS.temperature
      ),
      system_message: pickFirstDefined(
        cfg.system_message,
        docProps.getProperty('OPENAI_SYSTEM_MESSAGE'),
        scriptProps.getProperty('DEFAULT_SYSTEM_MESSAGE'),
        INTERNAL_DEFAULTS.system_message
      ),
      tool: normalizeTool(
        pickFirstDefined(
          cfg.tool,
          docProps.getProperty('OPENAI_DEFAULT_TOOL'),
          scriptProps.getProperty('DEFAULT_TOOL'),
          INTERNAL_DEFAULTS.tool
        )
      ),
      default_inferred_count: toNumberWithFallback(
        parsedArgs.inferredCount,
        docProps.getProperty('OPENAI_DEFAULT_COUNT'),
        scriptProps.getProperty('DEFAULT_COUNT'),
        INTERNAL_DEFAULTS.default_inferred_count
      ),
      hard_count_cap: toNumberWithFallback(
        undefined,
        docProps.getProperty('OPENAI_HARD_COUNT_CAP'),
        scriptProps.getProperty('HARD_COUNT_CAP'),
        INTERNAL_DEFAULTS.hard_count_cap
      ),
      strict: pickFirstDefined(
        undefined,
        parseBoolean(docProps.getProperty('OPENAI_STRICT_MODE')),
        parseBoolean(scriptProps.getProperty('STRICT_MODE')),
        INTERNAL_DEFAULTS.strict
      )
    };

    resolved.hard_count_cap = clamp(resolved.hard_count_cap, 1, 1000);
    resolved.temperature = clamp(resolved.temperature, 0, 2);
    resolved.max_tokens = clamp(resolved.max_tokens, 1, 32768);
    resolved.default_inferred_count = clamp(resolved.default_inferred_count, 1, resolved.hard_count_cap);

    return resolved;
  }

  function pickFirstDefined() {
    for (var i = 0; i < arguments.length; i++) {
      var value = arguments[i];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    return undefined;
  }

  function toNumberWithFallback(primary) {
    var fallbacks = Array.prototype.slice.call(arguments, 1);
    var candidate = parseInt(primary, 10);
    if (!isNaN(candidate) && candidate > 0) {
      return candidate;
    }
    for (var i = 0; i < fallbacks.length; i++) {
      var fallbackValue = parseInt(fallbacks[i], 10);
      if (!isNaN(fallbackValue) && fallbackValue > 0) {
        return fallbackValue;
      }
    }
    return 0;
  }

  function toFloatWithFallback(primary) {
    var fallbacks = Array.prototype.slice.call(arguments, 1);
    var candidate = parseFloat(primary);
    if (!isNaN(candidate)) {
      return candidate;
    }
    for (var i = 0; i < fallbacks.length; i++) {
      var fallbackValue = parseFloat(fallbacks[i]);
      if (!isNaN(fallbackValue)) {
        return fallbackValue;
      }
    }
    return 0;
  }

  function parseBoolean(value) {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      var lowered = value.toLowerCase();
      if (lowered === 'true') {
        return true;
      }
      if (lowered === 'false') {
        return false;
      }
    }
    return undefined;
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

  function normalizeTool(tool) {
    if (!tool) {
      return '';
    }
    var trimmed = String(tool).trim().toLowerCase();
    if (!trimmed || trimmed === 'none') {
      return '';
    }
    if (trimmed === 'web_search') {
      return 'web_search';
    }
    throw new Error('#GPT_TOOL_UNKNOWN Unsupported tool: ' + tool);
  }

  return {
    resolve: resolve
  };
})();
