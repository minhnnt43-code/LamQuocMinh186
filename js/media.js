import {
    generateID, showNotification, openModal, closeModal, formatDate
} from './common.js';
import {
    saveUserData, uploadFileToStorage, deleteFileFromStorage
} from './firebase.js';

let globalData = null;
let currentUser = null;

export const initMediaModule = (data, user) => {
    globalData = data;
    currentUser = user;

    if (!globalData.albums) globalData.albums = [];
    if (!globalData.timeline) globalData.timeline = [];

    renderAlbumsList();
    setupAlbumEvents();
};

const setupAlbumEvents = () => {
    const btnAdd = document.getElementById('btn-add-album');
    if (btnAdd) {
        // Clone to remove old listeners
        const newBtn = btnAdd.cloneNode(true);
        btnAdd.parentNode.replaceChild(newBtn, btnAdd);
        newBtn.addEventListener('click', () => {
            resetAlbumForm();
            openModal('album-modal');
        });
    }

    const btnSave = document.getElementById('btn-save-album');
    if (btnSave) {
        const newBtn = btnSave.cloneNode(true);
        btnSave.parentNode.replaceChild(newBtn, btnSave);
        newBtn.addEventListener('click', handleSaveAlbum);
    }

    // Photo upload handler
    const fileInput = document.getElementById('album-photos-input');
    if (fileInput) {
        fileInput.addEventListener('change', handlePhotoSelect);
    }
};

const resetAlbumForm = () => {
    document.getElementById('album-id').value = '';
    document.getElementById('album-title').value = '';
    document.getElementById('album-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('album-desc').value = '';
    document.getElementById('album-location').value = '';

    // Clear preview
    const previewContainer = document.getElementById('album-photos-preview');
    if (previewContainer) previewContainer.innerHTML = '';
    window.tempAlbumPhotos = [];
};

const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const previewContainer = document.getElementById('album-photos-preview');
    if (!window.tempAlbumPhotos) window.tempAlbumPhotos = [];

    // Simple preview (real upload happens on Save)
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'preview-thumb';
            previewContainer.appendChild(img);

            // Push file object to temp array for later upload
            window.tempAlbumPhotos.push({ file: file, url: e.target.result });
        };
        reader.readAsDataURL(file);
    });
};

const handleSaveAlbum = async () => {
    const btn = document.getElementById('btn-save-album');
    btn.textContent = 'Đang lưu...';
    btn.disabled = true;

    try {
        const id = document.getElementById('album-id').value;
        const title = document.getElementById('album-title').value;

        if (!title) throw new Error("Cần nhập tiêu đề album!");

        let photos = [];
        // Upload new photos
        if (window.tempAlbumPhotos && window.tempAlbumPhotos.length > 0) {
            for (const item of window.tempAlbumPhotos) {
                if (item.file) {
                    const path = `albums/${Date.now()}_${item.file.name}`;
                    const url = await uploadFileToStorage(item.file, path);
                    photos.push({ url, caption: '' });
                } else if (item.existing) {
                    photos.push(item);
                }
            }
        }

        // Merge with existing photos if editing
        if (id) {
            const existing = globalData.albums.find(a => a.id === id);
            if (existing && existing.photos) {
                // Logic to merge could be complex, for now simple append or replace?
                // For simplicity in this version, we replace with what's in temp (which should include existing if we loaded them properly)
                // But simplified: just take new ones + keep old ones is tricky without a proper UI to remove individual photos.
                // Reset to simplistic: just add new ones to existing list
                photos = [...(existing.photos || []), ...photos];
            }
        }

        const albumData = {
            id: id || generateID('album'),
            title,
            description: document.getElementById('album-desc').value,
            eventDate: document.getElementById('album-date').value,
            location: document.getElementById('album-location').value,
            photos: photos,
            cover: photos.length > 0 ? photos[0].url : ''
        };

        if (id) {
            const index = globalData.albums.findIndex(a => a.id === id);
            if (index > -1) globalData.albums[index] = albumData;
        } else {
            globalData.albums.push(albumData);
        }

        await saveUserData(currentUser.uid, { albums: globalData.albums });
        renderAlbumsList();
        closeModal('album-modal');
        showNotification('Đã lưu album!');

    } catch (e) {
        showNotification(e.message, 'error');
    } finally {
        btn.textContent = 'Lưu Album';
        btn.disabled = false;
    }
};

const renderAlbumsList = () => {
    const container = document.getElementById('albums-grid');
    if (!container) return;
    container.innerHTML = '';

    globalData.albums.forEach(a => {
        const div = document.createElement('div');
        div.className = 'album-card-admin';
        div.innerHTML = `
            <img src="${a.cover || 'https://placehold.co/100x100'}" class="album-thumb">
            <div class="album-info">
                <h4>${a.title}</h4>
                <p>${formatDate(a.eventDate)} • ${a.photos?.length || 0} ảnh</p>
            </div>
            <button class="btn-delete-album">🗑️</button>
        `;
        // Edit event...
        div.querySelector('.btn-delete-album').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteAlbum(a.id);
        });
        div.addEventListener('click', () => loadAlbumToEdit(a));
        container.appendChild(div);
    });
};

const deleteAlbum = async (id) => {
    if (!confirm("Xóa album này?")) return;
    globalData.albums = globalData.albums.filter(a => a.id !== id);
    await saveUserData(currentUser.uid, { albums: globalData.albums });
    renderAlbumsList();
}

const loadAlbumToEdit = (a) => {
    resetAlbumForm();
    document.getElementById('album-id').value = a.id;
    document.getElementById('album-title').value = a.title;
    document.getElementById('album-date').value = a.eventDate;
    document.getElementById('album-desc').value = a.description;

    // Load existing photos into preview
    const preview = document.getElementById('album-photos-preview');
    if (a.photos) {
        a.photos.forEach(p => {
            const img = document.createElement('img');
            img.src = p.url;
            img.className = 'preview-thumb';
            preview.appendChild(img);
            // Should mark these as existing so we don't re-upload
        });
    }

    openModal('album-modal');
};
