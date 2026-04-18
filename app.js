// ==========================================
// TWINMIND APP - Complete Logic
// Models: whisper-large-v3 (transcription), openai/gpt-oss-120b (suggestions/chat)
// ==========================================

// --- CONFIGURATION ---
const CONFIG = {
  groqBaseUrl: "https://api.groq.com/openai/v1",
  whisperModel: "whisper-large-v3",
  chatModel: "openai/gpt-oss-120b" // Exact model ID from Groq Playground
};

// --- PROMPTS ---
// Optimized for strict JSON output to prevent parsing errors
const DEFAULT_SUGGESTION_PROMPT = `You are TwinMind, an expert AI meeting copilot. Analyze the live conversation and generate EXACTLY 3 actionable, context-aware suggestions.

Allowed types: QUESTION, TALKING_POINT, FACT_CHECK, ANSWER, CLARIFICATION.

Output Format:
Return ONLY a valid JSON array. No markdown, no explanations, no extra text.
Format:
[
  {"type": "QUESTION", "content": "Concise question here"},
  {"type": "TALKING_POINT", "content": "Key point to raise"},
  {"type": "FACT_CHECK", "content": "Verification or correction"}
]

Rules:
- Keep content under 15 words per suggestion.
- Base on immediate context.
- Avoid repetition.`;

const DEFAULT_CHAT_PROMPT = `You are TwinMind's detailed answer engine. The user clicked a suggestion or asked a question during a live conversation.

Provide a thorough, structured response (3-5 sentences). Reference specific transcript details when relevant. Be actionable, accurate, and conversational.`;

// --- APP STATE ---
let state = {
  apiKey: "",
  isRecording: false,
  mediaRecorder: null,
  audioChunks: [],
  transcript: [],        // [{time, text}]
  chatHistory: [],       // [{role, content}]
  suggestionBatches: [], // [{timestamp, suggestions}] - For Export
  refreshInterval: null,
  suggestionPrompt: DEFAULT_SUGGESTION_PROMPT,
  chatPrompt: DEFAULT_CHAT_PROMPT,
  suggestionContextChars: 500,
  chatContextChars: 2000
};

// --- DOM ELEMENTS ---
const els = {
  micBtn: document.getElementById('micBtn'),
  transcriptBox: document.getElementById('transcript'),
  suggestionsBox: document.getElementById('suggestions'),
  refreshBtn: document.getElementById('refreshBtn'),
  chatBox: document.getElementById('chat'),
  chatInput: document.getElementById('chatInput'),
  sendBtn: document.getElementById('sendBtn'),
  exportBtn: document.getElementById('exportBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettings: document.getElementById('closeSettings'),
  saveSettings: document.getElementById('saveSettings'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  suggestionPromptInput: document.getElementById('suggestionPromptInput'),
  chatPromptInput: document.getElementById('chatPromptInput'),
  suggestionContextInput: document.getElementById('suggestionContextInput'),
  chatContextInput: document.getElementById('chatContextInput'),
  batchCount: document.getElementById('batchCount')
};

// ==========================================
// INITIALIZATION
// ==========================================
function init() {
  // Load saved API key
  const savedKey = localStorage.getItem('twinmind_api_key');
  if (savedKey) {
    state.apiKey = savedKey;
    els.apiKeyInput.value = savedKey;
  } else {
    toggleSettings(true); // Prompt for key on first run
  }

  // Pre-fill settings with defaults
  els.suggestionPromptInput.value = state.suggestionPrompt;
  els.chatPromptInput.value = state.chatPrompt;
  els.suggestionContextInput.value = state.suggestionContextChars;
  els.chatContextInput.value = state.chatContextChars;

  // Event listeners
  els.micBtn.addEventListener('click', toggleMic);
  els.refreshBtn.addEventListener('click', manualRefresh);
  els.sendBtn.addEventListener('click', sendChatMessage);
  els.chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });
  els.exportBtn.addEventListener('click', exportSession);
  els.settingsBtn.addEventListener('click', () => toggleSettings(true));
  els.closeSettings.addEventListener('click', () => toggleSettings(false));
  els.saveSettings.addEventListener('click', saveSettingsHandler);
}

