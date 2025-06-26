// audioVisualizer.js - Module riêng cho Audio Visualizer
class AudioVisualizerModule {
    constructor() {
        this.audioMotion = null;
        this.visualizerVisible = false;
        this.audioContext = null;
        this.sourceNode = null;
        this.audioPlayer = null;
        this.isInitialized = false;

        // Khởi tạo khi DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        console.log('Audio Visualizer Module initializing...');
        this.audioPlayer = document.getElementById("audioPlayer");

        if (!this.audioPlayer) {
            console.warn('Audio player not found, retrying in 1 second...');
            setTimeout(() => this.init(), 1000);
            return;
        }

        this.createVisualizerUI();
        this.setupEventListeners();
        this.isInitialized = true;
        console.log('Audio Visualizer Module initialized successfully');
    }

    createVisualizerUI() {
        // Tạo nút visualizer trong media control bar
        this.createVisualizerButton();

        // Tạo popup visualizer
        this.createVisualizerPopup();

        // Thêm CSS styles
        this.addVisualizerStyles();
    }

    createVisualizerButton() {
        // Tìm vị trí thích hợp để thêm button (trước volume button)
        const volumeBtn = document.getElementById('volumeBtn');
        const mediaControlBar = document.querySelector('.media-control-bar');

        if (!volumeBtn || !mediaControlBar) {
            console.warn('Media control bar elements not found');
            return;
        }

        const visualizerBtn = document.createElement('button');
        visualizerBtn.id = 'visualizerBtn';
        visualizerBtn.className = 'btn btn-link text-light p-1 other-btn';
        visualizerBtn.title = 'Audio Visualizer';
        visualizerBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-bar-chart" viewBox="0 0 16 16">
                <path d="M4 11H2v3h2zm5-4H7v7h2zm5-5v12h-2V2zm-2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM6 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm-5 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1z"/>
            </svg>
        `;

        // Thêm button vào trước volume button
        volumeBtn.parentNode.insertBefore(visualizerBtn, volumeBtn);
    }

    createVisualizerPopup() {
        const visualizerPopup = document.createElement('div');
        visualizerPopup.id = 'visualizerPopup';
        visualizerPopup.className = 'visualizer-popup';
        visualizerPopup.innerHTML = `
            <div class="visualizer-header d-flex justify-content-between align-items-center p-3 border-bottom">
                <div class="d-flex align-items-center gap-2">
                    <h6 class="mb-0 text-light">Audio Visualizer</h6>
                    <span id="currentSongInfo" class="text-muted small">No song playing</span>
                </div>
                <div class="visualizer-controls d-flex gap-2">
                    <select id="visualizerMode" class="form-select form-select-sm bg-dark text-light border-secondary" style="width: auto;">
                        <option value="0">Discrete</option>
                        <option value="1">1/24 octave</option>
                        <option value="2">1/12 octave</option>
                        <option value="3">1/8 octave</option>
                        <option value="4">1/6 octave</option>
                        <option value="5">1/4 octave</option>
                        <option value="6" selected>1/3 octave</option>
                        <option value="7">1/2 octave</option>
                        <option value="8">Full octave</option>
                    </select>
                    <select id="visualizerGradient" class="form-select form-select-sm bg-dark text-light border-secondary" style="width: auto;">
                        <option value="classic">Classic</option>
                        <option value="prism">Prism</option>
                        <option value="rainbow" selected>Rainbow</option>
                        <option value="orangered">Orange Red</option>
                        <option value="steelblue">Steel Blue</option>
                        <option value="sunset">Sunset</option>
                    </select>
                    <button id="fullscreenVisualizerBtn" class="btn btn-sm btn-outline-light" title="Fullscreen">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-fullscreen" viewBox="0 0 16 16">
                            <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5M.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5m15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5"/>
                        </svg>
                    </button>
                    <button id="closeVisualizerBtn" class="btn btn-sm btn-outline-light" title="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
                            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div id="visualizerContainer" class="visualizer-container position-relative">
                <div id="visualizerCanvas" style="width: 100%; height: 100%;"></div>
                <div class="visualizer-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center text-light" style="pointer-events: none; z-index: 10;">
                    <div id="noAudioMessage" class="text-center">
                        <div class="mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" class="bi bi-music-note" viewBox="0 0 16 16">
                                <path d="M9 13c0 1.105-1.12 2-2.5 2S4 14.105 4 13s1.12-2 2.5-2 2.5.895 2.5 2"/>
                                <path fill-rule="evenodd" d="M9 3v10H8V3h1"/>
                                <path d="M8 2.82a1 1 0 0 1 .804-.98l3-.6A1 1 0 0 1 13 2.22V4L8 5z"/>
                            </svg>
                        </div>
                        <div>Play a song to see visualization</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(visualizerPopup);
    }

