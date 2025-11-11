/**
 * app.js
 * Main application logic for Reverse Karaoke game
 */

// Game state
const GameStep = {
    PLAYER_NAMES: 0,
    CATEGORY_SELECTION: 1,
    PROMPT_SELECTION: 2,
    PLAYER1_RECORDING: 3,
    REVERSE_PLAYBACK: 4,
    PLAYER2_RECORDING: 5,
    REVERSE_PLAYER2: 6,
    EVALUATION: 7,
    RESULTS: 8
};

const prompts = [
    "Sing: Twinkle Twinkle Little Star",
    "Sing: Happy Birthday",
    "Sing: Mary Had a Little Lamb",
    "Sing any 80s pop song",
    "Sing: Row Row Row Your Boat",
    "Sing: The ABC Song",
    "Hum your favorite tune",
    "Sing: Old MacDonald Had a Farm",
    "Beatbox for 5 seconds",
    "Sing: Let It Go (Frozen)"
];

// Game state management
let currentStep = GameStep.PLAYER_NAMES;
let currentPrompt = "";
let similarityScore = 0;
let playerNames = ["", ""]; // Store player names
let selectedCategory = null; // Selected song category
let totalRounds = 3;
let currentRound = 1;
let currentPlayerIndex = 0; // 0 = Player 1, 1 = Player 2
let roundScores = []; // Store scores for each round: {round, player, playerIndex, score, prompt}
let turnsCompleted = 0; // Total turns completed (2 turns per round)

// Audio manager instance
const audioManager = new AudioManager();

// DOM elements
const homeScreen = document.getElementById('homeScreen');
const gameScreen = document.getElementById('gameScreen');
const instructionsModal = document.getElementById('instructionsModal');
const gameContent = document.getElementById('gameContent');
const progressBar = document.getElementById('progressBar');
const stepLabel = document.getElementById('stepLabel');

// Button handlers
document.getElementById('startGameBtn').addEventListener('click', startGame);
document.getElementById('instructionsBtn').addEventListener('click', showInstructions);
document.getElementById('closeInstructions').addEventListener('click', closeInstructions);
document.getElementById('exitGameBtn').addEventListener('click', exitGame);

// Click outside modal to close
instructionsModal.addEventListener('click', (e) => {
    if (e.target === instructionsModal) {
        closeInstructions();
    }
});

/**
 * Show instructions modal
 */
function showInstructions() {
    instructionsModal.classList.add('active');
}

/**
 * Close instructions modal
 */
function closeInstructions() {
    instructionsModal.classList.remove('active');
}

/**
 * Start new game
 */
function startGame() {
    homeScreen.classList.remove('active');
    gameScreen.classList.add('active');
    
    // Reset game state
    currentStep = GameStep.PLAYER_NAMES;
    currentPrompt = "";
    similarityScore = 0;
    playerNames = ["", ""]; // Reset player names
    selectedCategory = null; // Reset category
    currentRound = 1;
    currentPlayerIndex = 0; // Start with Player 1
    roundScores = [];
    turnsCompleted = 0;
    audioManager.reset();
    
    console.log('🎮 [App] Game started - Player 1 goes first');
    
    // Render first step
    renderStep();
}

/**
 * Exit game and return to home
 */
function exitGame() {
    gameScreen.classList.remove('active');
    homeScreen.classList.add('active');
    audioManager.reset();
}

/**
 * Update progress bar
 */
function updateProgress() {
    const progress = (currentStep / 8) * 100;
    progressBar.style.width = `${progress}%`;
}

/**
 * Update step label
 */
function updateStepLabel() {
    const activePlayer = playerNames[currentPlayerIndex] || `Player ${currentPlayerIndex + 1}`;
    const otherPlayer = playerNames[1 - currentPlayerIndex] || `Player ${2 - currentPlayerIndex}`;
    
    const labels = [
        'Player Names',
        'Song Selection',
        `${activePlayer} Recording`,
        'Reverse Playback',
        `${otherPlayer} Recording`,
        `${otherPlayer} Reverse`,
        'Evaluating...',
        'Results'
    ];
    stepLabel.textContent = labels[currentStep];
}

