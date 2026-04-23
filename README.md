# TwinMind — Live Suggestions Web App

> A real-time AI meeting copilot that listens to your voice, transcribes speech, and generates smart suggestions to help you stay engaged and effective in conversations. Built for the TwinMind April 2026 Engineering Assignment.

🔗 **Live Demo:** [https://twinmindlivesuggestions.netlify.app/]

📂 **GitHub Repo:** [https://github.com/SaiManoj-Prompts/TwinMind-live-suggestions]

---

## 🚀 Quick Start

### For Users
1. **Open the app:** Visit the live demo link.
2. **Enter your API key:** Click ⚙️ **Settings** → paste your [Groq API Key](https://console.groq.com) (starts with `gsk_`).
3. **Start talking:** Click the mic button or press `Space` to begin recording.
4. **Watch suggestions appear:** Every ~30 seconds, 3 new AI-powered suggestions will appear in the middle panel.
5. **Click any suggestion** to get a detailed answer in the chat panel.
6. **Export anytime:** Click 📤 Export to download your full session as JSON.

### For Developers
```bash
 Clone this repository
# 1. git clone [https://github.com/SaiManoj-Prompts/TwinMind-live-suggestions]
# 2. Open index.html in your browser
# 3. Enter your Groq API Key in Settings and start using!
```
## ✨ Features

### 🎙️ Smart Transcript (Left Panel)
- **Live Transcription:** Your speech is converted to text every ~30 seconds using Groq's Whisper model.
- **Dynamic Status:** Displays `Listening…`, `Recording paused`, or `IDLE` based on microphone state.
- **Keyboard Shortcut:** Press `Space` to start or stop recording (when not typing).
- **Auto-scroll:** New transcript lines automatically appear at the bottom.

---

### 💡 Context-Aware Suggestions (Middle Panel)
- **3 Fresh Suggestions per Batch:** Each refresh generates exactly three new, relevant suggestions.
- **Smart Variety:** Suggestions may include:
  - 🔵 Questions to ask next
  - 🟣 Talking points to expand on
  - 🟢 Answers to recently asked questions
  - 🟠 Fact-checks for statements made
  - 🔷 Clarifications when context is unclear
- **Clickable Cards:** Click any suggestion to receive a detailed, context-aware response in the chat panel.
- **Manual Refresh:** Click `🔄` to instantly generate a new set of suggestions.

---

### 💬 Detailed Chat (Right Panel)
- **Expand on Suggestions:** Clicking a suggestion sends it to the chat with full context.
- **Ask Anything:** Enter your own questions using the input bar.
- **Session Memory:** The AI retains conversation context for coherent follow-ups.
- **Clean UI:** User messages appear on the right (blue), and AI responses on the left (dark).

---

### ⚙️ Flexible Settings
- **Custom Prompts:** Modify suggestion and chat prompts to tailor AI behavior.
- **Context Window:** Configure how much transcript history is used  
  - Default: `500 chars` (suggestions)  
  - Default: `2000 chars` (chat)
- **Theme Toggle:** Switch instantly between Dark and Light mode.

## 🛠️ Tech Stack

| Layer              | Technology                          | Why?                                                                 |
|-------------------|-------------------------------------|----------------------------------------------------------------------|
| **Frontend**      | HTML5, CSS3, Vanilla JavaScript     | Lightweight, no build step, easy to read and modify.                |
| **Audio Capture** | Web Audio API + MediaRecorder       | Native browser support for real-time microphone access.             |
| **Speech-to-Text**| Groq Whisper Large-v3               | Fast, accurate, and simple REST API integration.                    |
| **AI Logic**      | Groq openai/gpt-oss-120b            | High-quality reasoning model with JSON mode support.                |
| **State Management** | JavaScript Objects + localStorage | Simple, transparent, no external dependencies.                      |
| **Styling**       | CSS Custom Properties (Variables)   | Enables instant light/dark theming without extra JavaScript.        |

## 🧠 Prompt Strategy

To ensure the app produces reliable and structured results, the prompts are designed to carefully manage context and enforce consistent output formats.

---

### 1. Live Suggestions (Middle Panel)
- **Intent Analysis:** The model is guided to interpret *why* something was said. For example, if a question is detected, it may generate a relevant answer rather than another question.
- **Strict Output:** Responses are constrained to JSON-only format to prevent UI breakage from extra conversational text.
- **Concise Context:** Only the last `500 characters` of the transcript are used. This keeps responses fast, cost-efficient, and focused on the immediate discussion.

---

### 2. Detailed Chat (Right Panel)
- **Deep Memory:** The context window is extended to `2000 characters`, allowing the model to retain broader conversation history for more meaningful follow-ups.
- **Reasoning Handling:** Since the model may generate internal reasoning (e.g., `<think>` tags), a regex-based parser in JavaScript removes these hidden steps and displays only the final answer.

## 📁 Project Structure
```
twinmind-live-suggestions/
├── index.html        # Main HTML structure
├── style.css         # All styles + dark/light theme variables
├── app.js            # All JavaScript logic (audio, API, UI)
└── README.md         # This file
```

## ✅ Deliverables Checklist

- [ ] **Public Deployed URL** (Netlify)
- [ ] **Public GitHub Repository** with clean commit history
- [ ] **User-Friendly README** (Setup, Tech Stack, Prompts, Tradeoffs)
- [ ] **Clean Code** (Readable, sensible abstractions, no dead code)
- [ ] **Export Functionality** (Full session JSON download)
