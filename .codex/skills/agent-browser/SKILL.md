---
name: agent-browser
description: Automates browser interactions for web testing, form filling, screenshots, recordings, and data extraction using the agent-browser CLI. Use when the user needs to navigate websites, interact with web pages, test flows, or capture evidence.
allowed-tools: Bash(agent-browser:*)
---

# Browser Automation with agent-browser

## Quick start

```bash
agent-browser open <url>
agent-browser snapshot -i
agent-browser click @e1
agent-browser fill @e2 "text"
agent-browser close
```

## Core workflow

- Always use `snapshot -i` to get refs (`@e1`, `@e2`).
- Prefer interacting by `@refs` over brittle CSS selectors.
- Re-snapshot after navigation or significant DOM changes.
- Use `wait` (`--url`, `--text`, `--load networkidle`) when needed.
- Capture evidence with `screenshot`, `pdf`, or `record`.

## Command reference

### Navigation

```bash
agent-browser open <url>
agent-browser back
agent-browser forward
agent-browser reload
agent-browser close
```

### Snapshot options

```bash
agent-browser snapshot -i
agent-browser snapshot -c
agent-browser snapshot -d 3
agent-browser snapshot -s "#main"
```

### Interactions

```bash
agent-browser click @e1
agent-browser dblclick @e1
agent-browser focus @e1
agent-browser fill @e2 "text"
agent-browser type @e2 "more"
agent-browser press Enter
agent-browser hover @e1
agent-browser check @e3
agent-browser uncheck @e3
agent-browser select @e4 "value"
agent-browser scroll down 500
agent-browser scrollintoview @e5
agent-browser drag @e6 @e7
agent-browser upload @e8 file.pdf
```

### Get information

```bash
agent-browser get text @e1
agent-browser get html @e1
agent-browser get value @e2
agent-browser get attr @e3 href
agent-browser get title
agent-browser get url
agent-browser get count ".item"
agent-browser get box @e4
```

### Check state

```bash
agent-browser is visible @e1
agent-browser is enabled @e2
agent-browser is checked @e3
```

### Screenshots & PDF

```bash
agent-browser screenshot
agent-browser screenshot --full
agent-browser screenshot page.png
agent-browser pdf output.pdf
```

### Video recording

```bash
agent-browser record start ./demo.webm
agent-browser record stop
agent-browser record restart ./take2.webm
```

### Wait

```bash
agent-browser wait @e1
agent-browser wait 2000
agent-browser wait --text "Success"
agent-browser wait --url "**/dashboard"
agent-browser wait --load networkidle
```

### Semantic locators

```bash
agent-browser find role button click --name "Submit"
agent-browser find text "Sign In" click
agent-browser find label "Email" fill "user@test.com"
agent-browser find first ".item" click
agent-browser find nth 2 "a" text
```

### Sessions and JSON output

```bash
agent-browser --session test1 open https://example.com
agent-browser --session test2 open https://example.org
agent-browser snapshot -i --json
agent-browser get text @e1 --json
```

### Debugging

```bash
agent-browser console
agent-browser errors
agent-browser highlight @e1
agent-browser trace start
agent-browser trace stop trace.zip
agent-browser state save auth.json
agent-browser state load auth.json
```

## Worked examples

### Form submission flow (snapshot refs)

```bash
agent-browser open https://example.com/form
agent-browser snapshot -i
agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password123"
agent-browser click @e3
agent-browser wait --load networkidle
agent-browser snapshot -i
```

### Login once + state save/load

```bash
agent-browser open https://app.example.com/login
agent-browser snapshot -i
agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password123"
agent-browser click @e3
agent-browser wait --url "**/dashboard"
agent-browser state save auth.json

agent-browser state load auth.json
agent-browser open https://app.example.com/dashboard
```