/**
 * Move to next step
 */
function nextStep() {
    if (currentStep < GameStep.RESULTS) {
        currentStep++;
        renderStep();
    }
}

/**
 * Render current step
 */
function renderStep() {
    updateProgress();
    updateStepLabel();
    
    switch (currentStep) {
        case GameStep.PLAYER_NAMES:
            renderPlayerNames();
            break;
        case GameStep.CATEGORY_SELECTION:
            renderCategorySelection();
            break;
        case GameStep.PROMPT_SELECTION:
            renderPromptSelection();
            break;
        case GameStep.PLAYER1_RECORDING:
            renderPlayer1Recording();
            break;
        case GameStep.REVERSE_PLAYBACK:
            renderReversePlayback();
            break;
        case GameStep.PLAYER2_RECORDING:
            renderPlayer2Recording();
            break;
        case GameStep.REVERSE_PLAYER2:
            renderReversePlayer2();
            break;
        case GameStep.EVALUATION:
            renderEvaluation();
            break;
        case GameStep.RESULTS:
            renderResults();
            break;
    }
}

/**
 * Step 0: Player Names
 */
function renderPlayerNames() {
    gameContent.innerHTML = `
        <div class="step-view">
            <div class="step-title">👥 Enter Player Names</div>
            <p class="step-description">Who's playing today?</p>
            
            <div style="max-width: 400px; margin: 20px auto;">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #FFFFFF;">Player 1 Name:</label>
                    <input 
                        type="text" 
                        id="player1Name" 
                        placeholder="Enter first player name" 
                        maxlength="20"
                        style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; box-sizing: border-box;"
                        value="${playerNames[0]}"
                    />
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #FFFFFF;">Player 2 Name:</label>
                    <input 
                        type="text" 
                        id="player2Name" 
                        placeholder="Enter second player name" 
                        maxlength="20"
                        style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; box-sizing: border-box;"
                        value="${playerNames[1]}"
                    />
                </div>
                
                <div id="nameError" style="color: #e74c3c; margin-bottom: 15px; display: none; font-weight: 600;">
                    Please enter both player names!
                </div>
            </div>
            
            <button class="btn btn-gradient btn-large" onclick="submitPlayerNames()">
                Let's Play! 🎮
            </button>
        </div>
    `;
    
    // Focus on first input
    setTimeout(() => {
        const input = document.getElementById('player1Name');
        if (input) input.focus();
    }, 100);
}

/**
 * Submit player names and validate
 */
function submitPlayerNames() {
    const player1Input = document.getElementById('player1Name');
    const player2Input = document.getElementById('player2Name');
    const errorDiv = document.getElementById('nameError');
    
    const name1 = player1Input.value.trim();
    const name2 = player2Input.value.trim();
    
    if (!name1 || !name2) {
        errorDiv.style.display = 'block';
        if (!name1) player1Input.focus();
        else if (!name2) player2Input.focus();
        return;
    }
    
    playerNames[0] = name1;
    playerNames[1] = name2;
    
    console.log('✅ Player names set:', playerNames);
    nextStep();
}

/**
 * Step 1: Category Selection
 */
