/**
 * Configuration resolution by merging user overrides with defaults.
 */

var DefaultsResolver = (function() {
  var INTERNAL_DEFAULTS = {
    model: 'gpt-4.1-mini',
    max_tokens: 512,
    temperature: 0.3,
    system_message: '',
    tool: null,
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
    if (tool === undefined || tool === null || tool === '') {
      return null;
    }

    var parsed = parseToolValue(tool);
    if (!parsed) {
      return null;
    }

    if (typeof parsed === 'string') {
      var lowered = parsed.trim().toLowerCase();
      if (!lowered || lowered === 'none') {
        return null;
      }
      if (lowered === 'web_search') {
        return {
          name: 'web_search',
          parameters: {}
        };
      }
      throw new Error('#GPT_TOOL_UNKNOWN Unsupported tool: ' + parsed);
    }

    if (typeof parsed === 'object') {
      var nameCandidate = parsed.name || parsed.type || parsed.tool;
      if (nameCandidate === undefined || nameCandidate === null || nameCandidate === '') {
        throw new Error('#GPT_TOOL_BAD_SPEC Tool specification is missing a name.');
      }

      var normalizedName = String(nameCandidate).trim().toLowerCase();
      if (!normalizedName || normalizedName === 'none') {
        return null;
      }

      if (normalizedName === 'web_search') {
        return {
          name: 'web_search',
          parameters: extractToolParameters(parsed, 'web_search')
        };
      }

      throw new Error('#GPT_TOOL_UNKNOWN Unsupported tool: ' + nameCandidate);
    }

    throw new Error('#GPT_TOOL_BAD_SPEC Unrecognized tool specification.');
  }

  function parseToolValue(tool) {
    if (tool === undefined || tool === null) {
      return null;
    }

    if (typeof tool === 'string') {
      var trimmed = tool.trim();
      if (!trimmed) {
        return null;
      }
      if (trimmed === 'none') {
        return null;
      }
      var firstChar = trimmed.charAt(0);
      if (firstChar === '{' || firstChar === '[') {
        try {
          return JSON.parse(trimmed);
        } catch (err) {
          throw new Error('#GPT_TOOL_BAD_SPEC Unable to parse tool specification: ' + err.message);
        }
      }
      return trimmed;
    }

    if (typeof tool === 'object') {
      return tool;
    }

    return String(tool);
  }

  function extractToolParameters(spec, toolName) {
    var merged = {};
    if (!spec || typeof spec !== 'object') {
      return merged;
    }

    var sources = [spec.parameters, spec.args, spec.arguments];
    if (toolName === 'web_search') {
      sources.push(spec.web_search);
    }

    for (var i = 0; i < sources.length; i++) {
      merged = mergePlainObject(merged, sources[i]);
    }

    for (var key in spec) {
      if (!Object.prototype.hasOwnProperty.call(spec, key)) {
        continue;
      }
      if (
        key === 'name' ||
        key === 'type' ||
        key === 'tool' ||
        key === 'parameters' ||
        key === 'args' ||
        key === 'arguments' ||
        key === 'web_search'
      ) {
        continue;
      }
      merged[key] = spec[key];
    }

    return sanitizePlainObject(merged);
  }

  function mergePlainObject(target, source) {
    if (!source || typeof source !== 'object') {
      return target;
    }

    var result = {};
    for (var key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        result[key] = target[key];
      }
    }

    for (var sourceKey in source) {
      if (Object.prototype.hasOwnProperty.call(source, sourceKey)) {
        result[sourceKey] = source[sourceKey];
      }
    }

    return result;
  }

  function sanitizePlainObject(candidate, depth) {
    if (!candidate || typeof candidate !== 'object') {
      return {};
    }

    var currentDepth = typeof depth === 'number' ? depth : 0;
    if (currentDepth > 3) {
      return {};
    }

    var sanitized = {};
    for (var key in candidate) {
      if (!Object.prototype.hasOwnProperty.call(candidate, key)) {
        continue;
      }
      var value = candidate[key];
      if (value === undefined) {
        continue;
      }
      if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
        continue;
      }
      if (Array.isArray(value)) {
        sanitized[key] = value
          .filter(function(item) {
            return (
              item === null ||
              typeof item === 'string' ||
              typeof item === 'number' ||
              typeof item === 'boolean'
            );
          })
          .slice(0, 10);
        continue;
      }
      if (typeof value === 'object') {
        sanitized[key] = sanitizePlainObject(value, currentDepth + 1);
      }
    }
    return sanitized;
  }

  return {
    resolve: resolve
  };
})();
