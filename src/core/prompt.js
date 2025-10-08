/**
 * Prompt construction helpers.
 */

var PromptBuilder = (function() {
  function build(options) {
    var cfg = options.cfg || {};
    var systemParts = [];
    if (cfg.system_message) {
      systemParts.push(cfg.system_message);
    }

    if (options.toolResult && options.toolResult.contextText) {
      systemParts.push('Tool context:\n' + options.toolResult.contextText);
    }

    var shapeInstruction = buildShapeInstruction(options.shape, options);
    if (shapeInstruction) {
      systemParts.push(shapeInstruction);
    }

    var messages = [];
    if (systemParts.length) {
      messages.push({ role: 'system', content: systemParts.join('\n\n') });
    }

    messages.push({
      role: 'user',
      content: buildUserContent(options)
    });

    return { messages: messages };
  }

  function buildShapeInstruction(shape, options) {
    switch (shape) {
      case 'list':
        return (
          'Return a list with ' +
          options.targetCount +
          ' items. Respond with one item per line without numbering or bullet characters.'
        );
      case 'record':
        return buildRecordInstruction(options.schema, false);
      case 'record_list':
        return (
          buildRecordInstruction(options.schema, true) +
          '\nReturn exactly ' +
          options.targetCount +
          ' JSON lines, each line representing one object.'
        );
      default:
        return '';
    }
  }

  function buildRecordInstruction(schema, plural) {
    var intro = plural
      ? 'Return structured JSON objects that follow this schema:'
      : 'Return a JSON object that follows this schema:';
    var fields = (schema && schema.fields) || [];
    var fieldDescriptions = fields
      .map(function(field) {
        return field.key + ': ' + field.type;
      })
      .join(', ');
    return (
      intro +
      ' { ' +
      fieldDescriptions +
      ' }. Respond only with valid JSON, without commentary or code fences.'
    );
  }

  function buildUserContent(options) {
    var userParts = [options.text];
    if (options.shape === 'list') {
      userParts.push('Number of items needed: ' + options.targetCount + '.');
    }
    if (options.shape === 'record_list') {
      userParts.push('Produce ' + options.targetCount + ' entries as JSON lines.');
    }
    return userParts.join('\n\n');
  }

  return {
    build: build
  };
})();
