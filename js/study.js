// --- FILE: js/study.js ---

import { 
    escapeHTML, formatDate, generateID, showNotification, 
    openModal, closeModal, convertDriveLink 
} from './common.js';

import { saveUserData, uploadFileToStorage, deleteFileFromStorage } from './firebase.js';

let globalData = null;
let currentUser = null;

// Biến cho Pomodoro
let pomodoroInterval;
let timeLeft;
let isRunning = false;

// Biến cho Quill Editor
let quillEditor = null;
let currentDraftId = null;

// Cấu trúc tiêu chí SV5T
const SV5T_LEVELS = ['khoa', 'truong', 'dhqg', 'thanhpho', 'trunguong'];
const SV5T_NAMES = {
    khoa: 'Cấp Khoa', truong: 'Cấp Trường', dhqg: 'Cấp ĐHQG',
    thanhpho: 'Cấp Thành phố', trunguong: 'Cấp Trung ương'
};

// ============================================================
// 1. HÀM KHỞI TẠO (MAIN ENTRY)
// ============================================================
export const initStudyModule = (data, user) => {
    globalData = data;
    currentUser = user;

    // Khởi tạo dữ liệu rỗng nếu chưa có để tránh lỗi
    if (!globalData.studentJourney) globalData.studentJourney = {};
    if (!globalData.documents) globalData.documents = [];
    if (!globalData.achievements) globalData.achievements = [];
    if (!globalData.drafts) globalData.drafts = [];

    // --- A. FOCUS MODE (POMODORO) ---
    const btnStart = document.getElementById('pomodoro-start-btn');
    if(btnStart) btnStart.addEventListener('click', startTimer);
    
    const btnPause = document.getElementById('pomodoro-pause-btn');
    if(btnPause) btnPause.addEventListener('click', pauseTimer);
    
    const btnReset = document.getElementById('pomodoro-reset-btn');
    if(btnReset) btnReset.addEventListener('click', resetTimer);
    
    // --- B. SV5T ---
    renderSV5TBoard();

    // --- C. THƯ VIỆN (LIBRARY) ---
    renderLibrary();
    
    // Nút Thêm mới Tài liệu
    document.getElementById('btn-add-document').addEventListener('click', () => {
        // Reset form
        document.getElementById('doc-id').value = '';
        document.getElementById('doc-title').value = '';
        document.getElementById('doc-source').value = '';
        document.getElementById('doc-tags').value = '';
        document.getElementById('doc-notes').value = '';
        document.getElementById('document-file-name').textContent = '';
        
        // Ẩn nút xóa vì đang thêm mới
        document.getElementById('btn-delete-doc').style.display = 'none'; 
        openModal('document-modal');
    });
    
    // Nút Lưu Tài liệu
    document.getElementById('btn-save-doc').addEventListener('click', handleSaveDocument);
    
    // Nút Xóa Tài liệu (Trong Modal)
    document.getElementById('btn-delete-doc').addEventListener('click', () => {
        handleDeleteDocumentInModal();
    });

    // --- D. THÀNH TÍCH ---
    renderAchievements();
    
    // Nút Thêm mới Thành tích
    document.getElementById('btn-add-achievement').addEventListener('click', () => {
        document.getElementById('achievement-id').value = ''; 
        document.getElementById('achievement-title').value = '';
        document.getElementById('achievement-description').value = '';
        
        // Reset các trường mới
        document.getElementById('achievement-category').value = 'other';
        document.getElementById('achievement-drive-link').value = '';
        document.getElementById('achievement-featured').checked = false; // Reset checkbox

        document.getElementById('btn-delete-achievement').style.display = 'none';
        openModal('achievement-modal');
    });
    
    // Nút Lưu Thành tích
    document.getElementById('btn-save-achievement').addEventListener('click', handleSaveAchievement);
    
    // Nút Xóa Thành tích (Trong Modal)
    document.getElementById('btn-delete-achievement').addEventListener('click', () => {
        handleDeleteAchievementInModal();
    });

    // --- E. DRAFTS (BẢN NHÁP) ---
    initQuillEditor();
    renderDraftsList();
    document.getElementById('btn-create-draft').addEventListener('click', createNewDraft);
    document.getElementById('draft-title-input').addEventListener('input', autoSaveDraft);
};


