/**
 * HSV QR Generator
 * Xử lý sinh mã QR động (Time-based)
 * Yêu cầu: qrcode.min.js
 */

class DynamicQR {
    constructor(elementId, eventId, secret) {
        this.container = document.getElementById(elementId);
        this.eventId = eventId;
        this.secret = secret;
        this.interval = 10000; // 10 giây
        this.timer = null;
        this.qrCodeObj = null;

        this.init();
    }

    init() {
        if (!this.container) return;

        // Tạo cấu trúc HTML cho QR widget
        this.container.innerHTML = `
            <div class="qr-wrapper" style="text-align: center;">
                <div id="qr-canvas" style="display: inline-block; padding: 10px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></div>
                <div class="qr-timer" style="margin-top: 15px;">
                    <div class="progress-bar" style="height: 4px; background: #eee; border-radius: 2px; overflow: hidden;">
                        <div id="qr-progress" style="width: 100%; height: 100%; background: var(--color-accent); transition: width 1s linear;"></div>
                    </div>
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">Mã tự động đổi sau <span id="qr-countdown">10</span>s</p>
                </div>
                <div class="qr-info" style="margin-top: 10px; font-size: 14px; font-weight: 500;">
                    Mã xác thực: <span id="qr-text-code" style="font-family: monospace; color: var(--color-primary);">---</span>
                </div>
            </div>
        `;

        this.startLoop();
    }

    generateToken() {
        // Giả lập thuật toán TOTP đơn giản: Hash(Secret + TimeBlock)
        const timeBlock = Math.floor(Date.now() / this.interval);
        const rawString = `${this.secret}-${timeBlock}`;

        // Hash đơn giản (trong thực tế dùng SHA-1/SHA-256)
        let hash = 0;
        for (let i = 0; i < rawString.length; i++) {
            const char = rawString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }

        // Lấy 6 số cuối tuyệt đối
        const code = Math.abs(hash).toString().slice(-6).padStart(6, '0');
        return { code, timeBlock };
    }

    updateQR() {
        const { code } = this.generateToken();
        const qrData = JSON.stringify({
            evt: this.eventId,
            code: code,
            ts: Date.now()
        });

        const canvas = document.getElementById('qr-canvas');
        if (!canvas) return;

        // Clear cũ
        canvas.innerHTML = '';

        // Tạo QR mới
        new QRCode(canvas, {
            text: qrData,
            width: 180,
            height: 180,
            colorDark: "#0056B3",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // Update text code hiển thị (để debug/nhập tay)
        const textCodeEl = document.getElementById('qr-text-code');
        if (textCodeEl) textCodeEl.textContent = code;
    }

    startLoop() {
        let timeLeft = 10;
        const progressEl = document.getElementById('qr-progress');
        const countdownEl = document.getElementById('qr-countdown');

        // Render lần đầu
        this.updateQR();

        this.timer = setInterval(() => {
            timeLeft--;

            // Update UI
            if (countdownEl) countdownEl.textContent = timeLeft;
            if (progressEl) progressEl.style.width = `${(timeLeft / 10) * 100}%`;

            if (timeLeft <= 0) {
                timeLeft = 10;
                this.updateQR();
            }
        }, 1000);
    }

    stop() {
        if (this.timer) clearInterval(this.timer);
    }
}

// Export global
window.DynamicQR = DynamicQR;
