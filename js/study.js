// --- FILE: js/study.js ---

import {
    escapeHTML, formatDate, generateID, showNotification,
    openModal, closeModal
} from './common.js';

import { saveUserData, uploadFileToStorage, deleteFileFromStorage } from './firebase.js';

// ============================================================
// KHAI BÁO BIẾN TOÀN CỤC
// ============================================================
let globalData = null;
let currentUser = null;

// Biến Pomodoro
let pomodoroInterval;
let timeLeft;
let isRunning = false;

// Biến Quill Editor & Drafts
let quillEditor = null;
let currentDraftId = null;
let saveDraftTimeout;

// Biến Outline
let currentOutlineId = null;

// ============================================================
// --- CẤU HÌNH CẤP ĐỘ SV5T ---
// ============================================================
const SV5T_LEVELS = ['khoa', 'truong', 'dhqg', 'thanhpho', 'trunguong'];

const SV5T_NAMES = {
    khoa: 'Cấp Khoa', 
    truong: 'Cấp Trường', 
    dhqg: 'Cấp ĐHQG/Tỉnh',
    thanhpho: 'Cấp Thành phố', 
    trunguong: 'Cấp Trung ương'
};

// ============================================================
// --- SV5T CRITERIA DATA (ĐẦY ĐỦ) ---
// ============================================================
const sv5tCriteriaData = {
    khoa: {
        name: "Cấp Khoa",
        criteria: {
            ethics: { name: 'Đạo đức tốt', icon: '🏆',
                required: [{ id: 'khoa_ethics_1', text: 'Điểm rèn luyện >= 80' }]
            },
            study: { name: 'Học tập tốt', icon: '📚',
                required: [{ id: 'khoa_study_1', text: 'Điểm TB chung học tập >= 7.5' }]
            },
            physical: { name: 'Thể lực tốt', icon: '💪',
                optionalGroups: [{
                    description: 'Đạt 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'khoa_physical_1', text: 'Đạt danh hiệu "Thanh niên khỏe" cấp Trường trở lên' },
                        { id: 'khoa_physical_2', text: 'Tham gia hoạt động thể thao từ cấp Khoa trở lên' },
                    ]
                }]
            },
            volunteer: { name: 'Tình nguyện tốt', icon: '❤️',
                optionalGroups: [{
                    description: 'Đạt 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'khoa_volunteer_1', text: 'Hoàn thành 1 trong các chiến dịch tình nguyện' },
                        { id: 'khoa_volunteer_2', text: 'Tham gia ít nhất 03 ngày tình nguyện/năm' },
                    ]
                }]
            },
            integration: { name: 'Hội nhập tốt', icon: '🌍',
                optionalGroups: [
                    {
                        description: 'Về ngoại ngữ (đạt 1 trong các tiêu chuẩn sau):',
                        options: [
                            { id: 'khoa_integration_1', text: 'Chứng chỉ tiếng Anh B1 hoặc tương đương' },
                            { id: 'khoa_integration_2', text: 'Điểm tổng kết các học phần ngoại ngữ >= 7.0' },
                        ]
                    },
                    {
                        description: 'Về kỹ năng (đạt 1 trong các tiêu chuẩn sau):',
                        options: [
                            { id: 'khoa_integration_4', text: 'Hoàn thành ít nhất 1 khóa học kỹ năng' },
                            { id: 'khoa_integration_5', text: 'Được Đoàn - Hội khen thưởng' }
                        ]
                    }
                ]
            }
        }
    },
    truong: {
        name: "Cấp Trường",
        criteria: {
            ethics: { name: 'Đạo đức tốt', icon: '🏆',
                required: [
                    { id: 'truong_ethics_1', text: 'Điểm rèn luyện >= 80' },
                    { id: 'truong_ethics_2', text: 'Xếp loại Đoàn viên/Hội viên xuất sắc' }
                ]
            },
            study: { name: 'Học tập tốt', icon: '📚',
                required: [{ id: 'truong_study_1', text: 'Điểm TB chung học tập >= 7.75' }],
                optionalGroups: [{
                    description: 'Đạt thêm 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'truong_study_2', text: 'Có đề tài NCKH hoặc luận văn tốt nghiệp' },
                        { id: 'truong_study_4', text: 'Đạt giải cuộc thi học thuật cấp Khoa trở lên' },
                    ]
                }]
            },
            physical: { name: 'Thể lực tốt', icon: '💪',
                optionalGroups: [{
                    description: 'Đạt 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'truong_physical_1', text: 'Đạt danh hiệu "Thanh niên khỏe" cấp Trường trở lên' },
                        { id: 'truong_physical_3', text: 'Đạt giải thể thao cấp Khoa trở lên' },
                    ]
                }]
            },
            volunteer: { name: 'Tình nguyện tốt', icon: '❤️',
                optionalGroups: [{
                    description: 'Đạt 1 trong các tiêu chuẩn sau:',
                     options: [
                        { id: 'truong_volunteer_1', text: 'Hoàn thành 1 trong các chiến dịch tình nguyện' },
                        { id: 'truong_volunteer_2', text: 'Tham gia ít nhất 05 ngày tình nguyện/năm' },
                    ]
                }]
            },
            integration: { name: 'Hội nhập tốt', icon: '🌍',
                optionalGroups: [
                    {
                        description: 'Về ngoại ngữ (đạt 1 trong các tiêu chuẩn sau):',
                        options: [
                            { id: 'truong_integration_1', text: 'Chứng chỉ tiếng Anh B1 hoặc tương đương' },
                            { id: 'truong_integration_2', text: 'Điểm tổng kết các học phần ngoại ngữ >= 8.0' },
                        ]
                    },
                    {
                        description: 'Về kỹ năng (đạt 1 trong các tiêu chuẩn sau):',
                        options: [
                            { id: 'truong_integration_4', text: 'Hoàn thành ít nhất 1 khóa học kỹ năng' },
                            { id: 'truong_integration_5', text: 'Được Đoàn - Hội khen thưởng' }
                        ]
                    },
                    {
                        description: 'Về hoạt động hội nhập (đạt 1 trong các tiêu chuẩn sau):',
                        options: [
                            { id: 'truong_integration_6', text: 'Tham gia ít nhất 1 hoạt động hội nhập' },
                            { id: 'truong_integration_8', text: 'Tham gia giao lưu quốc tế' }
                        ]
                    }
                ]
            }
        }
    },
    dhqg: {
        name: "Cấp ĐHQG",
        criteria: {
            ethics: { name: 'Đạo đức tốt', icon: '🏆',
                required: [
                    { id: 'dhqg_ethics_1', text: 'Điểm rèn luyện >= 80' },
                    { id: 'dhqg_ethics_2', text: 'Đoàn viên/Hội viên hoàn thành xuất sắc nhiệm vụ' }
                ]
            },
            study: { name: 'Học tập tốt', icon: '📚',
                required: [{ id: 'dhqg_study_1', text: 'Điểm TB chung học tập >= 8.0' }],
                optionalGroups: [{
                    description: 'Đạt thêm 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'dhqg_study_2', text: 'NCKH/Khóa luận tốt nghiệp >= 7.0' },
                        { id: 'dhqg_study_3', text: 'Đạt giải Ba học thuật cấp Khoa trở lên' },
                    ]
                }]
            },
            physical: { name: 'Thể lực tốt', icon: '💪',
                optionalGroups: [{
                    description: 'Đạt 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'dhqg_physical_1', text: 'Đạt danh hiệu "Thanh niên khỏe" cấp Trường trở lên' },
                        { id: 'dhqg_physical_2', text: 'Đạt giải thể thao cấp Trường trở lên' },
                    ]
                }]
            },
            volunteer: { name: 'Tình nguyện tốt', icon: '❤️',
                optionalGroups: [{
                    description: 'Đạt 1 trong các tiêu chuẩn sau:',
                     options: [
                        { id: 'dhqg_volunteer_1', text: 'Được khen thưởng tình nguyện cấp Trường trở lên' },
                        { id: 'dhqg_volunteer_2', text: 'Tham gia ít nhất 05 ngày tình nguyện/năm' }
                    ]
                }]
            },
            integration: { name: 'Hội nhập tốt', icon: '🌍',
                required: [{ id: 'dhqg_integration_1', text: 'Chứng chỉ tiếng Anh B1 hoặc tương đương' }],
                optionalGroups: [
                    {
                        description: 'Về hội nhập (đạt thêm 1 trong các tiêu chuẩn sau):',
                        options: [
                            { id: 'dhqg_integration_2', text: 'Tham gia ít nhất 1 hoạt động giao lưu quốc tế' },
                            { id: 'dhqg_integration_3', text: 'Đạt giải Ba hội nhập/NN cấp Trường trở lên' }
                        ]
                    },
                    {
                        description: 'Về kỹ năng (đạt thêm 1 trong các tiêu chuẩn sau):',
                        options: [
                            { id: 'dhqg_integration_4', text: 'Hoàn thành ít nhất 1 khóa học kỹ năng' },
                            { id: 'dhqg_integration_6', text: 'Được Đoàn - Hội khen thưởng' }
                        ]
                    }
                ]
            }
        }
    },
    thanhpho: {
        name: "Cấp Thành phố",
        criteria: {
             ethics: { name: 'Đạo đức tốt', icon: '🏆',
                required: [
                    { id: 'tp_ethics_1', text: 'Điểm rèn luyện >= 90' },
                    { id: 'tp_ethics_2', text: 'Đoàn viên/Hội viên hoàn thành xuất sắc nhiệm vụ' }
                ],
                optionalGroups: [{
                    description: 'Đạt thêm 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'tp_ethics_3', text: 'Là thành viên đội thi Mác-Lênin, TTHCM' },
                        { id: 'tp_ethics_4', text: 'Là Thanh niên tiên tiến làm theo lời Bác' }
                    ]
                }]
            },
            study: { name: 'Học tập tốt', icon: '📚',
                required: [{ id: 'tp_study_1', text: 'Điểm TB chung học tập >= 8.5' }],
                optionalGroups: [{
                    description: 'Đạt thêm 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'tp_study_2', text: 'NCKH/Khóa luận tốt nghiệp >= 8.0' },
                        { id: 'tp_study_3', text: 'Đạt giải Euréka hoặc NCKH cấp Thành trở lên' },
                    ]
                }]
            },
            physical: { name: 'Thể lực tốt', icon: '💪',
                optionalGroups: [{
                    description: 'Đạt 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'tp_physical_1', text: 'Đạt danh hiệu "Thanh niên khỏe" cấp Trường trở lên' },
                        { id: 'tp_physical_2', text: 'Đạt giải thể thao cấp Trường trở lên' },
                    ]
                }]
            },
            volunteer: { name: 'Tình nguyện tốt', icon: '❤️',
                required: [
                    { id: 'tp_volunteer_1', text: 'Được khen thưởng tình nguyện cấp Trường trở lên' },
                    { id: 'tp_volunteer_2', text: 'Tham gia ít nhất 05 ngày tình nguyện/năm' }
                ]
            },
            integration: { name: 'Hội nhập tốt', icon: '🌍',
                required: [
                    { id: 'tp_integration_1', text: 'Chứng chỉ tiếng Anh B1 hoặc tương đương' },
                    { id: 'tp_integration_5', text: 'Tham gia ít nhất 01 hoạt động hội nhập' }
                ],
                optionalGroups: [
                    {
                        description: 'Về ngoại ngữ (đạt thêm 1 trong 2):',
                        options: [
                            { id: 'tp_integration_2', text: 'Tham gia ít nhất 1 hoạt động giao lưu quốc tế' },
                            { id: 'tp_integration_3', text: 'Đạt giải Ba hội nhập/NN cấp Trường trở lên' }
                        ]
                    },
                    {
                        description: 'Về kỹ năng (đạt 1 trong 2):',
                        options: [
                            { id: 'tp_integration_4', text: 'Hoàn thành ít nhất 1 khóa học kỹ năng' },
                            { id: 'tp_integration_6', text: 'Được Đoàn - Hội khen thưởng' }
                        ]
                    }
                ]
            }
        }
    },
    trunguong: {
        name: "Cấp Trung ương",
        criteria: {
            ethics: { name: 'Đạo đức tốt', icon: '🏆',
                required: [{ id: 'tw_ethics_1', text: 'Điểm rèn luyện >= 90' }],
                 optionalGroups: [{
                    description: 'Đạt thêm 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'tw_ethics_2', text: 'Là thành viên đội thi Mác-Lênin, TTHCM' },
                        { id: 'tw_ethics_3', text: 'Là thanh niên tiêu biểu/tiên tiến' }
                    ]
                }]
            },
            study: { name: 'Học tập tốt', icon: '📚',
                required: [{ id: 'tw_study_1', text: 'Điểm TB chung học tập >= 8.5 (ĐH) hoặc >= 8.0 (CĐ)' }],
                optionalGroups: [{
                    description: 'Đạt thêm 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'tw_study_2', text: 'NCKH đạt loại Tốt cấp Trường trở lên' },
                        { id: 'tw_study_5', text: 'Là thành viên đội tuyển thi học thuật quốc gia, quốc tế' }
                    ]
                }]
            },
            physical: { name: 'Thể lực tốt', icon: '💪',
                optionalGroups: [{
                    description: 'Đạt 1 trong các tiêu chuẩn sau:',
                    options: [
                        { id: 'tw_physical_1', text: 'Đạt danh hiệu "Sinh viên khỏe" cấp Trường trở lên' },
                        { id: 'tw_physical_2', text: 'Đạt danh hiệu "Sinh viên khỏe" cấp Tỉnh trở lên' },
                    ]
                }]
            },
            volunteer: { name: 'Tình nguyện tốt', icon: '❤️',
                required: [
                    { id: 'tw_volunteer_1', text: 'Tham gia ít nhất 05 ngày tình nguyện/năm' },
                    { id: 'tw_volunteer_2', text: 'Được khen thưởng tình nguyện cấp Huyện/Trường trở lên' }
                ]
            },
            integration: { name: 'Hội nhập tốt', icon: '🌍',
                required: [
                    { id: 'tw_integration_1', text: 'Hoàn thành 1 khóa kỹ năng hoặc được khen thưởng' },
                    { id: 'tw_integration_2', text: 'Tham gia ít nhất 01 hoạt động hội nhập' },
                    { id: 'tw_integration_3', text: 'Chứng chỉ tiếng Anh B1 hoặc tương đương' }
                ],
                optionalGroups: [
                    {
                        description: 'Đạt thêm 1 trong 2 tiêu chuẩn sau:',
                        options: [
                            { id: 'tw_integration_4', text: 'Tham gia ít nhất 1 hoạt động giao lưu quốc tế' },
                            { id: 'tw_integration_5', text: 'Đạt giải Ba hội nhập/NN cấp Trường trở lên' }
                        ]
                    }
                ]
            }
        }
    }
};

