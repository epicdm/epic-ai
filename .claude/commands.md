# Claude Code Quick Reference

## Starting Claude Code
```bash
# Start in current directory
claude

# Start with specific task
claude "create the authentication pages"

# Resume previous session
claude --resume
```

## In-Session Commands
```
/help           - Show available commands
/clear          - Clear conversation history
/compact        - Summarize and compact history
/cost           - Show token usage
/config         - View/edit configuration
/memory         - View project memory
/quit           - Exit Claude Code
```

## Tips for This Project

1. **Always start from project root**: `cd ~/projects/epic-ai`

2. **Reference the CLAUDE.md**: Claude Code reads this automatically

3. **For large tasks**, break into steps:
   - "First, create the database schema for users"
   - "Next, create the API routes for users"
   - "Finally, create the user management UI"

4. **Check status after each task**:
   - `pnpm build` - ensure no errors
   - `pnpm lint` - check code quality
   - `pnpm dev` - test manually

5. **Commit frequently**:
   - After each working feature
   - With descriptive messages
