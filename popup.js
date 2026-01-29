// VibeCoding Chrome Extension - Popup Script
// Handles UI state, recording, and communication with service worker

class VibeCodingPopup {
  constructor() {
    // State
    this.state = 'idle'; // idle, recording, transcribing, formatting, preview, error
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recordingStartTime = null;
    this.durationInterval = null;
    this.analyserNode = null;
    this.audioContext = null;
    this.transcribedText = '';
    this.formattedText = '';
    
    // DOM Elements
    this.screens = {
      idle: document.getElementById('idleScreen'),
      recording: document.getElementById('recordingScreen'),
      transcribing: document.getElementById('transcribingScreen'),
      formatting: document.getElementById('formattingScreen'),
      preview: document.getElementById('previewScreen'),
      error: document.getElementById('errorScreen')
    };
    
    this.elements = {
      recordBtn: document.getElementById('recordBtn'),
      stopBtn: document.getElementById('stopBtn'),
      insertBtn: document.getElementById('insertBtn'),
      copyBtn: document.getElementById('copyBtn'),
      retryBtn: document.getElementById('retryBtn'),
      clearBtn: document.getElementById('clearBtn'),
      errorRetryBtn: document.getElementById('errorRetryBtn'),
      status: document.getElementById('status'),
      modelStatus: document.getElementById('modelStatus'),
      duration: document.getElementById('duration'),
      volumeBar: document.getElementById('volumeBar'),
      waveform: document.getElementById('waveform'),
      originalText: document.getElementById('originalText'),
      formattedText: document.getElementById('formattedText'),
      errorMessage: document.getElementById('errorMessage')
    };
    
    this.init();
  }
  
  init() {
    this.bindEvents();
    this.checkModelStatus();
  }
  
  bindEvents() {
    this.elements.recordBtn.addEventListener('click', () => this.startRecording());
    this.elements.stopBtn.addEventListener('click', () => this.stopRecording());
    this.elements.insertBtn.addEventListener('click', () => this.insertText());
    this.elements.copyBtn.addEventListener('click', () => this.copyText());
    this.elements.retryBtn.addEventListener('click', () => this.retry());
    this.elements.clearBtn.addEventListener('click', () => this.clear());
    this.elements.errorRetryBtn.addEventListener('click', () => this.clear());
  }
  
  showScreen(screenName) {
    Object.keys(this.screens).forEach(key => {
      this.screens[key].classList.remove('active');
    });
    this.screens[screenName].classList.add('active');
    this.state = screenName;
  }
  
  async checkModelStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CHECK_STATUS' });
      if (response && response.ready) {
        this.elements.modelStatus.textContent = 'Ready';
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
      this.showError('Microphone access denied. Please enable microphone permission.');
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
  
  startDurationTimer() {
    this.durationInterval = setInterval(() => {
      const elapsed = Date.now() - this.recordingStartTime;
      const seconds = Math.floor(elapsed / 1000);
      const minutes = Math.floor(seconds / 60);
      const displaySeconds = seconds % 60;
      this.elements.duration.textContent = `${minutes}:${displaySeconds.toString().padStart(2, '0')}`;
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
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new VibeCodingPopup();
});