// ==========================================
// MICROPHONE & AUDIO (30s Chunking)
// ==========================================
async function toggleMic() {
  if (!state.apiKey) {
    alert("Please enter your Groq API Key in Settings first.");
    toggleSettings(true);
    return;
  }
  state.isRecording ? stopRecording() : await startRecording();
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.mediaRecorder = new MediaRecorder(stream);
    state.audioChunks = [];

    state.mediaRecorder.ondataavailable = (e) => state.audioChunks.push(e.data);
    
    // When recording stops (every 30s), process the chunk
    state.mediaRecorder.onstop = async () => {
      const blob = new Blob(state.audioChunks, { type: 'audio/webm' });
      await processAudioChunk(blob);
    };

    state.mediaRecorder.start();
    state.isRecording = true;
    updateMicUI(true);

    // Auto-chunk every 30 seconds (stop -> process -> restart)
    state.refreshInterval = setInterval(() => {
      if (state.isRecording && state.mediaRecorder.state === 'recording') {
        state.mediaRecorder.stop();
      }
    }, 30000);

  } catch (err) {
    console.error("Mic error:", err);
    alert("Microphone access denied. Please allow permissions.");
  }
}

function stopRecording() {
  if (state.mediaRecorder?.state === 'recording') state.mediaRecorder.stop();
  clearInterval(state.refreshInterval);
  state.isRecording = false;
  updateMicUI(false);
}

function updateMicUI(isRec) {
  els.micBtn.querySelector('.btn-text').textContent = isRec ? "Stop" : "Start";
  els.micBtn.classList.toggle('recording', isRec);
}

// ==========================================
// GROQ API: TRANSCRIPTION (Whisper)
// ==========================================
async function processAudioChunk(blob) {
  if (!blob.size) return;

  const formData = new FormData();
  formData.append('file', blob, 'audio.webm');
  formData.append('model', CONFIG.whisperModel);

  try {
    const res = await fetch(`${CONFIG.groqBaseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${state.apiKey}` },
      body: formData
    });

    if (!res.ok) throw new Error(`Transcription ${res.status}: ${await res.text()}`);
    
    const data = await res.json();
    const newText = data.text?.trim();
    
    if (newText) {
      // 1. Add to transcript
      addTranscriptLine(newText);
      
      // 2. Generate suggestions based on the new text
      setTimeout(() => generateSuggestions(newText), 100);
    }

    // 3. Restart recording if still active
    if (state.isRecording) {
      state.audioChunks = [];
      state.mediaRecorder.start();
    }
  } catch (err) {
    console.error("Transcription error:", err);
  }
}

// ==========================================
// GROQ API: GENERATE SUGGESTIONS (Fixed Parsing)
// ==========================================
async function generateSuggestions(newChunk) {
  // Build context window
  const fullText = state.transcript.map(t => t.text).join(" ");
  const context = fullText.slice(-state.suggestionContextChars);
  const prompt = `${state.suggestionPrompt}\n\nRecent Context:\n${context}\n\nNew Input:\n${newChunk}`;

  try {
    const res = await fetch(`${CONFIG.groqBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.apiKey}`
      },
      body: JSON.stringify({
        model: CONFIG.chatModel,
        messages: [
          { role: 'system', content: "Output ONLY valid JSON array. No markdown, no code blocks, no explanations." },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
        max_completion_tokens: 500,
        reasoning_effort: "medium" // Required for gpt-oss-120b
      })
    });

    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    
    const data = await res.json();
    let raw = data.choices[0]?.message?.content || "";
    
    console.log("Raw AI Response:", raw);

    // --- ROBUST PARSING FOR REASONING MODELS ---
    // 1. Remove <think> tags (reasoning model quirk)
    let clean = raw.replace(/<think>[\s\S]*?<\/think>/gi, '');
    
    // 2. Remove markdown code blocks
    clean = clean.replace(/```json|```/g, '').trim();
    
    // 3. Extract JSON array using regex (finds first [ and last ])
    const match = clean.match(/\[[\s\S]*\]/);
    
    if (!match) throw new Error("No JSON array found in response");
    
    const suggestions = JSON.parse(match[0]);
    if (!Array.isArray(suggestions) || suggestions.length === 0) throw new Error("Invalid suggestion format");
    
    // Add to UI and State (for export)
    addSuggestionsBatch(suggestions);
    
  } catch (err) {
    console.error("Suggestion error:", err);
    els.suggestionsBox.innerHTML = `<p style="color:#ff6b6b;padding:15px;">⚠️ ${err.message}<br><small>Check console (F12) for details</small></p>`;
  }
}

// ==========================================
// GROQ API: CHAT
// ==========================================
async function sendChatToAI(userMsg) {
  addChatMessage('user', userMsg);
  els.chatInput.value = '';

  // Build context
  const fullContext = state.transcript.map(t => t.text).join("\n").slice(-state.chatContextChars);
  const sysPrompt = `${state.chatPrompt}\n\nConversation Context:\n${fullContext}`;
  
  const messages = [
    { role: 'system', content: sysPrompt },
    ...state.chatHistory,
    { role: 'user', content: userMsg }
  ];

  const loadId = addChatMessage('assistant', 'Thinking...', true);

  try {
    const res = await fetch(`${CONFIG.groqBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.apiKey}`
      },
      body: JSON.stringify({
        model: CONFIG.chatModel,
        messages,
        temperature: 0.7,
        max_completion_tokens: 800,
        reasoning_effort: "medium"
      })
    });

    if (!res.ok) throw new Error(`Chat ${res.status}: ${await res.text()}`);
    
    const data = await res.json();
    const reply = data.choices[0]?.message?.content || "No response received.";
    
    removeChatMessage(loadId);
    addChatMessage('assistant', reply);
  } catch (err) {
    console.error("Chat error:", err);
    removeChatMessage(loadId);
    addChatMessage('assistant', `❌ Error: ${err.message}`);
  }
}

