// === COMPONENT: SLIDE-OVER PANEL MANAGER ===

export const PanelManager = {
    // Current active panel ID
    activePanelId: null,

    // Initialize the panel system
    init() {
        // Create the backdrop and container if not exist
        if (!document.getElementById('slide-panel-backdrop')) {
            const backdrop = document.createElement('div');
            backdrop.id = 'slide-panel-backdrop';
            backdrop.className = 'slide-panel-backdrop';

            // Close on backdrop click
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    this.closeCurrentPanel();
                }
            });

            document.body.appendChild(backdrop);
        }
    },

    // Create or get a panel by ID
    getPanel(panelId) {
        let panel = document.getElementById(panelId);

        // If panel doesn't exist, we assume it needs to be created dynamically
        // or it's a structural error. For now, we return existing.
        return panel;
    },

    // Open a panel
    open(panelId) {
        // If another panel is open, close it first (or we could stack them?)
        if (this.activePanelId && this.activePanelId !== panelId) {
            this.close(this.activePanelId);
        }

        const panel = document.getElementById(panelId);
        const backdrop = document.getElementById('slide-panel-backdrop');

        if (!panel) {
            console.error(`Panel with ID ${panelId} not found`);
            return;
        }

        // [FIX] Move panel to document.body to escape any z-index stacking contexts
        // Giúp panel không bị mờ đè bởi backdrop (do z-index bị giới hạn bởi parent container)
        if (panel.parentElement !== document.body) {
            document.body.appendChild(panel);
        }

        // Add class to show
        backdrop.classList.add('active');
        panel.classList.add('active'); // CSS transform handles the slide/modal

        this.activePanelId = panelId;

        // Dispatch event
        window.dispatchEvent(new CustomEvent('panel-opened', { detail: { panelId } }));
    },

    // Close specific panel
    close(panelId) {
        const panel = document.getElementById(panelId);
        const backdrop = document.getElementById('slide-panel-backdrop');

        if (panel) {
            panel.classList.remove('active');
        }

        // Only hide backdrop if no other panels are active (simplified for single panel)
        if (this.activePanelId === panelId) {
            backdrop.classList.remove('active');
            this.activePanelId = null;
        }

        // Dispatch event
        window.dispatchEvent(new CustomEvent('panel-closed', { detail: { panelId } }));
    },

    // Close whatever is open
    closeCurrentPanel() {
        if (this.activePanelId) {
            this.close(this.activePanelId);
        }
    },

    // Inject content into a generic panel (useful for dynamic forms)
    // We can have one generic <div id="dynamic-panel" class="slide-panel">...</div>
    // and just swap content. This reduces DOM clutter.
    openDynamic(title, contentHTML, onRenderCallback) {
        this.initDynamicPanel();

        const panel = document.getElementById('dynamic-panel');
        const titleEl = panel.querySelector('.panel-title-text');
        const bodyEl = panel.querySelector('.panel-body');

        if (titleEl) titleEl.textContent = title;
        if (bodyEl) bodyEl.innerHTML = contentHTML;

        if (typeof onRenderCallback === 'function') {
            onRenderCallback(bodyEl);
        }

        this.open('dynamic-panel');
    },

    initDynamicPanel() {
        if (document.getElementById('dynamic-panel')) return;

        const panelHTML = `
            <div id="dynamic-panel" class="slide-panel">
                <div class="panel-header">
                    <h3 class="panel-title">
                        <span class="panel-title-text">Panel Title</span>
                    </h3>
                    <button class="panel-close-btn" id="dynamic-panel-close">&times;</button>
                </div>
                <div class="panel-body">
                    <!-- Dynamic Content -->
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', panelHTML);

        // Setup close btn
        document.getElementById('dynamic-panel-close').addEventListener('click', () => {
            this.close('dynamic-panel');
        });
    }
};

// Global Exposure for ease of use (optional)
window.PanelManager = PanelManager;

// Init on load
document.addEventListener('DOMContentLoaded', () => {
    PanelManager.init();
});
