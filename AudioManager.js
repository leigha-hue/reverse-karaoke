/**
 * AudioManager.js
 * Handles all audio recording, playback, and reversal operations using Web Audio API
 */

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.isPlaying = false;
        this.recordingTime = 0;
        this.recordingTimer = null;
        this.maxRecordingDuration = 10.0; // seconds
        
        // Store audio buffers
        this.player1OriginalBuffer = null;
        this.player1ReversedBuffer = null;
        this.player2AttemptBuffer = null;
        this.player2ReverseForwardBuffer = null;
        
        // Callbacks
        this.onRecordingUpdate = null;
        this.onPlaybackEnd = null;
    }
    
    /**
     * Initialize Audio Context
     */
    async initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Resume context if suspended (required for some browsers)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }
    
    /**
     * Request microphone permission and start recording
     */
    async startRecording(player, onComplete) {
        console.log('🎤 [AudioManager] Starting recording for Player', player);
        try {
            console.log('🎤 [AudioManager] Checking for mediaDevices support...');
            
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error('❌ [AudioManager] getUserMedia not supported in this browser');
                alert('Your browser does not support audio recording. Please use Chrome, Firefox, or Safari.');
                if (onComplete) onComplete(null);
                return;
            }
            
            console.log('✅ [AudioManager] mediaDevices supported');
            await this.initAudioContext();
            console.log('✅ [AudioManager] AudioContext initialized');
            
            console.log('🎤 [AudioManager] Requesting microphone access with high-quality settings...');
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,        // Disable for better vocal quality
                    noiseSuppression: false,        // Disable to preserve natural voice
                    autoGainControl: false,         // Disable to preserve dynamics
                    sampleRate: 48000,              // Higher sample rate for better quality
                    channelCount: 1                 // Mono is fine for voice
                } 
            });
            console.log('✅ [AudioManager] Microphone access granted with high-quality settings!', stream);
            
            // Create media recorder with high bitrate
            console.log('🎤 [AudioManager] Creating MediaRecorder with high bitrate...');
            let options = { 
                mimeType: 'audio/webm;codecs=opus',
                audioBitsPerSecond: 128000  // 128kbps for high quality
            };
            
            // Check if webm with opus is supported, fallback to other formats
            if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                console.warn('⚠️ [AudioManager] audio/webm;codecs=opus not supported, trying alternatives...');
                if (MediaRecorder.isTypeSupported('audio/webm')) {
                    options = { 
                        mimeType: 'audio/webm',
                        audioBitsPerSecond: 128000
                    };
                    console.log('✅ [AudioManager] Using audio/webm with 128kbps');
                } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    options = { 
                        mimeType: 'audio/mp4',
                        audioBitsPerSecond: 128000
                    };
                    console.log('✅ [AudioManager] Using audio/mp4 with 128kbps');
                } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
                    options = { 
                        mimeType: 'audio/ogg',
                        audioBitsPerSecond: 128000
                    };
                    console.log('✅ [AudioManager] Using audio/ogg with 128kbps');
                } else {
                    options = { audioBitsPerSecond: 128000 };
                    console.log('✅ [AudioManager] Using default format with 128kbps');
                }
            } else {
                console.log('✅ [AudioManager] Using audio/webm with Opus codec at 128kbps');
            }
            
            this.mediaRecorder = new MediaRecorder(stream, options);
            this.audioChunks = [];
            console.log('✅ [AudioManager] MediaRecorder created');
            
            this.mediaRecorder.ondataavailable = (event) => {
                console.log('📦 [AudioManager] Data available:', event.data.size, 'bytes');
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = async () => {
                console.log('🛑 [AudioManager] Recording stopped');
                console.log('📦 [AudioManager] Total chunks:', this.audioChunks.length);
                
                // Stop all tracks
                stream.getTracks().forEach(track => {
                    console.log('🛑 [AudioManager] Stopping track:', track.label);
                    track.stop();
                });
                
                // Create blob from chunks
                const audioBlob = new Blob(this.audioChunks, { type: options.mimeType || 'audio/webm' });
                console.log('📦 [AudioManager] Created blob:', audioBlob.size, 'bytes, type:', audioBlob.type);
                
                // Convert to audio buffer
                console.log('🔄 [AudioManager] Converting to audio buffer...');
                const arrayBuffer = await audioBlob.arrayBuffer();
                console.log('✅ [AudioManager] ArrayBuffer created:', arrayBuffer.byteLength, 'bytes');
                
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                console.log('✅ [AudioManager] Audio decoded:', audioBuffer.duration.toFixed(2), 'seconds');
                
                // Store based on player
                if (player === 1) {
                    this.player1OriginalBuffer = audioBuffer;
                } else {
                    this.player2AttemptBuffer = audioBuffer;
                }
                
                this.isRecording = false;
                this.recordingTime = 0;
                
                if (onComplete) {
                    onComplete(audioBuffer);
                }
            };
            
            // Start recording
            console.log('▶️ [AudioManager] Starting MediaRecorder...');
            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordingTime = 0;
            console.log('✅ [AudioManager] Recording started successfully!');
            
            // Start timer
            this.recordingTimer = setInterval(() => {
                this.recordingTime += 0.1;
                
                if (this.onRecordingUpdate) {
                    this.onRecordingUpdate(this.recordingTime);
                }
                
                // Auto-stop at max duration
                if (this.recordingTime >= this.maxRecordingDuration) {
                    this.stopRecording();
                }
            }, 100);
            
        } catch (error) {
            console.error('❌ [AudioManager] Error starting recording:', error);
            console.error('❌ [AudioManager] Error name:', error.name);
            console.error('❌ [AudioManager] Error message:', error.message);
            
            let errorMessage = 'Failed to access microphone. ';
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage += 'Please allow microphone access in your browser settings.';
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                errorMessage += 'No microphone found. Please connect a microphone.';
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                errorMessage += 'Microphone is being used by another application.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage += 'Your browser does not support audio recording. Try Chrome or Firefox.';
            } else {
                errorMessage += error.message;
            }
            
            alert(errorMessage);
            if (onComplete) {
                onComplete(null);
            }
        }
    }
    
    /**
     * Stop recording
     */
    stopRecording() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
        
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
    }
    
    /**
     * Play audio buffer
     */
    async playAudioBuffer(audioBuffer, onComplete) {
        console.log('🔊 [AudioManager] playAudioBuffer called');
        console.log('🔊 [AudioManager] audioBuffer:', audioBuffer);
        console.log('🔊 [AudioManager] duration:', audioBuffer ? audioBuffer.duration : 'null');
        
        try {
            await this.initAudioContext();
            console.log('🔊 [AudioManager] AudioContext state:', this.audioContext.state);
            
            // Check if buffer has audio data
            const channelData = audioBuffer.getChannelData(0);
            let maxAmplitude = 0;
            for (let i = 0; i < channelData.length; i++) {
                maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[i]));
            }
            console.log('🔊 [AudioManager] Max amplitude in buffer:', maxAmplitude.toFixed(4));
            
            if (maxAmplitude < 0.001) {
                console.warn('⚠️ [AudioManager] Audio buffer is nearly silent! Max amplitude:', maxAmplitude);
            }
            
                // Create gain node for volume boost
                const gainNode = this.audioContext.createGain();
                gainNode.gain.value = 3.0; // 3x volume boost for clarity without distortion
            
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            
            // Connect: source -> gain -> destination
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            console.log('🔊 [AudioManager] Source created with gain boost: 3.0x');
            console.log('🔊 [AudioManager] Output volume will be:', (maxAmplitude * 3.0).toFixed(4));
            
            source.onended = () => {
                console.log('🔊 [AudioManager] Playback ended');
                this.isPlaying = false;
                if (onComplete) {
                    onComplete();
                }
                if (this.onPlaybackEnd) {
                    this.onPlaybackEnd();
                }
            };
            
            this.isPlaying = true;
            source.start(0);
            console.log('🔊 [AudioManager] Playback started with 3x boosted volume for clarity');
            
        } catch (error) {
            console.error('❌ [AudioManager] Error playing audio:', error);
            console.error('❌ [AudioManager] Error stack:', error.stack);
            this.isPlaying = false;
            if (onComplete) {
                onComplete();
            }
        }
    }
    
    /**
     * Reverse audio buffer
     */
    reverseAudioBuffer(inputBuffer) {
        const numberOfChannels = inputBuffer.numberOfChannels;
        const length = inputBuffer.length;
        const sampleRate = inputBuffer.sampleRate;
        
        // Create new buffer for reversed audio
        const reversedBuffer = this.audioContext.createBuffer(
            numberOfChannels,
            length,
            sampleRate
        );
        
        // Reverse each channel
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const inputData = inputBuffer.getChannelData(channel);
            const outputData = reversedBuffer.getChannelData(channel);
            
            for (let i = 0; i < length; i++) {
                outputData[i] = inputData[length - 1 - i];
            }
        }
        
        return reversedBuffer;
    }
    
    /**
     * Reverse Player 1's recording
     */
    async reversePlayer1(onComplete) {
        console.log('🔄 [AudioManager] reversePlayer1 called');
        console.log('🔄 [AudioManager] player1OriginalBuffer:', this.player1OriginalBuffer);
        
        try {
            await this.initAudioContext();
            console.log('🔄 [AudioManager] AudioContext initialized');
            
            if (!this.player1OriginalBuffer) {
                throw new Error('No Player 1 recording found');
            }
            
            console.log('🔄 [AudioManager] Reversing buffer...');
            this.player1ReversedBuffer = this.reverseAudioBuffer(this.player1OriginalBuffer);
            console.log('🔄 [AudioManager] Buffer reversed successfully');
            console.log('🔄 [AudioManager] Reversed buffer duration:', this.player1ReversedBuffer.duration);
            
            if (onComplete) {
                onComplete(this.player1ReversedBuffer);
            }
        } catch (error) {
            console.error('❌ [AudioManager] Error reversing Player 1 audio:', error);
            console.error('❌ [AudioManager] Error stack:', error.stack);
            if (onComplete) {
                onComplete(null);
            }
        }
    }
    
    /**
     * Reverse Player 2's recording (reverse the mimic back to forward)
     */
    async reversePlayer2(onComplete) {
        try {
            await this.initAudioContext();
            
            if (!this.player2AttemptBuffer) {
                throw new Error('No Player 2 recording found');
            }
            
            console.log('🔄 [AudioManager] Reversing Player 2 attempt...');
            console.log('  📥 Input (P2 mimic in reverse): ' + this.player2AttemptBuffer.duration.toFixed(2) + 's');
            
            this.player2ReverseForwardBuffer = this.reverseAudioBuffer(this.player2AttemptBuffer);
            
            console.log('  📤 Output (P2 reversed to forward): ' + this.player2ReverseForwardBuffer.duration.toFixed(2) + 's');
            console.log('  ✅ This forward version will be compared to Player 1\'s original');
            
            if (onComplete) {
                onComplete(this.player2ReverseForwardBuffer);
            }
        } catch (error) {
            console.error('Error reversing Player 2 audio:', error);
            if (onComplete) {
                onComplete(null);
            }
        }
    }
    
    /**
     * Extract simplified MFCC-like features (timbre representation)
     * Uses frequency band energy distribution as MFCC approximation
     */
    extractMFCCFeatures(audioData, sampleRate) {
        const windowSize = 2048;
        const hopSize = 512;
        const numBands = 13; // Standard MFCC count
        const features = [];
        
        // Mel scale frequency bands (approximate)
        const melBands = [];
        for (let i = 0; i < numBands; i++) {
            const melFreq = (i / numBands) * 2595 * Math.log10(1 + sampleRate / 2 / 700);
            melBands.push(700 * (Math.pow(10, melFreq / 2595) - 1));
        }
        
        for (let pos = 0; pos < audioData.length - windowSize; pos += hopSize) {
            const frame = audioData.slice(pos, pos + windowSize);
            const bandEnergies = new Array(numBands).fill(0);
            
            // Calculate energy in each mel band
            for (let i = 0; i < windowSize / 2; i++) {
                const freq = (i * sampleRate) / windowSize;
                const magnitude = Math.abs(frame[i]);
                
                // Find which mel band this frequency belongs to
                for (let b = 0; b < numBands - 1; b++) {
                    if (freq >= melBands[b] && freq < melBands[b + 1]) {
                        bandEnergies[b] += magnitude * magnitude;
                        break;
                    }
                }
            }
            
            // Log scale and normalize
            const logEnergies = bandEnergies.map(e => Math.log(e + 1e-10));
            features.push(logEnergies);
        }
        
        return features;
    }
    
    /**
     * Calculate cosine similarity between two MFCC feature sets
     */
    calculateMFCCSimilarity(features1, features2) {
        if (features1.length === 0 || features2.length === 0) return 0;
        
        const minFrames = Math.min(features1.length, features2.length);
        let totalSimilarity = 0;
        
        for (let i = 0; i < minFrames; i++) {
            const f1 = features1[Math.floor(i * features1.length / minFrames)];
            const f2 = features2[Math.floor(i * features2.length / minFrames)];
            
            // Cosine similarity
            let dotProduct = 0, mag1 = 0, mag2 = 0;
            for (let j = 0; j < f1.length; j++) {
                dotProduct += f1[j] * f2[j];
                mag1 += f1[j] * f1[j];
                mag2 += f2[j] * f2[j];
            }
            
            const similarity = dotProduct / (Math.sqrt(mag1 * mag2) + 1e-10);
            totalSimilarity += similarity;
        }
        
        return totalSimilarity / minFrames;
    }
    
    /**
     * Extract pitch contour using autocorrelation method
     */
    extractPitchContour(audioData, sampleRate) {
        const windowSize = 2048;
        const hopSize = 512;
        const minFreq = 80;  // Minimum pitch (Hz)
        const maxFreq = 500; // Maximum pitch (Hz)
        const pitchContour = [];
        
        for (let pos = 0; pos < audioData.length - windowSize; pos += hopSize) {
            const frame = audioData.slice(pos, pos + windowSize);
            
            // Autocorrelation
            const minLag = Math.floor(sampleRate / maxFreq);
            const maxLag = Math.floor(sampleRate / minFreq);
            let maxCorr = -Infinity;
            let bestLag = 0;
            
            for (let lag = minLag; lag < maxLag && lag < windowSize / 2; lag++) {
                let corr = 0;
                for (let i = 0; i < windowSize - lag; i++) {
                    corr += frame[i] * frame[i + lag];
                }
                
                if (corr > maxCorr) {
                    maxCorr = corr;
                    bestLag = lag;
                }
            }
            
            // Convert lag to frequency
            const pitch = bestLag > 0 ? sampleRate / bestLag : 0;
            
            // Only record if above threshold (likely voiced)
            if (maxCorr > 0.3) {
                pitchContour.push(pitch);
            } else {
                pitchContour.push(0); // Unvoiced/silent
            }
        }
        
        return pitchContour;
    }
    
    /**
     * Calculate pitch contour match using correlation
     */
    calculatePitchContourMatch(contour1, contour2) {
        if (contour1.length === 0 || contour2.length === 0) return 0.5;
        
        const minLen = Math.min(contour1.length, contour2.length);
        let totalDiff = 0;
        let validFrames = 0;
        
        for (let i = 0; i < minLen; i++) {
            const p1 = contour1[Math.floor(i * contour1.length / minLen)];
            const p2 = contour2[Math.floor(i * contour2.length / minLen)];
            
            // Skip if both are unvoiced
            if (p1 === 0 && p2 === 0) continue;
            
            // If one is voiced and other isn't, penalize
            if ((p1 === 0) !== (p2 === 0)) {
                totalDiff += 1;
                validFrames++;
                continue;
            }
            
            // Both voiced - compare pitch difference
            const diff = Math.abs(p1 - p2) / Math.max(p1, p2);
            totalDiff += Math.min(1, diff);
            validFrames++;
        }
        
        if (validFrames === 0) return 0.5; // Neutral if no voiced frames
        
        const avgDiff = totalDiff / validFrames;
        return 1 - avgDiff; // Convert difference to similarity
    }
    
    /**
     * Calculate spectral centroid (brightness) from audio data
     */
    calculateSpectralCentroid(audioData, sampleRate) {
        const fftSize = 2048;
        const numFrames = Math.floor(audioData.length / fftSize);
        let totalCentroid = 0;
        
        for (let frame = 0; frame < numFrames; frame++) {
            const start = frame * fftSize;
            const frameData = audioData.slice(start, start + fftSize);
            
            // Simple spectral centroid approximation
            let weightedSum = 0;
            let magnitudeSum = 0;
            
            for (let i = 0; i < frameData.length / 2; i++) {
                const magnitude = Math.abs(frameData[i]);
                const frequency = (i * sampleRate) / fftSize;
                weightedSum += frequency * magnitude;
                magnitudeSum += magnitude;
            }
            
            if (magnitudeSum > 0) {
                totalCentroid += weightedSum / magnitudeSum;
            }
        }
        
        return numFrames > 0 ? totalCentroid / numFrames : 0;
    }
    
    /**
     * Calculate RMS energy curve
     */
    calculateRMSEnergyCurve(audioData, windowSize = 2048) {
        const energyCurve = [];
        const hopSize = windowSize / 2;
        
        for (let i = 0; i < audioData.length - windowSize; i += hopSize) {
            let sum = 0;
            for (let j = 0; j < windowSize; j++) {
                sum += audioData[i + j] * audioData[i + j];
            }
            energyCurve.push(Math.sqrt(sum / windowSize));
        }
        
        return energyCurve;
    }
    
    /**
     * Detect onset times in audio
     */
    detectOnsets(audioData, threshold = 0.1) {
        const windowSize = 512;
        const onsets = [];
        let prevEnergy = 0;
        
        for (let i = 0; i < audioData.length - windowSize; i += windowSize) {
            let energy = 0;
            for (let j = 0; j < windowSize; j++) {
                energy += Math.abs(audioData[i + j]);
            }
            energy /= windowSize;
            
            // Detect sharp increases in energy
            if (energy > prevEnergy * (1 + threshold) && energy > 0.01) {
                onsets.push(i);
            }
            
            prevEnergy = energy;
        }
        
        return onsets;
    }
    
    /**
     * Calculate correlation between two arrays
     */
    calculateCorrelation(arr1, arr2) {
        const len = Math.min(arr1.length, arr2.length);
        if (len === 0) return 0;
        
        let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, pSum = 0;
        
        for (let i = 0; i < len; i++) {
            sum1 += arr1[i];
            sum2 += arr2[i];
            sum1Sq += arr1[i] * arr1[i];
            sum2Sq += arr2[i] * arr2[i];
            pSum += arr1[i] * arr2[i];
        }
        
        const num = pSum - (sum1 * sum2 / len);
        const den = Math.sqrt((sum1Sq - sum1 * sum1 / len) * (sum2Sq - sum2 * sum2 / len));
        
        if (den === 0) return 0;
        return num / den;
    }
    
    /**
     * Compare two audio buffers using MFCC-based scoring system
     */
    compareAudio(onComplete) {
        try {
            if (!this.player1OriginalBuffer || !this.player2ReverseForwardBuffer) {
                throw new Error('Missing audio buffers for comparison');
            }
            
            const buffer1 = this.player1OriginalBuffer;
            const buffer2 = this.player2ReverseForwardBuffer;
            const sampleRate = buffer1.sampleRate;
            
            console.log('🎯 [AudioManager] Starting MFCC-based audio comparison...');
            console.log('📊 [AudioManager] Comparing:');
            console.log('  🎤 Player 1 ORIGINAL (forward): ' + buffer1.duration.toFixed(2) + 's, ' + buffer1.length + ' samples');
            console.log('  🔄 Player 2 REVERSED to forward: ' + buffer2.duration.toFixed(2) + 's, ' + buffer2.length + ' samples');
            console.log('  ℹ️  Flow: P1 forward → reversed → P2 hears & mimics → P2 reversed back to forward → compare');
            
            // Get channel data (use first channel)
            const data1 = buffer1.getChannelData(0);
            const data2 = buffer2.getChannelData(0);
            
            const minLength = Math.min(data1.length, data2.length);
            
            // Normalize lengths for comparison
            const normalized1 = new Float32Array(minLength);
            const normalized2 = new Float32Array(minLength);
            normalized1.set(data1.slice(0, minLength));
            normalized2.set(data2.slice(0, minLength));
            
            // === 1. MFCC SIMILARITY (Timbre) - 35% ===
            const mfccFeatures1 = this.extractMFCCFeatures(normalized1, sampleRate);
            const mfccFeatures2 = this.extractMFCCFeatures(normalized2, sampleRate);
            const mfccSimilarityRaw = this.calculateMFCCSimilarity(mfccFeatures1, mfccFeatures2);
            // Normalize from [-1, 1] to [0, 1]
            const mfccSimilarity = (mfccSimilarityRaw + 1) / 2;
            
            // === 2. PITCH CONTOUR MATCH - 25% ===
            const pitchContour1 = this.extractPitchContour(normalized1, sampleRate);
            const pitchContour2 = this.extractPitchContour(normalized2, sampleRate);
            const pitchMatch = this.calculatePitchContourMatch(pitchContour1, pitchContour2);
            
            // === 3. ENVELOPE MATCH (Shape/Dynamics) - 15% ===
            const envelope1 = this.calculateRMSEnergyCurve(normalized1);
            const envelope2 = this.calculateRMSEnergyCurve(normalized2);
            const envelopeCorrelation = this.calculateCorrelation(envelope1, envelope2);
            const envelopeMatch = (envelopeCorrelation + 1) / 2; // Map [-1,1] to [0,1]
            
            // === 4. SPECTRAL CENTROID MATCH (Brightness) - 10% ===
            const centroid1 = this.calculateSpectralCentroid(normalized1, sampleRate);
            const centroid2 = this.calculateSpectralCentroid(normalized2, sampleRate);
            const centroidDiff = Math.abs(centroid1 - centroid2);
            const maxCentroid = Math.max(centroid1, centroid2, 1);
            const spectralMatch = 1 - Math.min(1, centroidDiff / maxCentroid);
            
            // === 5. ENERGY MATCH (Loudness Profile) - 10% ===
            let totalEnergy1 = 0, totalEnergy2 = 0;
            for (let i = 0; i < minLength; i++) {
                totalEnergy1 += normalized1[i] * normalized1[i];
                totalEnergy2 += normalized2[i] * normalized2[i];
            }
            const rms1 = Math.sqrt(totalEnergy1 / minLength);
            const rms2 = Math.sqrt(totalEnergy2 / minLength);
            const energyMatch = Math.min(rms1, rms2) / Math.max(rms1, rms2, 0.001);
            
            // === 6. DURATION MATCH - 5% ===
            const dur1 = buffer1.duration;
            const dur2 = buffer2.duration;
            const durationMatch = 1 - Math.abs(dur1 - dur2) / Math.max(dur1, dur2);
            
            // === WEIGHTED COMBINATION (per spec) ===
            const rawScore = (
                mfccSimilarity * 0.35 +      // MFCC (timbre)
                pitchMatch * 0.25 +          // Pitch contour
                envelopeMatch * 0.15 +       // Envelope/dynamics
                spectralMatch * 0.10 +       // Spectral centroid
                energyMatch * 0.10 +         // Energy/loudness
                durationMatch * 0.05         // Duration
            );
            
            // Apply aggressive curve to spread scores across full range
            // This amplifies differences: good matches stay high, poor matches drop significantly
            let adjustedScore;
            if (rawScore > 0.7) {
                // High similarity: gentle curve (70-100% stays high)
                adjustedScore = 50 + (rawScore - 0.7) * 166.67; // Maps 0.7-1.0 to 50-100
            } else if (rawScore > 0.4) {
                // Medium similarity: moderate curve (40-70% spreads to 20-50%)
                adjustedScore = 20 + (rawScore - 0.4) * 100; // Maps 0.4-0.7 to 20-50
            } else {
                // Low similarity: harsh curve (0-40% maps to 0-20%)
                adjustedScore = rawScore * 50; // Maps 0-0.4 to 0-20
            }
            
            // Clamp to valid range (0-100)
            adjustedScore = Math.max(0, Math.min(100, adjustedScore));
            
            const roundedScore = Math.round(adjustedScore);
            
            console.log('🎯 [AudioManager] MFCC-Based Scoring Breakdown:');
            console.log('  🎵 MFCC similarity (timbre):  ' + (mfccSimilarity * 100).toFixed(1) + '% (weight: 35%)');
            console.log('  🎹 Pitch contour match:       ' + (pitchMatch * 100).toFixed(1) + '% (weight: 25%)');
            console.log('  📊 Envelope match:            ' + (envelopeMatch * 100).toFixed(1) + '% (weight: 15%)');
            console.log('  ✨ Spectral centroid:         ' + (spectralMatch * 100).toFixed(1) + '% (weight: 10%)');
            console.log('  🔊 Energy match:              ' + (energyMatch * 100).toFixed(1) + '% (weight: 10%)');
            console.log('  ⏱️  Duration match:            ' + (durationMatch * 100).toFixed(1) + '% (weight: 5%)');
            console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('  📊 Raw weighted score:        ' + (rawScore * 100).toFixed(1) + '%');
            console.log('  📈 After curve adjustment:    ' + adjustedScore.toFixed(1) + '%');
            console.log('  🏆 Final score:               ' + roundedScore + '%');
            
            if (onComplete) {
                onComplete(roundedScore);
            }
        } catch (error) {
            console.error('❌ [AudioManager] Error comparing audio:', error);
            console.error(error.stack);
            if (onComplete) {
                onComplete(30); // Give a participation score even on error
            }
        }
    }
    
    /**
     * Play Player 1's reversed audio
     */
    async playPlayer1Reversed(onComplete) {
        if (this.player1ReversedBuffer) {
            await this.playAudioBuffer(this.player1ReversedBuffer, onComplete);
        } else {
            console.error('No reversed audio available');
            if (onComplete) {
                onComplete();
            }
        }
    }
    
    /**
     * Play Player 2's reverse-forward audio
     */
    async playPlayer2ReverseForward(onComplete) {
        if (this.player2ReverseForwardBuffer) {
            await this.playAudioBuffer(this.player2ReverseForwardBuffer, onComplete);
        } else {
            console.error('No reverse-forward audio available');
            if (onComplete) {
                onComplete();
            }
        }
    }
    
    /**
     * Reset all audio data
     */
    reset() {
        this.player1OriginalBuffer = null;
        this.player1ReversedBuffer = null;
        this.player2AttemptBuffer = null;
        this.player2ReverseForwardBuffer = null;
        this.isRecording = false;
        this.isPlaying = false;
        this.recordingTime = 0;
        
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }
}


