//==========================================
// TWINMIND APP - Live Suggestions
// Models: whisper-large-v3 (transcription), openai/gpt-oss-120b (suggestions/chat)
//==========================================

//--- CONFIGURATION ---
const CONFIG = {
    groqBaseUrl: "https://api.groq.com/openai/v1",
    whisperModel: "whisper-large-v3",
    chatModel: "openai/gpt-oss-120b"
};

//--- PROMPTS ---
// This prompt includes a concrete example to force valid JSON output
const DEFAULT_SUGGESTION_PROMPT = `You are TwinMind, an expert AI meeting copilot. Your job is to generate exactly 3 useful suggestions based on the conversation.

Analyze the speaker's intent and provide the right mix of:
- QUESTION (to ask the speaker)
- ANSWER (to a question the speaker asked)
- FACT_CHECK (verification of a statement)
- TALKING_POINT (a key point to mention)
- CLARIFICATION (if something is unclear)

CRITICAL: You must output ONLY a valid JSON array. No text before or after the array.

EXAMPLE OUTPUT:
[
  {"type": "QUESTION", "content": "When is the deadline for this project?"},
  {"type": "FACT_CHECK", "content": "Actually, Q3 revenue increased by 15%, not decreased."},
  {"type": "TALKING_POINT", "content": "We should also discuss the marketing budget."}
]

Rules:
- Exactly 3 suggestions.
- Keep content under 15 words.
- Use the types above.
- Return ONLY the JSON.`;

const DEFAULT_CHAT_PROMPT = `You are TwinMind's detailed answer engine. The user clicked a suggestion or asked a question during a live conversation.

Provide a thorough, structured response (3-5 sentences). Reference specific transcript details when relevant. Be actionable, accurate, and conversational.`;

//--- APP STATE ---
let state = {
    apiKey: "",
    isRecording: false,
    mediaRecorder: null,
    audioChunks: [],
    transcript: [],
    chatHistory: [],
    suggestionBatches: [],
    refreshInterval: null,
    suggestionPrompt: DEFAULT_SUGGESTION_PROMPT,
    chatPrompt: DEFAULT_CHAT_PROMPT,
    suggestionContextChars: 500,
    chatContextChars: 2000
};

//--- DOM ELEMENTS ---
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
    batchCount: document.getElementById('batchCount'),
    micStatus: document.getElementById('micStatus'),
    transcriptPlaceholder: document.getElementById('transcriptPlaceholder')
};

//==========================================
// INITIALIZATION
//==========================================
function init() {
    const savedKey = localStorage.getItem('twinmind_api_key');
    if (savedKey) {
        state.apiKey = savedKey;
        els.apiKeyInput.value = savedKey;
    } else {
        toggleSettings(true);
    }

    els.suggestionPromptInput.value = state.suggestionPrompt;
    els.chatPromptInput.value = state.chatPrompt;
    els.suggestionContextInput.value = state.suggestionContextChars;
    els.chatContextInput.value = state.chatContextChars;

    // Button Listeners
    els.micBtn.addEventListener('click', toggleMic);
    els.refreshBtn.addEventListener('click', manualRefresh);
    els.sendBtn.addEventListener('click', sendChatMessage);
    els.chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });
    els.exportBtn.addEventListener('click', exportSession);
    els.settingsBtn.addEventListener('click', () => toggleSettings(true));
    els.closeSettings.addEventListener('click', () => toggleSettings(false));
    els.saveSettings.addEventListener('click', saveSettingsHandler);

    // KEYBOARD SHORTCUT: Space bar to toggle mic
    document.addEventListener('keydown', (e) => {
        // Check if Space is pressed and focus is NOT on an input field
        if (e.code === 'Space' && !e.target.matches('input, textarea')) {
            e.preventDefault(); // Prevent page scrolling
            toggleMic();
        }
    });
}

//==========================================
// MICROPHONE & AUDIO
//==========================================
async function toggleMic() {
    if (!state.apiKey) {
        alert("Please enter your Groq API Key in Settings first.");
        toggleSettings(true);
        return;
    }
    
    if (state.isRecording) {
        stopRecording();
    } else {
        await startRecording();
    }
}

async function startRecording() {
    try {
        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            } 
        });
        
        state.mediaRecorder = new MediaRecorder(stream);
        state.audioChunks = [];

        state.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                state.audioChunks.push(e.data);
            }
        };
       
        // FIXED: Clear audioChunks after processing to get separate 30s transcriptions
        state.mediaRecorder.onstop = async () => {
            const blob = new Blob(state.audioChunks, { type: 'audio/webm' });
            await processAudioChunk(blob);
            // Clear chunks so next interval only has new audio
            state.audioChunks = [];
        };

        state.mediaRecorder.onerror = (e) => {
            console.error("MediaRecorder error:", e.error);
            stopRecording();
        };

        // Start recording
        state.mediaRecorder.start(1000); // Collect 1 second of audio at a time
        state.isRecording = true;
        updateMicUI(true);

        // Auto-stop and process every 30 seconds
        state.refreshInterval = setInterval(() => {
            if (state.isRecording && state.mediaRecorder && state.mediaRecorder.state === 'recording') {
                state.mediaRecorder.stop();
                // Restart immediately after processing
                setTimeout(() => {
                    if (state.isRecording) {
                        state.mediaRecorder.start(1000);
                    }
                }, 100);
            }
        }, 30000);

    } catch (err) {
        console.error("Mic error:", err);
        let errorMsg = "Microphone access denied. ";
        if (err.name === 'NotAllowedError') {
            errorMsg += "Please allow microphone permission in your browser settings.";
        } else if (err.name === 'NotFoundError') {
            errorMsg += "No microphone found. Please connect a microphone.";
        } else if (err.name === 'NotReadableError') {
            errorMsg += "Microphone is being used by another application.";
        }
        alert(errorMsg);
        stopRecording();
    }
}

