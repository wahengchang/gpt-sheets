/**
 * Post-processing utilities to dedupe, truncate, and coerce outputs.
 */

var PostProcessor = (function() {
  function postProcess(options) {
    var shape = options.shape;
    var items = options.items || [];
    var cfg = options.cfg || {};
    var targetCount = options.targetCount || items.length;

    switch (shape) {
      case 'text':
        return wrapStrings(items.length ? [items[0]] : ['']);
      case 'list':
        return wrapStrings(applyListRules(items, targetCount, cfg));
      case 'record':
        return wrapRecord(items[0], options.schema, cfg);
      case 'record_list':
        return wrapRecordList(items, options.schema, targetCount, cfg);
      default:
        throw new Error('#GPT_INTERNAL Unknown shape: ' + shape);
    }
  }

  function applyListRules(items, targetCount, cfg) {
    var normalized = [];
    var seen = {};
    for (var i = 0; i < items.length; i++) {
      var item = String(items[i] || '').trim();
      if (!item) {
        continue;
      }
      var key = item
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
      if (seen[key]) {
        continue;
      }
      seen[key] = true;
      normalized.push(item);
      if (normalized.length >= cfg.hard_count_cap) {
        break;
      }
    }

    if (normalized.length > targetCount) {
      normalized = normalized.slice(0, targetCount);
    }

    return normalized.length ? normalized : ['(no results)'];
  }

  function wrapRecord(record, schema, cfg) {
    if (!record) {
      return [['(no data)']];
    }

    var rows = [];
    var fields = (schema && schema.fields) || [];
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      var coerced = coerceField(record[field.key], field.type);
      rows.push([field.key + ': ' + formatCoercedValue(coerced, field.type)]);
    }

    return rows.length ? rows : [['(no data)']];
  }

  function wrapRecordList(records, schema, targetCount, cfg) {
    var normalized = [];
    for (var i = 0; i < records.length; i++) {
      var record = records[i];
      if (!record) {
        continue;
      }
      var coerced = coerceRecord(record, schema);
      normalized.push(JSON.stringify(coerced));
      if (normalized.length >= cfg.hard_count_cap) {
        break;
      }
    }

    if (normalized.length > targetCount) {
      normalized = normalized.slice(0, targetCount);
    }

    return wrapStrings(normalized.length ? normalized : ['{}']);
  }

  function coerceRecord(record, schema) {
    var result = {};
    var fields = (schema && schema.fields) || [];
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      result[field.key] = coerceField(record[field.key], field.type);
    }
    return result;
  }

  function coerceField(value, type) {
    switch (type) {
      case 'number':
      case 'currency':
        var numberValue = parseFloat(value);
        return isNaN(numberValue) ? null : numberValue;
      case 'boolean':
        if (typeof value === 'boolean') {
          return value;
        }
        if (typeof value === 'string') {
          var lowered = value.toLowerCase();
          if (lowered === 'true' || lowered === 'yes') {
            return true;
          }
          if (lowered === 'false' || lowered === 'no') {
            return false;
          }
        }
        if (typeof value === 'number') {
          return value !== 0;
        }
        return null;
      case 'date':
        var dateValue = new Date(value);
        return isNaN(dateValue.getTime()) ? null : dateValue.toISOString();
      default:
        return value === undefined || value === null ? '' : String(value);
    }
  }

  function formatCoercedValue(value, type) {
    if (value === null || value === undefined) {
      return '';
    }
    if (type === 'currency') {
      return '$' + Number(value).toFixed(2);
    }
    if (type === 'number') {
      return String(value);
    }
    if (type === 'date') {
      return String(value).split('T')[0];
    }
    if (type === 'boolean') {
      return value ? 'true' : 'false';
    }
    return String(value);
  }

  function wrapStrings(items) {
    return items.map(function(item) {
      return [item === undefined || item === null ? '' : String(item)];
    });
  }

  return {
    postProcess: postProcess
  };
})();
