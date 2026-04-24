//==========================================
// TWINMIND APP - Live Suggestions
// Models: whisper-large-v3 (transcription), openai/gpt-oss-120b (suggestions/chat)
//==========================================

//--- CONFIGURATION ---
// TwinMind - Live Suggestions

const CONFIG = {
    groqBaseUrl: "https://api.groq.com/openai/v1",
    whisperModel: "whisper-large-v3",
    defaultChatModel: "openai/gpt-oss-120b",
    settingsKey: "twinmind_settings_v3",
    legacyApiKey: "twinmind_api_key",
    themeKey: "twinmind_theme"
};

const DEFAULT_SUGGESTION_PROMPT = `You are TwinMind, an expert AI meeting copilot. Generate exactly 3 useful suggestions from the live conversation.

Return ONLY a valid JSON array. No markdown, no comments, no extra text.

Each item must match this schema:
{"type":"QUESTION|ANSWER|FACT_CHECK|TALKING_POINT","content":"..."}

Rules:
- Exactly 3 suggestions.
- content must be 15 words or fewer.
- Ground suggestions in the most recent conversation context.
- Prioritize unresolved decisions, risks, blockers, and next actions.
- Keep suggestions specific and immediately usable in a meeting.
- Use at least 2 different types when context allows.
- If context is unclear, convert it into a QUESTION instead of guessing.
- For FACT_CHECK, focus on verifiable claims (numbers, dates, names, commitments).`;

const DEFAULT_CHAT_PROMPT = `You are TwinMind's detailed answer engine. The user clicked a suggestion or asked a question during a live conversation.

Provide a practical response in 3-5 sentences.
- Start with a direct answer in sentence 1.
- Use transcript context when relevant, especially recent points.
- Do not invent facts. If context is missing, clearly say what is uncertain.
- Include concrete next steps when they are obvious and useful.
- Keep tone clear, professional, and actionable.`;

const DEMO_TRANSCRIPT = [
    "Thanks everyone. The main question is whether we can move the beta launch from May 15 to May 8 without hurting onboarding quality.",
    "Design is ready, but support still needs the help center articles and the escalation playbook. We also need a final call on pricing before Friday.",
    "My biggest concern is that the analytics dashboard is still missing activation metrics, so we may not know whether the pilot is working.",
    "Let's leave with owners for launch readiness, pricing approval, and the dashboard instrumentation plan."
];

const DEMO_SUGGESTIONS = [
    { type: "QUESTION", content: "Who owns the final launch-readiness decision by Friday?" },
    { type: "TALKING_POINT", content: "Separate launch date risk from onboarding quality risk." },
    { type: "FACT_CHECK", content: "Verify whether activation metrics are instrumented before beta." },
    { type: "ANSWER", content: "Support needs articles and escalation docs before launch." }
];

let messageId = 0;
let suggestionId = 0;
let batchId = 0;
let transcriptId = 0;

let state = {
    apiKey: "",
    isRecording: false,
    mediaRecorder: null,
    audioChunks: [],
    transcript: [],
    chatHistory: [],
    suggestionBatches: [],
    refreshInterval: null,
    countdownInterval: null,
    timerInterval: null,
    sessionStartedAt: null,
    elapsedMs: 0,
    countdownRemaining: null,
    suggestionPrompt: DEFAULT_SUGGESTION_PROMPT,
    chatPrompt: DEFAULT_CHAT_PROMPT,
    suggestionContextChars: 500,
    chatContextChars: 2000,
    chunkSeconds: 30,
    chatModel: CONFIG.defaultChatModel,
    suggestionFilter: "all"
};

const els = {
    micBtn: document.getElementById("micBtn"),
    transcriptBox: document.getElementById("transcript"),
    transcriptSearch: document.getElementById("transcriptSearch"),
    copyTranscriptBtn: document.getElementById("copyTranscriptBtn"),
    suggestionsBox: document.getElementById("suggestions"),
    suggestionFilters: document.getElementById("suggestionFilters"),
    activeFilterLabel: document.getElementById("activeFilterLabel"),
    savedCount: document.getElementById("savedCount"),
    refreshBtn: document.getElementById("refreshBtn"),
    refreshCountdown: document.getElementById("refreshCountdown"),
    chatBox: document.getElementById("chat"),
    chatInput: document.getElementById("chatInput"),
    sendBtn: document.getElementById("sendBtn"),
    quickPrompts: document.querySelector(".quick-prompts"),
    exportBtn: document.getElementById("exportBtn"),
    demoBtn: document.getElementById("demoBtn"),
    clearBtn: document.getElementById("clearBtn"),
    settingsBtn: document.getElementById("settingsBtn"),
    settingsModal: document.getElementById("settingsModal"),
    closeSettings: document.getElementById("closeSettings"),
    saveSettings: document.getElementById("saveSettings"),
    apiKeyInput: document.getElementById("apiKeyInput"),
    suggestionPromptInput: document.getElementById("suggestionPromptInput"),
    chatPromptInput: document.getElementById("chatPromptInput"),
    suggestionContextInput: document.getElementById("suggestionContextInput"),
    chatContextInput: document.getElementById("chatContextInput"),
    batchCount: document.getElementById("batchCount"),
    micStatus: document.getElementById("micStatus"),
    sessionState: document.getElementById("sessionState"),
    sessionTimer: document.getElementById("sessionTimer"),
    activeDuration: document.getElementById("activeDuration"),
    wordCount: document.getElementById("wordCount"),
    savedMetric: document.getElementById("savedMetric"),
    transcriptCount: document.getElementById("transcriptCount"),
    lastUpdate: document.getElementById("lastUpdate"),
    toastRegion: document.getElementById("toastRegion"),
    themeToggle: document.getElementById("themeToggle")
};

