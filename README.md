# TwinMind - Live Suggestions Web App

TwinMind is a real-time AI meeting copilot.  
It listens to live conversation, converts speech to transcript, shows useful suggestions during the call, and gives detailed answers in chat.

This project was built for the **TwinMind Live Suggestions Assignment (April 2026)**.

Live demo: https://twinmindlivesuggestions.netlify.app/  
GitHub repo: https://github.com/SaiManoj-Prompts/TwinMind-live-suggestions

## Overview

The app follows the required 3-column layout:

1. **Mic and Transcript (left)**: start/stop mic, transcript chunks, auto-scroll.
2. **Live Suggestions (middle)**: 3 fresh suggestions per cycle, manual refresh, older batches kept below.
3. **Detailed Answers (right)**: click suggestion for expanded answer, or ask your own question.

Main goal: show the right suggestion at the right time while a conversation is happening.

## Requirements Coverage

### Functional requirements

| Requirement | Status |
| --- | --- |
| Start/stop mic | Implemented |
| Transcript updates in chunks around every 30 seconds | Implemented |
| Transcript auto-scroll to latest line | Implemented |
| Suggestions auto-refresh around every 30 seconds | Implemented |
| Manual refresh button | Implemented |
| Exactly 3 suggestions per batch | Implemented |
| New batch at top, older batches below | Implemented |
| Tappable suggestion cards with useful preview | Implemented |
| Click suggestion -> detailed answer in chat | Implemented |
| User can type direct questions in chat | Implemented |
| One continuous chat per session (no login) | Implemented |
| Export transcript + all suggestion batches + chat history | Implemented (JSON) |

### Technical requirements

| Requirement | Status |
| --- | --- |
| Transcription model: Groq Whisper Large V3 | Implemented (`whisper-large-v3`) |
| Suggestions/chat model: Groq GPT-OSS 120B | Implemented (`openai/gpt-oss-120b`) |
| User-pasted Groq API key in Settings | Implemented |
| Hardcoded default prompts and parameters, editable in UI | Implemented |
| Public URL and public/shared code repo | Included above |

## Quick Start

1. Run the local server:

```bash
node server.js 8080
```

2. Open:

```text
http://127.0.0.1:8080
```

3. Open **Settings** and paste your Groq API key (`gsk_...`).
4. Save settings.
5. Click the mic button (or press `Space`) to start.

No `npm install` is required.

## How a User Uses It

1. Start recording from the left panel.
2. Speak naturally; transcript lines appear in chunks with timestamps.
3. Watch the middle panel for live suggestion cards.
4. Use those suggestions directly in the conversation.
5. Click **Ask** on any card for a detailed answer in the right panel.
6. Use quick prompts (`Summarize`, `Decisions`, `Follow-ups`) when needed.
7. Save useful suggestions and export the session at the end.

## Feature Highlights

- Real-time transcript from browser mic input.
- Automatic suggestion batches every capture cycle (default 30s).
- Suggestion categories:
  - `QUESTION`
  - `ANSWER`
  - `FACT_CHECK`
  - `TALKING_POINT`
- Fallback logic if model output is malformed or not usable.
- Transcript search and copy.
- Suggestion save/filter workflow.
- Session export to JSON.
- Demo mode for trying the app without an API key.

## Prompt Strategy

### Live suggestion prompt

The default suggestion prompt is tuned for:

- Strict JSON output only.
- Exactly 3 short and actionable suggestions.
- Strong focus on recent transcript context.
- Better meeting usefulness (decisions, blockers, risks, next actions).

Clarification intent is folded into `QUESTION` to reduce overlap and keep the suggestions sharper.

### Detailed chat prompt

The default chat prompt is tuned for:

- Direct answer in the first sentence.
- Practical, transcript-grounded explanation.
- No fabricated facts.
- Clear next steps when obvious.
- 3-5 sentence response length.

## Settings

Users can edit:

- Groq API key
- Live suggestion prompt
- Chat prompt
- Suggestion context window
- Chat context window

The app ships with strong defaults, so a new user usually only needs to paste the API key and start.

## Stack Choices

| Layer | Choice | Reason |
| --- | --- | --- |
| Frontend | HTML, CSS, Vanilla JavaScript | Lightweight, readable, no build step |
| Audio capture | Browser MediaRecorder API | Native browser support |
| Speech-to-text | Groq Whisper Large V3 | Assignment model requirement |
| Suggestions/chat | Groq GPT-OSS 120B | Assignment model requirement |
| Local persistence | `localStorage` | Stores key, prompts, theme, settings |
| Local server | `server.js` | Simple localhost serving without extra tools |

## Export Format

Export includes:

- Export time
- Session metrics
- Transcript entries (with timestamps)
- Suggestion batches (with timestamps)
- Full chat history
- Active settings snapshot

## Tradeoffs

1. No database:
Session data is in memory for assignment speed and simplicity.

2. API key in browser storage:
Good for reviewer setup speed, not ideal for enterprise production security.

3. Fixed model choices:
Keeps evaluation focused on prompt quality and implementation quality.

4. Local static architecture:
Very easy to run and review, but not designed as a production multi-user backend.

## Project Structure

```text
twinmind-app/
|-- index.html   # Main app layout and settings modal
|-- style.css    # Theme and UI styling
|-- app.js       # Mic capture, API calls, suggestions, chat, export
|-- server.js    # Local static server
`-- README.md
```

## Key Takeaways

This project demonstrates:

- Prompt engineering for live, context-sensitive suggestion quality.
- Real-time browser audio capture and chunking.
- Practical LLM integration with strict output handling.
- Defensive parsing and graceful fallback behavior.
- Clear, usable UI focused on meeting workflow.
- Clean, easy-to-review JavaScript structure without framework overhead.
