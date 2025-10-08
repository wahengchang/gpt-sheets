/**
 * Converts OpenAI responses into intermediate structures before final post-processing.
 */

var Shaper = (function() {
  function apply(options) {
    var content = (options.completion && options.completion.content) || '';
    var shape = options.shape;
    var schema = options.schema;
    var cfg = options.cfg || {};

    switch (shape) {
      case 'text':
        return { items: [content], diagnostics: {} };
      case 'list':
        return shapeList(content, options.targetCount, cfg);
      case 'record':
        return shapeRecord(content, schema, cfg);
      case 'record_list':
        return shapeRecordList(content, schema, options.targetCount, cfg);
      default:
        throw new Error('#GPT_INTERNAL Unsupported shape: ' + shape);
    }
  }

  function shapeList(content, targetCount, cfg) {
    var lines = content
      .split(/\r?\n/)
      .map(function(line) {
        return line.replace(/^\s*[-•*\d\.\)]+\s*/, '').trim();
      })
      .filter(function(line) {
        return Boolean(line);
      });

    if (lines.length === 0 && content) {
      lines = [content.trim()];
    }

    return {
      items: lines,
      diagnostics: {
        requested: targetCount,
        received: lines.length
      }
    };
  }

  function shapeRecord(content, schema, cfg) {
    if (!schema || !schema.fields || !schema.fields.length) {
      throw new Error('#GPT_BAD_SCHEMA Schema is required for record outputs.');
    }

    var parsed = parseRecord(content, schema, cfg);
    return {
      items: parsed ? [parsed] : [],
      diagnostics: {
        record_fields: schema.fields.length
      }
    };
  }

  function shapeRecordList(content, schema, targetCount, cfg) {
    if (!schema || !schema.fields || !schema.fields.length) {
      throw new Error('#GPT_BAD_SCHEMA Schema is required for record list outputs.');
    }

    var lines = content.split(/\r?\n/).filter(function(line) {
      return Boolean(line && line.trim());
    });

    var records = [];
    for (var i = 0; i < lines.length; i++) {
      var candidate = parseRecord(lines[i], schema, cfg);
      if (candidate) {
        records.push(candidate);
      }
    }

    if (!records.length) {
      var fallback = parseRecord(content, schema, cfg);
      if (fallback) {
        records = [fallback];
      }
    }

    return {
      items: records,
      diagnostics: {
        requested: targetCount,
        received: records.length
      }
    };
  }

  function parseRecord(text, schema, cfg) {
    if (!text) {
      return null;
    }

    var trimmed = String(text).trim();
    if (!trimmed) {
      return null;
    }

    var candidate = safeJsonParse(trimmed);
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      return projectSchema(candidate, schema, cfg);
    }

    var repaired = attemptJsonRepair(trimmed);
    if (repaired) {
      return projectSchema(repaired, schema, cfg);
    }

    var kvObject = parseKeyValuePairs(trimmed);
    if (kvObject) {
      return projectSchema(kvObject, schema, cfg);
    }

    if (cfg.strict) {
      throw new Error('#GPT_JSON_PARSE Unable to parse record output.');
    }

    return null;
  }

  function attemptJsonRepair(text) {
    var match = text.match(/\{[\s\S]*\}/);
    if (match) {
      var maybeJson = safeJsonParse(match[0]);
      if (maybeJson && typeof maybeJson === 'object' && !Array.isArray(maybeJson)) {
        return maybeJson;
      }
    }
    return null;
  }

  function parseKeyValuePairs(text) {
    var result = {};
    var lines = text.split(/\r?\n/);
    var matched = 0;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var separatorIndex = line.indexOf(':');
      if (separatorIndex === -1) {
        continue;
      }
      var key = line.slice(0, separatorIndex).trim();
      var value = line.slice(separatorIndex + 1).trim();
      if (!key) {
        continue;
      }
      result[normalizeSchemaKey(key)] = value;
      matched++;
    }
    return matched > 0 ? result : null;
  }

  function projectSchema(source, schema, cfg) {
    var projected = {};
    var fields = schema.fields;
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (source.hasOwnProperty(field.key)) {
        projected[field.key] = source[field.key];
      } else if (source.hasOwnProperty(field.key.toLowerCase())) {
        projected[field.key] = source[field.key.toLowerCase()];
      } else {
        projected[field.key] = '';
      }
    }
    return projected;
  }

  function normalizeSchemaKey(key) {
    return String(key)
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toLowerCase();
  }

  return {
    apply: apply
  };
})();