function init() {
    loadSettings();
    hydrateSettingsForm();
    initTheme();
    bindEvents();
    renderTranscript();
    renderSuggestions();
    renderChatEmptyState();
    updateMetrics();
    updateMicUI(false);
    updateCountdown();

    if (!state.apiKey) {
        window.setTimeout(() => showToast("Add a Groq key in Settings, or use Demo to explore."), 500);
    }
}

function bindEvents() {
    els.micBtn.addEventListener("click", toggleMic);
    els.refreshBtn.addEventListener("click", manualRefresh);
    els.sendBtn.addEventListener("click", sendChatMessage);
    els.chatInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") sendChatMessage();
    });

    els.quickPrompts.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-prompt]");
        if (!button) return;
        sendChatToAI(button.dataset.prompt);
    });

    els.exportBtn.addEventListener("click", exportSession);
    els.demoBtn.addEventListener("click", loadDemoSession);
    els.clearBtn.addEventListener("click", confirmClearSession);
    els.copyTranscriptBtn.addEventListener("click", copyTranscript);
    els.transcriptSearch.addEventListener("input", renderTranscript);
    els.settingsBtn.addEventListener("click", () => toggleSettings(true));
    els.closeSettings.addEventListener("click", () => toggleSettings(false));
    els.saveSettings.addEventListener("click", saveSettingsHandler);

    els.settingsModal.addEventListener("click", (event) => {
        if (event.target.matches("[data-close-modal]")) toggleSettings(false);
    });

    els.suggestionFilters.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-filter]");
        if (!button) return;
        setSuggestionFilter(button.dataset.filter);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !els.settingsModal.classList.contains("hidden")) {
            toggleSettings(false);
            return;
        }

        if (event.code === "Space" && !isInteractiveTarget(event.target)) {
            event.preventDefault();
            toggleMic();
        }
    });
}

function loadSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(CONFIG.settingsKey) || "{}");
        state.apiKey = saved.apiKey || localStorage.getItem(CONFIG.legacyApiKey) || "";
        state.suggestionPrompt = sanitizeSuggestionPrompt(saved.suggestionPrompt || DEFAULT_SUGGESTION_PROMPT);
        state.chatPrompt = saved.chatPrompt || DEFAULT_CHAT_PROMPT;
        state.suggestionContextChars = clampNumber(saved.suggestionContextChars, 100, 5000, 500);
        state.chatContextChars = clampNumber(saved.chatContextChars, 500, 12000, 2000);
    } catch (error) {
        console.warn("Could not load settings", error);
    }
}

function hydrateSettingsForm() {
    els.apiKeyInput.value = state.apiKey;
    els.suggestionPromptInput.value = state.suggestionPrompt;
    els.chatPromptInput.value = state.chatPrompt;
    els.suggestionContextInput.value = state.suggestionContextChars;
    els.chatContextInput.value = state.chatContextChars;
}

function saveSettingsHandler() {
    state.apiKey = els.apiKeyInput.value.trim();
    state.suggestionPrompt = sanitizeSuggestionPrompt(els.suggestionPromptInput.value.trim() || DEFAULT_SUGGESTION_PROMPT);
    state.chatPrompt = els.chatPromptInput.value.trim() || DEFAULT_CHAT_PROMPT;
    state.suggestionContextChars = clampNumber(els.suggestionContextInput.value, 100, 5000, 500);
    state.chatContextChars = clampNumber(els.chatContextInput.value, 500, 12000, 2000);

    localStorage.setItem(CONFIG.settingsKey, JSON.stringify({
        apiKey: state.apiKey,
        suggestionPrompt: state.suggestionPrompt,
        chatPrompt: state.chatPrompt,
        suggestionContextChars: state.suggestionContextChars,
        chatContextChars: state.chatContextChars
    }));

    if (state.apiKey) {
        localStorage.setItem(CONFIG.legacyApiKey, state.apiKey);
    } else {
        localStorage.removeItem(CONFIG.legacyApiKey);
    }

    hydrateSettingsForm();
    toggleSettings(false);
    updateCountdown();
    showToast("Settings saved.");
}

async function toggleMic() {
    if (state.isRecording) {
        stopRecording();
        return;
    }

    if (!state.apiKey) {
        showToast("Add your Groq key first, or try Demo.");
        toggleSettings(true);
        return;
    }

    await startRecording();
}