// ============================================================
// 2. CHẾ ĐỘ TẬP TRUNG (POMODORO)
// ============================================================

const startTimer = () => {
    if (isRunning) return;
    
    const duration = parseInt(document.getElementById('focus-duration').value) || 25;
    if (!timeLeft) timeLeft = duration * 60;

    isRunning = true;
    document.getElementById('pomodoro-start-btn').style.display = 'none';
    document.getElementById('pomodoro-pause-btn').style.display = 'inline-block';

    pomodoroInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            clearInterval(pomodoroInterval);
            isRunning = false;
            showNotification('🎉 Hoàn thành phiên làm việc!', 'success');
            if (typeof confetti === 'function') confetti();
            resetTimer();
        }
    }, 1000);
};

const pauseTimer = () => {
    clearInterval(pomodoroInterval);
    isRunning = false;
    document.getElementById('pomodoro-start-btn').style.display = 'inline-block';
    document.getElementById('pomodoro-pause-btn').style.display = 'none';
};

const resetTimer = () => {
    clearInterval(pomodoroInterval);
    isRunning = false;
    timeLeft = null;
    const duration = parseInt(document.getElementById('focus-duration').value) || 25;
    updateTimerDisplay(duration * 60);
    document.getElementById('pomodoro-start-btn').style.display = 'inline-block';
    document.getElementById('pomodoro-pause-btn').style.display = 'none';
};

const updateTimerDisplay = (seconds = timeLeft) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    const timerEl = document.getElementById('pomodoro-timer');
    if(timerEl) timerEl.textContent = `${m}:${s}`;
    document.title = `${m}:${s} - Focus Mode`;
};


// ============================================================
// 3. HÀNH TRÌNH SINH VIÊN 5 TỐT (SV5T)
// ============================================================

const renderSV5TBoard = () => {
    const container = document.getElementById('sv5t-board-container');
    if(!container) return;
    container.innerHTML = '';

    const board = document.createElement('div');
    board.className = 'sv5t-board';

    SV5T_LEVELS.forEach(levelKey => {
        const levelData = globalData.studentJourney[levelKey] || { status: 'Chưa đạt' };
        
        const col = document.createElement('div');
        col.className = 'sv5t-column';
        col.innerHTML = `
            <div class="sv5t-column-header">
                ${SV5T_NAMES[levelKey]} 
                <span style="font-size:0.8rem; margin-left:auto; color:${levelData.status === 'Đạt' ? 'green' : '#666'}">
                    ${levelData.status || ''}
                </span>
            </div>
            <div class="sv5t-column-content">
                ${renderCriterionCard(levelKey, 'ethics', 'Đạo đức tốt', '🏆')}
                ${renderCriterionCard(levelKey, 'study', 'Học tập tốt', '📚')}
                ${renderCriterionCard(levelKey, 'physical', 'Thể lực tốt', '💪')}
                ${renderCriterionCard(levelKey, 'volunteer', 'Tình nguyện tốt', '❤️')}
                ${renderCriterionCard(levelKey, 'integration', 'Hội nhập tốt', '🌍')}
            </div>
        `;
        board.appendChild(col);
    });

    container.appendChild(board);
};

const renderCriterionCard = (level, type, name, icon) => {
    const key = `${level}_${type}`;
    const isDone = globalData.studentJourney[key] === true;
    
    return `
        <div class="sv5t-card ${isDone ? 'achieved' : ''}" onclick="window.openSV5TPanel('${level}', '${type}', '${name}')">
            <div class="sv5t-card-header">
                <span class="sv5t-card-icon">${icon}</span>
                <span>${name}</span>
            </div>
            <div class="sv5t-card-progress-info">
                <span>${isDone ? 'Đã hoàn thành' : 'Chưa hoàn thành'}</span>
            </div>
        </div>
    `;
};