function renderCategorySelection() {
    updateProgress();
    updateStepLabel();
    
    gameContent.innerHTML = `
        <style>
            .category-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 25px 15px;
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.2);
                color: white;
                font-size: 16px;
                min-height: 120px;
                transition: all 0.3s ease;
                cursor: pointer;
            }
            .category-btn:hover {
                background: rgba(255, 255, 255, 0.15);
                border-color: rgba(255, 255, 255, 0.4);
                transform: translateY(-5px);
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
            }
        </style>
        <div class="step-view">
            <div class="step-title">🎵 Choose a Category</div>
            <p class="step-description">Select the type of songs you want to sing</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; max-width: 600px; margin: 30px auto;">
                ${categories.map(category => `
                    <button class="btn btn-large category-btn" 
                            onclick="selectCategory('${category}')">
                        <span style="font-size: 32px;">${getCategoryEmoji(category)}</span>
                        <span style="text-align: center; line-height: 1.3;">${category}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Select a category and load a random song from it
 */
function selectCategory(category) {
    console.log('🎵 [App] Category selected:', category);
    selectedCategory = category;
    
    // Select a random song from this category
    const song = selectRandomSong(category);
    if (song) {
        currentPrompt = `Sing: ${song.song} by ${song.artist}`;
        console.log('🎵 [App] Selected song:', currentPrompt);
    } else {
        currentPrompt = "Sing any song you like!";
    }
    
    nextStep();
}

/**
 * Shuffle prompt (get a different song from the same category)
 */
function shufflePrompt() {
    if (!selectedCategory) {
        console.log('⚠️ [App] No category selected, using random prompt');
        const randomIndex = Math.floor(Math.random() * prompts.length);
        currentPrompt = prompts[randomIndex];
    } else {
        const song = selectRandomSong(selectedCategory);
        if (song) {
            const newPrompt = `Sing: ${song.song} by ${song.artist}`;
            if (newPrompt !== currentPrompt) {
                currentPrompt = newPrompt;
            } else {
                // If we got the same song, try one more time
                const song2 = selectRandomSong(selectedCategory);
                if (song2) {
                    currentPrompt = `Sing: ${song2.song} by ${song2.artist}`;
                }
            }
        }
    }
    
    console.log('🔀 [App] Shuffled to:', currentPrompt);
    
    // Animate and update only the prompt text
    const promptText = document.querySelector('.prompt-text');
    if (promptText) {
        // Add fade-out animation
        promptText.style.opacity = '0';
        promptText.style.transform = 'scale(0.95)';
        
        // After fade-out, update text and fade back in
        setTimeout(() => {
            promptText.textContent = currentPrompt;
            promptText.style.opacity = '1';
            promptText.style.transform = 'scale(1)';
        }, 200);
    }
}

/**
 * Step 2: Prompt Selection
 */
function renderPromptSelection() {
    const activePlayer = playerNames[currentPlayerIndex] || `Player ${currentPlayerIndex + 1}`;
    const turnNumber = turnsCompleted + 1;
    
    gameContent.innerHTML = `
        <div class="step-view">
            <div style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; display: inline-block; margin-bottom: 15px; font-weight: 600; color: white;">
                Round ${currentRound} of ${totalRounds} • Turn ${turnNumber} of 6
            </div>
            <div class="step-title">🎵 Song Prompt</div>
            <div class="prompt-box">
                <div class="prompt-text" style="transition: opacity 0.2s ease, transform 0.2s ease;">${currentPrompt}</div>
            </div>
            <p class="step-description">${activePlayer}'s turn to sing this prompt</p>
            
            <div style="display: flex; flex-direction: column; gap: 12px; align-items: center; margin-top: 20px;">
                <button class="btn btn-blue btn-large" onclick="nextStep()">
                    Ready to Record
                </button>
                
                <button class="btn" onclick="shufflePrompt()" 
                        style="background: transparent; color: white; border: none; box-shadow: none;">
                    🔀 Different Song
                </button>
            </div>
            
            <p class="helper-text" style="margin-top: 15px; font-size: 14px; opacity: 0.7;">
                Don't know this song? Click "Different Song" to get another one from the same category
            </p>
        </div>
    `;
}

/**
 * Step 2: Player 1 Recording
 */
function renderPlayer1Recording() {
    const isRecording = audioManager.isRecording;
    const activePlayer = playerNames[currentPlayerIndex] || `Player ${currentPlayerIndex + 1}`;
    const turnNumber = turnsCompleted + 1;
    
    gameContent.innerHTML = `
        <div class="step-view">
            <div style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; display: inline-block; margin-bottom: 15px; font-weight: 600; color: white;">
                Round ${currentRound} of ${totalRounds} • Turn ${turnNumber} of 6
            </div>
            <div class="step-title">🎤 ${activePlayer}</div>
            <p class="step-description">${currentPrompt}</p>
            
            <div class="recording-container">
                ${isRecording ? `
                    <div class="timer-display">
                        <div class="timer-value" id="timerValue">${audioManager.recordingTime.toFixed(1)}</div>
                        <div class="timer-label">seconds</div>
                    </div>
                    <div class="waveform" id="waveform">
                        ${Array(20).fill(0).map(() => '<div class="waveform-bar"></div>').join('')}
                    </div>
                ` : `
                    <div class="icon-large">🎤</div>
                `}
            </div>
            
            ${isRecording ? `
                <button class="btn btn-red btn-large" onclick="stopPlayer1Recording()">
                    Stop Recording
                </button>
            ` : `
                <button class="btn btn-blue btn-large" onclick="startPlayer1Recording()">
                    Start Recording
                </button>
            `}
            
            <p class="helper-text">Max 10 seconds - sing the prompt!</p>
        </div>
    `;
}

/**
 * Start Player 1 recording
 */
function startPlayer1Recording() {
    // Prevent double-clicking
    if (audioManager.isRecording) {
        console.log('⚠️ [App] Recording already in progress, ignoring duplicate call');
        return;
    }
    
    console.log('🎮 [App] Starting Player 1 recording...');
    
    // Set up timer update callback
    audioManager.onRecordingUpdate = (time) => {
        const timerValue = document.getElementById('timerValue');
        if (timerValue) {
            timerValue.textContent = time.toFixed(1);
        }
    };
    
    audioManager.startRecording(1, (buffer) => {
        console.log('🎮 [App] Player 1 recording callback, buffer:', buffer);
        if (buffer) {
            console.log('✅ [App] Player 1 recording successful, moving to next step');
            nextStep();
        } else {
            console.error('❌ [App] Player 1 recording failed');
            alert('Failed to record audio. Please try again.');
            renderPlayer1Recording();
        }
    });
    
    // Poll until recording starts, then render with timer UI
    const checkRecordingStarted = () => {
        if (audioManager.isRecording) {
            console.log('✅ [App] Recording started, rendering timer UI');
            renderPlayer1Recording();
            updateRecordingTimer(); // Start the single timer loop
        } else {
            // Check again in 50ms
            setTimeout(checkRecordingStarted, 50);
        }
    };
    setTimeout(checkRecordingStarted, 100);
}

/**
 * Stop Player 1 recording
 */
function stopPlayer1Recording() {
    audioManager.stopRecording();
}

/**
 * Update recording timer (only updates display, doesn't re-render)
 */
function updateRecordingTimer() {
    if (audioManager.isRecording) {
        const timerValue = document.getElementById('timerValue');
        if (timerValue) {
            timerValue.textContent = audioManager.recordingTime.toFixed(1);
        }
        
        setTimeout(updateRecordingTimer, 100);
    }
}

/**
 * Step 3: Reverse Playback
 */
function renderReversePlayback() {
    const isPlaying = audioManager.isPlaying;
    const hasReversed = audioManager.player1ReversedBuffer !== null;
    
    gameContent.innerHTML = `
        <div class="step-view">
            <div class="step-title">🔄 Reversed Audio</div>
            <p class="step-description">Listen to Player 1's recording... backwards!</p>
            
            ${isPlaying ? `
                <div class="playing-animation">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            ` : `
                <div class="icon-large">🔊</div>
            `}
            
            <button class="btn btn-purple btn-large" onclick="playPlayer1Reversed()" ${isPlaying ? 'disabled' : ''}>
                ${isPlaying ? 'Playing...' : '▶️ Play Reversed'}
            </button>
            
            ${hasReversed ? `
                <button class="btn btn-white btn-large" onclick="nextStep()">
                    Player 2 Ready →
                </button>
            ` : ''}
        </div>
    `;
}

/**
 * Play Player 1 reversed
 */
function playPlayer1Reversed() {
    if (!audioManager.player1ReversedBuffer) {
        // First time - need to reverse
        gameContent.innerHTML = `
            <div class="step-view">
                <div class="step-title">🔄 Reversed Audio</div>
                <div class="spinner"></div>
                <p class="step-description">Reversing audio...</p>
            </div>
        `;
        
        audioManager.reversePlayer1((buffer) => {
            if (buffer) {
                audioManager.playAudioBuffer(buffer, () => {
                    renderReversePlayback();
                });
                renderReversePlayback();
            } else {
                alert('Failed to reverse audio. Please try again.');
                renderReversePlayback();
            }
        });
    } else {
        // Already reversed, just play
        audioManager.playPlayer1Reversed(() => {
            renderReversePlayback();
        });
        renderReversePlayback();
    }
}

/**
 * Step 4: Player 2 Recording
 */
function renderPlayer2Recording() {
    const isRecording = audioManager.isRecording;
    const otherPlayerIndex = 1 - currentPlayerIndex;
    const otherPlayer = playerNames[otherPlayerIndex] || `Player ${otherPlayerIndex + 1}`;
    const turnNumber = turnsCompleted + 1;
    
    gameContent.innerHTML = `
        <div class="step-view">
            <div style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; display: inline-block; margin-bottom: 15px; font-weight: 600; color: white;">
                Round ${currentRound} of ${totalRounds} • Turn ${turnNumber} of 6
            </div>
            <div class="step-title">🎤 ${otherPlayer}</div>
            <p class="step-description">Mimic the reversed audio you just heard!</p>
            
            <div class="recording-container">
                ${isRecording ? `
                    <div class="timer-display">
                        <div class="timer-value" id="timerValue">${audioManager.recordingTime.toFixed(1)}</div>
                        <div class="timer-label">seconds</div>
                    </div>
                    <div class="waveform" id="waveform">
                        ${Array(20).fill(0).map(() => '<div class="waveform-bar"></div>').join('')}
                    </div>
                ` : `
                    <div class="icon-large">🎤</div>
                `}
            </div>
            
            ${isRecording ? `
                <button class="btn btn-red btn-large" onclick="stopPlayer2Recording()">
                    Stop Recording
                </button>
            ` : `
                <button class="btn btn-green btn-large" onclick="startPlayer2Recording()">
                    Start Recording
                </button>
            `}
            
            <p class="helper-text">Max 10 seconds - try to match what you heard!</p>
        </div>
    `;
}

/**
 * Start Player 2 recording
 */
function startPlayer2Recording() {
    // Prevent double-clicking
    if (audioManager.isRecording) {
        console.log('⚠️ [App] Recording already in progress, ignoring duplicate call');
        return;
    }
    
    console.log('🎮 [App] Starting Player 2 recording...');
    
    audioManager.onRecordingUpdate = (time) => {
        const timerValue = document.getElementById('timerValue');
        if (timerValue) {
            timerValue.textContent = time.toFixed(1);
        }
    };
    
    audioManager.startRecording(2, (buffer) => {
        console.log('🎮 [App] Player 2 recording callback, buffer:', buffer);
        if (buffer) {
            console.log('✅ [App] Player 2 recording successful, moving to next step');
            nextStep();
        } else {
            console.error('❌ [App] Player 2 recording failed');
            alert('Failed to record audio. Please try again.');
            renderPlayer2Recording();
        }
    });
    
    // Poll until recording starts, then render with timer UI
    const checkRecordingStarted = () => {
        if (audioManager.isRecording) {
            console.log('✅ [App] Player 2 recording started, rendering timer UI');
            renderPlayer2Recording();
            updateRecordingTimer(); // Start the single timer loop
        } else {
            // Check again in 50ms
            setTimeout(checkRecordingStarted, 50);
        }
    };
    setTimeout(checkRecordingStarted, 100);
}

/**
 * Stop Player 2 recording
 */
function stopPlayer2Recording() {
    audioManager.stopRecording();
}

/**
 * Step 5: Reverse Player 2
 */
function renderReversePlayer2() {
    const isPlaying = audioManager.isPlaying;
    const hasReversed = audioManager.player2ReverseForwardBuffer !== null;
    
    gameContent.innerHTML = `
        <div class="step-view">
            <div class="step-title">🔄 Let's hear it!</div>
            <p class="step-description">We'll reverse Player 2's recording to see how it matches Player 1's original</p>
            
            ${isPlaying ? `
                <div class="playing-animation">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            ` : `
                <div class="icon-large">🔊</div>
            `}
            
            <button class="btn btn-orange btn-large" onclick="playPlayer2Reversed()" ${isPlaying ? 'disabled' : ''}>
                ${isPlaying ? 'Playing...' : '▶️ Play Reversed'}
            </button>
            
            ${hasReversed ? `
                <button class="btn btn-gradient btn-large" onclick="evaluatePerformance()">
                    Get My Score! 🎯
                </button>
            ` : ''}
        </div>
    `;
}

/**
 * Play Player 2 reversed
 */
function playPlayer2Reversed() {
    if (!audioManager.player2ReverseForwardBuffer) {
        gameContent.innerHTML = `
            <div class="step-view">
                <div class="step-title">🔄 Let's hear it!</div>
                <div class="spinner"></div>
                <p class="step-description">Reversing audio...</p>
            </div>
        `;
        
        audioManager.reversePlayer2((buffer) => {
            if (buffer) {
                audioManager.playAudioBuffer(buffer, () => {
                    renderReversePlayer2();
                });
                renderReversePlayer2();
            } else {
                alert('Failed to reverse audio. Please try again.');
                renderReversePlayer2();
            }
        });
    } else {
        audioManager.playPlayer2ReverseForward(() => {
            renderReversePlayer2();
        });
        renderReversePlayer2();
    }
}

/**
 * Evaluate performance
 */
function evaluatePerformance() {
    currentStep = GameStep.EVALUATION;
    renderEvaluation();
    
    setTimeout(() => {
        audioManager.compareAudio((score) => {
            similarityScore = score;
            currentStep = GameStep.RESULTS;
            renderResults();
        });
    }, 1000);
}

/**
 * Step 6: Evaluation
 */
function renderEvaluation() {
    updateProgress();
    updateStepLabel();
    
    gameContent.innerHTML = `
        <div class="step-view">
            <div class="step-title">⏳ Analyzing...</div>
            <div class="spinner"></div>
            <p class="step-description">Comparing recordings...</p>
        </div>
    `;
}

/**
 * Step 7: Results
 */
function renderResults() {
    updateProgress();
    updateStepLabel();
    
    const activePlayer = playerNames[currentPlayerIndex] || `Player ${currentPlayerIndex + 1}`;
    const turnNumber = turnsCompleted + 1;
    
    console.log('🎉 [App] renderResults called');
    console.log('🎉 [App] currentRound:', currentRound, 'currentPlayerIndex:', currentPlayerIndex);
    console.log('🎉 [App] similarityScore:', similarityScore);
    console.log('🎉 [App] turnsCompleted:', turnsCompleted);
    
    // Increment turns completed
    turnsCompleted++;
    
    // Store the score for this turn
    roundScores.push({
        turn: turnNumber,
        round: currentRound,
        player: activePlayer,
        playerIndex: currentPlayerIndex,
        score: similarityScore,
        prompt: currentPrompt
    });
    
    console.log('🎉 [App] Stored score for turn', turnNumber, ':', roundScores[roundScores.length - 1]);
    console.log('🎉 [App] All roundScores:', roundScores);
    
    // Check if game is over (all 6 turns completed: 3 rounds × 2 players)
    const isGameOver = turnsCompleted >= (totalRounds * 2);
    
    console.log('🎉 [App] isGameOver:', isGameOver);
    
    const performanceData = getPerformanceMessage(similarityScore);
    
    // Calculate averages if game is over
    let scoresHTML = '';
    if (isGameOver) {
        const player1Scores = roundScores.filter(r => r.playerIndex === 0);
        const player2Scores = roundScores.filter(r => r.playerIndex === 1);
        
        const avgScoreP1 = Math.round(player1Scores.reduce((sum, r) => sum + r.score, 0) / player1Scores.length);
        const avgScoreP2 = Math.round(player2Scores.reduce((sum, r) => sum + r.score, 0) / player2Scores.length);
        
        const winner = avgScoreP1 > avgScoreP2 ? playerNames[0] || 'Player 1' : 
                       avgScoreP2 > avgScoreP1 ? playerNames[1] || 'Player 2' : 'Tie';
        
        scoresHTML = `
            <div style="margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 12px;">
                <h3 style="margin: 0 0 15px 0; color: white; text-align: center;">🏆 Final Scores 🏆</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div style="padding: 12px; background: rgba(79, 172, 254, 0.2); border-radius: 8px;">
                        <div style="font-weight: 700; color: white; margin-bottom: 8px;">${playerNames[0] || 'Player 1'}</div>
                        ${player1Scores.map(r => `
                            <div style="display: flex; justify-content: space-between; padding: 3px 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                                <span>Round ${r.round}</span>
                                <span>${Math.round(r.score)}%</span>
                            </div>
                        `).join('')}
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 2px solid rgba(255,255,255,0.3); display: flex; justify-content: space-between; font-weight: 700; color: white;">
                            <span>Average</span>
                            <span>${avgScoreP1}%</span>
                        </div>
                    </div>
                    
                    <div style="padding: 12px; background: rgba(0, 242, 254, 0.2); border-radius: 8px;">
                        <div style="font-weight: 700; color: white; margin-bottom: 8px;">${playerNames[1] || 'Player 2'}</div>
                        ${player2Scores.map(r => `
                            <div style="display: flex; justify-content: space-between; padding: 3px 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                                <span>Round ${r.round}</span>
                                <span>${Math.round(r.score)}%</span>
                            </div>
                        `).join('')}
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 2px solid rgba(255,255,255,0.3); display: flex; justify-content: space-between; font-weight: 700; color: white;">
                            <span>Average</span>
                            <span>${avgScoreP2}%</span>
                        </div>
                    </div>
                </div>
                
                <div style="text-align: center; font-size: 24px; font-weight: 700; color: #FFD700; margin-top: 15px;">
                    ${winner === 'Tie' ? '🤝 It\'s a Tie!' : `🎉 ${winner} Wins!`}
                </div>
            </div>
        `;
    }
    
    gameContent.innerHTML = `
        <div class="step-view">
            <div style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; display: inline-block; margin-bottom: 15px; font-weight: 600; color: white;">
                Round ${currentRound} of ${totalRounds}
            </div>
            <div class="step-title">🎉 Results!</div>
            
            <div class="score-container">
                <div class="score-circle">
                    <svg width="200" height="200">
                        <defs>
                            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#4facfe;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#00f2fe;stop-opacity:1" />
                            </linearGradient>
                        </defs>
                        <circle class="score-circle-bg" cx="100" cy="100" r="90"></circle>
                        <circle class="score-circle-progress" cx="100" cy="100" r="90"
                                stroke-dasharray="${2 * Math.PI * 90}"
                                stroke-dashoffset="${2 * Math.PI * 90 * (1 - similarityScore / 100)}">
                        </circle>
                    </svg>
                    <div class="score-text">
                        <div class="score-value">${Math.round(similarityScore)}</div>
                        <div class="score-percent">%</div>
                    </div>
                </div>
            </div>
            
            <div class="performance-message">${performanceData.message}</div>
            <p class="performance-description">${performanceData.description}</p>
            
            ${scoresHTML}
            
            ${isGameOver ? `
                <button class="btn btn-gradient btn-large" onclick="playAgain()">
                    Play Again
                </button>
                <button class="btn btn-white btn-large" onclick="exitGame()">
                    Back to Home
                </button>
            ` : `
                <button class="btn btn-gradient btn-large" onclick="nextTurn()">
                    Next Turn →
                </button>
            `}
        </div>
    `;
}

/**
 * Get performance message based on score
 */
function getPerformanceMessage(score) {
    if (score >= 90) {
        return {
            message: "🏆 Perfect!",
            description: "You're a reverse karaoke master!"
        };
    } else if (score >= 80) {
        return {
            message: "🌟 Excellent!",
            description: "Amazing mimicry skills!"
        };
    } else if (score >= 70) {
        return {
            message: "✨ Great Job!",
            description: "Very impressive matching!"
        };
    } else if (score >= 60) {
        return {
            message: "👍 Good Try!",
            description: "You're getting the hang of it!"
        };
    } else if (score >= 50) {
        return {
            message: "🙂 Not Bad!",
            description: "Room for improvement, but solid effort!"
        };
    } else {
        return {
            message: "😅 Keep Practicing!",
            description: "This is harder than it looks! Try again?"
        };
    }
}

/**
 * Start next turn (switch players)
 */
function nextTurn() {
    console.log('🎮 [App] nextTurn called');
    console.log('🎮 [App] Current state - Round:', currentRound, 'Player:', currentPlayerIndex, 'Turns:', turnsCompleted);
    
    // Switch active player
    currentPlayerIndex = (currentPlayerIndex + 1) % 2;
    console.log('🎮 [App] Switched to player:', currentPlayerIndex, '(' + (playerNames[currentPlayerIndex] || `Player ${currentPlayerIndex + 1}`) + ')');
    
    // If we loop back to Player 1 (index 0), both players have played this round
    if (currentPlayerIndex === 0) {
        currentRound++;
        console.log('🎮 [App] Both players completed round, incrementing to round:', currentRound);
    }
    
    // Check if game should end
    if (currentRound > totalRounds) {
        console.log('🎮 [App] Game over! All rounds completed.');
        return;
    }
    
    // Reset for next turn
    currentStep = GameStep.PROMPT_SELECTION;
    
    // Select a new song from the same category
    if (selectedCategory) {
        const song = selectRandomSong(selectedCategory);
        if (song) {
            currentPrompt = `Sing: ${song.song} by ${song.artist}`;
        } else {
            currentPrompt = "Sing any song you like!";
        }
    } else {
        currentPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    }
    
    similarityScore = 0;
    audioManager.reset();
    
    console.log('🎮 [App] Starting turn', turnsCompleted + 1, 'with prompt:', currentPrompt);
    renderStep();
}

/**
 * Play again
 */
function playAgain() {
    currentStep = GameStep.PLAYER_NAMES;
    currentPrompt = "";
    similarityScore = 0;
    playerNames = ["", ""]; // Reset names so players can change if they want
    selectedCategory = null; // Reset category so players can choose a new one
    currentRound = 1;
    currentPlayerIndex = 0; // Start with Player 1
    roundScores = [];
    turnsCompleted = 0;
    audioManager.reset();
    console.log('🎮 [App] New game started');
    renderStep();
}

// Initialize app
console.log('🎤 Reverse Karaoke initialized!');
console.log('🌐 User Agent:', navigator.userAgent);
console.log('🔒 Protocol:', window.location.protocol);
console.log('🎤 MediaDevices available:', !!navigator.mediaDevices);
console.log('🎤 getUserMedia available:', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));