async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        showToast("This browser does not support live microphone capture.");
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            }
        });

        state.audioChunks = [];
        state.mediaRecorder = new MediaRecorder(stream);

        state.mediaRecorder.addEventListener("dataavailable", (event) => {
            if (event.data.size > 0) state.audioChunks.push(event.data);
        });

        state.mediaRecorder.addEventListener("stop", async () => {
            const chunks = state.audioChunks.splice(0, state.audioChunks.length);
            if (chunks.length) {
                const blob = new Blob(chunks, { type: state.mediaRecorder.mimeType || "audio/webm" });
                await processAudioChunk(blob);
            }

            if (state.isRecording && state.mediaRecorder?.state === "inactive") {
                state.mediaRecorder.start(1000);
                startCaptureCountdown();
            }
        });

        state.mediaRecorder.addEventListener("error", (event) => {
            console.error("MediaRecorder error:", event.error);
            showToast("Recording stopped because the microphone hit an error.");
            stopRecording();
        });

        state.isRecording = true;
        state.mediaRecorder.start(1000);
        updateMicUI(true);
        startSessionTimer();
        startCaptureCountdown();
        state.refreshInterval = window.setInterval(captureAndRestart, state.chunkSeconds * 1000);
        showToast("Recording started.");
    } catch (error) {
        console.error("Mic error:", error);
        showToast(getMicErrorMessage(error));
        stopRecording();
    }
}

function captureAndRestart() {
    if (!state.isRecording || !state.mediaRecorder || state.mediaRecorder.state !== "recording") return;
    state.mediaRecorder.stop();
}

function stopRecording() {
    const recorder = state.mediaRecorder;
    state.isRecording = false;

    if (state.refreshInterval) {
        window.clearInterval(state.refreshInterval);
        state.refreshInterval = null;
    }

    stopCaptureCountdown();
    stopSessionTimer();

    if (recorder) {
        if (recorder.state === "recording") recorder.stop();
        recorder.stream?.getTracks().forEach((track) => track.stop());
    }

    updateMicUI(false);
    showToast("Recording stopped.");
}

function updateMicUI(isRecording) {
    els.micBtn.classList.toggle("recording", isRecording);
    document.body.classList.toggle("is-recording", isRecording);

    if (isRecording) {
        els.micStatus.textContent = "Live";
        els.micStatus.classList.add("recording-live");
        setSessionState("Live", "live");
    } else {
        els.micStatus.textContent = "Idle";
        els.micStatus.classList.remove("recording-live");
        setSessionState("Ready");
    }
}

async function processAudioChunk(blob) {
    if (!blob.size) return;

    const formData = new FormData();
    formData.append("file", blob, "audio.webm");
    formData.append("model", CONFIG.whisperModel);

    setSessionState("Transcribing", "working");

    try {
        const response = await fetch(`${CONFIG.groqBaseUrl}/audio/transcriptions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${state.apiKey}` },
            body: formData
        });

        if (!response.ok) throw new Error(`Transcription ${response.status}: ${await response.text()}`);

        const data = await response.json();
        const newText = data.text?.trim();

        if (newText) {
            addTranscriptLine(newText, "live");
            await generateSuggestions(newText, { trigger: "auto" });
        } else {
            const latestText = state.transcript.at(-1)?.text;
            if (latestText) {
                await generateSuggestions(latestText, { trigger: "auto", reuseLatest: true });
            }
        }
    } catch (error) {
        console.error("Transcription error:", error);
        showToast("Transcription failed. Check your API key and network.");
    } finally {
        setSessionState(state.isRecording ? "Live" : "Ready", state.isRecording ? "live" : undefined);
    }
}

async function generateSuggestions(newChunk, options = {}) {
    const { trigger = "manual", reuseLatest = false } = options;
    const fullText = state.transcript.map((item) => item.text).join("\n");
    const context = fullText.slice(-state.suggestionContextChars);
    const prompt = `${state.suggestionPrompt}

Important: return exactly 3 usable items. Each item must include "type" and "content".

Recent context:
${context}

${reuseLatest ? "Use the latest transcript context to produce a fresh suggestion batch." : `New input:\n${newChunk}`}`;

    if (!state.apiKey) {
        addSuggestionsBatch(buildLocalSuggestions(newChunk), "demo", { silent: trigger === "auto" });
        if (trigger !== "auto") showToast("Generated local demo suggestions. Add a key for AI results.");
        return;
    }

    setSessionState("Generating", "working");

    try {
        const response = await fetch(`${CONFIG.groqBaseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${state.apiKey}`
            },
            body: JSON.stringify({
                model: state.chatModel,
                messages: [
                    { role: "system", content: "Output only a raw JSON array. Do not use markdown." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.55,
                max_completion_tokens: 500,
                reasoning_effort: "medium"
            })
        });

        if (!response.ok) throw new Error(`Suggestions ${response.status}: ${await response.text()}`);

        const data = await response.json();
        const raw = data.choices?.[0]?.message?.content || "";
        const suggestions = parseSuggestions(raw);
        const added = addSuggestionsBatch(suggestions, "ai", { silent: trigger === "auto" });

        if (!added) {
            console.warn("AI returned suggestions without usable text; using fallback suggestions.", suggestions);
            addSuggestionsBatch(buildLocalSuggestions(context || newChunk), "fallback", { silent: true });
        }
    } catch (error) {
        console.error("Suggestion error:", error);
        if (context || newChunk) {
            addSuggestionsBatch(buildLocalSuggestions(context || newChunk), "fallback", { silent: true });
            if (trigger !== "auto") showToast("Used fallback suggestions because AI output was not usable.");
        } else {
            renderSuggestionError(error.message);
            showToast("Suggestion generation failed.");
        }
    } finally {
        setSessionState(state.isRecording ? "Live" : "Ready", state.isRecording ? "live" : undefined);
    }
}

