# TwinMind — Live Suggestions Web App

## What is this app?
This is an AI helper for live conversations. It listens to what you say, writes it down as text, and gives you helpful ideas while you are talking. It is built for the TwinMind April 2026 Engineering Assignment.

Think of it like having a smart assistant sitting next to you during important conversations, whispering helpful suggestions in your ear.

## How it works
The screen has three parts:

### 1. Left Side (Transcript) - "What is being said"
This is where the app listens to your voice and turns it into text. Every 30 seconds, it adds new text to the list so you can see what was just said.

**Example:**
If you say: "We need to finish the design by Friday, but the engineering team needs more time."

The transcript shows:
- 11:30 AM: We need to finish the design by Friday
- 11:30:30 AM: but the engineering team needs more time

### 2. Middle Side (Live Suggestions) - "Helpful ideas"
This is the smart helper. It reads what you said and gives you 3 useful ideas instantly. These could be:
- A question to ask
- A talking point to mention
- A fact to check
- An answer to give
- Something to clarify

**Example:**
If the transcript says: "We need two more engineers, but budget approval is pending."

The suggestions might be:
1. **Question:** "When will the budget be approved?"
2. **Talking Point:** "We could start with contractors while waiting"
3. **Fact Check:** "Current hiring timeline is 6-8 weeks"

### 3. Right Side (Chat) - "Detailed explanations"
This is for deeper answers. If you click one of the suggestions in the middle, this side explains it fully. You can also type your own questions here.

**Example:**
If you click "When will the budget be approved?"

The chat might say:
"This is a critical question. Based on the conversation, you should ask: 'Can you confirm the exact date when budget approval is expected?' This helps you plan your hiring timeline and set expectations with stakeholders."

## Real-Life Use Cases

### In Job Interviews
**Situation:** You're being interviewed and the interviewer asks about your experience.

**What happens:**
- You speak: "I worked on cloud infrastructure for 3 years"
- Suggestion appears: "Mention specific technologies like AWS or Azure"
- You click it → Chat explains: "Add details about AWS EC2, S3, and Lambda to show depth"

**Result:** You give a stronger, more specific answer.

### In Sales Calls
**Situation:** A customer says your product is too expensive.

**What happens:**
- Customer speaks: "Your pricing is higher than competitors"
- Suggestion appears: "Explain the ROI and long-term savings"
- You click it → Chat explains: "Show them how your product saves 10 hours/week, which equals $500/month in labor costs"

**Result:** You handle the objection professionally.

### In Team Meetings
**Situation:** Your team is discussing a project deadline.

**What happens:**
- Team member says: "We might miss the July launch"
- Suggestion appears: "Ask what's blocking progress"
- You click it → Chat explains: "Ask: 'What specific tasks are behind schedule?' to identify the root cause"

**Result:** You lead the conversation toward solutions.

### In Brainstorming Sessions
**Situation:** Your team is generating ideas for a new feature.

**What happens:**
- Someone says: "We could add a dark mode"
- Suggestion appears: "Suggest checking user analytics first"
- You click it → Chat explains: "Before building, check if users are requesting this in support tickets"

**Result:** You make data-driven decisions.

## How to use it
1. Open the website in your browser.
2. Click the "Settings" button and paste your Groq API Key.
3. Click the "Start" button (microphone icon) and let the app listen to your microphone.
4. Talk normally. You will see your words appear on the left, and helpful ideas appear in the middle.
5. Click an idea to get a detailed answer on the right.
6. When you are done, click "Export" to save your conversation.

## Technology Used
- **Frontend:** HTML, CSS, and JavaScript (no complex frameworks).
- **AI Provider:** Groq.
- **Models:**
  - **Transcription:** Whisper Large V3 (turns speech into text).
  - **Suggestions & Chat:** GPT-OSS 120B (thinks and gives answers).

## How I built it (Prompt Strategy)

### 1. Live Suggestions
**What I did:**
- I told the AI to look at only the last 500 characters (about 3-5 minutes of conversation).
- I asked it to give exactly 3 ideas that are short and useful.
- I made sure it only gives back a clean list of ideas (JSON format) so the app doesn't crash.

**Why:**
- Too much context confuses the AI and makes it slow.
- Three suggestions is enough to be helpful without overwhelming you.
- Clean formatting means the app works reliably.

### 2. Detailed Chat
**What I did:**
- When you click an idea, I send the last 2000 characters of conversation history.
- This helps the AI remember what was said earlier.
- I use a "reasoning model" that thinks deeply before answering.

**Why:**
- Detailed answers need more context to be accurate.
- The reasoning model gives better, more thoughtful responses.

### 3. Decisions I made

**No Backend Server**
- I built this to run entirely in your browser.
- This makes it fast and simple.
- Your API key stays on your computer (not sent to any server).

**30-Second Chunks**
- The app listens for 30 seconds, writes the text, then starts again.
- This keeps the suggestions fresh and relevant.
- It matches how real conversations flow.

**Export Feature**
- The app saves everything: what was said, the ideas given, and the chat answers.
- Each item has a timestamp so you can review exactly when things happened.
- This helps you prepare for follow-up meetings or interviews.

## Files in this project
- `index.html`: The structure of the page (the skeleton).
- `style.css`: The design and colors (the clothes).
- `app.js`: The logic that makes the AI work (the brain).
- `README.md`: This file (the instruction manual).

## What makes this different
Most AI tools wait until after the meeting to give you notes. This app helps you **during** the conversation. It's like having a coach in your ear telling you:
- "Ask this question now"
- "Don't forget to mention that"
- "That fact might be wrong"
- "Here's how to answer"

This real-time help is what makes TwinMind special.

## Example Session
Here's what a real session might look like:

**11:30 AM** - You start the mic and begin your interview.

**11:30:30 AM** - You say: "I have experience with machine learning."
- **Suggestion appears:** "Give a specific project example"
- **You click it** → Chat says: "Mention the customer churn prediction model you built that improved accuracy by 15%"

**11:31:00 AM** - Interviewer asks: "What's your biggest weakness?"
- **Suggestion appears:** "Use the 'area of improvement' framework"
- **You click it** → Chat says: "Say: 'I used to struggle with public speaking, so I joined Toastmasters and now lead weekly team presentations'"

**11:31:30 AM** - You export the session and review all the suggestions you used.

This is the power of live AI assistance.