function stopRecording() {
    if (state.mediaRecorder) {
        if (state.mediaRecorder.state === 'recording') {
            state.mediaRecorder.stop();
        }
        // Stop all tracks to release microphone
        if (state.mediaRecorder.stream) {
            state.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }
    
    if (state.refreshInterval) {
        clearInterval(state.refreshInterval);
        state.refreshInterval = null;
    }
    
    state.isRecording = false;
    updateMicUI(false);
}

function updateMicUI(isRec) {
    // Update mic button
    if (isRec) {
        els.micBtn.classList.add('recording');
        if (els.micStatus) {
            els.micStatus.textContent = 'LIVE';
            els.micStatus.classList.add('recording-live');
        }
        // Show listening placeholder
        if (els.transcriptPlaceholder) {
            document.body.classList.add('is-recording');
        }
    } else {
        els.micBtn.classList.remove('recording');
        if (els.micStatus) {
            els.micStatus.textContent = 'IDLE';
            els.micStatus.classList.remove('recording-live');
        }
        // Show idle placeholder
        if (els.transcriptPlaceholder) {
            document.body.classList.remove('is-recording');
        }
    }
}

//==========================================
// GROQ API: TRANSCRIPTION
//==========================================
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
            addTranscriptLine(newText);
            setTimeout(() => generateSuggestions(newText), 100);
        }
    } catch (err) {
        console.error("Transcription error:", err);
    }
}

//==========================================
// GROQ API: GENERATE SUGGESTIONS
//==========================================
async function generateSuggestions(newChunk) {
    const fullText = state.transcript.map(t => t.text).join("");
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
                    { role: 'system', content: "You are a JSON-only generator. Output ONLY a raw JSON array. No markdown, no explanations." },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.6,
                max_completion_tokens: 500,
                reasoning_effort: "medium"
            })
        });

        if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
       
        const data = await res.json();
        let raw = data.choices[0]?.message?.content || "";
       
        console.log("Raw AI Response:", raw);

        // Robust parsing
        let clean = raw.replace(/<think>[\s\S]*?<\/think>/gi, '');
        clean = clean.replace(/```json|```/g, '').trim();
       
        const match = clean.match(/\[[\s\S]*\]/);
       
        if (!match) {
            console.error("Failed to find JSON in:", clean);
            throw new Error("No JSON array found in response.");
        }
       
        const suggestions = JSON.parse(match[0]);
        if (!Array.isArray(suggestions) || suggestions.length === 0) throw new Error("Invalid suggestion format");
       
        addSuggestionsBatch(suggestions);
       
    } catch (err) {
        console.error("Suggestion error:", err);
        els.suggestionsBox.innerHTML = `<p style="color:#ff6b6b;padding:15px;">⚠️ ${err.message}</p>`;
    }
}

//==========================================
// GROQ API: CHAT
//==========================================
async function sendChatToAI(userMsg) {
    addChatMessage('user', userMsg);
    els.chatInput.value = '';

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

//==========================================
// UI HELPERS
//==========================================
function addTranscriptLine(text) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    state.transcript.push({ time, text });
 
    const div = document.createElement('div');
    div.className = 'transcript-line';
    div.innerHTML = `<span class="transcript-time">${time}</span> ${text}`;
 
    els.transcriptBox.appendChild(div);
    els.transcriptBox.scrollTop = els.transcriptBox.scrollHeight;
 
    // Remove placeholder when first transcript appears
    const placeholder = els.transcriptBox.querySelector('.placeholder-text');
    if (placeholder) placeholder.remove();
}

function addSuggestionsBatch(items) {
    const batch = document.createElement('div');
    batch.className = 'suggestion-batch';
 
    const ph = els.suggestionsBox.querySelector('.placeholder-text');
    if (ph) ph.remove();

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'suggestion-card';
       
        const type = (item.type || 'SUGGESTION').toUpperCase();
        card.setAttribute('data-type', type);
        
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

function addChatMessage(role, text, loading = false) {
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
        generateSuggestions(state.transcript[state.transcript.length - 1].text);
    } else {
        alert("No transcript yet. Start speaking!");
    }
}

//==========================================
// SETTINGS & EXPORT
//==========================================
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
        suggestionBatches: state.suggestionBatches,
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

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// --- THEME TOGGLE ---
const themeToggleBtn = document.getElementById('themeToggle');
const sunIcon = themeToggleBtn.querySelector('.sun-icon');
const moonIcon = themeToggleBtn.querySelector('.moon-icon');
const html = document.documentElement;

// Load saved theme
const savedTheme = localStorage.getItem('twinmind_theme') || 'dark';
html.setAttribute('data-theme', savedTheme);
updateThemeIcons(savedTheme);

themeToggleBtn.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('twinmind_theme', next);
    updateThemeIcons(next);
});

function updateThemeIcons(theme) {
    if (theme === 'light') {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    }
}