window.openSV5TPanel = (level, type, name) => {
    const panel = document.getElementById('sv5t-side-panel');
    const overlay = document.getElementById('sv5t-panel-overlay');
    const title = document.getElementById('sv5t-panel-title');
    const body = document.getElementById('condition-list-container');

    title.textContent = `${name} (${SV5T_NAMES[level]})`;
    panel.classList.add('open');
    overlay.classList.add('active');

    const key = `${level}_${type}`;
    const isDone = globalData.studentJourney[key] === true;

    body.innerHTML = `
        <div class="condition-item ${isDone ? 'completed' : ''}">
            <div class="condition-main">
                <input type="checkbox" id="chk-${key}" ${isDone ? 'checked' : ''}>
                <label for="chk-${key}" class="condition-name">Xác nhận đã đạt tiêu chuẩn này</label>
            </div>
        </div>
        <div style="margin-top: 20px;">
            <h4>Minh chứng đã tải:</h4>
            <ul id="proof-list-${key}" class="proof-list"></ul>
            <button class="btn-submit" id="btn-upload-${key}" style="margin-top:10px;">📁 Tải minh chứng lên</button>
        </div>
    `;

    const chk = document.getElementById(`chk-${key}`);
    chk.addEventListener('change', async (e) => {
        globalData.studentJourney[key] = e.target.checked;
        await saveUserData(currentUser.uid, { studentJourney: globalData.studentJourney });
        renderSV5TBoard();
        
        const item = e.target.closest('.condition-item');
        if(e.target.checked) item.classList.add('completed');
        else item.classList.remove('completed');
    });

    renderProofs(key);

    const btnUpload = document.getElementById(`btn-upload-${key}`);
    btnUpload.addEventListener('click', () => {
        const fileInput = document.getElementById('proof-upload-input');
        fileInput.onchange = (e) => handleProofUpload(e, key);
        fileInput.click();
    });
};

const renderProofs = (criteriaKey) => {
    const list = document.getElementById(`proof-list-${criteriaKey}`);
    if (!list) return;
    list.innerHTML = '';

    const proofs = (globalData.documents || []).filter(d => d.type === 'proof' && d.criteriaKey === criteriaKey);

    if (proofs.length === 0) {
        list.innerHTML = '<li style="color:#666; font-style:italic;">Chưa có minh chứng nào.</li>';
        return;
    }

    proofs.forEach(p => {
        const li = document.createElement('li');
        li.className = 'proof-item';
        li.innerHTML = `
            <div class="proof-info">
                <a href="${p.link}" target="_blank">${escapeHTML(p.title)}</a>
            </div>
            <button style="color:red; border:none; background:none; cursor:pointer;" onclick="window.deleteProof('${p.id}')">🗑️</button>
        `;
        list.appendChild(li);
    });
};

const handleProofUpload = async (event, criteriaKey) => {
    const file = event.target.files[0];
    if (!file) return;

    showNotification('Đang tải lên...', 'info');
    try {
        const path = `proofs/${currentUser.uid}/${criteriaKey}/${file.name}`;
        const uploadResult = await uploadFileToStorage(file, path);

        const newProof = {
            id: generateID('proof'),
            title: file.name,
            link: uploadResult.url,
            fullPath: uploadResult.fullPath,
            type: 'proof',
            criteriaKey: criteriaKey,
            dateAdded: new Date().toISOString()
        };

        globalData.documents.push(newProof);
        await saveUserData(currentUser.uid, { documents: globalData.documents });
        
        renderProofs(criteriaKey);
        showNotification('Tải minh chứng thành công!', 'success');
    } catch (error) {
        showNotification('Lỗi tải file: ' + error.message, 'error');
    }
    event.target.value = '';
};