// ============================================================
// 1. MAIN ENTRY - HÀM KHỞI TẠO
// ============================================================
export const initStudyModule = (data, user) => {
    globalData = data;
    currentUser = user;

    // Khởi tạo dữ liệu mặc định nếu chưa có
    if (!globalData.studentJourney) globalData.studentJourney = {};
    if (!globalData.documents) globalData.documents = [];
    if (!globalData.achievements) globalData.achievements = [];
    if (!globalData.drafts) globalData.drafts = [];
    if (!globalData.outlines) globalData.outlines = [];

    // 1. Setup Pomodoro (Trong try-catch)
    try {
        const btnStart = document.getElementById('pomodoro-start-btn');
        const btnPause = document.getElementById('pomodoro-pause-btn');
        const btnReset = document.getElementById('pomodoro-reset-btn');
        if (btnStart) btnStart.addEventListener('click', startTimer);
        if (btnPause) btnPause.addEventListener('click', pauseTimer);
        if (btnReset) btnReset.addEventListener('click', resetTimer);
    } catch (e) { console.error("Lỗi Pomodoro:", e); }

    // 2. Setup SV5T
    try {
        renderSV5TBoard();
        const proofInput = document.getElementById('proof-upload-input');
        if (proofInput) {
            // Clone để xóa sự kiện cũ
            const newProofInput = proofInput.cloneNode(true);
            proofInput.parentNode.replaceChild(newProofInput, proofInput);
        }
    } catch (e) { console.error("Lỗi SV5T:", e); }

    // 3. Setup Library (Thư viện)
    try {
        renderLibrary();
        setupLibraryEvents();
    } catch (e) { console.error("Lỗi Library:", e); }

    // 4. Setup Achievements (Thành tích) - CÓ FIX NÚT BẤM
    try {
        renderAchievements();
        setupAchievementEvents();
    } catch (e) { console.error("Lỗi Achievements:", e); }

    // 5. Setup Drafts (Nháp/Quill)
    try {
        setTimeout(() => {
            initQuillEditor();
            renderDraftsList();
        }, 500);
        const btnCreateDraft = document.getElementById('btn-create-draft');
        if (btnCreateDraft) btnCreateDraft.addEventListener('click', createNewDraft);
        const draftTitleInput = document.getElementById('draft-title-input');
        if (draftTitleInput) draftTitleInput.addEventListener('input', autoSaveDraft);
    } catch (e) { console.error("Lỗi Drafts:", e); }

    // 6. Setup Outlines (Dàn ý)
    try {
        renderOutlineList();
        const btnCreateOutline = document.getElementById('btn-create-outline');
        if (btnCreateOutline) btnCreateOutline.addEventListener('click', () => {
            document.getElementById('outline-id').value = '';
            document.getElementById('outline-title').value = '';
            openModal('outline-modal');
        });
        const btnSaveOutline = document.getElementById('btn-save-outline');
        if (btnSaveOutline) btnSaveOutline.addEventListener('click', handleSaveOutline);
        const btnAddRootNode = document.getElementById('btn-add-root-node');
        if (btnAddRootNode) btnAddRootNode.addEventListener('click', handleAddRootNode);
    } catch (e) { console.error("Lỗi Outlines:", e); }
};

