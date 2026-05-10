// =============================================
// PHẦN 0: DARK MODE
// =============================================
function initDarkMode() {
    const saved = localStorage.getItem('uelDarkMode');
    if (saved === 'true') document.documentElement.setAttribute('data-theme', 'dark');
}
function toggleDarkMode() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? '' : 'dark');
    localStorage.setItem('uelDarkMode', !isDark);
}
initDarkMode();

// =============================================
// PHẦN 1: AUTO CAPITALIZE PHÁP LUẬT
// =============================================
const LEGAL_TERMS = [
    [/\bbộ luật dân sự\b/gi, 'Bộ luật Dân sự'],
    [/\bbộ luật hình sự\b/gi, 'Bộ luật Hình sự'],
    [/\bbộ luật tố tụng dân sự\b/gi, 'Bộ luật Tố tụng dân sự'],
    [/\bbộ luật tố tụng hình sự\b/gi, 'Bộ luật Tố tụng hình sự'],
    [/\bbộ luật lao động\b/gi, 'Bộ luật Lao động'],
    [/\bluật doanh nghiệp\b/gi, 'Luật Doanh nghiệp'],
    [/\bluật thương mại\b/gi, 'Luật Thương mại'],
    [/\bluật đất đai\b/gi, 'Luật Đất đai'],
    [/\bluật hôn nhân và gia đình\b/gi, 'Luật Hôn nhân và gia đình'],
    [/\bluật sở hữu trí tuệ\b/gi, 'Luật Sở hữu trí tuệ'],
    [/\bluật đầu tư\b/gi, 'Luật Đầu tư'],
    [/\bluật xây dựng\b/gi, 'Luật Xây dựng'],
    [/\bluật nhà ở\b/gi, 'Luật Nhà ở'],
    [/\bluật kinh doanh bất động sản\b/gi, 'Luật Kinh doanh bất động sản'],
    [/\bluật cạnh tranh\b/gi, 'Luật Cạnh tranh'],
    [/\bluật bảo vệ môi trường\b/gi, 'Luật Bảo vệ môi trường'],
    [/\bluật giáo dục\b/gi, 'Luật Giáo dục'],
    [/\bluật trọng tài thương mại\b/gi, 'Luật Trọng tài thương mại'],
    [/\bhiến pháp\b/gi, 'Hiến pháp'],
    [/\bnghị định\b/gi, 'Nghị định'],
    [/\bthông tư\b/gi, 'Thông tư'],
    [/\bnghị quyết\b/gi, 'Nghị quyết'],
];

function autoCapitalizeLegal(text) {
    let result = text;
    LEGAL_TERMS.forEach(([regex, replacement]) => {
        result = result.replace(regex, replacement);
    });
    return result;
}

// Attach auto-capitalize to lawName input
document.addEventListener('DOMContentLoaded', () => {
    const lawNameInput = document.getElementById('lawName');
    if (lawNameInput) {
        lawNameInput.addEventListener('blur', function () {
            this.value = autoCapitalizeLegal(this.value);
        });
    }
});

// =============================================
// PHẦN 2: TOGGLE FIELDS
// =============================================
function toggleFields() {
    const type = document.getElementById('docType').value;
    const allDynamic = document.querySelectorAll('.dynamic-field, .type-academic, .type-year');
    allDynamic.forEach(el => el.style.display = 'none');

    document.querySelectorAll('.type-' + type).forEach(el => el.style.display = 'block');

    // Ẩn/hiện tldd section
    const tlddSection = document.getElementById('tlddSection');
    if (tlddSection) tlddSection.style.display = (type === '8') ? 'none' : 'block';

    if (type === '8') {
        document.querySelectorAll('.type-academic').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.type-year').forEach(el => el.style.display = 'none');
    } else {
        document.querySelectorAll('.type-academic').forEach(el => el.style.display = 'block');
        if (type === '5' || type === '7') {
            document.querySelectorAll('.type-year').forEach(el => el.style.display = 'none');
        } else {
            document.querySelectorAll('.type-year').forEach(el => el.style.display = 'block');
        }
    }

    // Toggle tldd fields
    toggleTldd();
    livePreview();
}