window.deleteProof = async (id) => {
    if(!confirm("Xóa minh chứng này?")) return;
    
    const proofIndex = globalData.documents.findIndex(d => d.id === id);
    if (proofIndex > -1) {
        const proof = globalData.documents[proofIndex];
        
        if (proof.fullPath) {
            await deleteFileFromStorage(proof.fullPath);
        }

        globalData.documents.splice(proofIndex, 1);
        await saveUserData(currentUser.uid, { documents: globalData.documents });
        
        if (proof.criteriaKey) renderProofs(proof.criteriaKey);
        showNotification('Đã xóa minh chứng');
    }
};


// ============================================================
// 4. THƯ VIỆN SỐ (DOCUMENTS)
// ============================================================

const renderLibrary = () => {
    const grid = document.getElementById('library-grid');
    grid.innerHTML = '';

    const docs = (globalData.documents || []).filter(d => d.type !== 'proof');

    if (docs.length === 0) {
        document.getElementById('library-empty').style.display = 'block';
        return;
    }
    document.getElementById('library-empty').style.display = 'none';

    docs.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'doc-card';
        card.innerHTML = `
            <div class="doc-card-header" style="cursor:pointer;">
                <span class="doc-card-icon">📄</span>
                <div>
                    <h3 class="doc-card-title">${escapeHTML(doc.title)}</h3>
                    <p class="doc-card-type">${doc.category || 'Tài liệu'}</p>
                </div>
            </div>
            <div class="doc-card-body">
                ${doc.link ? `<a href="${doc.link}" target="_blank">Xem tài liệu</a>` : ''}
            </div>
            <div class="doc-card-footer">
                <button class="btn-delete-lib-item" style="background:var(--danger-color); padding:5px 10px; border:none; border-radius:4px; color:white; cursor:pointer;">Xóa</button>
            </div>
        `;
        
        card.querySelector('.doc-card-header').onclick = () => openEditDocument(doc);
        card.querySelector('.btn-delete-lib-item').onclick = (e) => {
            e.stopPropagation();
            window.deleteDoc(doc.id);
        };
        
        grid.appendChild(card);
    });
};

const openEditDocument = (doc) => {
    document.getElementById('doc-id').value = doc.id;
    document.getElementById('doc-title').value = doc.title;
    document.getElementById('doc-source').value = doc.link || '';
    document.getElementById('doc-tags').value = doc.tags || '';
    document.getElementById('doc-notes').value = doc.notes || '';
    document.getElementById('document-file-name').textContent = doc.fullPath ? 'Đã có file đính kèm' : '';
    document.getElementById('btn-delete-doc').style.display = 'inline-block'; 
    openModal('document-modal');
};

const handleSaveDocument = async () => {
    const id = document.getElementById('doc-id').value;
    const title = document.getElementById('doc-title').value;
    const link = document.getElementById('doc-source').value;
    
    if (!title) return showNotification('Cần nhập tiêu đề', 'error');

    const fileInput = document.getElementById('document-file-input');
    let fileUrl = link;
    let fullPath = null;

    if (fileInput.files.length > 0) {
        showNotification('Đang tải file...', 'info');
        const file = fileInput.files[0];
        const result = await uploadFileToStorage(file, `library/${currentUser.uid}/${file.name}`);
        fileUrl = result.url;
        fullPath = result.fullPath;
    } else if (id) {
        const oldDoc = globalData.documents.find(d => d.id === id);
        if (oldDoc) {
            if (!fileUrl) fileUrl = oldDoc.link;
            if (!fullPath) fullPath = oldDoc.fullPath;
        }
    }

    const docData = {
        id: id || generateID('doc'),
        title: title,
        link: fileUrl,
        fullPath: fullPath,
        category: document.getElementById('doc-type').value,
        tags: document.getElementById('doc-tags').value,
        notes: document.getElementById('doc-notes').value,
        type: 'document',
        dateAdded: new Date().toISOString()
    };

    if (id) {
        const index = globalData.documents.findIndex(d => d.id === id);
        if (index > -1) globalData.documents[index] = { ...globalData.documents[index], ...docData };
    } else {
        globalData.documents.push(docData);
    }

    await saveUserData(currentUser.uid, { documents: globalData.documents });
    
    renderLibrary();
    closeModal('document-modal');
    showNotification('Lưu tài liệu thành công');
};