function parseSuggestions(raw) {
    const clean = raw
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .replace(/```json|```/gi, "")
        .trim();
    const parsed = parseSuggestionPayload(clean);
    if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Model returned an invalid suggestion list.");
    }

    return parsed;
}

function parseSuggestionPayload(clean) {
    const arrayMatch = clean.match(/\[[\s\S]*\]/);
    if (arrayMatch) return JSON.parse(arrayMatch[0]);

    const objectMatch = clean.match(/\{[\s\S]*\}/);
    if (objectMatch) {
        const parsed = JSON.parse(objectMatch[0]);
        if (Array.isArray(parsed.suggestions)) return parsed.suggestions;
        if (Array.isArray(parsed.items)) return parsed.items;
        if (Array.isArray(parsed.data)) return parsed.data;
        return [parsed];
    }

    const lines = clean
        .split(/\n+/)
        .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
        .filter(Boolean);

    if (lines.length) {
        return lines.slice(0, 3).map((line) => ({ type: inferSuggestionType(line), content: line }));
    }

    throw new Error("No suggestions found in model response.");
}

function addSuggestionsBatch(items, source = "ai", options = {}) {
    const { silent = false } = options;
    const normalized = items
        .map(normalizeSuggestion)
        .filter((item) => item.content)
        .slice(0, 6);

    if (!normalized.length) {
        if (!silent) showToast("No usable suggestions were returned.");
        return false;
    }

    state.suggestionBatches.unshift({
        id: `batch-${++batchId}`,
        timestamp: new Date().toISOString(),
        source,
        items: normalized
    });

    renderSuggestions();
    updateMetrics();
    return true;
}

function normalizeSuggestion(item) {
    if (typeof item === "string") {
        return {
            id: `sug-${++suggestionId}`,
            type: inferSuggestionType(item),
            content: item.trim(),
            saved: false
        };
    }

    const content = String(
        item?.content ??
        item?.text ??
        item?.suggestion ??
        item?.message ??
        item?.question ??
        item?.answer ??
        item?.title ??
        item?.description ??
        ""
    ).trim();
    const type = normalizeSuggestionType(item?.type || item?.category || item?.kind || inferSuggestionType(content));

    return {
        id: `sug-${++suggestionId}`,
        type,
        content,
        saved: Boolean(item?.saved)
    };
}

function normalizeSuggestionType(type) {
    const normalized = String(type || "TALKING_POINT").toUpperCase().replace(/[\s-]+/g, "_");
    if (normalized.includes("QUESTION")) return "QUESTION";
    if (normalized.includes("ANSWER")) return "ANSWER";
    if (normalized.includes("FACT")) return "FACT_CHECK";
    if (normalized.includes("CLARIF")) return "QUESTION";
    if (normalized.includes("TALK")) return "TALKING_POINT";
    return "TALKING_POINT";
}

function inferSuggestionType(text) {
    const value = String(text || "").toLowerCase();
    if (value.includes("?") || value.startsWith("ask ") || value.startsWith("what ") || value.startsWith("how ") || value.startsWith("who ")) return "QUESTION";
    if (value.includes("verify") || value.includes("check") || value.includes("confirm") || value.includes("validate")) return "FACT_CHECK";
    if (value.includes("answer") || value.includes("explain") || value.includes("respond")) return "ANSWER";
    if (value.includes("clarify") || value.includes("unclear")) return "QUESTION";
    return "TALKING_POINT";
}

function renderSuggestions() {
    els.suggestionsBox.textContent = "";
    updateBatchCount();
    updateFilterLabel();

    const visibleBatches = state.suggestionBatches
        .map((batch) => ({
            ...batch,
            items: batch.items.filter(matchesSuggestionFilter)
        }))
        .filter((batch) => batch.items.length > 0);

    if (!visibleBatches.length) {
        els.suggestionsBox.appendChild(createEmptyState(
            state.suggestionBatches.length ? "No matching suggestions" : "Suggestions will appear here",
            state.suggestionBatches.length ? "Try another filter or save cards for later." : "Start recording, refresh manually, or load a demo session."
        ));
        return;
    }

    visibleBatches.forEach((batch, index) => {
        const batchEl = document.createElement("div");
        batchEl.className = "suggestion-batch";

        const header = document.createElement("div");
        header.className = "suggestion-batch-header";

        const title = document.createElement("span");
        title.textContent = `${formatBatchSource(batch.source)} batch ${visibleBatches.length - index}`;

        const time = document.createElement("span");
        time.textContent = formatClock(new Date(batch.timestamp));

        header.append(title, time);
        batchEl.appendChild(header);

        batch.items.forEach((item) => batchEl.appendChild(createSuggestionCard(item)));
        els.suggestionsBox.appendChild(batchEl);
    });
}

