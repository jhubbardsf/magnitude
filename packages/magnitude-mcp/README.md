# Magnitude MCP

A Model Context Protocol (MCP) server that gives agents the ability to interact with a browser using the [Magnitude](https://github.com/sagekit/magnitude) framework.

## Requirements
Since Magnitude relies on vision-based browser interaction, the agent using this MCP must be **visually grounded**. Generally this means Claude (Sonnet 3.7/4, Opus 4) or Qwen VL series. See [docs](https://docs.magnitude.run/core-concepts/compatible-llms) for more info.

## Capabilities

Magnitude MCP enables the same browser actions as the Magnitude agent but for any MCP-compatible agent instead:
- 🖥️ Open a browser with a persistent profile
- 🖱️ Click, type, drag, etc. using pixel-based coordinates
- 👁️ Automatically see screenshot after each interaction
- ⚡ Take multiple actions at once for efficiency

## Installation
```sh
npm i -g magnitude-mcp@latest
```

MCP Configuration:
```json
{
  "mcpServers": {
    "magnitude": {
      "command": "npx",
      "args": [
        "magnitude-mcp"
      ]
    }
  }
}
```

## Claude Code Setup
```sh
claude mcp add magnitude -- npx magnitude-mcp
```

## Cline Setup

Go to `MCP Servers -> Marketplace`, search for `Magnitude`, click `Install`

## Cursor Setup

1. Open Cursor Settings
2. Go to Features > MCP Servers
3. Click "+ Add new global MCP server"
4. Enter the following code: 
```json
{
  "mcpServers": {
    "magnitude": {
      "command": "npx",
      "args": [
        "magnitude-mcp"
      ]
    }
  }
}
```

## Windsurf Setup
Add this to your `./codeium/windsurf/model_config.json`:
```json
{
  "mcpServers": {
    "magnitude": {
      "command": "npx",
      "args": [
        "magnitude-mcp"
      ]
    }
  }
}
```


## Configuration Options

The MCP can optionally be configured with a different persistent profile directory (for example if you want different projects to use their own browser cookies and local storage), to use stealth mode, or to change the default viewport dimensions.

```json
{
  "mcpServers": {
    "magnitude": {
      "command": "npx",
      "args": [
        "magnitude-mcp"
      ],
      "env": {
        "MAGNITUDE_MCP_PROFILE_DIR": "/Users/myuser/.magnitude/profiles/default",
        "MAGNITUDE_MCP_STEALTH": "true",
        "MAGNITUDE_MCP_VIEWPORT_WIDTH": "950",
        "MAGNITUDE_MCP_VIEWPORT_HEIGHT": "720"
      }
    }
  }
}
```
- `MAGNITUDE_MCP_PROFILE_DIR`: Stores cookies and local storage so that credentials can be re-used across agents using the MCP (default: `~/.magnitude/profiles/default`)
- `MAGNITUDE_MCP_STEALTH`: Add extra stealth settings to help with anti-bot detection (default: disabled)
- `MAGNITUDE_MCP_VIEWPORT_WIDTH`: Override viewport width (default: 950)
- `MAGNITUDE_MCP_VIEWPORT_HEIGHT`: Override viewport height (default: 720)

## Advanced Configuration

### Browser Inspection Features

Magnitude MCP provides advanced inspection capabilities beyond screenshots:

**Available Tools:**
- `get_page_html` - Get full HTML content of the page
- `get_accessibility_tree` - Get accessibility tree with interactive elements
- `get_console_logs` - Get captured browser console messages
- `get_network_requests` - Get captured network requests with headers and status codes
- `set_clipboard`, `copy`, `paste` - Clipboard operations for reliable form filling

**Feature Toggles:**

You can disable console or network monitoring to reduce token usage:

```json
{
  "mcpServers": {
    "magnitude": {
      "command": "npx",
      "args": ["magnitude-mcp"],
      "env": {
        "MAGNITUDE_MCP_ENABLE_CONSOLE": "false",
        "MAGNITUDE_MCP_ENABLE_NETWORK": "false"
      }
    }
  }
}
```

- `MAGNITUDE_MCP_ENABLE_CONSOLE`: Enable console log capture (default: `true`)
- `MAGNITUDE_MCP_ENABLE_NETWORK`: Enable network request capture (default: `true`)

### Console & Network Limits

To manage memory usage, Magnitude keeps only recent logs and requests:

```json
{
  "mcpServers": {
    "magnitude": {
      "command": "npx",
      "args": ["magnitude-mcp"],
      "env": {
        "MAGNITUDE_MCP_CONSOLE_LOG_LIMIT": "1000",
        "MAGNITUDE_MCP_NETWORK_REQUEST_LIMIT": "200"
      }
    }
  }
}
```

- `MAGNITUDE_MCP_CONSOLE_LOG_LIMIT`: Maximum console logs to retain (default: 500, minimum: 10)
- `MAGNITUDE_MCP_NETWORK_REQUEST_LIMIT`: Maximum network requests to retain (default: 100, minimum: 10)

**Note:** Setting very high limits may impact memory usage on long-running sessions.

## Examples

Why connect your agent to a browser?
- Enable coding agents to see and interact with web apps as they build
- Interact with sites that don't have APIs
- Browse documentation that isn't accessible with fetch
- Improvised testing
- Or whatever else you find use for!

It's even suitable for non-engineering tasks if you just want an easily accessible browser agent.

## Troubleshooting

### Model Compatibility

If the agent model is not Claude Sonnet 4, Sonnet 3.7, Opus 4, Qwen 2.5 VL, or Qwen 3 VL, it will probably not work with this MCP - because the vast majority of models cannot click accurately based on an image alone.

### AWS Bedrock Image Size Errors

When using Claude Code with AWS Bedrock (1M context), you may encounter:

```
API Error: 400 messages.16.content.1.image.source.base64.data:
At least one of the image dimensions exceed max allowed size for many-image requests: 2000 pixels
```

**Cause:** AWS Bedrock limits images to 2000 pixels per dimension for multi-image requests. On macOS with Retina displays, the default viewport (1024×768) uses 2x device scaling, producing 2048×1536 screenshots that exceed this limit.

**Solution:** Reduce viewport size in your MCP configuration:

```json
{
  "mcpServers": {
    "magnitude": {
      "command": "npx",
      "args": ["magnitude-mcp"],
      "env": {
        "MAGNITUDE_MCP_VIEWPORT_WIDTH": "950",
        "MAGNITUDE_MCP_VIEWPORT_HEIGHT": "720"
      }
    }
  }
}
```

**Why this works:** 950px × 2 (Retina scaling) = 1900px < 2000px limit ✅

**Note:** This issue only affects AWS Bedrock. The standard Anthropic API has more lenient image size limits.