const handleDeleteDocumentInModal = () => {
    const id = document.getElementById('doc-id').value;
    if (id) {
        window.deleteDoc(id);
        closeModal('document-modal');
    }
};

window.deleteDoc = async (id) => {
    if(!confirm("Xóa tài liệu này?")) return;
    const index = globalData.documents.findIndex(d => d.id === id);
    if (index > -1) {
        const doc = globalData.documents[index];
        if (doc.fullPath) await deleteFileFromStorage(doc.fullPath);
        
        globalData.documents.splice(index, 1);
        await saveUserData(currentUser.uid, { documents: globalData.documents });
        renderLibrary();
        showNotification('Đã xóa tài liệu');
    }
};


// ============================================================
// 5. BẢN NHÁP (DRAFTS - QUILLJS)
// ============================================================

const initQuillEditor = () => {
    if (typeof Quill !== 'undefined' && !quillEditor) {
        quillEditor = new Quill('#editor-container', {
            theme: 'snow',
            placeholder: 'Viết ý tưởng của bạn tại đây...',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, false] }],
                    ['bold', 'italic', 'underline'],
                    ['image', 'code-block']
                ]
            }
        });
        quillEditor.on('text-change', () => {
            autoSaveDraft();
        });
    }
};

const renderDraftsList = () => {
    const list = document.getElementById('drafts-list-column');
    list.innerHTML = '';
    const drafts = globalData.drafts || [];

    drafts.forEach(d => {
        const div = document.createElement('div');
        div.className = `outline-list-item ${d.id === currentDraftId ? 'active' : ''}`;
        div.innerHTML = `
            <span>${escapeHTML(d.title || 'Không tiêu đề')}</span>
            <button class="btn-delete-draft" style="float:right; border:none; background:none; color:red;">×</button>
        `;
        
        div.onclick = () => loadDraft(d);
        div.querySelector('.btn-delete-draft').onclick = (e) => {
            e.stopPropagation();
            deleteDraft(d.id);
        };
        list.appendChild(div);
    });
};

const createNewDraft = () => {
    const newDraft = {
        id: generateID('draft'),
        title: 'Bản nháp mới',
        content: '',
        lastModified: new Date().toISOString()
    };
    globalData.drafts.unshift(newDraft);
    renderDraftsList();
    loadDraft(newDraft);
};

const loadDraft = (draft) => {
    currentDraftId = draft.id;
    document.getElementById('draft-title-input').value = draft.title;
    
    if (quillEditor) {
        try {
            const delta = JSON.parse(draft.content);
            quillEditor.setContents(delta);
        } catch (e) {
            quillEditor.root.innerHTML = draft.content || '';
        }
    }

    document.getElementById('drafts-editor-welcome').style.display = 'none';
    document.getElementById('drafts-editor-content').style.display = 'flex';
    renderDraftsList();
};

const deleteDraft = async (id) => {
    if(!confirm("Xóa bản nháp này?")) return;
    globalData.drafts = globalData.drafts.filter(d => d.id !== id);
    
    if (currentDraftId === id) {
        currentDraftId = null;
        document.getElementById('drafts-editor-welcome').style.display = 'flex';
        document.getElementById('drafts-editor-content').style.display = 'none';
    }
    
    await saveUserData(currentUser.uid, { drafts: globalData.drafts });
    renderDraftsList();
};

