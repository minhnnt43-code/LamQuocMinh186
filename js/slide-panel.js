/**
 * SLIDE PANEL MODULE
 * Replaces all modals with a slide-in panel from the right
 */

// Panel state
let currentPanelMode = null; // 'add-task', 'edit-task', 'add-event', etc.
let editingTaskId = null;

// DOM Elements
const slidePanel = document.getElementById('slide-panel');
const slidePanelOverlay = document.getElementById('slide-panel-overlay');
const slidePanelClose = document.getElementById('slide-panel-close');
const slidePanelTitleText = document.getElementById('slide-panel-title-text');
const slidePanelIcon = document.getElementById('slide-panel-icon');
const panelCancelBtn = document.getElementById('panel-cancel-btn');
const panelSaveBtn = document.getElementById('panel-save-btn');

// Priority selector elements
const priorityOptions = document.querySelectorAll('.priority-option');
let selectedPriority = 'medium';

/**
 * Open the slide panel
 * @param {string} mode - The mode to open: 'add-task', 'edit-task', 'add-event'
 * @param {object} data - Optional data to populate the form (for editing)
 */
export function openPanel(mode, data = null) {
    currentPanelMode = mode;

    // Set title based on mode
    switch (mode) {
        case 'add-task':
            slidePanelIcon.textContent = '➕';
            slidePanelTitleText.textContent = 'Thêm công việc mới';
            clearTaskForm();
            break;
        case 'edit-task':
            slidePanelIcon.textContent = '✏️';
            slidePanelTitleText.textContent = 'Chỉnh sửa công việc';
            if (data) populateTaskForm(data);
            editingTaskId = data?.id || null;
            break;
        case 'add-event':
            slidePanelIcon.textContent = '📅';
            slidePanelTitleText.textContent = 'Thêm sự kiện';
            break;
        default:
            slidePanelIcon.textContent = '📝';
            slidePanelTitleText.textContent = 'Chi tiết';
    }

    // Show panel with animation
    slidePanel.classList.add('active');
    slidePanelOverlay.classList.add('active');

    // Focus first input
    setTimeout(() => {
        const firstInput = slidePanel.querySelector('input:not([type="hidden"])');
        if (firstInput) firstInput.focus();
    }, 300);
}

/**
 * Close the slide panel
 */
export function closePanel() {
    slidePanel.classList.remove('active');
    slidePanelOverlay.classList.remove('active');
    currentPanelMode = null;
    editingTaskId = null;
}

/**
 * Clear the task form
 */
function clearTaskForm() {
    const nameInput = document.getElementById('panel-task-name');
    const dateInput = document.getElementById('panel-task-date');
    const categorySelect = document.getElementById('panel-task-category');
    const tagsInput = document.getElementById('panel-task-tags');
    const notesInput = document.getElementById('panel-task-notes');

    if (nameInput) nameInput.value = '';
    if (dateInput) dateInput.value = '';
    if (categorySelect) categorySelect.value = 'Học tập';
    if (tagsInput) tagsInput.value = '';
    if (notesInput) notesInput.value = '';

    // Reset priority
    setPriority('medium');
}

/**
 * Populate the task form with data (for editing)
 */
function populateTaskForm(data) {
    const nameInput = document.getElementById('panel-task-name');
    const dateInput = document.getElementById('panel-task-date');
    const categorySelect = document.getElementById('panel-task-category');
    const tagsInput = document.getElementById('panel-task-tags');
    const notesInput = document.getElementById('panel-task-notes');

    if (nameInput) nameInput.value = data.name || '';
    if (dateInput) dateInput.value = data.dueDate || '';
    if (categorySelect) categorySelect.value = data.category || 'Học tập';
    if (tagsInput) tagsInput.value = (data.tags || []).join(', ');
    if (notesInput) notesInput.value = data.notes || '';

    // Set priority
    setPriority(data.priority || 'medium');
}

/**
 * Set the selected priority
 */
function setPriority(priority) {
    selectedPriority = priority;
    priorityOptions.forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.priority === priority) {
            opt.classList.add('selected');
        }
    });
}

/**
 * Get form data
 */
export function getTaskFormData() {
    return {
        name: document.getElementById('panel-task-name')?.value || '',
        dueDate: document.getElementById('panel-task-date')?.value || '',
        category: document.getElementById('panel-task-category')?.value || 'Học tập',
        priority: selectedPriority,
        tags: (document.getElementById('panel-task-tags')?.value || '')
            .split(',')
            .map(t => t.trim())
            .filter(t => t),
        notes: document.getElementById('panel-task-notes')?.value || '',
        id: editingTaskId
    };
}

/**
 * Initialize panel event listeners
 */
export function initSlidePanel(onSaveCallback) {
    // Close button
    if (slidePanelClose) {
        slidePanelClose.addEventListener('click', closePanel);
    }

    // Overlay click to close
    if (slidePanelOverlay) {
        slidePanelOverlay.addEventListener('click', closePanel);
    }

    // Cancel button
    if (panelCancelBtn) {
        panelCancelBtn.addEventListener('click', closePanel);
    }

    // Save button
    if (panelSaveBtn) {
        panelSaveBtn.addEventListener('click', () => {
            const formData = getTaskFormData();

            // Validate
            if (!formData.name.trim()) {
                const nameInput = document.getElementById('panel-task-name');
                if (nameInput) {
                    nameInput.style.borderColor = 'var(--danger-color)';
                    nameInput.focus();
                    setTimeout(() => {
                        nameInput.style.borderColor = '';
                    }, 2000);
                }
                return;
            }

            // Call the save callback
            if (onSaveCallback) {
                onSaveCallback(currentPanelMode, formData);
            }

            // Close panel
            closePanel();
        });
    }

    // Priority selector
    priorityOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            setPriority(opt.dataset.priority);
        });
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && slidePanel.classList.contains('active')) {
            closePanel();
        }
    });

    console.log('✅ Slide Panel initialized');
}

// Make functions available globally for inline onclick
window.openSlidePanel = openPanel;
window.closeSlidePanel = closePanel;