// ============================================================
// 2. POMODORO MODULE
// ============================================================
const startTimer = () => {
    if (isRunning) return;
    const durationInput = document.getElementById('focus-duration');
    const duration = durationInput ? (parseInt(durationInput.value) || 25) : 25;
    
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
            showNotification('🎉 Hoàn thành phiên tập trung!', 'success');
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
    const durationInput = document.getElementById('focus-duration');
    const duration = durationInput ? (parseInt(durationInput.value) || 25) : 25;
    
    updateTimerDisplay(duration * 60);
    document.getElementById('pomodoro-start-btn').style.display = 'inline-block';
    document.getElementById('pomodoro-pause-btn').style.display = 'none';
};

const updateTimerDisplay = (seconds = timeLeft) => {
    const timerEl = document.getElementById('pomodoro-timer');
    if (!timerEl) return;
    
    if (seconds === null || seconds === undefined) {
        const duration = parseInt(document.getElementById('focus-duration').value) || 25;
        seconds = duration * 60;
    }
    
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    timerEl.textContent = `${m}:${s}`;
};

// ============================================================
// 3. SV5T MODULE (SINH VIÊN 5 TỐT)
// ============================================================
const renderSV5TBoard = () => {
    const container = document.getElementById('sv5t-board-container');
    if (!container) return;
    container.innerHTML = '';
    const board = document.createElement('div');
    board.className = 'sv5t-board';

    let isPreviousLevelUnlocked = true;

    SV5T_LEVELS.forEach(levelKey => {
        const levelData = globalData.studentJourney[levelKey] || { status: 'Chưa đạt' };
        const isLocked = !isPreviousLevelUnlocked;
        
        const col = document.createElement('div');
        col.className = `sv5t-column ${isLocked ? 'locked' : ''}`;
        const lockIcon = isLocked ? '🔒 ' : '';
        
        col.innerHTML = `
            <div class="sv5t-column-header">
                ${lockIcon}${SV5T_NAMES[levelKey]} 
                <span style="font-size:0.8rem; margin-left:auto; color:${levelData.status === 'Đủ điều kiện' ? 'green' : '#666'}">
                    ${levelData.status || 'Chưa đạt'}
                </span>
            </div>
            <div class="sv5t-column-content"></div>
        `;

        const contentDiv = col.querySelector('.sv5t-column-content');
        
        ['ethics', 'study', 'physical', 'volunteer', 'integration'].forEach(type => {
            const criteriaInfo = sv5tCriteriaData[levelKey].criteria[type];
            if (!criteriaInfo) return;
            
            const key = `${levelKey}_${type}`;
            const isDone = globalData.studentJourney[key] === true;
            
            const card = document.createElement('div');
            card.className = `sv5t-card ${isDone ? 'achieved' : ''}`;
            card.innerHTML = `
                <div class="sv5t-card-header">
                    <span class="sv5t-card-icon">${criteriaInfo.icon}</span>
                    <span>${criteriaInfo.name}</span>
                </div>
                <div class="sv5t-card-progress-info">
                    <span>${isDone ? 'Đã hoàn thành' : 'Chưa hoàn thành'}</span>
                </div>
            `;
            
            if (isLocked) {
                card.style.cursor = "not-allowed";
                card.onclick = () => showNotification("🔒 Hãy hoàn thành cấp độ thấp hơn trước!", "warning");
            } else {
                card.onclick = () => window.openSV5TPanel(levelKey, type, criteriaInfo);
            }
            contentDiv.appendChild(card);
        });

        board.appendChild(col);

        // Check level completion status
        let isCurrentLevelDone = true;
        ['ethics', 'study', 'physical', 'volunteer', 'integration'].forEach(t => {
            if (globalData.studentJourney[`${levelKey}_${t}`] !== true) isCurrentLevelDone = false;
        });

        if(isCurrentLevelDone) {
            if (!globalData.studentJourney[levelKey]) globalData.studentJourney[levelKey] = {};
            globalData.studentJourney[levelKey].status = 'Đủ điều kiện';
        } else {
             if (globalData.studentJourney[levelKey]) globalData.studentJourney[levelKey].status = 'Chưa đạt';
        }
        
        isPreviousLevelUnlocked = isCurrentLevelDone;
    });
    container.appendChild(board);
};

