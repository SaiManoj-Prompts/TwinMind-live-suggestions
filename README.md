# TwinMind — Live Suggestions Web App

> A real-time AI meeting copilot that listens to your voice, transcribes speech, and generates smart, context-aware suggestions to help you stay sharp during conversations. Built for the TwinMind April 2026 Engineering Assignment.

🔗 **Live Demo:** [Insert Your Netlify/GitHub Pages URL Here]  
📂 **GitHub Repo:** [Insert Your Repository URL Here]

---

## 🚀 What This App Does

This is an AI helper for live conversations. It listens to what you say, writes it down as text, and gives you helpful ideas while you are talking. Think of it like having a smart assistant sitting next to you during important conversations, whispering useful suggestions in your ear.

The screen is divided into three simple parts:

### 1. Left Side (Transcript) — "What is being said"
This is where the app listens to your voice and turns it into text. Every ~30 seconds, it adds new text to the list so you can see what was just said.
- **Example:** If you say: *"We need to finish the design by Friday, but the engineering team needs more time."*
- **Transcript shows:** 
  `11:30:00 AM | We need to finish the design by Friday`  
  `11:30:30 AM | but the engineering team needs more time`

### 2. Middle Side (Live Suggestions) — "Helpful ideas"
This is the smart helper. It reads your recent words and instantly gives you 3 useful ideas. These can be questions, talking points, fact-checks, answers, or clarifications.
- **Example:** If the transcript says: *"We need two more engineers, but budget approval is pending."*
- **Suggestions might be:**
  1. **Question:** "When will the budget be approved?"
  2. **Talking Point:** "We could start with contractors while waiting"
  3. **Fact Check:** "Current hiring timeline is 6-8 weeks"

### 3. Right Side (Chat) — "Detailed explanations"
This is for deeper answers. If you click one of the suggestions in the middle, this side explains it fully. You can also type your own questions here. The AI remembers the full conversation so answers stay accurate.
- **Example:** If you click *"When will the budget be approved?"*
- **Chat might say:**  
  *"This is a critical question. Based on the conversation, you should ask: 'Can you confirm the exact date when budget approval is expected?' This helps you plan your hiring timeline and set expectations with stakeholders."*

---

## 💼 Real-Life Use Cases

### In Job Interviews
- **You say:** "I worked on cloud infrastructure for 3 years."
- **Suggestion:** "Mention specific technologies like AWS or Azure"
- **Click → Chat:** "Add details about AWS EC2, S3, and Lambda to show depth."
- **Result:** You give a stronger, more specific answer.

### In Sales Calls
- **Customer says:** "Your pricing is higher than competitors."
- **Suggestion:** "Explain the ROI and long-term savings"
- **Click → Chat:** "Show them how your product saves 10 hours/week, which equals $500/month in labor costs."
- **Result:** You handle the objection professionally.

### In Team Meetings
- **Teammate says:** "We might miss the July launch."
- **Suggestion:** "Ask what's blocking progress"
- **Click → Chat:** "Ask: 'What specific tasks are behind schedule?' to identify the root cause."
- **Result:** You lead the conversation toward solutions.

### In Brainstorming Sessions
- **Someone says:** "We could add a dark mode."
- **Suggestion:** "Suggest checking user analytics first"
- **Click → Chat:** "Before building, check if users are requesting this in support tickets."
- **Result:** You make data-driven decisions.

---

## ⚡ Quick Start

### For Users
1. Open the app in your browser.
2. Click ⚙️ **Settings** and paste your Groq API Key (starts with `gsk_`).
3. Click the 🔴 **Start** button or press `Space` to begin recording.
4. Talk normally. Your words appear on the left, and 3 smart ideas appear in the middle every 30 seconds.
5. Click any idea to see a detailed answer on the right.
6. Click 📤 **Export** to save your full session as a JSON file.