    addVisualizerStyles() {
        const style = document.createElement('style');
        style.id = 'visualizerStyles';
        style.textContent = `
            .visualizer-popup {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 90vw;
                max-width: 900px;
                height: 70vh;
                min-height: 500px;
                background: rgba(15, 15, 15, 0.98);
                border: 1px solid #333;
                border-radius: 12px;
                z-index: 10000;
                display: none;
                backdrop-filter: blur(15px);
                box-shadow: 0 0 40px rgba(0, 0, 0, 0.9);
                overflow: hidden;
            }
            
            .visualizer-popup.show {
                display: block;
                animation: visualizerSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            
            .visualizer-popup.hide {
                animation: visualizerSlideOut 0.3s ease-in;
            }
            
            .visualizer-popup.fullscreen {
                width: 100vw;
                height: 100vh;
                max-width: none;
                border-radius: 0;
                border: none;
            }
            
            @keyframes visualizerSlideIn {
                from {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }
            
            @keyframes visualizerSlideOut {
                from {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                to {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
            }
            
            .visualizer-container {
                height: calc(100% - 70px);
                background: linear-gradient(135deg, #0a0a0a, #1a1a1a, #0f0f0f);
                overflow: hidden;
            }
            
            .visualizer-header {
                background: rgba(0, 0, 0, 0.7);
                border-bottom: 1px solid #333 !important;
            }
            
            #visualizerBtn:hover {
                color: #ffc107 !important;
                transform: scale(1.1);
                transition: all 0.2s ease;
            }
            
            #currentSongInfo {
                max-width: 200px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .visualizer-overlay {
                opacity: 1;
                transition: opacity 0.3s ease;
            }
            
            .visualizer-overlay.hidden {
                opacity: 0;
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        const visualizerBtn = document.getElementById('visualizerBtn');
        const closeVisualizerBtn = document.getElementById('closeVisualizerBtn');
        const fullscreenBtn = document.getElementById('fullscreenVisualizerBtn');
        const visualizerMode = document.getElementById('visualizerMode');
        const visualizerGradient = document.getElementById('visualizerGradient');
        const visualizerPopup = document.getElementById('visualizerPopup');

        if (!visualizerBtn) return;

        // Toggle visualizer
        visualizerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleVisualizer();
        });

        // Close visualizer
        if (closeVisualizerBtn) {
            closeVisualizerBtn.addEventListener('click', () => this.hideVisualizer());
        }

        // Fullscreen toggle
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }

        // Settings changes
        if (visualizerMode) {
            visualizerMode.addEventListener('change', (e) => {
                if (this.audioMotion) {
                    this.audioMotion.mode = parseInt(e.target.value);
                }
            });
        }

        if (visualizerGradient) {
            visualizerGradient.addEventListener('change', (e) => {
                if (this.audioMotion) {
                    this.audioMotion.gradient = e.target.value;
                }
            });
        }

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.visualizerVisible && visualizerPopup &&
                !visualizerPopup.contains(e.target) &&
                e.target !== visualizerBtn) {
                this.hideVisualizer();
            }
        });

        // Prevent popup close on internal clicks
        if (visualizerPopup) {
            visualizerPopup.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.visualizerVisible) {
                this.hideVisualizer();
            }
        });

        const albumCover = document.getElementById('albumCover');
        if (albumCover) {
            albumCover.style.cursor = 'pointer';
            albumCover.addEventListener('click', () => this.showVisualizer());
        }


        // Lắng nghe thay đổi từ media player
        this.monitorMediaPlayer();
    }

    monitorMediaPlayer() {
        if (!this.audioPlayer) return;

        // Lắng nghe khi có bài hát mới được load
        this.audioPlayer.addEventListener('loadstart', () => {
            this.updateCurrentSongInfo();
        });

        this.audioPlayer.addEventListener('loadeddata', () => {
            this.initializeAudioMotion();
        });

        // Lắng nghe khi play/pause
        this.audioPlayer.addEventListener('play', () => {
            this.resumeAudioContext();
            this.hideNoAudioMessage();
        });

        this.audioPlayer.addEventListener('pause', () => {
            this.showNoAudioMessage();
        });

        // Theo dõi thay đổi tên bài hát
        const observer = new MutationObserver(() => {
            this.updateCurrentSongInfo();
        });

        const songNameElement = document.querySelector('.song-name');
        if (songNameElement) {
            observer.observe(songNameElement, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
    }

    updateCurrentSongInfo() {
        const currentSongInfo = document.getElementById('currentSongInfo');
        const songNameElement = document.querySelector('.song-name');

        if (currentSongInfo && songNameElement) {
            const songName = songNameElement.textContent.trim();
            currentSongInfo.textContent = songName || 'No song playing';
        }
    }

    showNoAudioMessage() {
        const overlay = document.querySelector('.visualizer-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    hideNoAudioMessage() {
        const overlay = document.querySelector('.visualizer-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    initializeAudioMotion() {
        if (this.audioMotion || !this.audioPlayer) return;

        try {
            // Tạo audio context nếu chưa có
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Chỉ tạo media source 1 lần duy nhất
            if (!this.sourceNode) {
                this.sourceNode = this.audioContext.createMediaElementSource(this.audioPlayer);
            }
            // Lấy container cho visualizer
            const visualizerCanvas = document.getElementById('visualizerCanvas');

            if (!visualizerCanvas) {
                console.error('Visualizer canvas not found');
                return;
            }

            // Khởi tạo audioMotion-analyzer
            this.audioMotion = new AudioMotionAnalyzer(visualizerCanvas, {
                source: this.sourceNode,
                height: visualizerCanvas.offsetHeight || 400,
                ansiBands: false,
                showScaleX: false,
                showScaleY: false,
                bgAlpha: 0,
                overlay: true,
                mode: 6, // 1/3 octave bands
                frequencyScale: 'bark',
                showPeaks: true,
                smoothing: 0.7,
                gradient: 'rainbow',
                lineWidth: 2,
                fillAlpha: 0.6,
                reflexAlpha: 0.25,
                showFPS: false,
                ledBars: false,
                lumiBars: false,
                radial: false,
                spinSpeed: 0,
                mirror: 0
            });

            // Kết nối output để âm thanh vẫn phát ra loa
            this.audioMotion.connectOutput();

            console.log('AudioMotion analyzer initialized successfully');

            // Ẩn thông báo "no audio"
            if (this.audioPlayer && !this.audioPlayer.paused) {
                this.hideNoAudioMessage();
            }

        } catch (error) {
            console.error('Error initializing AudioMotion:', error);
        }
    }

    toggleVisualizer() {
        if (this.visualizerVisible) {
            this.hideVisualizer();
        } else {
            this.showVisualizer();
        }
    }

    showVisualizer() {
        if (this.visualizerVisible) return;

        const visualizerPopup = document.getElementById('visualizerPopup');
        if (!visualizerPopup) return;

        visualizerPopup.classList.remove('hide');
        visualizerPopup.classList.add('show');
        this.visualizerVisible = true;

        // Khởi tạo AudioMotion nếu chưa có
        if (!this.audioMotion) {
            setTimeout(() => this.initializeAudioMotion(), 100);
        }

        // Resume audio context
        this.resumeAudioContext();

        // Cập nhật thông tin bài hát hiện tại
        this.updateCurrentSongInfo();

        // Kiểm tra trạng thái audio player
        if (this.audioPlayer && this.audioPlayer.paused) {
            this.showNoAudioMessage();
        } else {
            this.hideNoAudioMessage();
        }
    }

    hideVisualizer() {
        if (!this.visualizerVisible) return;

        const visualizerPopup = document.getElementById('visualizerPopup');
        if (!visualizerPopup) return;

        visualizerPopup.classList.remove('show');
        visualizerPopup.classList.add('hide');

        setTimeout(() => {
            visualizerPopup.style.display = 'none';
            visualizerPopup.classList.remove('hide');
            visualizerPopup.classList.remove('fullscreen');
        }, 300);

        this.visualizerVisible = false;
    }

    toggleFullscreen() {
        const visualizerPopup = document.getElementById('visualizerPopup');
        const fullscreenBtn = document.getElementById('fullscreenVisualizerBtn');

        if (!visualizerPopup || !fullscreenBtn) return;

        visualizerPopup.classList.toggle('fullscreen');

        // Cập nhật icon button
        const isFullscreen = visualizerPopup.classList.contains('fullscreen');
        fullscreenBtn.innerHTML = isFullscreen ?
            `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-fullscreen-exit" viewBox="0 0 16 16">
                <path d="M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5m5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5M0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5m10 1a1.5 1.5 0 0 1 1.5-1.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0z"/>
            </svg>` :
            `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-fullscreen" viewBox="0 0 16 16">
                <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5M.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5m15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5"/>
            </svg>`;

        // Resize AudioMotion nếu cần
        if (this.audioMotion) {
            setTimeout(() => {
                const canvas = document.getElementById('visualizerCanvas');
                if (canvas) {
                    this.audioMotion.setCanvasSize(canvas.offsetWidth, canvas.offsetHeight);
                }
            }, 100);
        }
    }

    resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(console.error);
        }
    }

    // Public method để cleanup khi cần
    destroy() {
        if (this.audioMotion) {
            this.audioMotion.destroy();
            this.audioMotion = null;
        }

        if (this.audioContext) {
            this.audioContext.close().catch(console.error);
            this.audioContext = null;
        }

        // Remove UI elements
        const visualizerBtn = document.getElementById('visualizerBtn');
        const visualizerPopup = document.getElementById('visualizerPopup');
        const visualizerStyles = document.getElementById('visualizerStyles');

        if (visualizerBtn) visualizerBtn.remove();
        if (visualizerPopup) visualizerPopup.remove();
        if (visualizerStyles) visualizerStyles.remove();

        console.log('Audio Visualizer Module destroyed');
    }
}

// Khởi tạo module
const audioVisualizerModule = new AudioVisualizerModule();

// Export cho global access nếu cần
window.AudioVisualizerModule = audioVisualizerModule;