let saveTimeout;
const autoSaveDraft = () => {
    if (!currentDraftId) return;
    document.getElementById('draft-status').textContent = 'Đang lưu...';
    
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        const draft = globalData.drafts.find(d => d.id === currentDraftId);
        if (draft) {
            draft.title = document.getElementById('draft-title-input').value;
            draft.content = JSON.stringify(quillEditor.getContents());
            draft.lastModified = new Date().toISOString();
            
            await saveUserData(currentUser.uid, { drafts: globalData.drafts });
            document.getElementById('draft-status').textContent = 'Đã lưu';
            renderDraftsList();
        }
    }, 1000);
};


// ============================================================
// 6. THÀNH TÍCH (ACHIEVEMENTS)
// ============================================================
const renderAchievements = () => {
    const grid = document.getElementById('achievements-grid');
    grid.innerHTML = '';
    const achievements = globalData.achievements || [];
    
    achievements.forEach(ach => {
        const div = document.createElement('div');
        div.className = 'achievement-card';
        div.onclick = () => openEditAchievement(ach);

        div.innerHTML = `
             <div class="achievement-preview">
                ${ach.imageUrl ? `<img src="${ach.imageUrl}">` : '🏆'}
            </div>
            <div class="achievement-info">
                <h3>${escapeHTML(ach.name)}</h3>
                <p>${formatDate(ach.date)}</p>
            </div>
        `;
        grid.appendChild(div);
    });
};

// [ĐÃ SỬA] Thêm load trạng thái Checkbox
const openEditAchievement = (ach) => {
    document.getElementById('achievement-id').value = ach.id;
    document.getElementById('achievement-title').value = ach.name;
    document.getElementById('achievement-date').value = ach.date;
    document.getElementById('achievement-description').value = ach.description || '';
    
    // Load loại
    document.getElementById('achievement-category').value = ach.category || 'other';
    // Load link Drive
    document.getElementById('achievement-drive-link').value = ach.imageUrl || '';
    // Load trạng thái Nổi bật (Checkbox)
    document.getElementById('achievement-featured').checked = ach.isFeatured || false;

    document.getElementById('btn-delete-achievement').style.display = 'inline-block';
    openModal('achievement-modal');
};

// [ĐÃ SỬA] Thêm lưu trạng thái Checkbox
const handleSaveAchievement = async () => {
    const id = document.getElementById('achievement-id').value;
    const title = document.getElementById('achievement-title').value;
    const date = document.getElementById('achievement-date').value;
    const category = document.getElementById('achievement-category').value;
    const rawLink = document.getElementById('achievement-drive-link').value;
    
    // Lấy trạng thái checkbox
    const isFeatured = document.getElementById('achievement-featured').checked;
    
    if(!title) return showNotification('Nhập tên thành tích', 'error');
    
    const finalImgUrl = convertDriveLink(rawLink);

    const achData = {
        id: id || generateID('ach'),
        name: title,
        date: date,
        category: category,
        description: document.getElementById('achievement-description').value,
        imageUrl: finalImgUrl,
        isFeatured: isFeatured // Lưu vào database
    };

    if (id) {
        const index = globalData.achievements.findIndex(a => a.id === id);
        if (index > -1) globalData.achievements[index] = achData;
    } else {
        globalData.achievements.push(achData);
    }

    await saveUserData(currentUser.uid, { achievements: globalData.achievements });
    
    renderAchievements();
    closeModal('achievement-modal');
    showNotification('Lưu thành tích thành công!');
};

const handleDeleteAchievementInModal = () => {
    const id = document.getElementById('achievement-id').value;
    if (id) handleDeleteAchievement(id);
};

const handleDeleteAchievement = async (id) => {
    if (!confirm('Xóa thành tích này?')) return;

    const index = globalData.achievements.findIndex(a => a.id === id);
    if (index > -1) {
        globalData.achievements.splice(index, 1);
        await saveUserData(currentUser.uid, { achievements: globalData.achievements });
        renderAchievements();
        closeModal('achievement-modal');
        showNotification('Đã xóa thành tích');
    }
};