function toggleTldd() {
    const cb = document.getElementById('isTldd');
    const tlddFields = document.getElementById('tlddFields');
    const mainAcademicFields = document.getElementById('mainAcademicFields');
    if (!cb || !tlddFields) return;
    if (cb.checked) {
        tlddFields.style.display = 'block';
        if (mainAcademicFields) mainAcademicFields.style.opacity = '0.3';
    } else {
        tlddFields.style.display = 'none';
        if (mainAcademicFields) mainAcademicFields.style.opacity = '1';
    }
}

function clearForm() {
    document.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => input.value = '');
    const cb = document.getElementById('isTldd');
    if (cb) cb.checked = false;
    toggleTldd();
    document.getElementById('outInText').innerHTML = '<span style="color:var(--text-muted)">Kết quả sẽ hiện ở đây...</span>';
    document.getElementById('outRefList').innerHTML = '<span style="color:var(--text-muted)">Kết quả sẽ hiện ở đây...</span>';
}

// =============================================
// PHẦN 3: XỬ LÝ TÁC GIẢ
// =============================================
function buildAuthorsRef(authorString) {
    if (!authorString) return "";
    let authors = authorString.split(',').map(a => a.trim()).filter(a => a);
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
    return `${authors.slice(0, -1).join(", ")}, & ${authors[authors.length - 1]}`;
}

function buildAuthorsInText(authorString) {
    if (!authorString) return "Không rõ tác giả";
    let authors = authorString.split(',').map(a => a.trim()).filter(a => a);
    let formatted = authors.map(a => { let p = a.split(/\s+/); return p[p.length - 1]; });
    if (formatted.length === 1) return formatted[0];
    if (formatted.length === 2) return `${formatted[0]} & ${formatted[1]}`;
    return `${formatted[0]} và cộng sự`;
}

// =============================================
// PHẦN 4: LIVE PREVIEW
// =============================================
function livePreview() {
    const type = document.getElementById('docType').value;
    let inText = '', ref = '';

    try {
        if (type === '8') {
            const r = buildLawCitation();
            inText = r.inText;
            ref = r.ref;
        } else {
            const cb = document.getElementById('isTldd');
            if (cb && cb.checked) {
                const r = buildTlddCitation();
                inText = r.inText;
                ref = r.ref;
            } else {
                const r = buildAcademicCitation(type);
                inText = r.inText;
                ref = r.ref;
            }
        }
    } catch (e) { /* ignore partial input errors */ }

    const placeholder = '<span style="color:var(--text-muted)">Kết quả sẽ hiện ở đây...</span>';
    document.getElementById('outInText').innerHTML = (inText && inText !== '(Không rõ tác giả, )') ? inText : placeholder;
    document.getElementById('outRefList').innerHTML = (ref && ref !== '.') ? ref : placeholder;
}

// =============================================
// PHẦN 5: BUILD CITATIONS
// =============================================
function buildLawCitation() {
    const lName = document.getElementById('lawName').value.trim();
    const lNum = document.getElementById('lawNumber').value.trim();
    const lLoc = document.getElementById('lawLocation').value.trim();
    const lPages = document.getElementById('pages').value.trim();
    const vietStyle = document.getElementById('lawStyleViet') && document.getElementById('lawStyleViet').checked;

    let baseLaw = lNum ? lNum : lName;
    if (lNum && lName && lNum.toLowerCase().indexOf("nghị định") !== -1) {
        baseLaw = `${lNum} ${lName.replace(/^Về /i, "về ")}`;
    }

    let refArr = [];
    if (baseLaw) refArr.push(baseLaw);
    if (lLoc) {
        if (vietStyle) {
            // Convert 107.1(b) -> Điểm b Khoản 1 Điều 107
            let locText = convertToVietnameseStyle(lLoc);
            refArr.push(locText);
        } else {
            let locText = lLoc.toLowerCase().includes("điều") ? lLoc : `Điều ${lLoc}`;
            refArr.push(locText);
        }
    }
    if (lPages) refArr.push(`tr. ${lPages.replace('tr. ', '')}`);

    let refStr = refArr.join(', ') + '.';
    return { inText: refStr, ref: refStr };
}