function createSuggestionCard(item) {
    const card = document.createElement("article");
    card.className = `suggestion-card${item.saved ? " saved" : ""}`;
    card.dataset.type = item.type;

    const topLine = document.createElement("div");
    topLine.className = "suggestion-topline";

    const tag = document.createElement("span");
    tag.className = `suggestion-tag ${getSuggestionTagClass(item.type)}`;
    tag.textContent = formatSuggestionType(item.type);
    topLine.appendChild(tag);

    const text = document.createElement("div");
    text.className = "suggestion-text";
    text.textContent = item.content;

    const actions = document.createElement("div");
    actions.className = "suggestion-actions";

    const askBtn = createCardAction("Ask", () => sendChatToAI(`Expand on this suggestion: ${item.content}`));
    const saveBtn = createCardAction(item.saved ? "Saved" : "Save", () => toggleSaveSuggestion(item.id));
    saveBtn.classList.toggle("saved-action", item.saved);
    const copyBtn = createCardAction("Copy", () => copyText(item.content, "Suggestion copied."));

    actions.append(askBtn, saveBtn, copyBtn);
    card.append(topLine, text, actions);
    return card;
}

function formatBatchSource(source) {
    if (source === "demo") return "Demo";
    if (source === "fallback") return "Fallback";
    return "AI";
}

function createCardAction(label, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card-action";
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
}

function toggleSaveSuggestion(id) {
    for (const batch of state.suggestionBatches) {
        const item = batch.items.find((suggestion) => suggestion.id === id);
        if (item) {
            item.saved = !item.saved;
            renderSuggestions();
            updateMetrics();
            showToast(item.saved ? "Suggestion saved." : "Suggestion removed from saved.");
            return;
        }
    }
}

function matchesSuggestionFilter(item) {
    if (state.suggestionFilter === "all") return true;
    if (state.suggestionFilter === "saved") return item.saved;
    return item.type.includes(state.suggestionFilter);
}

function setSuggestionFilter(filter) {
    state.suggestionFilter = filter;
    els.suggestionFilters.querySelectorAll("button").forEach((button) => {
        button.classList.toggle("active", button.dataset.filter === filter);
    });
    renderSuggestions();
}

function updateFilterLabel() {
    const labels = {
        all: "Showing all suggestions",
        QUESTION: "Showing questions",
        ANSWER: "Showing answers",
        FACT_CHECK: "Showing fact-checks",
        TALKING_POINT: "Showing talking points",
        saved: "Showing saved suggestions"
    };
    els.activeFilterLabel.textContent = labels[state.suggestionFilter] || "Showing suggestions";
}

function updateBatchCount() {
    const count = state.suggestionBatches.length;
    els.batchCount.textContent = `${count} batch${count === 1 ? "" : "es"}`;
}

function renderSuggestionError(message) {
    els.suggestionsBox.textContent = "";
    const error = document.createElement("div");
    error.className = "suggestion-card error-card";
    const text = document.createElement("div");
    text.className = "suggestion-text";
    text.textContent = message;
    error.appendChild(text);
    els.suggestionsBox.appendChild(error);
}

async function sendChatMessage() {
    const text = els.chatInput.value.trim();
    if (!text) return;
    await sendChatToAI(text);
}

async function sendChatToAI(userMsg) {
    addChatMessage("user", userMsg);
    els.chatInput.value = "";

    const loadingId = addChatMessage("assistant", "Thinking...", true);
    setSessionState("Thinking", "working");

    if (!state.apiKey) {
        await delay(350);
        removeChatMessage(loadingId);
        addChatMessage("assistant", buildLocalReply(userMsg));
        setSessionState(state.isRecording ? "Live" : "Ready", state.isRecording ? "live" : undefined);
        return;
    }

    const fullContext = state.transcript.map((item) => item.text).join("\n").slice(-state.chatContextChars);
    const systemPrompt = `${state.chatPrompt}\n\nConversation context:\n${fullContext}`;
    const messages = [
        { role: "system", content: systemPrompt },
        ...state.chatHistory.slice(-12)
    ];

    try {
        const response = await fetch(`${CONFIG.groqBaseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${state.apiKey}`
            },
            body: JSON.stringify({
                model: state.chatModel,
                messages,
                temperature: 0.7,
                max_completion_tokens: 800,
                reasoning_effort: "medium"
            })
        });

        if (!response.ok) throw new Error(`Chat ${response.status}: ${await response.text()}`);

        const data = await response.json();
        const reply = cleanAssistantText(data.choices?.[0]?.message?.content || "No response received.");
        removeChatMessage(loadingId);
        addChatMessage("assistant", reply);
    } catch (error) {
        console.error("Chat error:", error);
        removeChatMessage(loadingId);
        addChatMessage("assistant", `I could not get an AI response: ${error.message}`);
        showToast("Chat request failed.");
    } finally {
        setSessionState(state.isRecording ? "Live" : "Ready", state.isRecording ? "live" : undefined);
    }
}