window.openSV5TPanel = (level, type, criteriaInfo) => {
    const panel = document.getElementById('sv5t-side-panel');
    const overlay = document.getElementById('sv5t-panel-overlay');
    const title = document.getElementById('sv5t-panel-title');
    const body = document.getElementById('condition-list-container');
    
    if (!panel || !overlay) return;

    title.textContent = `${criteriaInfo.name} (${SV5T_NAMES[level]})`;
    panel.classList.add('open');
    overlay.classList.add('active');
    
    const key = `${level}_${type}`;
    const isDone = globalData.studentJourney[key] === true;

    // Render mô tả từ cấu trúc dữ liệu phức tạp
    let descriptionHTML = '<div style="display:flex; flex-direction:column; gap:10px;">';
    
    // 1. Hiển thị Required (Bắt buộc)
    if (criteriaInfo.required && criteriaInfo.required.length > 0) {
        descriptionHTML += `<div><strong style="color:#d32f2f;">🔴 Tiêu chuẩn bắt buộc:</strong><ul style="margin:5px 0 0 20px; padding:0;">`;
        criteriaInfo.required.forEach(req => {
            descriptionHTML += `<li style="margin-bottom:5px;">${req.text}</li>`;
        });
        descriptionHTML += `</ul></div>`;
    }

    // 2. Hiển thị Optional Groups (Tự chọn)
    if (criteriaInfo.optionalGroups && criteriaInfo.optionalGroups.length > 0) {
        criteriaInfo.optionalGroups.forEach(group => {
            descriptionHTML += `<div><strong style="color:#0288d1;">🔵 ${group.description || 'Tiêu chuẩn tự chọn:'}</strong><ul style="margin:5px 0 0 20px; padding:0;">`;
            group.options.forEach(opt => {
                descriptionHTML += `<li style="margin-bottom:5px;">${opt.text}</li>`;
            });
            descriptionHTML += `</ul></div>`;
        });
    }
    descriptionHTML += '</div>';
    
    body.innerHTML = `
        <div style="background:#e3f2fd; padding:15px; border-radius:8px; margin-bottom:20px; border:1px solid #90caf9; color:#333; max-height:300px; overflow-y:auto;">
            ${descriptionHTML}
        </div>
        <div class="condition-item ${isDone ? 'completed' : ''}">
            <div class="condition-main" style="display:flex; align-items:center; gap:10px;">
                <input type="checkbox" id="chk-${key}" ${isDone ? 'checked' : ''} style="width:20px; height:20px;">
                <label for="chk-${key}" class="condition-name" style="font-weight:bold; cursor:pointer;">Xác nhận đã đạt tiêu chí này</label>
            </div>
        </div>
        <div style="margin-top: 20px; border-top:1px dashed #ccc; padding-top:15px;">
            <h4>Minh chứng:</h4>
            <ul id="proof-list-${key}" class="proof-list"></ul>
            <button class="btn-submit" id="btn-upload-${key}" style="margin-top:10px; width:100%;">📁 Tải minh chứng</button>
        </div>
    `;

    document.getElementById(`chk-${key}`).addEventListener('change', async (e) => {
        globalData.studentJourney[key] = e.target.checked;
        await saveUserData(currentUser.uid, { studentJourney: globalData.studentJourney });
        renderSV5TBoard();
        e.target.closest('.condition-item').classList.toggle('completed', e.target.checked);
        if(e.target.checked) showNotification("Đã hoàn thành tiêu chí!", "success");
    });

    renderProofs(key);

    document.getElementById(`btn-upload-${key}`).addEventListener('click', () => {
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
        list.innerHTML = '<li style="color:#666; font-style:italic;">Chưa có minh chứng.</li>'; 
        return; 
    }
    
    proofs.forEach(p => {
        const li = document.createElement('li');
        li.className = 'proof-item';
        li.innerHTML = `
            <div class="proof-info">
                <a href="${p.link}" target="_blank">${escapeHTML(p.title)}</a>
            </div>
            <button style="color:red; border:none; background:none; cursor:pointer;" onclick="window.deleteProof('${p.id}', '${criteriaKey}')">🗑️</button>
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

window.deleteProof = async (id, key) => {
    if (!confirm("Xóa minh chứng này?")) return;
    
    const index = globalData.documents.findIndex(d => d.id === id);
    if (index > -1) {
        const proof = globalData.documents[index];
        if (proof.fullPath) await deleteFileFromStorage(proof.fullPath);
        
        globalData.documents.splice(index, 1);
        await saveUserData(currentUser.uid, { documents: globalData.documents });
        renderProofs(key);
        showNotification('Đã xóa minh chứng');
    }
};

// ============================================================
// 4. LIBRARY MODULE (THƯ VIỆN SỐ)
// ============================================================
const renderLibrary = () => {
    const grid = document.getElementById('library-grid');
    if(!grid) return;
    grid.innerHTML = '';

    const docs = (globalData.documents || []).filter(d => d.type !== 'proof');

    if (docs.length === 0) {
        const empty = document.getElementById('library-empty');
        if(empty) empty.style.display = 'block';
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

const setupLibraryEvents = () => {
    const btnAdd = document.getElementById('btn-add-document');
    if(btnAdd) {
        // Clone nút để xóa sự kiện cũ
        const newBtn = btnAdd.cloneNode(true);
        btnAdd.parentNode.replaceChild(newBtn, btnAdd);
        
        newBtn.addEventListener('click', () => {
            document.getElementById('doc-id').value = ''; 
            document.getElementById('doc-title').value = '';
            document.getElementById('doc-source').value = '';
            document.getElementById('doc-tags').value = '';
            document.getElementById('doc-notes').value = '';
            document.getElementById('document-file-name').textContent = '';
            
            const btnDel = document.getElementById('btn-delete-doc'); 
            if(btnDel) btnDel.style.display = 'none';
            openModal('document-modal');
        });
    }
    
    const btnSave = document.getElementById('btn-save-doc');
    if(btnSave) {
        const newBtnSave = btnSave.cloneNode(true);
        btnSave.parentNode.replaceChild(newBtnSave, btnSave);
        newBtnSave.addEventListener('click', handleSaveDocument);
    }

    document.getElementById('btn-delete-doc')?.addEventListener('click', handleDeleteDocumentInModal);
};

const openEditDocument = (doc) => {
    document.getElementById('doc-id').value = doc.id;
    document.getElementById('doc-title').value = doc.title;
    document.getElementById('doc-source').value = doc.link || '';
    document.getElementById('doc-tags').value = doc.tags || '';
    document.getElementById('doc-notes').value = doc.notes || '';
    document.getElementById('document-file-name').textContent = doc.fullPath ? 'Đã có file' : '';
    
    const btnDel = document.getElementById('btn-delete-doc');
    if(btnDel) btnDel.style.display = 'inline-block';
    
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
    if (!confirm("Xóa tài liệu này?")) return;
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
// 5. ACHIEVEMENTS MODULE (THÀNH TÍCH)
// ============================================================
const setupAchievementEvents = () => {
    const btnAdd = document.getElementById('btn-add-achievement');
    if(btnAdd) {
        // Dùng cloneNode để xóa sạch sự kiện cũ, tránh lỗi bấm 1 lần mở 2 modal
        const newBtn = btnAdd.cloneNode(true);
        btnAdd.parentNode.replaceChild(newBtn, btnAdd);
        
        newBtn.addEventListener('click', () => {
            document.getElementById('achievement-id').value = ''; 
            document.getElementById('achievement-title').value = '';
            document.getElementById('achievement-date').value = '';
            document.getElementById('achievement-description').value = '';
            document.getElementById('achievement-category').value = 'other';
            document.getElementById('achievement-drive-link').value = '';
            document.getElementById('achievement-featured').checked = false;
            
            const btnDel = document.getElementById('btn-delete-achievement'); 
            if(btnDel) btnDel.style.display = 'none';
            openModal('achievement-modal');
        });
    }
    
    const btnSave = document.getElementById('btn-save-achievement');
    if(btnSave) {
        const newBtnSave = btnSave.cloneNode(true);
        btnSave.parentNode.replaceChild(newBtnSave, btnSave);
        newBtnSave.addEventListener('click', handleSaveAchievement);
    }

    document.getElementById('btn-delete-achievement')?.addEventListener('click', handleDeleteAchievementInModal);
};

const renderAchievements = () => {
    const container = document.getElementById('achievements-grid');
    if (!container) return;
    container.innerHTML = '';

    const achievements = globalData.achievements || [];
    
    if (achievements.length === 0) {
        // Có thể hiện empty state nếu muốn
        return;
    }

    achievements.forEach(ach => {
        const div = document.createElement('div');
        div.className = 'achievement-card';
        div.onclick = () => openEditAchievement(ach);

        div.innerHTML = `
             <div class="achievement-preview">
                ${ach.imageUrl ? `<img src="${ach.imageUrl}">` : '🏆'}
            </div>
            <div class="achievement-info">
                <h3>${escapeHTML(ach.name || ach.title)}</h3>
                <p>${formatDate(ach.date)}</p>
            </div>
        `;
        container.appendChild(div);
    });
};

const openEditAchievement = (ach) => {
    document.getElementById('achievement-id').value = ach.id;
    document.getElementById('achievement-title').value = ach.name || ach.title;
    document.getElementById('achievement-date').value = ach.date;
    document.getElementById('achievement-description').value = ach.description || '';
    
    // Load loại & link
    document.getElementById('achievement-category').value = ach.category || 'other';
    document.getElementById('achievement-drive-link').value = ach.imageUrl || '';
    // Load checkbox
    document.getElementById('achievement-featured').checked = ach.isFeatured || false;
    
    const btnDel = document.getElementById('btn-delete-achievement');
    if(btnDel) btnDel.style.display = 'inline-block';
    
    openModal('achievement-modal');
};

const handleSaveAchievement = async () => {
    const id = document.getElementById('achievement-id').value;
    const title = document.getElementById('achievement-title').value;
    const date = document.getElementById('achievement-date').value;
    const desc = document.getElementById('achievement-description').value;
    const category = document.getElementById('achievement-category').value;
    const rawLink = document.getElementById('achievement-drive-link').value;
    const isFeatured = document.getElementById('achievement-featured').checked;

    if (!title) return showNotification('Vui lòng nhập tên thành tích!', 'error');

    // Xử lý link ảnh (nếu có hàm convertDriveLink thì dùng, ko thì để nguyên)
    // import { convertDriveLink } from './common.js' đã có ở trên
    // Nếu trong common.js chưa export hàm này thì dùng rawLink
    let finalImgUrl = rawLink; 
    // Giả sử common.js có hàm convertDriveLink như trong file common.js mẫu
    // finalImgUrl = convertDriveLink(rawLink); 

    const newAch = {
        id: id || generateID('ach'),
        name: title, // Lưu thống nhất là name
        title: title, // Backup trường hợp code cũ dùng title
        date: date,
        description: desc,
        category: category,
        imageUrl: finalImgUrl,
        isFeatured: isFeatured
    };

    if (id) {
        const index = globalData.achievements.findIndex(a => a.id === id);
        if (index > -1) globalData.achievements[index] = newAch;
    } else {
        globalData.achievements.push(newAch);
    }

    await saveUserData(currentUser.uid, { achievements: globalData.achievements });
    renderAchievements();
    closeModal('achievement-modal');
    showNotification('Đã lưu thành tích!', 'success');
};

const handleDeleteAchievementInModal = async () => {
    const id = document.getElementById('achievement-id').value;
    if (!id) return;
    
    if (!confirm("Bạn chắc chắn muốn xóa thành tích này?")) return;

    const index = globalData.achievements.findIndex(a => a.id === id);
    if (index > -1) {
        const ach = globalData.achievements[index];
        // Nếu có xóa file storage thì thêm logic ở đây
        
        globalData.achievements.splice(index, 1);
        await saveUserData(currentUser.uid, { achievements: globalData.achievements });
        renderAchievements();
        closeModal('achievement-modal');
        showNotification('Đã xóa thành tích', 'success');
    }
};

// ============================================================
// 6. DRAFTS & QUILL MODULE (NHÁP & EDITOR)
// ============================================================
const initQuillEditor = () => {
    if (document.getElementById('editor-container') && !quillEditor) {
        if (typeof Quill !== 'undefined') {
            quillEditor = new Quill('#editor-container', {
                theme: 'snow',
                placeholder: 'Viết ý tưởng của bạn tại đây...',
                modules: {
                    toolbar: [
                        [{ 'header': [1, 2, false] }],
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['clean']
                    ]
                }
            });
            
            quillEditor.on('text-change', () => {
                autoSaveDraft();
            });
        }
    }
};

const renderDraftsList = () => {
    const list = document.getElementById('drafts-list-column');
    if (!list) return;
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
    if (!confirm("Xóa bản nháp này?")) return;
    globalData.drafts = globalData.drafts.filter(d => d.id !== id);

    if (currentDraftId === id) {
        currentDraftId = null;
        document.getElementById('drafts-editor-welcome').style.display = 'flex';
        document.getElementById('drafts-editor-content').style.display = 'none';
    }

    await saveUserData(currentUser.uid, { drafts: globalData.drafts });
    renderDraftsList();
};

const autoSaveDraft = () => {
    if (!currentDraftId) return;
    document.getElementById('draft-status').textContent = 'Đang lưu...';
    
    clearTimeout(saveDraftTimeout);
    saveDraftTimeout = setTimeout(async () => {
        const draft = globalData.drafts.find(d => d.id === currentDraftId);
        if (draft) {
            const titleInput = document.getElementById('draft-title-input');
            draft.title = titleInput ? titleInput.value : 'Không tiêu đề';
            
            if (quillEditor) {
                draft.content = JSON.stringify(quillEditor.getContents());
            }
            
            draft.lastModified = new Date().toISOString();
            
            await saveUserData(currentUser.uid, { drafts: globalData.drafts });
            document.getElementById('draft-status').textContent = 'Đã lưu';
            renderDraftsList();
        }
    }, 1000);
};

// ============================================================
// 7. OUTLINE MODULE (DÀN Ý)
// ============================================================
const renderOutlineList = () => {
    const container = document.getElementById('outline-list-container');
    if(!container) return;
    container.innerHTML = '';
    
    if (globalData.outlines.length === 0) { 
        container.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px;">Chưa có dàn ý.</p>'; 
        return; 
    }
    
    globalData.outlines.forEach(outline => {
        const div = document.createElement('div');
        div.className = `outline-list-item ${outline.id === currentOutlineId ? 'active' : ''}`;
        div.innerHTML = `
            <span>📑 ${escapeHTML(outline.title)}</span>
            <button class="delete-outline-btn" style="float:right; border:none; background:none; color:red;">&times;</button>
        `;
        div.onclick = () => loadOutline(outline);
        div.querySelector('.delete-outline-btn').onclick = (e) => { 
            e.stopPropagation(); 
            deleteOutline(outline.id); 
        };
        container.appendChild(div);
    });
};

const handleSaveOutline = async () => {
    const title = document.getElementById('outline-title').value.trim();
    if (!title) return showNotification("Nhập tên dàn ý!", "error");
    
    const newOutline = { 
        id: generateID('outline'), 
        title: title, 
        nodes: [], 
        lastModified: new Date().toISOString() 
    };
    
    globalData.outlines.push(newOutline);
    await saveUserData(currentUser.uid, { outlines: globalData.outlines });
    
    closeModal('outline-modal'); 
    renderOutlineList(); 
    loadOutline(newOutline);
};

const deleteOutline = async (id) => {
    if(!confirm("Xóa dàn ý này?")) return;
    
    globalData.outlines = globalData.outlines.filter(o => o.id !== id);
    
    if (currentOutlineId === id) { 
        currentOutlineId = null; 
        document.getElementById('outline-editor-welcome').style.display = 'flex'; 
        document.getElementById('outline-editor-content').style.display = 'none'; 
    }
    
    await saveUserData(currentUser.uid, { outlines: globalData.outlines });
    renderOutlineList();
};

const loadOutline = (outline) => {
    currentOutlineId = outline.id;
    const welcome = document.getElementById('outline-editor-welcome');
    const content = document.getElementById('outline-editor-content');
    
    if(welcome) welcome.style.display = 'none';
    if(content) content.style.display = 'block';
    
    document.getElementById('editor-outline-title').textContent = outline.title;
    renderOutlineTree(); 
    renderOutlineList(); 
};

const renderOutlineTree = () => {
    const container = document.getElementById('outline-tree-container');
    const outline = globalData.outlines.find(o => o.id === currentOutlineId);
    if (!container || !outline) return;
    
    container.innerHTML = '';
    
    outline.nodes.forEach((node, index) => {
        const li = document.createElement('div');
        li.className = 'outline-node';
        li.innerHTML = `
            <div class="outline-node-content" style="display:flex; gap:10px; align-items:center; padding:10px; background:#f8f9fa; border-radius:8px; margin-bottom:5px;">
                <strong style="color:#005B96;">${index + 1}.</strong>
                <input type="text" class="node-input" value="${escapeHTML(node.text)}" style="flex:1; border:none; background:transparent;">
                <button class="btn-del-node" style="color:red; border:none; background:none;">🗑️</button>
            </div>
        `;
        
        const input = li.querySelector('.node-input');
        input.addEventListener('change', async () => { 
            node.text = input.value; 
            await saveUserData(currentUser.uid, { outlines: globalData.outlines }); 
        });
        
        li.querySelector('.btn-del-node').onclick = async () => { 
            if(confirm("Xóa mục?")) { 
                outline.nodes.splice(index, 1); 
                await saveUserData(currentUser.uid, { outlines: globalData.outlines }); 
                renderOutlineTree(); 
            }
        };
        
        container.appendChild(li);
    });
};

const handleAddRootNode = async () => {
    if (!currentOutlineId) return;
    
    const outline = globalData.outlines.find(o => o.id === currentOutlineId);
    if (outline) {
        outline.nodes.push({ 
            id: generateID('node'), 
            text: 'Mục mới', 
            children: [] 
        });
        await saveUserData(currentUser.uid, { outlines: globalData.outlines });
        renderOutlineTree();
    }
};
