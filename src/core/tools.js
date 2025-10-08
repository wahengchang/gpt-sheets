/**
 * Tool registry and runner.
 */

var ToolRunner = (function() {
  function run(toolName, text, context) {
    if (!toolName) {
      return { contextText: '', diagnostics: {} };
    }

    if (toolName !== 'web_search') {
      throw new Error('#GPT_TOOL_UNKNOWN Unsupported tool: ' + toolName);
    }

    try {
      var result = runWebSearchTool(text, context);
      return result;
    } catch (err) {
      debugLog('Tool failed, falling back without context:', err && err.message);
      return {
        contextText: '',
        diagnostics: {
          tool_error: err && err.message
        }
      };
    }
  }

  function runWebSearchTool(text, context) {
    // Stub implementation: in v1 we simply return a placeholder context so the
    // prompt builder can include a deterministic hint without making external calls.
    var sanitizedPrompt = (text || '').slice(0, 300);
    return {
      contextText:
        'Web search context is not yet available. Use your general knowledge to answer the prompt: ' +
        sanitizedPrompt,
      diagnostics: {
        tool_used: 'web_search',
        tool_mode: 'stub'
      }
    };
  }

  return {
    run: run
  };
})();