// ==========================================
// UI HELPERS
// ==========================================
function addTranscriptLine(text) {
  const time = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  state.transcript.push({ time, text });
  
  const div = document.createElement('div');
  div.className = 'transcript-line';
  div.innerHTML = `<span class="transcript-time">${time}</span> ${text}`;
  
  els.transcriptBox.appendChild(div);
  els.transcriptBox.scrollTop = els.transcriptBox.scrollHeight;
  
  const placeholder = els.transcriptBox.querySelector('.placeholder-text');
  if (placeholder) placeholder.remove();
}

function addSuggestionsBatch(items) {
  const batch = document.createElement('div');
  batch.className = 'suggestion-batch';
  
  // Remove placeholder
  const ph = els.suggestionsBox.querySelector('.placeholder-text');
  if (ph) ph.remove();

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'suggestion-card';
    
    const type = (item.type || 'SUGGESTION').toUpperCase();
    const cls = type.includes('QUESTION') ? 'tag-question' : 
                type.includes('TALKING') ? 'tag-talking-point' : 
                type.includes('FACT') ? 'tag-fact-check' : 'tag-answer';
    
    card.innerHTML = `
      <span class="suggestion-tag ${cls}">${type.replace('_', ' ')}</span>
      <div class="suggestion-text">${item.content}</div>
    `;
    
    card.addEventListener('click', () => sendChatToAI(`Expand on: "${item.content}"`));
    batch.prepend(card);
  });
  
  els.suggestionsBox.prepend(batch);
  
  // Save to state for export
  state.suggestionBatches.push({ 
    timestamp: new Date().toISOString(), 
    items: items 
  });
  
  updateBatchCount();
}

function updateBatchCount() {
  const batches = document.querySelectorAll('.suggestion-batch');
  if (els.batchCount) els.batchCount.textContent = `${batches.length} BATCH${batches.length !== 1 ? 'ES' : ''}`;
}

function addChatMessage(role, text, loading=false) {
  const id = Date.now();
  const div = document.createElement('div');
  div.id = `msg-${id}`;
  div.className = `chat-message ${role}`;
  
  const label = role === 'user' ? 'YOU' : (loading ? 'ASSISTANT (Typing...)' : 'ASSISTANT');
  div.innerHTML = `<span class="chat-label">${label}</span><div>${text}</div>`;
  
  els.chatBox.appendChild(div);
  els.chatBox.scrollTop = els.chatBox.scrollHeight;
  
  if (!loading) state.chatHistory.push({ role, content: text });
  return id;
}

function removeChatMessage(id) {
  document.getElementById(`msg-${id}`)?.remove();
}

function manualRefresh() {
  if (state.transcript.length > 0) {
    generateSuggestions(state.transcript[state.transcript.length-1].text);
  } else {
    alert("No transcript yet. Start speaking!");
  }
}

// ==========================================
// SETTINGS & EXPORT
// ==========================================
function toggleSettings(show) {
  els.settingsModal.classList.toggle('hidden', !show);
}

function saveSettingsHandler() {
  const key = els.apiKeyInput.value.trim();
  if (key) {
    state.apiKey = key;
    localStorage.setItem('twinmind_api_key', key);
  }
  state.suggestionPrompt = els.suggestionPromptInput.value || DEFAULT_SUGGESTION_PROMPT;
  state.chatPrompt = els.chatPromptInput.value || DEFAULT_CHAT_PROMPT;
  state.suggestionContextChars = parseInt(els.suggestionContextInput.value) || 500;
  state.chatContextChars = parseInt(els.chatContextInput.value) || 2000;
  
  toggleSettings(false);
  alert("✅ Settings saved!");
}

function exportSession() {
  const data = {
    exportedAt: new Date().toISOString(),
    transcript: state.transcript,
    suggestionBatches: state.suggestionBatches, // Now correctly included
    chatHistory: state.chatHistory
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `twinmind-session-${Date.now()}.json`;
  a.click();
}

function sendChatMessage() {
  const txt = els.chatInput.value.trim();
  if (txt) sendChatToAI(txt);
}

// ==========================================
// START APP
// ==========================================
init();