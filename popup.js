// VibeCoding Chrome Extension - Popup Script
// Handles UI state, recording, and communication with service worker

class VibeCodingPopup {
  constructor() {
    // State
    this.state = 'idle'; // idle, recording, transcribing, formatting, preview, error, settings
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recordingStartTime = null;
    this.durationInterval = null;
    this.analyserNode = null;
    this.audioContext = null;
    this.transcribedText = '';
    this.formattedText = '';
    this.currentModel = 'moonshine'; // Default to Moonshine
    this.whisperDownloaded = false;
    
    // DOM Elements
    this.screens = {
      idle: document.getElementById('idleScreen'),
      recording: document.getElementById('recordingScreen'),
      transcribing: document.getElementById('transcribingScreen'),
      formatting: document.getElementById('formattingScreen'),
      preview: document.getElementById('previewScreen'),
      error: document.getElementById('errorScreen'),
      settings: document.getElementById('settingsScreen')
    };
    
    this.elements = {
      recordBtn: document.getElementById('recordBtn'),
      stopBtn: document.getElementById('stopBtn'),
      insertBtn: document.getElementById('insertBtn'),
      copyBtn: document.getElementById('copyBtn'),
      retryBtn: document.getElementById('retryBtn'),
      clearBtn: document.getElementById('clearBtn'),
      errorRetryBtn: document.getElementById('errorRetryBtn'),
      settingsBtn: document.getElementById('settingsBtn'),
      status: document.getElementById('status'),
      modelStatus: document.getElementById('modelStatus'),
      duration: document.getElementById('duration'),
      volumeBar: document.getElementById('volumeBar'),
      waveform: document.getElementById('waveform'),
      originalText: document.getElementById('originalText'),
      formattedText: document.getElementById('formattedText'),
      errorMessage: document.getElementById('errorMessage'),
      transcribingInfo: document.getElementById('transcribingInfo'),
      // Settings elements
      moonshineRadio: document.getElementById('moonshineRadio'),
      whisperRadio: document.getElementById('whisperRadio'),
      moonshineStatus: document.getElementById('moonshineStatus'),
      whisperStatus: document.getElementById('whisperStatus'),
      saveSettingsBtn: document.getElementById('saveSettingsBtn'),
      backBtn: document.getElementById('backBtn'),
      downloadSection: document.getElementById('downloadSection'),
      downloadText: document.getElementById('downloadText'),
      progressFill: document.getElementById('progressFill'),
      downloadPercent: document.getElementById('downloadPercent')
    };
    
    this.init();
  }
  
  async init() {
    await this.loadSettings();
    this.bindEvents();
    this.checkModelStatus();
    this.updateSettingsUI();
    
    // Check if we're in a tab (vs popup) - affects microphone permission behavior
    this.isInTab = window.location.search.includes('tab=true');
  }
  