function addChatMessage(role, text, loading = false) {
    const empty = els.chatBox.querySelector(".empty-state");
    if (empty) empty.remove();

    const id = `msg-${++messageId}`;
    const message = document.createElement("div");
    message.id = id;
    message.className = `chat-message ${role}${loading ? " loading" : ""}`;

    const label = document.createElement("span");
    label.className = "chat-label";
    label.textContent = role === "user" ? "You" : (loading ? "Assistant" : "Assistant");

    const content = document.createElement("div");
    content.className = "chat-text";
    content.textContent = text;

    message.append(label, content);
    els.chatBox.appendChild(message);
    els.chatBox.scrollTop = els.chatBox.scrollHeight;

    if (!loading) state.chatHistory.push({ role, content: text });
    return id;
}

function removeChatMessage(id) {
    document.getElementById(id)?.remove();
    renderChatEmptyState();
}

function renderChatEmptyState() {
    if (state.chatHistory.length || els.chatBox.querySelector(".chat-message")) return;
    els.chatBox.textContent = "";
    const empty = createEmptyState("No chat yet", "Click Ask on a suggestion or type a question below.");
    empty.classList.add("compact");
    els.chatBox.appendChild(empty);
}

function addTranscriptLine(text, source = "live") {
    const entry = {
        id: `line-${++transcriptId}`,
        time: formatClock(new Date()),
        text,
        source
    };

    state.transcript.push(entry);
    renderTranscript();
    updateMetrics();

    if (!els.transcriptSearch.value.trim()) {
        els.transcriptBox.scrollTop = els.transcriptBox.scrollHeight;
    }
}

function renderTranscript() {
    const query = els.transcriptSearch.value.trim();
    els.transcriptBox.textContent = "";

    const visibleLines = query
        ? state.transcript.filter((line) => `${line.time} ${line.text}`.toLowerCase().includes(query.toLowerCase()))
        : state.transcript;

    if (!visibleLines.length) {
        els.transcriptBox.appendChild(createEmptyState(
            state.transcript.length ? "No transcript matches" : "No transcript yet",
            state.transcript.length ? "Clear the search to see the full session." : "Press Space or click the mic to begin. Use Demo to explore the interface without a key.",
            true
        ));
        return;
    }

    visibleLines.forEach((line, index) => {
        const row = document.createElement("div");
        row.className = "transcript-line";

        const meta = document.createElement("div");
        meta.className = "transcript-meta";

        const time = document.createElement("span");
        time.className = "transcript-time";
        time.textContent = line.time;

        const label = document.createElement("span");
        label.textContent = line.source === "demo" ? "Demo" : `Chunk ${index + 1}`;

        meta.append(time, label);

        const body = document.createElement("div");
        body.className = "transcript-text";
        appendHighlightedText(body, line.text, query);

        row.append(meta, body);
        els.transcriptBox.appendChild(row);
    });
}

function appendHighlightedText(parent, text, query) {
    if (!query) {
        parent.textContent = text;
        return;
    }

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let cursor = 0;
    let index = lowerText.indexOf(lowerQuery);

    while (index !== -1) {
        if (index > cursor) parent.appendChild(document.createTextNode(text.slice(cursor, index)));

        const mark = document.createElement("mark");
        mark.textContent = text.slice(index, index + query.length);
        parent.appendChild(mark);

        cursor = index + query.length;
        index = lowerText.indexOf(lowerQuery, cursor);
    }

    if (cursor < text.length) parent.appendChild(document.createTextNode(text.slice(cursor)));
}

function manualRefresh() {
    const latest = state.transcript.at(-1)?.text;
    if (!latest) {
        addSuggestionsBatch(buildLocalSuggestions("meeting priorities"), "demo");
        showToast("Loaded starter suggestions. Add transcript for better context.");
        return;
    }

    generateSuggestions(latest, { trigger: "manual" });
}

function loadDemoSession() {
    clearSession({ silent: true });
    state.elapsedMs = 6 * 60 * 1000 + 24 * 1000;
    DEMO_TRANSCRIPT.forEach((line) => addTranscriptLine(line, "demo"));
    addSuggestionsBatch(DEMO_SUGGESTIONS, "demo");
    addChatMessage("assistant", "Demo session loaded. Try the filters, save a suggestion, or ask for a launch-readiness summary.");
    updateMetrics();
    showToast("Demo session loaded.");
}

function confirmClearSession() {
    if (!hasSessionData()) {
        showToast("There is no session to clear.");
        return;
    }

    if (window.confirm("Clear the current transcript, suggestions, and chat?")) {
        clearSession();
    }
}

