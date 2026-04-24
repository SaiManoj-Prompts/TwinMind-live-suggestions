# TwinMind - Live Suggestions Web App

TwinMind is a real-time AI meeting copilot. It listens to a live conversation, turns speech into a transcript, generates useful suggestions, and lets the user ask follow-up questions with the meeting context.

This project is built as a simple browser app using HTML, CSS, and vanilla JavaScript. It does not need a backend, database, or build step.

Live demo: https://twinmindlivesuggestions.netlify.app/  
GitHub repo: https://github.com/SaiManoj-Prompts/TwinMind-live-suggestions

## What It Does

TwinMind helps users stay focused during meetings instead of manually taking notes.

The app has three main panels:

| Panel | Purpose |
| --- | --- |
| Mic and Transcript | Records short audio chunks and converts speech into searchable transcript text. |
| Live Suggestions | Generates helpful suggestions from the latest conversation context every capture cycle. |
| Detailed Answers | Lets the user ask questions, expand suggestions, summarize the meeting, and create follow-ups. |

## Main Features

- Live microphone recording from the browser.
- Speech-to-text transcription using Groq `whisper-large-v3`.
- Automatic suggestion generation after each capture interval, default 30 seconds.
- Suggestions can include questions, answers, talking points, and fact checks.
- Fallback suggestion handling so the UI still provides useful cards if the AI returns an unexpected format.
- Click a suggestion to ask the chat for a detailed answer.
- Quick prompts for summaries, decisions, and follow-up actions.
- Transcript search and copy.
- Save useful suggestions for later.
- Filter suggestions by type.
- Export the full session as JSON.
- Demo mode to explore the app without an API key.
- Light and dark themes.
- Settings for API key, model name, prompts, capture interval, and context windows.

## How To Use

1. Open the live demo or run the app locally.
2. Click the Settings button.
3. Paste a Groq API key that starts with `gsk_`.
4. Click Save settings.
5. Click the mic button or press Space to start recording.
6. Speak naturally during the meeting.
7. Watch transcript lines appear in the left panel.
8. Review AI suggestions in the middle panel.
9. Click Ask on a suggestion, or type your own question in the chat panel.
10. Export the session when finished.

You can also click Demo to load sample data without using an API key.

## Running Locally

Microphone access works best on `localhost` or HTTPS. Use the included local server:

```bash
node server.js 8080
```

Then open:

```text
http://127.0.0.1:8080
```

No `npm install` is required.

## Project Structure

```text
twinmind-app/
|-- index.html   # Page structure and app layout
|-- style.css    # UI styling, themes, responsive layout
|-- app.js       # Recording, Groq API calls, suggestions, chat, export
|-- server.js    # Small local static server
`-- README.md    # Project documentation
```

## Tech Stack

| Layer | Technology | Why It Was Used |
| --- | --- | --- |
| Frontend | HTML, CSS, JavaScript | Simple, fast, and easy to review. |
| Audio capture | Browser MediaRecorder API | Native microphone recording in modern browsers. |
| Transcription | Groq Whisper Large V3 | Fast speech-to-text for recorded audio chunks. |
| Suggestions and chat | Groq OpenAI-compatible chat API | Generates context-aware suggestions and detailed answers. |
| Storage | localStorage | Saves settings and theme in the browser. |
| Server | Small Node static server | Used only for local development and microphone-safe localhost access. |

## How The App Works

1. The browser records audio in short chunks.
2. Each audio chunk is sent to Groq Whisper for transcription.
3. The new transcript text is added to the transcript panel.
4. The latest transcript context is sent to the chat model.
5. The model returns suggestions for the current conversation.
6. The user can save, copy, filter, or expand suggestions.
7. The chat panel uses the transcript as context for detailed answers.

## Prompt Strategy

The suggestion prompt asks the model to return exactly three useful items in JSON format. The app supports four suggestion types:

| Type | Meaning |
| --- | --- |
| `QUESTION` | A question the user may want to ask next. |
| `ANSWER` | A direct answer to something raised in the conversation. |
| `TALKING_POINT` | A useful point to mention or expand on. |
| `FACT_CHECK` | A claim, number, date, or assumption worth verifying. |

The app also includes tolerant parsing. If the AI returns fields like `text`, `suggestion`, `question`, or `answer` instead of `content`, TwinMind still turns them into suggestion cards.

If the AI response is unusable, the app creates fallback suggestions from the latest transcript instead of leaving the user stuck.

## Settings

Users can change:

- Groq API key.
- Suggestion prompt.
- Chat prompt.
- Suggestion context length.
- Chat context length.
- Theme preference.

The API key and settings are stored in the browser's `localStorage`.

## Export

The Export button downloads a JSON file with:

- Export time.
- Session duration.
- Word count.
- Transcript lines.
- Suggestion batches.
- Saved suggestions.
- Chat history.
- Main settings used during the session.

## Design Notes

- The layout uses three clear columns so the user can see transcript, suggestions, and chat at the same time.
- Each panel includes short helper text so first-time users understand what the app is doing.
- The UI is dense enough for real meeting use, but still simple enough for a recruiter or reviewer to understand quickly.
- Demo mode makes the project easy to evaluate even without a Groq API key.

## Current Limitations

- The app stores session data in memory, so refreshing the page clears the active session.
- The Groq API key is stored in browser `localStorage`, which is convenient for a demo but not ideal for a production enterprise app.
- Audio quality depends on the user's microphone and browser permissions.
- The app does not use a database or user accounts.

## Recruiter Notes

This project demonstrates:

- Browser audio capture.
- Real-time AI workflow design.
- Prompt engineering for structured output.
- Defensive parsing for imperfect model responses.
- Practical UI/UX design for a meeting assistant.
- Vanilla JavaScript state management.
- Clean export and demo flows for easier review.
