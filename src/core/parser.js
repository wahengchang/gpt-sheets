/**
 * Argument parsing for GPT for Sheets formulas.
 */

var ParamParser = (function() {
  var INTERNAL_DEFAULT_COUNT = 10;
  var INTERNAL_HARD_CAP = 200;
  var COUNT_PHRASES = {
    'a few': 3,
    'a couple': 2,
    'a dozen': 12,
    dozen: 12
  };

  var LIST_KEYWORDS = /(ideas|items|names|options|headlines|examples|questions|facts|insights|products|suggestions)/i;

  /**
   * Parses arguments coming from the Apps Script facade.
   *
   * @param {Shape} shape Desired output shape.
   * @param {IArguments} rawArgs Raw arguments object.
   * @returns {GenerateArgs & { inferredCount: number }}
   */
  function fromArgs(shape, rawArgs) {
    var args = Array.prototype.slice.call(rawArgs || []);
    if (!args.length || isBlank(args[0])) {
      throw new Error('#GPT_INTERNAL Missing prompt text.');
    }

    var text = String(args[0]);
    var index = 1;
    var schemaSpec = null;

    if (shape === 'record' || shape === 'record_list') {
      var schemaSource = args[index++];
      schemaSpec = parseSchema(schemaSource);
    }

    var systemMessage = toUndefinedString(args[index++]);
    var model = toUndefinedString(args[index++]);
    var maxTokens = toPositiveIntOrUndefined(args[index++]);
    var temperature = toNumberOrUndefined(args[index++]);
    var tool = toUndefinedString(args[index++]);

    var inferredCount = inferCount(text);

    return {
      shape: shape,
      text: text,
      schema: schemaSpec,
      inferredCount: inferredCount,
      cfg: {
        model: model,
        max_tokens: maxTokens,
        temperature: temperature,
        system_message: systemMessage,
        tool: tool
      }
    };
  }

  function parseSchema(schemaSource) {
    if (schemaSource === undefined || schemaSource === null || schemaSource === '') {
      throw new Error('#GPT_BAD_SCHEMA Schema is required for record outputs.');
    }

    if (typeof schemaSource !== 'string') {
      schemaSource = String(schemaSource);
    }

    var segments = schemaSource
      .split(';')
      .map(function(segment) {
        return segment.trim();
      })
      .filter(function(segment) {
        return Boolean(segment);
      });

    if (!segments.length) {
      throw new Error('#GPT_BAD_SCHEMA Provide fields using "name:type;" syntax.');
    }

    var fields = segments.map(function(segment) {
      var parts = segment.split(':');
      var rawKey = parts[0] ? parts[0].trim() : '';
      if (!rawKey) {
        throw new Error('#GPT_BAD_SCHEMA Missing field name in schema segment: ' + segment);
      }
      var key = normalizeSchemaKey(rawKey);
      var type = 'string';
      if (parts.length > 1 && parts[1]) {
        type = normalizeSchemaType(parts[1]);
      }
      return {
        key: key,
        type: type
      };
    });

    return { fields: fields };
  }

  function normalizeSchemaKey(key) {
    return key
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toLowerCase();
  }

  function normalizeSchemaType(type) {
    var normalized = String(type).trim().toLowerCase();
    switch (normalized) {
      case 'string':
      case 'number':
      case 'boolean':
      case 'date':
      case 'currency':
        return normalized;
      default:
        throw new Error('#GPT_BAD_SCHEMA Unsupported field type: ' + type);
    }
  }

  function inferCount(text) {
    if (!text) {
      return INTERNAL_DEFAULT_COUNT;
    }

    var lowered = text.toLowerCase();
    for (var phrase in COUNT_PHRASES) {
      if (COUNT_PHRASES.hasOwnProperty(phrase) && lowered.indexOf(phrase) !== -1) {
        return clampCount(COUNT_PHRASES[phrase]);
      }
    }

    var numberMatch = text.match(/\b(?:top\s+(\d+)|(\d+)\s+(?:[a-z]+)|list\s+(\d+))\b/i);
    if (numberMatch) {
      var num = parseInt(numberMatch[1] || numberMatch[2] || numberMatch[3], 10);
      if (!isNaN(num)) {
        return clampCount(num);
      }
    }

    var chineseMatch = text.match(/([一二三四五六七八九十百千两]+)(个|条|项|名|名字|新闻)/);
    if (chineseMatch) {
      var mapped = chineseNumeralToNumber(chineseMatch[1]);
      if (mapped) {
        return clampCount(mapped);
      }
    }

    var digits = text.match(/(\d{1,3})/g);
    if (digits && LIST_KEYWORDS.test(text)) {
      var last = parseInt(digits[digits.length - 1], 10);
      if (!isNaN(last)) {
        return clampCount(last);
      }
    }

    return INTERNAL_DEFAULT_COUNT;
  }

  function clampCount(value) {
    if (!value || value < 1) {
      return 1;
    }
    if (value > INTERNAL_HARD_CAP) {
      return INTERNAL_HARD_CAP;
    }
    return value;
  }

  function chineseNumeralToNumber(text) {
    var numerals = {
      一: 1,
      二: 2,
      两: 2,
      三: 3,
      四: 4,
      五: 5,
      六: 6,
      七: 7,
      八: 8,
      九: 9,
      十: 10
    };
    if (!text) {
      return 0;
    }
    if (text.length === 1) {
      return numerals[text] || 0;
    }
    if (text === '十') {
      return 10;
    }
    if (text.indexOf('十') !== -1) {
      var parts = text.split('十');
      var tens = parts[0] ? numerals[parts[0]] || 1 : 1;
      var ones = parts[1] ? numerals[parts[1]] || 0 : 0;
      return tens * 10 + ones;
    }
    return 0;
  }

  function toUndefinedString(value) {
    if (value === undefined || value === null) {
      return undefined;
    }
    var trimmed = String(value).trim();
    return trimmed ? trimmed : undefined;
  }

  function toNumberOrUndefined(value) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    var parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  }

  function toPositiveIntOrUndefined(value) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    var parsed = parseInt(value, 10);
    return isNaN(parsed) || parsed <= 0 ? undefined : parsed;
  }

  function isBlank(value) {
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
  }

  return {
    fromArgs: fromArgs
  };
})();
