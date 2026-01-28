/**
 * ============================================================
 * VOICE AI - LifeOS 2026
 * ============================================================
 * Feature #9: Voice-to-Task Pro
 * - Speech recognition tiếng Việt
 * - Hỗ trợ giọng miền
 * - Tích hợp với DateParser và Abbreviations
 * ============================================================
 */

const VoiceAI = (function () {
    'use strict';

    // ========== STATE ==========
    let recognition = null;
    let isListening = false;
    let currentCallback = null;
    let interimTranscript = '';
    let finalTranscript = '';

    // ========== INITIALIZATION ==========

    /**
     * Kiểm tra browser hỗ trợ Speech Recognition
     */
    function isSupported() {
        return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }

    /**
     * Khởi tạo Speech Recognition
     */
    function init() {
        if (!isSupported()) {
            console.warn('⚠️ VoiceAI: Speech Recognition không được hỗ trợ');
            return false;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();

        // Cấu hình
        recognition.continuous = false;      // Dừng sau khi nhận xong
        recognition.interimResults = true;   // Hiển thị kết quả tạm
        recognition.lang = 'vi-VN';          // Tiếng Việt
        recognition.maxAlternatives = 3;     // Số lựa chọn thay thế

        // Event handlers
        recognition.onstart = handleStart;
        recognition.onresult = handleResult;
        recognition.onerror = handleError;
        recognition.onend = handleEnd;

        console.log('🎤 VoiceAI initialized (vi-VN)');
        return true;
    }

    // ========== EVENT HANDLERS ==========

    function handleStart() {
        isListening = true;
        interimTranscript = '';
        finalTranscript = '';

        // Dispatch event for UI
        document.dispatchEvent(new CustomEvent('voice-start'));
    }

    function handleResult(event) {
        interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];

            if (result.isFinal) {
                finalTranscript += result[0].transcript;
            } else {
                interimTranscript += result[0].transcript;
            }
        }

        // Dispatch interim event for live preview
        document.dispatchEvent(new CustomEvent('voice-interim', {
            detail: {
                interim: interimTranscript,
                final: finalTranscript
            }
        }));
    }

    function handleError(event) {
        console.error('VoiceAI error:', event.error);
        isListening = false;

        let errorMessage = 'Lỗi nhận dạng giọng nói';

        switch (event.error) {
            case 'no-speech':
                errorMessage = 'Không nghe thấy giọng nói. Hãy thử lại.';
                break;
            case 'audio-capture':
                errorMessage = 'Không tìm thấy microphone. Kiểm tra kết nối.';
                break;
            case 'not-allowed':
                errorMessage = 'Chưa cấp quyền microphone. Cho phép trong trình duyệt.';
                break;
            case 'network':
                errorMessage = 'Lỗi mạng. Kiểm tra kết nối internet.';
                break;
            case 'aborted':
                errorMessage = 'Đã hủy nhận dạng.';
                break;
        }

        document.dispatchEvent(new CustomEvent('voice-error', {
            detail: { error: event.error, message: errorMessage }
        }));

        if (currentCallback) {
            currentCallback({ success: false, error: errorMessage });
            currentCallback = null;
        }
    }

    function handleEnd() {
        isListening = false;

        // Process final transcript
        let processedText = finalTranscript.trim();

        // Expand abbreviations if available
        if (window.Abbreviations && processedText) {
            const { expanded } = window.Abbreviations.expand(processedText);
            processedText = expanded;
        }

        const result = {
            success: true,
            raw: finalTranscript.trim(),
            processed: processedText,
            parsedDate: null
        };

        // Parse date if available
        if (window.DateParser && processedText) {
            result.parsedDate = window.DateParser.parse(processedText);
        }

        // Dispatch end event
        document.dispatchEvent(new CustomEvent('voice-end', {
            detail: result
        }));

        // Call callback if exists
        if (currentCallback) {
            currentCallback(result);
            currentCallback = null;
        }
    }

    // ========== PUBLIC METHODS ==========

    /**
     * Bắt đầu nhận dạng giọng nói
     * @param {Function} callback - Callback khi hoàn thành
     * @returns {boolean} Success
     */
    function start(callback = null) {
        if (!recognition) {
            if (!init()) {
                if (callback) callback({ success: false, error: 'Không hỗ trợ' });
                return false;
            }
        }

        if (isListening) {
            console.warn('VoiceAI: Đang lắng nghe rồi');
            return false;
        }

        currentCallback = callback;
        finalTranscript = '';
        interimTranscript = '';

        try {
            recognition.start();
            return true;
        } catch (error) {
            console.error('VoiceAI start error:', error);
            if (callback) callback({ success: false, error: error.message });
            return false;
        }
    }

    /**
     * Dừng nhận dạng giọng nói
     */
    function stop() {
        if (recognition && isListening) {
            recognition.stop();
        }
    }

    /**
     * Hủy nhận dạng (không trigger callback)
     */
    function abort() {
        if (recognition && isListening) {
            currentCallback = null;
            recognition.abort();
        }
    }

    /**
     * Đổi ngôn ngữ
     * @param {string} lang - Language code (vi-VN, en-US, etc.)
     */
    function setLanguage(lang) {
        if (recognition) {
            recognition.lang = lang;
            console.log(`🎤 VoiceAI language: ${lang}`);
        }
    }

    /**
     * Toggle liên tục/một lần
     * @param {boolean} continuous 
     */
    function setContinuous(continuous) {
        if (recognition) {
            recognition.continuous = continuous;
        }
    }

    /**
     * Helper: Tạo task từ voice
     * @returns {Promise} Task object
     */
    function createTaskFromVoice() {
        return new Promise((resolve, reject) => {
            start((result) => {
                if (result.success && result.processed) {
                    // Use AIPhase1 if available
                    if (window.AIPhase1 && window.AIPhase1.isReady) {
                        const taskResult = window.AIPhase1.processTaskInput(result.processed);
                        resolve({
                            ...result,
                            task: taskResult.task,
                            suggestions: taskResult.suggestions
                        });
                    } else {
                        resolve({
                            ...result,
                            task: {
                                name: result.processed,
                                dueDate: result.parsedDate?.date || null
                            }
                        });
                    }
                } else {
                    reject(new Error(result.error || 'Voice recognition failed'));
                }
            });
        });
    }

    // ========== UI HELPERS ==========

    /**
     * Tạo nút voice input
     * @param {string} targetInputId - ID của input để điền kết quả
     * @returns {HTMLElement}
     */
    function createVoiceButton(targetInputId) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'voice-input-btn';
        btn.innerHTML = '🎤';
        btn.title = 'Nhập bằng giọng nói';
        btn.style.cssText = `
            background: linear-gradient(135deg, #ef4444, #dc2626);
            border: none;
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        `;

        btn.addEventListener('click', () => {
            if (isListening) {
                stop();
                btn.innerHTML = '🎤';
                btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
            } else {
                btn.innerHTML = '⏹️';
                btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
                btn.style.animation = 'pulse 1s infinite';

                start((result) => {
                    btn.innerHTML = '🎤';
                    btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                    btn.style.animation = 'none';

                    if (result.success && result.processed) {
                        const input = document.getElementById(targetInputId);
                        if (input) {
                            input.value = result.processed;
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }
                });
            }
        });

        return btn;
    }

    // ========== PUBLIC API ==========
    return {
        isSupported,
        init,
        start,
        stop,
        abort,
        setLanguage,
        setContinuous,
        createTaskFromVoice,
        createVoiceButton,

        get isListening() { return isListening; },
        get currentTranscript() { return finalTranscript + interimTranscript; }
    };
})();

// Auto-init
if (typeof window !== 'undefined') {
    window.VoiceAI = VoiceAI;

    // Add CSS animation for pulse
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
    `;
    document.head.appendChild(style);
}
