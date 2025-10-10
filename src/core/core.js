/**
 * Core orchestration for GPT for Sheets formulas.
 */

var Core = (function() {
  /**
   * Runs the full generation pipeline for a given shape and argument list.
   *
   * @param {Shape} shape The desired output shape.
   * @param {IArguments} rawArgs Raw `arguments` from the facade.
   * @returns {string[][]} Spill-ready single-column array.
   */
  function generate(shape, rawArgs) {
    var parsed = ParamParser.fromArgs(shape, rawArgs);
    var resolved = DefaultsResolver.resolve(parsed);
    var targetCount = parsed.inferredCount || resolved.default_inferred_count;
    if (targetCount > resolved.hard_count_cap) {
      targetCount = resolved.hard_count_cap;
    }

    var toolResult = ToolRunner.run(resolved.tool, parsed.text, {
      cfg: resolved,
      shape: shape,
      targetCount: targetCount
    });

    var prompt = PromptBuilder.build({
      shape: shape,
      text: parsed.text,
      schema: parsed.schema,
      cfg: resolved,
      targetCount: targetCount,
      toolResult: toolResult
    });

    var completion = OpenAIClient.chat({
      model: resolved.model,
      messages: prompt.messages,
      temperature: resolved.temperature,
      max_tokens: resolved.max_tokens,
      tool: toolResult && toolResult.toolSpec
    });

    var shaped = Shaper.apply({
      shape: shape,
      completion: completion,
      schema: parsed.schema,
      cfg: resolved,
      targetCount: targetCount,
      toolResult: toolResult
    });

    return PostProcessor.postProcess({
      shape: shape,
      items: shaped.items,
      schema: parsed.schema,
      cfg: resolved,
      targetCount: targetCount,
      diagnostics: mergeDiagnostics(toolResult.diagnostics, shaped.diagnostics)
    });
  }

  function mergeDiagnostics() {
    var diagnostics = {};
    for (var i = 0; i < arguments.length; i++) {
      var source = arguments[i];
      if (!source) {
        continue;
      }
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          diagnostics[key] = source[key];
        }
      }
    }
    return diagnostics;
  }

  return {
    generate: generate
  };
})();