function convertToVietnameseStyle(loc) {
    // Parse patterns like 107.1(b) or 4.1(a) or just 107
    loc = loc.trim();
    // Already Vietnamese style?
    if (/điều|khoản|điểm/i.test(loc)) return loc;

    const match = loc.match(/^(\d+)(?:\.(\d+))?(?:\(([a-zA-Zđ]+)\))?$/);
    if (!match) return `Điều ${loc}`;

    const [, dieu, khoan, diem] = match;
    let parts = [];
    if (diem) parts.push(`Điểm ${diem}`);
    if (khoan) parts.push(`Khoản ${khoan}`);
    parts.push(`Điều ${dieu}`);
    return parts.join(' ');
}

function buildTlddCitation() {
    const authorsRaw = document.getElementById('authors').value.trim();
    const fnNum = document.getElementById('tlddFootnoteNum').value.trim();
    const pageNum = document.getElementById('tlddPage').value.trim();

    const authorInText = buildAuthorsInText(authorsRaw);
    let inText = `${authorInText}, tlđd (${fnNum || '?'})`;
    if (pageNum) inText += `, tr. ${pageNum}`;
    inText += '.';

    return { inText: inText, ref: inText };
}

function buildAcademicCitation(type) {
    const authorsRaw = document.getElementById('authors').value;
    const year = document.getElementById('year') ? document.getElementById('year').value.trim() : "";
    const date = document.getElementById('date').value.trim();
    const title = document.getElementById('title').value.trim();
    const pubLoc = document.getElementById('publisherLoc').value.trim();
    const publisher = document.getElementById('publisher').value.trim();
    const pages = document.getElementById('pages').value.trim();

    let displayYear = (type === '5' || type === '7') ? date : year;
    let displayYearInText = (type === '5' || type === '7') ? (date.split('/').length === 3 ? date.split('/')[2] : date) : year;

    const authorRef = buildAuthorsRef(authorsRaw);
    const authorInText = buildAuthorsInText(authorsRaw);

    let inTextStr = `(${authorInText}, ${displayYearInText})`;
    if (!authorsRaw) {
        let shortTitle = title.split(' ').slice(0, 4).join(' ');
        inTextStr = `(<i>${shortTitle}...</i>, ${displayYearInText})`;
    }

    let refStr = '';
    switch (type) {
        case '1':
            refStr = pubLoc
                ? `${authorRef} (${year}). <i>${title}</i>. ${pubLoc}: ${publisher}.`
                : `${authorRef} (${year}). <i>${title}</i>. ${publisher}.`;
            break;
        case '2':
            const eds = document.getElementById('bookEditors').value.trim();
            const bTitle = document.getElementById('bookTitle').value.trim();
            let ps2 = pages ? ` (tr. ${pages})` : "";
            refStr = `${authorRef} (${year}). ${title}. Trong ${eds ? `${eds} (Chủ biên), ` : ""}<i>${bTitle}</i>${ps2}. ${publisher}.`;
            break;
        case '3':
            const jName = document.getElementById('journalName').value.trim();
            const vol = document.getElementById('volume').value.trim();
            const iss = document.getElementById('issue').value.trim();
            const doi = document.getElementById('doi').value.trim();
            let vis = (vol && iss) ? `<i>${vol}</i>(${iss})` : (vol ? `<i>${vol}</i>` : (iss ? `(${iss})` : ""));
            let ps3 = pages ? `, ${pages}` : "";
            refStr = `${authorRef} (${year}). ${title}. <i>${jName}</i>, ${vis}${ps3}.${doi ? ` ${doi}` : ""}`;
            break;
        case '4':
            const procName = document.getElementById('proceedingName').value.trim();
            refStr = `${authorRef} (${year}). ${title}. <i>${procName}</i> (tr. ${pages}). ${publisher}.`;
            break;
        case '5':
            const newsName = document.getElementById('journalName').value.trim();
            refStr = `${authorRef} (${date}). ${title}. <i>${newsName}</i>.`;
            break;
        case '6':
            const level = document.getElementById('thesisLevel').value.trim();
            const uni = document.getElementById('university').value.trim();
            refStr = `${authorRef} (${year}). <i>${title}</i> [${level}]. ${uni}.`;
            break;
        case '7':
            const url = document.getElementById('url').value.trim();
            let td = new Date();
            let tdStr = `${td.getDate()}/${td.getMonth() + 1}/${td.getFullYear()}`;
            refStr = authorsRaw
                ? `${authorRef} (${date}). <i>${title}</i>. Truy cập ngày ${tdStr}, từ ${url}`
                : `<i>${title}</i> (${date}). Truy cập ngày ${tdStr}, từ ${url}`;
            break;
    }

    refStr = refStr.replace(/ \. /g, " ").replace(/\.\./g, ".").replace(/ ,/g, ",").replace(/ \(\)/g, "").trim();
    return { inText: inTextStr, ref: refStr };
}