### For Developers
```bash
# 1. Clone the repository
git clone [Your-Repo-URL]

# 2. Open index.html in your browser
# 3. Enter your Groq API Key in the Settings panel
# 4. No build step or installation required!
✨ Key Features
🎙️ Live Transcription: Converts speech to text every ~30 seconds using Groq's Whisper model
💡 Smart Suggestions: Exactly 3 context-aware ideas per batch (Questions, Talking Points, Answers, Fact-Checks, Clarifications)
💬 Interactive Chat: Click suggestions for detailed answers or ask your own questions
⌨️ Keyboard Shortcut: Press Space to start/stop recording (when not typing)
🌓 Theme Toggle: Switch between Dark and Light modes instantly
📤 Session Export: Download transcript + suggestions + chat as a structured JSON file
🔒 Privacy-First: Everything runs in your browser. No backend server, no data stored externally

🛠️ Tech Stack
| Layer           | Technology                        | Why?                                                              |
| --------------- | --------------------------------- | ----------------------------------------------------------------- |
| Frontend        | HTML5, CSS3, Vanilla JavaScript   | Lightweight, no build steps, easy to read and maintain            |
| Audio Capture   | Web Audio API + MediaRecorder     | Native browser support for real-time microphone access            |
| Speech-to-Text  | Groq whisper-large-v3             | Fast, accurate transcription with simple REST API                 |
| AI Reasoning    | Groq openai/gpt-oss-120b          | High-quality reasoning model with strong context understanding    |
| Styling         | CSS Custom Properties (Variables) | Enables instant light/dark theming with zero JavaScript logic     |
| State & Storage | JavaScript Objects + localStorage | Simple, transparent data management. API key stays on your device |


🧠 Prompt Engineering Strategy

To ensure the app provides reliable, useful results, the prompts are designed carefully to manage context and enforce clean outputs.

1. Live Suggestions (Middle Panel)
Focused Context: Only the last 500 characters of the transcript are used. This keeps responses relevant and fast.
Strict Output: JSON-only responses are enforced. No markdown or extra text, which keeps parsing stable.
Intent-Aware: The AI analyzes why something was said and mixes suggestion types naturally.
2. Detailed Chat (Right Panel)
Deep Memory: Uses up to 2000 characters of context for better follow-up answers.
Reasoning Model Handling: The model produces hidden thinking tags. A custom parser removes them and shows only the final clean response.

⚖️ Design Decisions & Tradeoffs

| Decision                 | Why It Was Chosen                                                    |
| ------------------------ | -------------------------------------------------------------------- |
| No Backend Server        | Runs fully in the browser, reducing latency and keeping data private |
| 30-Second Audio Chunks   | Balanced between responsiveness and API efficiency                   |
| Vanilla JavaScript       | No frameworks, easier to review, zero setup                          |
| LocalStorage for API Key | Simple and user-controlled without backend complexity                |
| Fixed 3 Suggestions      | Predictable UI and easier testing                                    |

📁 Project Structure

twinmind-live-suggestions/
├── index.html        # Main UI structure and layout
├── style.css         # All styling, themes, and animations
├── app.js            # Core logic (audio capture, API calls, UI updates)
└── README.md         # This instruction manual

🎯 What Makes This Different

Most AI tools help after a meeting. This one helps during the conversation.

It acts like a real-time coach, nudging you with:

Ask this question now
Mention this detail
Double-check that fact
Try this response

That live feedback is what makes TwinMind stand out.

📝 Example Session
11:30:00 AM — You start the mic and begin your interview
11:30:30 AM — You say: "I have experience with machine learning."
→ Suggestion: "Give a specific project example"
→ Chat: "Mention the customer churn prediction model you built that improved accuracy by 15%"
11:31:00 AM — Interviewer asks: "What's your biggest weakness?"
→ Suggestion: "Use the 'area of improvement' framework"
→ Chat: "Say: 'I used to struggle with public speaking, so I joined Toastmasters and now lead weekly team presentations'"
11:31:30 AM — You export the session for later review

This is what real-time AI assistance looks like.

✅ Deliverables Checklist
Public Deployed URL (Netlify or GitHub Pages)
Public GitHub Repository with clean commit history
Clear README (setup, tech stack, prompts, tradeoffs)
Clean and readable code
Fully working real-time system
Exportable session data (JSON with timestamps)

Note: No login required. Just paste your API key and start speaking.

Built with ❤️ using Groq API. Simple, fast, and private.
