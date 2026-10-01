---
name: handoff
description: Create a detailed project handoff so another Claude session or account can continue the current coding task.
---

# Handoff

Create a complete handoff document for the current coding session.

## Before creating the handoff

1. Understand the current task and conversation.
2. Inspect the current project state.
3. Check `git status` and `git diff` if the project uses Git.
4. Inspect relevant files that were modified during this task.
5. Verify important technical details against the actual project files.
6. Do not expose secrets, passwords, API keys, tokens, or `.env` contents.

## Create

Create or update:

`CLAUDE_HANDOFF.md`

The document must contain:

### 1. Current Objective
What we are currently trying to accomplish.

### 2. Project Context
Relevant architecture, technologies, and relationships between components.

### 3. Current State
What currently works and what does not.

### 4. Files Changed
List files modified during this task and briefly explain each change.

### 5. Important Discoveries
Record important technical facts discovered during the session, including:
- API behavior
- database relationships
- frontend/backend field names
- important functions
- project conventions
- configuration details

### 6. Problems Found
List current bugs, errors, warnings, and unexpected behavior.

Include exact error messages when useful.

### 7. Failed Attempts
Record approaches that were tried and did not work.

Explain why they failed when known.

### 8. Decisions
Record important implementation decisions and their reasons.

### 9. Testing
Record:
- tests performed
- commands executed
- results
- things that have not yet been tested

Never claim something works unless it has been verified.

### 10. Remaining Work
List everything that still needs to be completed.

### 11. Immediate Next Step
State the exact next action another Claude should take.

### 12. Warnings
Mention anything another Claude must be careful not to change or assume.

## Rules

- The actual project files are the source of truth.
- Do not copy large amounts of source code into the handoff.
- Do not include secrets.
- Preserve exact filenames, function names, API endpoints, database fields, and error messages when relevant.
- Do not claim something is complete without verification.
- Keep the handoff concise but detailed enough for another Claude to continue immediately.
- If `CLAUDE_HANDOFF.md` already exists, update it with the current state rather than blindly replacing useful information.
- Finish with the single most important next action.