// =============================================
// PHẦN 6: GENERATE & SAVE
// =============================================
function generate() {
    const type = document.getElementById('docType').value;
    let result;

    if (type === '8') {
        result = buildLawCitation();
    } else {
        const cb = document.getElementById('isTldd');
        if (cb && cb.checked) {
            result = buildTlddCitation();
        } else {
            result = buildAcademicCitation(type);
        }
    }

    let { inText, ref } = result;

    document.getElementById('outInText').innerHTML = inText;
    document.getElementById('outRefList').innerHTML = ref;

    if (!inText || inText === '.' || ref === '.') {
        showToast("⚠️ Vui lòng nhập thông tin tài liệu!", true);
        return;
    }

    saveHistory(inText, ref);
    showToast("✅ Đã tạo trích dẫn thành công!");
}

// =============================================
// PHẦN 7: LOCAL STORAGE & HISTORY
// =============================================
function saveHistory(inText, ref) {
    let history = JSON.parse(localStorage.getItem('uelCitationHistory')) || [];
    history.unshift({ inText, ref, time: new Date().toLocaleString('vi-VN') });
    if (history.length > 100) history.pop();
    localStorage.setItem('uelCitationHistory', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    let history = JSON.parse(localStorage.getItem('uelCitationHistory')) || [];
    const container = document.getElementById('historyList');
    if (!container) return;

    if (history.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;font-size:13px;padding:20px 0;">Chưa có dữ liệu trích dẫn nào.</p>';
        return;
    }

    let html = '';
    history.forEach((item, i) => {
        html += `<div class="history-item">
            <span class="time">🕐 ${item.time}</span>
            <p><strong>Footnote:</strong> <span id="histIn_${i}">${item.inText}</span></p>
            <p><strong>TLTK:</strong> <span id="histRef_${i}">${item.ref}</span></p>
            <div class="history-actions">
                <button class="btn btn-secondary btn-sm" onclick="copyText('histIn_${i}')">Copy FN</button>
                <button class="btn btn-secondary btn-sm" onclick="copyText('histRef_${i}')">Copy TLTK</button>
                <button class="btn btn-danger btn-sm" onclick="deleteItem(${i})">Xóa</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

function deleteItem(index) {
    let history = JSON.parse(localStorage.getItem('uelCitationHistory')) || [];
    history.splice(index, 1);
    localStorage.setItem('uelCitationHistory', JSON.stringify(history));
    renderHistory();
}

function clearHistory() {
    if (confirm('Xóa TOÀN BỘ lịch sử? Hành động này không thể hoàn tác.')) {
        localStorage.removeItem('uelCitationHistory');
        renderHistory();
    }
}

// =============================================
// PHẦN 8: XUẤT DANH MỤC TLTK (A-Z)
// =============================================
function exportRefList() {
    let history = JSON.parse(localStorage.getItem('uelCitationHistory')) || [];
    if (history.length === 0) {
        showToast("⚠️ Chưa có trích dẫn nào trong lịch sử!", true);
        return;
    }

    // Remove duplicates
    let unique = [...new Map(history.map(h => [h.ref, h])).values()];

    // Separate Vietnamese vs Foreign
    const isVietnamese = (text) => /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(text);
    let vnRefs = unique.filter(h => isVietnamese(h.ref));
    let enRefs = unique.filter(h => !isVietnamese(h.ref));

    const stripHtml = (s) => s.replace(/<[^>]*>/g, '');
    const sortFn = (a, b) => stripHtml(a.ref).localeCompare(stripHtml(b.ref), 'vi');
    vnRefs.sort(sortFn);
    enRefs.sort(sortFn);

    let content = '';
    if (vnRefs.length > 0) {
        content += '<b>📚 TÀI LIỆU TIẾNG VIỆT</b><br><br>';
        vnRefs.forEach((h, i) => { content += `${i + 1}. ${h.ref}<br>`; });
    }
    if (enRefs.length > 0) {
        if (content) content += '<br>';
        content += '<b>📖 TÀI LIỆU TIẾNG NƯỚC NGOÀI</b><br><br>';
        enRefs.forEach((h, i) => { content += `${i + 1}. ${h.ref}<br>`; });
    }

    // Show in modal
    showModal('Danh mục Tài liệu tham khảo (A-Z)', `
        <div class="ref-export-box" id="refExportContent">${content}</div>
        <div class="btn-group" style="margin-top:16px">
            <button class="btn btn-primary" onclick="copyRefExport()">📋 Copy toàn bộ</button>
            <button class="btn btn-secondary" onclick="closeModal()">Đóng</button>
        </div>
    `);
}

function copyRefExport() {
    const el = document.getElementById('refExportContent');
    if (!el) return;
    const htmlBlob = new Blob([el.innerHTML], { type: 'text/html' });
    const textBlob = new Blob([el.innerText], { type: 'text/plain' });
    navigator.clipboard.write([new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })]).then(() => {
        showToast("✅ Đã copy toàn bộ danh mục TLTK!");
    }).catch(() => {
        fallbackCopy(el.innerText);
    });
}

// =============================================
// PHẦN 9: BACKUP / RESTORE JSON
// =============================================
function exportBackup() {
    let history = JSON.parse(localStorage.getItem('uelCitationHistory')) || [];
    if (history.length === 0) {
        showToast("⚠️ Không có dữ liệu để xuất!", true);
        return;
    }
    const data = JSON.stringify({ version: 2, exportDate: new Date().toISOString(), citations: history }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TLTK_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("✅ Đã tải file backup!");
}

function importBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                let citations = data.citations || data;
                if (!Array.isArray(citations)) throw new Error('Invalid format');

                let existing = JSON.parse(localStorage.getItem('uelCitationHistory')) || [];
                // Merge - avoid duplicates
                let merged = [...existing];
                citations.forEach(c => {
                    if (!merged.some(m => m.ref === c.ref && m.inText === c.inText)) {
                        merged.push(c);
                    }
                });
                localStorage.setItem('uelCitationHistory', JSON.stringify(merged));
                renderHistory();
                showToast(`✅ Đã nhập ${citations.length} trích dẫn!`);
            } catch (err) {
                showToast("❌ File không hợp lệ!", true);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// =============================================
// PHẦN 10: COPY & TOAST & MODAL
// =============================================
function copyText(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([el.innerHTML], { type: 'text/html' });
        const textBlob = new Blob([el.innerText], { type: 'text/plain' });
        navigator.clipboard.write([new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })]).then(() => {
            showToast("✅ Đã copy (giữ in nghiêng cho Word)!");
        }).catch(() => fallbackCopy(el.innerText));
    } else {
        fallbackCopy(el.innerText);
    }
}

function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast("✅ Đã copy!");
}

function showToast(msg, isError) {
    const t = document.createElement("div");
    t.className = "toast";
    if (isError) t.style.background = 'linear-gradient(135deg, #e53e3e, #c53030)';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = '0.4s'; }, 2200);
    setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 2700);
}

function showModal(title, contentHtml) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'activeModal';
    overlay.innerHTML = `<div class="modal-box"><h3>${title}</h3>${contentHtml}</div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
}

function closeModal() {
    const m = document.getElementById('activeModal');
    if (m) m.remove();
}

// =============================================
// PHẦN 11: ATTACH LIVE PREVIEW LISTENERS
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('input[type="text"], input[type="number"], select').forEach(el => {
        el.addEventListener('input', livePreview);
        el.addEventListener('change', livePreview);
    });
    toggleFields();
    renderHistory();
});