function clearSession(options = {}) {
    const { silent = false } = options;

    if (state.isRecording) stopRecording();

    state.transcript = [];
    state.chatHistory = [];
    state.suggestionBatches = [];
    state.elapsedMs = 0;
    state.sessionStartedAt = null;
    state.countdownRemaining = null;
    els.transcriptSearch.value = "";
    els.chatBox.textContent = "";

    renderTranscript();
    renderSuggestions();
    renderChatEmptyState();
    updateMetrics();
    updateCountdown();
    setSessionState("Ready");

    if (!silent) showToast("Session cleared.");
}

async function copyTranscript() {
    if (!state.transcript.length) {
        showToast("No transcript to copy yet.");
        return;
    }

    const text = state.transcript.map((line) => `[${line.time}] ${line.text}`).join("\n");
    await copyText(text, "Transcript copied.");
}

async function copyText(text, successMessage) {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            fallbackCopy(text);
        }
        showToast(successMessage);
    } catch (error) {
        console.error("Clipboard error:", error);
        fallbackCopy(text);
        showToast(successMessage);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
}

function exportSession() {
    if (!hasSessionData()) {
        showToast("Nothing to export yet.");
        return;
    }

    const data = {
        exportedAt: new Date().toISOString(),
        metrics: {
            durationMs: getElapsedMs(),
            words: getWordCount(),
            transcriptChunks: state.transcript.length,
            suggestionBatches: state.suggestionBatches.length,
            savedSuggestions: getSavedSuggestions().length
        },
        transcript: state.transcript,
        suggestionBatches: state.suggestionBatches,
        chatHistory: state.chatHistory,
        settings: {
            suggestionContextChars: state.suggestionContextChars,
            chatContextChars: state.chatContextChars,
            chunkSeconds: state.chunkSeconds,
            chatModel: state.chatModel
        }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `twinmind-session-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Session exported.");
}

function startSessionTimer() {
    if (!state.sessionStartedAt) state.sessionStartedAt = Date.now();
    if (state.timerInterval) window.clearInterval(state.timerInterval);
    state.timerInterval = window.setInterval(updateMetrics, 1000);
    updateMetrics();
}

function stopSessionTimer() {
    if (state.sessionStartedAt) {
        state.elapsedMs = getElapsedMs();
        state.sessionStartedAt = null;
    }

    if (state.timerInterval) {
        window.clearInterval(state.timerInterval);
        state.timerInterval = null;
    }

    updateMetrics();
}

function startCaptureCountdown() {
    state.countdownRemaining = state.chunkSeconds;
    updateCountdown();

    if (state.countdownInterval) window.clearInterval(state.countdownInterval);
    state.countdownInterval = window.setInterval(() => {
        if (!state.isRecording) return;
        state.countdownRemaining = Math.max(0, (state.countdownRemaining ?? state.chunkSeconds) - 1);
        updateCountdown();
    }, 1000);
}

function stopCaptureCountdown() {
    if (state.countdownInterval) {
        window.clearInterval(state.countdownInterval);
        state.countdownInterval = null;
    }
    state.countdownRemaining = null;
    updateCountdown();
}

function updateCountdown() {
    if (!els.refreshCountdown) return;
    els.refreshCountdown.textContent = state.countdownRemaining == null ? "--" : `${state.countdownRemaining}s`;
}

function updateMetrics() {
    const duration = formatDuration(getElapsedMs());
    const words = getWordCount();
    const saved = getSavedSuggestions().length;
    const last = state.transcript.at(-1)?.time || "Never";

    els.sessionTimer.textContent = duration;
    els.activeDuration.textContent = duration;
    els.wordCount.textContent = `${words} word${words === 1 ? "" : "s"}`;
    els.savedMetric.textContent = `${saved} saved`;
    els.savedCount.textContent = `${saved} saved`;
    els.transcriptCount.textContent = String(state.transcript.length);
    els.lastUpdate.textContent = last;
}

function setSessionState(label, kind) {
    els.sessionState.textContent = label;
    els.sessionState.classList.toggle("live", kind === "live");
    els.sessionState.classList.toggle("working", kind === "working");
}

function getElapsedMs() {
    return state.elapsedMs + (state.sessionStartedAt ? Date.now() - state.sessionStartedAt : 0);
}

function getWordCount() {
    return state.transcript.reduce((total, line) => {
        const words = line.text.trim().split(/\s+/).filter(Boolean).length;
        return total + words;
    }, 0);
}

function getSavedSuggestions() {
    return state.suggestionBatches.flatMap((batch) => batch.items.filter((item) => item.saved));
}

function hasSessionData() {
    return state.transcript.length || state.chatHistory.length || state.suggestionBatches.length;
}

function buildLocalSuggestions(seedText) {
    const topic = extractTopic(seedText);
    return [
        { type: "QUESTION", content: `What decision is needed next for ${topic}?` },
        { type: "TALKING_POINT", content: "Clarify owner, deadline, and risk before moving on." },
        { type: "FACT_CHECK", content: "Verify dates, metrics, and dependencies before sharing externally." }
    ];
}

function buildLocalReply(userMsg) {
    const transcript = state.transcript.map((line) => line.text).join(" ");
    const latest = state.transcript.slice(-2).map((line) => line.text).join(" ");
    const lower = userMsg.toLowerCase();

    if (!transcript) {
        return "Demo answer: I do not have transcript context yet. Load Demo or start recording, then I can summarize, extract decisions, or expand a suggestion.";
    }

    if (lower.includes("summar")) {
        return `Session summary: ${latest} The useful next move is to identify owners, confirm timing, and separate open risks from settled decisions. Add a Groq key in Settings for a richer AI-generated answer.`;
    }

    if (lower.includes("decision") || lower.includes("risk")) {
        return "Likely decisions: confirm the launch date, assign readiness owners, and decide whether missing analytics blocks beta. Key risks are onboarding quality, support documentation, and limited activation visibility.";
    }

    if (lower.includes("follow")) {
        return "Suggested follow-ups: assign support documentation, lock pricing approval, and create a dashboard instrumentation owner. Each item should have a due date before the next launch check-in.";
    }

    return `Based on the current transcript, the strongest answer is to focus on ${extractTopic(transcript)} and clarify the owner, deadline, dependency, and risk. This is a local demo response; add a Groq key for full contextual chat.`;
}

function extractTopic(text) {
    const stopWords = new Set(["about", "after", "again", "also", "before", "being", "could", "every", "from", "have", "into", "just", "need", "should", "that", "their", "there", "this", "with", "would", "your"]);
    const words = String(text)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 3 && !stopWords.has(word));

    return words.slice(-3).join(" ") || "this topic";
}

function getSuggestionTagClass(type) {
    if (type.includes("QUESTION")) return "tag-question";
    if (type.includes("TALKING")) return "tag-talking-point";
    if (type.includes("FACT")) return "tag-fact-check";
    if (type.includes("CLARIF")) return "tag-question";
    return "tag-answer";
}

function formatSuggestionType(type) {
    return type.toLowerCase().replace(/_/g, " ");
}

function createEmptyState(title, text, transcriptPlaceholder = false) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    if (transcriptPlaceholder) empty.id = "transcriptPlaceholder";

    const titleEl = document.createElement("span");
    titleEl.className = "empty-title";
    titleEl.textContent = title;

    const textEl = document.createElement("span");
    textEl.className = "empty-text";
    textEl.textContent = text;

    empty.append(titleEl, textEl);

    if (transcriptPlaceholder) {
        const listening = document.createElement("span");
        listening.className = "listening-state";
        listening.append(createDot(), createDot(), createDot(), document.createTextNode("Listening"));
        empty.appendChild(listening);
    }

    return empty;
}

function createDot() {
    const dot = document.createElement("span");
    dot.className = "l-dot";
    return dot;
}

function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    els.toastRegion.appendChild(toast);

    window.setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(6px)";
    }, 2800);

    window.setTimeout(() => toast.remove(), 3200);
}

function toggleSettings(show) {
    els.settingsModal.classList.toggle("hidden", !show);
    if (show) window.setTimeout(() => els.apiKeyInput.focus(), 0);
}

function initTheme() {
    const html = document.documentElement;
    const savedTheme = localStorage.getItem(CONFIG.themeKey) || "dark";
    html.setAttribute("data-theme", savedTheme);
    updateThemeIcons(savedTheme);

    els.themeToggle.addEventListener("click", () => {
        const current = html.getAttribute("data-theme");
        const next = current === "dark" ? "light" : "dark";
        html.setAttribute("data-theme", next);
        localStorage.setItem(CONFIG.themeKey, next);
        updateThemeIcons(next);
    });
}

function updateThemeIcons(theme) {
    const sunIcon = els.themeToggle.querySelector(".sun-icon");
    const moonIcon = els.themeToggle.querySelector(".moon-icon");
    sunIcon.style.display = theme === "light" ? "none" : "block";
    moonIcon.style.display = theme === "light" ? "block" : "none";
}

function cleanAssistantText(text) {
    return String(text).replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function getMicErrorMessage(error) {
    if (error?.name === "NotAllowedError") return "Microphone permission was blocked.";
    if (error?.name === "NotFoundError") return "No microphone was found.";
    if (error?.name === "NotReadableError") return "The microphone is already in use.";
    return "Could not start microphone recording.";
}

function isInteractiveTarget(target) {
    return Boolean(target.closest("input, textarea, button, select, a, [contenteditable='true']"));
}

function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.round(number)));
}

function sanitizeSuggestionPrompt(prompt) {
    const text = String(prompt || DEFAULT_SUGGESTION_PROMPT);
    return text
        .replace(/\bCLARIFICATION\b/gi, "QUESTION")
        .replace(/\bclarification\b/gi, "question");
}

function formatClock(date) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
    }

    return `${pad2(minutes)}:${pad2(seconds)}`;
}

function pad2(value) {
    return String(value).padStart(2, "0");
}

function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