  /**
   * Check microphone permission status
   * @returns {Promise<string>} 'granted', 'denied', or 'prompt'
   */
  async checkMicrophonePermission() {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' });
      return result.state;
    } catch (e) {
      // permissions.query may not support 'microphone' in all browsers
      return 'prompt';
    }
  }
  
  /**
   * Open the extension in a new tab (for reliable permission prompt)
   */
  openInTab() {
    const url = chrome.runtime.getURL('popup.html?tab=true');
    chrome.tabs.create({ url });
    window.close(); // Close the popup
  }
  
  bindEvents() {
    this.elements.recordBtn.addEventListener('click', () => this.startRecording());
    this.elements.stopBtn.addEventListener('click', () => this.stopRecording());
    this.elements.insertBtn.addEventListener('click', () => this.insertText());
    this.elements.copyBtn.addEventListener('click', () => this.copyText());
    this.elements.retryBtn.addEventListener('click', () => this.retry());
    this.elements.clearBtn.addEventListener('click', () => this.clear());
    this.elements.errorRetryBtn.addEventListener('click', () => this.clear());
    this.elements.settingsBtn.addEventListener('click', () => this.showSettings());
    this.elements.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
    this.elements.backBtn.addEventListener('click', () => this.showScreen('idle'));
    
    // Model radio change events
    this.elements.whisperRadio.addEventListener('change', () => this.onModelChange('whisper'));
    this.elements.moonshineRadio.addEventListener('change', () => this.onModelChange('moonshine'));
    
    // Listen for transcription progress messages from service worker
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'TRANSCRIPTION_PROGRESS') {
        this.updateTranscriptionProgress(message);
      }
      return false;
    });
  }
  
  /**
   * Update UI with transcription progress
   */
  updateTranscriptionProgress(message) {
    if (this.state === 'transcribing' && this.elements.transcribingInfo) {
      if (message.progress !== undefined) {
        this.elements.transcribingInfo.textContent = `Loading model: ${Math.round(message.progress)}%`;
      } else if (message.message) {
        this.elements.transcribingInfo.textContent = message.message;
      }
    }
  }
  
  showScreen(screenName) {
    Object.keys(this.screens).forEach(key => {
      this.screens[key].classList.remove('active');
    });
    this.screens[screenName].classList.add('active');
    this.state = screenName;
  }
  
  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response) {
        this.currentModel = response.sttModel || 'moonshine';
        this.whisperDownloaded = response.whisperDownloaded || false;
      }
    } catch (error) {
      console.log('Settings load:', error.message);
      this.currentModel = 'moonshine';
      this.whisperDownloaded = false;
    }
    
    // Update transcribing info text to reflect current model
    this.updateTranscribingInfoText();
  }
  
  updateTranscribingInfoText() {
    const modelName = this.currentModel === 'moonshine' ? 'Moonshine' : 'Whisper';
    if (this.elements.transcribingInfo) {
      this.elements.transcribingInfo.textContent = `Processing audio with ${modelName} (local)`;
    }
  }
  
  async checkModelStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CHECK_STATUS' });
      if (response && response.ready) {
        const modelName = this.currentModel === 'moonshine' ? 'Moonshine' : 'Whisper';
        this.elements.modelStatus.textContent = `${modelName} Ready`;
        this.elements.modelStatus.style.color = '#00b894';
      } else {
        this.elements.modelStatus.textContent = response?.status || 'Initializing...';
      }
    } catch (error) {
      console.log('Model status check:', error.message);
      this.elements.modelStatus.textContent = 'Ready (demo mode)';
      this.elements.modelStatus.style.color = '#00b894';
    }
  }
  
  async startRecording() {
    try {
      // Check permission status first
      const permissionState = await this.checkMicrophonePermission();
      console.log('Microphone permission state:', permissionState);
      
      // If permission is denied and we're in popup, offer to open in tab
      if (permissionState === 'denied' && !this.isInTab) {
        this.showError('Microphone permission was denied. Click below to open in a new tab where you can grant permission.');
        // Add a button to open in tab
        setTimeout(() => {
          const errorScreen = this.screens.error;
          if (errorScreen && !errorScreen.querySelector('.open-tab-btn')) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary open-tab-btn';
            btn.textContent = '🔓 Open in Tab to Enable Mic';
            btn.style.marginTop = '10px';
            btn.onclick = () => this.openInTab();
            errorScreen.appendChild(btn);
          }
        }, 100);
        return;
      }
      
      // First check if we can enumerate devices (tests permission state)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasAudioInput = devices.some(d => d.kind === 'audioinput');
      
      if (!hasAudioInput) {
        throw new Error('No microphone detected');
      }
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      // Set up audio context for visualization
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      source.connect(this.analyserNode);
      
      // Set up media recorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.getSupportedMimeType()
      });
      
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => this.handleRecordingStop();
      
      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.recordingStartTime = Date.now();
      
      // Show recording screen
      this.showScreen('recording');
      
      // Start duration timer
      this.startDurationTimer();
      
      // Start waveform visualization
      this.startWaveformVisualization();
      
    } catch (error) {
      console.error('Error starting recording:', error);
      
      // Provide specific error messages
      let errorMsg = 'Microphone access denied. ';
      let showOpenInTab = false;
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        if (!this.isInTab) {
          errorMsg = 'Chrome extensions need microphone permission granted in a full tab. Click below to open in a new tab.';
          showOpenInTab = true;
        } else {
          errorMsg += 'Please allow microphone access when prompted. You may need to check Chrome Settings → Privacy & Security → Site Settings → Microphone.';
        }
      } else if (error.name === 'NotFoundError' || error.message.includes('No microphone')) {
        errorMsg = 'No microphone detected. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMsg = 'Microphone is in use by another app. Please close other apps using the microphone.';
      } else {
        errorMsg += error.message || 'Please check your microphone settings.';
      }
      
      this.showError(errorMsg);
      
      // Add "Open in Tab" button for permission errors when in popup
      if (showOpenInTab) {
        setTimeout(() => {
          const errorScreen = this.screens.error;
          if (errorScreen && !errorScreen.querySelector('.open-tab-btn')) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary open-tab-btn';
            btn.textContent = '🔓 Open in Tab to Enable Mic';
            btn.style.marginTop = '10px';
            btn.onclick = () => this.openInTab();
            errorScreen.appendChild(btn);
          }
        }, 100);
      }
    }
  }
  
  getSupportedMimeType() {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];
    
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }
    return 'audio/webm';
  }
  
  // Maximum recording duration (5 minutes in ms)
  static MAX_RECORDING_DURATION = 5 * 60 * 1000;
  
  startDurationTimer() {
    this.durationInterval = setInterval(() => {
      const elapsed = Date.now() - this.recordingStartTime;
      const seconds = Math.floor(elapsed / 1000);
      const minutes = Math.floor(seconds / 60);
      const displaySeconds = seconds % 60;
      this.elements.duration.textContent = `${minutes}:${displaySeconds.toString().padStart(2, '0')}`;
      
      // Auto-stop at max duration
      if (elapsed >= VibeCodingPopup.MAX_RECORDING_DURATION) {
        console.log('Max recording duration reached, auto-stopping');
        this.stopRecording();
      }
    }, 100);
  }
  
  startWaveformVisualization() {
    const canvas = this.elements.waveform;
    const ctx = canvas.getContext('2d');
    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      if (this.state !== 'recording') return;
      
      requestAnimationFrame(draw);
      
      this.analyserNode.getByteFrequencyData(dataArray);
      
      // Clear canvas
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw waveform bars
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        // Gradient color
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, '#6c5ce7');
        gradient.addColorStop(1, '#a29bfe');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
      
      // Update volume bar
      const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
      const volumeLevel = Math.floor((average / 255) * 10);
      const filledBars = '▰'.repeat(volumeLevel);
      const emptyBars = '▯'.repeat(10 - volumeLevel);
      this.elements.volumeBar.textContent = filledBars + emptyBars;
    };
    
    draw();
  }
  
  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
  
  async handleRecordingStop() {
    // Create audio blob
    const mimeType = this.getSupportedMimeType();
    const audioBlob = new Blob(this.audioChunks, { type: mimeType });
    
    // Show transcribing screen
    this.showScreen('transcribing');
    
    try {
      // Transcribe audio
      const transcribeResponse = await this.transcribeAudio(audioBlob);
      
      if (!transcribeResponse.success) {
        throw new Error(transcribeResponse.error || 'Transcription failed');
      }
      
      this.transcribedText = transcribeResponse.text;
      
      // Show formatting screen
      this.showScreen('formatting');
      
      // Format text with LLM
      const formatResponse = await this.formatText(this.transcribedText);
      
      if (formatResponse.success) {
        this.formattedText = formatResponse.text;
      } else {
        // Fallback: use transcribed text if formatting fails
        console.warn('Formatting failed, using raw transcription:', formatResponse.error);
        this.formattedText = this.transcribedText;
      }
      
      // Show preview
      this.showPreview();
      
    } catch (error) {
      console.error('Processing error:', error);
      this.showError(error.message || 'An error occurred while processing your recording.');
    }
  }
  
  async transcribeAudio(audioBlob) {
    try {
      // Convert blob to base64 for message passing
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = this.arrayBufferToBase64(arrayBuffer);
      
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSCRIBE',
        audioData: base64Audio,
        mimeType: audioBlob.type
      });
      
      return response || { success: false, error: 'No response from service worker' };
    } catch (error) {
      console.error('Transcription error:', error);
      return { success: false, error: error.message };
    }
  }
  
  async formatText(text) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'REWRITE',
        text: text
      });
      
      return response || { success: false, error: 'No response from service worker' };
    } catch (error) {
      console.error('Formatting error:', error);
      return { success: false, error: error.message };
    }
  }
  
  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  
  showPreview() {
    this.elements.originalText.textContent = this.transcribedText;
    this.elements.formattedText.textContent = this.formattedText;
    this.showScreen('preview');
  }
  
  async insertText() {
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('No active tab found');
      }
      
      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'INSERT_TEXT',
        text: this.formattedText
      });
      
      if (response && response.success) {
        // Close popup after successful insertion
        window.close();
      } else {
        // Fallback to copy
        await this.copyText();
        this.showError('Could not insert directly. Text copied to clipboard. Use Ctrl+V to paste.');
      }
    } catch (error) {
      console.error('Insert error:', error);
      // Fallback to copy
      await this.copyText();
      alert('Text copied to clipboard. Use Ctrl+V to paste.');
    }
  }
  
  async copyText() {
    try {
      await navigator.clipboard.writeText(this.formattedText);
      
      // Show feedback
      const originalText = this.elements.copyBtn.textContent;
      this.elements.copyBtn.textContent = '✓ Copied!';
      setTimeout(() => {
        this.elements.copyBtn.textContent = originalText;
      }, 2000);
    } catch (error) {
      console.error('Copy error:', error);
      this.showError('Failed to copy text to clipboard.');
    }
  }
  
  retry() {
    this.clear();
    this.startRecording();
  }
  
  clear() {
    this.transcribedText = '';
    this.formattedText = '';
    this.audioChunks = [];
    this.showScreen('idle');
    this.elements.status.textContent = 'Ready';
  }
  
  showError(message) {
    this.elements.errorMessage.textContent = message;
    this.showScreen('error');
  }
  
  // Settings methods
  showSettings() {
    this.updateSettingsUI();
    this.showScreen('settings');
  }
  
  updateSettingsUI() {
    // Update radio buttons
    if (this.currentModel === 'moonshine') {
      this.elements.moonshineRadio.checked = true;
    } else {
      this.elements.whisperRadio.checked = true;
    }
    
    // Update status badges
    this.elements.moonshineStatus.textContent = 'Default';
    this.elements.moonshineStatus.className = 'model-status-badge default';
    
    if (this.whisperDownloaded) {
      this.elements.whisperStatus.textContent = 'Ready';
      this.elements.whisperStatus.className = 'model-status-badge ready';
    } else {
      this.elements.whisperStatus.textContent = 'Not Downloaded';
      this.elements.whisperStatus.className = 'model-status-badge not-downloaded';
    }
    
    // Hide download section initially
    this.elements.downloadSection.style.display = 'none';
  }
  
  async onModelChange(model) {
    if (model === 'whisper' && !this.whisperDownloaded) {
      // Show download section and start download
      this.elements.downloadSection.style.display = 'block';
      await this.downloadWhisperModel();
    }
  }
  
  async downloadWhisperModel() {
    try {
      this.elements.downloadText.textContent = 'Downloading Whisper model...';
      this.elements.whisperStatus.textContent = 'Downloading';
      this.elements.whisperStatus.className = 'model-status-badge downloading';
      
      // Send download request to service worker
      const response = await chrome.runtime.sendMessage({ 
        type: 'DOWNLOAD_WHISPER',
        onProgress: true
      });
      
      // For demo, simulate download progress
      await this.simulateDownloadProgress();
      
      if (response && response.success) {
        this.whisperDownloaded = true;
        this.elements.whisperStatus.textContent = 'Ready';
        this.elements.whisperStatus.className = 'model-status-badge ready';
        this.elements.downloadSection.style.display = 'none';
      } else {
        throw new Error(response?.error || 'Download failed');
      }
      
    } catch (error) {
      console.error('Download error:', error);
      this.elements.downloadText.textContent = 'Download failed. Please try again.';
      this.elements.whisperStatus.textContent = 'Not Downloaded';
      this.elements.whisperStatus.className = 'model-status-badge not-downloaded';
      
      // Revert to Moonshine
      this.elements.moonshineRadio.checked = true;
    }
  }
  
  async simulateDownloadProgress() {
    // Simulate download progress for demo
    for (let i = 0; i <= 100; i += 5) {
      this.elements.progressFill.style.width = `${i}%`;
      this.elements.downloadPercent.textContent = `${i}%`;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  async saveSettings() {
    const selectedModel = this.elements.whisperRadio.checked ? 'whisper' : 'moonshine';
    
    // If Whisper is selected but not downloaded, don't save
    if (selectedModel === 'whisper' && !this.whisperDownloaded) {
      this.elements.downloadText.textContent = 'Please wait for Whisper model to download first.';
      this.elements.downloadSection.style.display = 'block';
      return;
    }
    
    this.currentModel = selectedModel;
    
    try {
      // Save settings via service worker
      await chrome.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        settings: {
          sttModel: this.currentModel,
          whisperDownloaded: this.whisperDownloaded
        }
      });
      
      // Update the model status display
      const modelName = this.currentModel === 'moonshine' ? 'Moonshine' : 'Whisper';
      this.elements.modelStatus.textContent = `${modelName} Ready`;
      
      // Update transcribing info text using textContent (safer than innerHTML)
      this.updateTranscribingInfoText();
      
      // Go back to idle screen
      this.showScreen('idle');
      
    } catch (error) {
      console.error('Save settings error:', error);
      this.showError('Failed to save settings. Please try again.');
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new VibeCodingPopup();
});
