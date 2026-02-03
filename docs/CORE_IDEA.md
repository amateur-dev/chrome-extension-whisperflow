# CORE_IDEA: The Voice-First Workflow Integrator

> **System Context Document**
> *Status: MVP Complete ✅ | Version: 1.0 | Last Updated: Feb 3, 2026*

This document serves as the **Vision and Philosophy** source for the VibeCoding Chrome Extension. It defines the "Why" and the "What" for AI agents.

---

## 1. System Philosophy & Vision

**VibeCoding** is a privacy-first, offline-only Chrome Extension that bridges the gap between **voice thought** and **structured text**.

We believe that knowledge workers spend too much time formatting, editing, and typing. They should be able to **speak** their intent ("the vibe") and have a local AI handle the syntax, grammar, and structure.

### Core Principles
1.  **100% Offline & Private:** No audio, text, or data ever leaves the user's device. No cloud API keys. No subscriptions.
2.  **Worker-First Architecture:** The UI must never freeze. All heavy lifting (Whisper, LLM) happens in background threads.
3.  **Frictionless Injection:** We don't want users to copy-paste. We inject the result directly into their active workflow (Gmail, Slack, Notion).
4.  **Graceful Degradation:** If the browser doesn't support WebGPU/WASM, we fail gracefully with clear UI feedback.

---

## 2. Operational Modes

The extension operates in a linear "Pipeline" mode:

1.  **Ingestion (Recording):**
    *   Captures system audio/mic via `MediaRecorder`.
    *   Visual feedback (waveform) is critical for trust.
2.  **Transformation (AI Chain):**
    *   **Step A: Transcription** (Whisper.cpp WASM). Raw audio -> Raw text.
    *   **Step B: Refinement** (WebLLM). Raw text -> Polished prose.
3.  **Action (Injection):**
    *   The polished text is inserted into the DOM (`document.activeElement`) or copied to clipboard.

---

## 3. The "Stateful Pipeline"

The AI agents working on this repo should respect the following data flow:

### A. Input Layer (`popup.js`)
*   Handles user interactions.
*   Manages the "State Machine" (Idle -> Recording -> Transcribing -> Review).

### B. Logic Layer (`service-worker.js`)
*   The "Central Nervous System".
*   Routes messages.
*   Manages the lifecycle of the AI workers.

### C. Compute Layer (`lib/*-worker.js`)
*   **Whisper Worker:** Dedicated thread for audio processing.
*   **WebLLM Worker:** Dedicated thread for text generation.

---

## 4. Success Metrics (MVP)

*   **Latency:** Transcription start < 2s after recording stops.
*   **Accuracy:** User does not need to correct > 1 word per sentence.
*   **Privacy:** Zero network requests to external AI endpoints (OpenAI/Anthropic) observed in Network Tab.
