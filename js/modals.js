// --- FILE: js/modals.js ---
import { setupModal } from './common.js';

export function setupAllModals() {
    const modals = [
        'edit-modal', 'event-modal', 'achievement-modal', 'project-modal',
        'document-modal', 'outline-modal', 'confirm-modal', 'admin-modal'
    ];
    const closes = [
        'close-edit-modal', 'close-event-modal', 'close-achievement-modal', 'close-project-modal',
        'close-document-modal', 'close-outline-modal', 'btn-cancel-confirm', 'close-admin-modal'
    ];

    modals.forEach((id, i) => setupModal(id, closes[i]));

    const closeSidePanels = () => {
        document.querySelectorAll('.sv5t-side-panel').forEach(p => p.classList.remove('open'));
        document.querySelectorAll('.sv5t-panel-overlay').forEach(o => o.classList.remove('active'));
    };

    document.getElementById('sv5t-panel-close-btn')?.addEventListener('click', closeSidePanels);
    document.getElementById('sv5t-panel-overlay')?.addEventListener('click', closeSidePanels);
    document.getElementById('outline-node-panel-close-btn')?.addEventListener('click', closeSidePanels);
    document.getElementById('outline-node-panel-overlay')?.addEventListener('click', closeSidePanels);
}
