// ============================================================
// FILE: js/api.js
// API Wrapper - Thay thế Firebase SDK
// Gọi đến PHP backend thay vì Firebase
// ============================================================

const API_BASE = './api'; // Đường dẫn đến thư mục api

/**
 * Helper function để gọi API
 */
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include' // Gửi cookie session
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE}/${endpoint}`, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Lỗi không xác định');
        }

        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ============================================================
// A. XÁC THỰC (AUTH) - Thay thế Firebase Auth
// ============================================================

/**
 * Đăng ký tài khoản mới
 */
export const registerWithEmail = async (email, password, displayName) => {
    const result = await apiCall('auth.php?action=register', 'POST', {
        email,
        password,
        displayName
    });
    return result.user;
};

/**
 * Đăng nhập bằng Email/Password
 */
export const loginWithEmail = async (email, password) => {
    const result = await apiCall('auth.php?action=login', 'POST', {
        email,
        password
    });
    return result.user;
};

/**
 * Đăng nhập bằng Google (Placeholder - cần OAuth riêng)
 */
export const loginWithGoogle = async () => {
    // TODO: Implement Google OAuth nếu cần
    alert('Tính năng đăng nhập Google chưa được hỗ trợ. Vui lòng dùng Email/Password.');
    throw new Error('Google login not implemented');
};

/**
 * Đăng xuất
 */
export const logoutUser = async () => {
    await apiCall('auth.php?action=logout', 'POST');
    localStorage.clear();
};

/**
 * Kiểm tra trạng thái đăng nhập
 */
export const checkAuthStatus = async () => {
    try {
        const result = await apiCall('auth.php?action=check', 'GET');
        return result.authenticated ? result.user : null;
    } catch {
        return null;
    }
};

/**
 * Lắng nghe thay đổi trạng thái auth (giả lập Firebase onAuthStateChanged)
 */
export const subscribeToAuthChanges = (callback) => {
    // Kiểm tra auth ngay lập tức
    checkAuthStatus().then(user => {
        callback(user);
    });

    // Không có real-time subscription như Firebase
    // Callback chỉ được gọi 1 lần khi page load
};

// Fake auth object để tương thích với code cũ
export const auth = {
    currentUser: null,
    onAuthStateChanged: subscribeToAuthChanges
};

// ============================================================
// B. QUẢN LÝ DỮ LIỆU USER
// ============================================================

/**
 * Lấy tất cả dữ liệu của user (thay thế getUserData)
 */
export const getUserData = async (uid) => {
    try {
        const result = await apiCall('user.php?action=get-all', 'GET');
        return result.userData;
    } catch (error) {
        console.error('Lỗi lấy dữ liệu:', error);
        return null;
    }
};

/**
 * Lưu dữ liệu user (thay thế saveUserData)
 */
export const saveUserData = async (uid, data) => {
    try {
        await apiCall('user.php?action=save', 'POST', data);
    } catch (error) {
        console.error('Lỗi lưu dữ liệu:', error);
        throw error;
    }
};

/**
 * Lấy danh sách tất cả users (Admin only)
 */
export const getAllUsers = async () => {
    // TODO: Implement admin endpoint
    console.warn('getAllUsers chưa được implement');
    return [];
};

// ============================================================
// C. TASKS API
// ============================================================

export const getTasks = async () => {
    const result = await apiCall('tasks.php', 'GET');
    return result.tasks;
};

export const createTask = async (taskData) => {
    const result = await apiCall('tasks.php', 'POST', taskData);
    return result.task;
};

export const updateTask = async (taskId, taskData) => {
    await apiCall('tasks.php', 'PUT', { id: taskId, ...taskData });
};

export const deleteTask = async (taskId) => {
    await apiCall('tasks.php', 'DELETE', { id: taskId });
};

// ============================================================
// D. CALENDAR EVENTS API
// ============================================================

export const getCalendarEvents = async () => {
    const result = await apiCall('calendar.php', 'GET');
    return result.calendarEvents;
};

export const createCalendarEvent = async (eventData) => {
    const result = await apiCall('calendar.php', 'POST', eventData);
    return result.event;
};

export const updateCalendarEvent = async (eventId, eventData) => {
    await apiCall('calendar.php', 'PUT', { id: eventId, ...eventData });
};

export const deleteCalendarEvent = async (eventId) => {
    await apiCall('calendar.php', 'DELETE', { id: eventId });
};

// ============================================================
// E. PROJECTS API
// ============================================================

export const getProjects = async () => {
    const result = await apiCall('projects.php', 'GET');
    return result.projects;
};

export const createProject = async (projectData) => {
    const result = await apiCall('projects.php', 'POST', projectData);
    return result.project;
};

export const updateProject = async (projectId, projectData) => {
    await apiCall('projects.php', 'PUT', { id: projectId, ...projectData });
};

export const deleteProject = async (projectId) => {
    await apiCall('projects.php', 'DELETE', { id: projectId });
};

// ============================================================
// F. TODO GROUPS API
// ============================================================

export const getTodoGroups = async () => {
    const result = await apiCall('todos.php', 'GET');
    return result.todoGroups;
};

export const createTodoGroup = async (groupData) => {
    const result = await apiCall('todos.php', 'POST', groupData);
    return result.group;
};

export const updateTodoGroup = async (groupId, groupData) => {
    await apiCall('todos.php', 'PUT', { id: groupId, ...groupData });
};

export const deleteTodoGroup = async (groupId) => {
    await apiCall('todos.php', 'DELETE', { id: groupId });
};

export const addTodoItem = async (groupId, text) => {
    await apiCall('todos.php?action=add-item', 'POST', { groupId, text });
};

export const toggleTodoItem = async (groupId, itemId) => {
    await apiCall('todos.php?action=toggle-item', 'PUT', { groupId, itemId });
};

export const deleteTodoItem = async (groupId, itemId) => {
    await apiCall('todos.php?action=delete-item', 'DELETE', { groupId, itemId });
};

// ============================================================
// G. PLACEHOLDER FUNCTIONS (Chưa implement)
// ============================================================

// Firebase Storage placeholders
export const uploadFileToStorage = async (file, path) => {
    console.warn('File upload chưa được implement. Cần cấu hình riêng.');
    return null;
};

export const deleteFileFromStorage = async (path) => {
    console.warn('File delete chưa được implement.');
};

// Sub-collections placeholders
export const addSubCollectionDoc = async (uid, subColName, data) => {
    console.warn(`addSubCollectionDoc(${subColName}) chưa được implement`);
};

export const getSubCollectionDocs = async (uid, subColName, orderField = null) => {
    console.warn(`getSubCollectionDocs(${subColName}) chưa được implement`);
    return [];
};

export const updateSubCollectionDoc = async (uid, subColName, docId, data) => {
    console.warn(`updateSubCollectionDoc(${subColName}) chưa được implement`);
};

export const deleteSubCollectionDoc = async (uid, subColName, docId) => {
    console.warn(`deleteSubCollectionDoc(${subColName}) chưa được implement`);
};

// System config
export const getSystemConfig = async (configId) => {
    console.warn('getSystemConfig chưa được implement');
    return null;
};

export const saveSystemConfig = async (configId, data) => {
    console.warn('saveSystemConfig chưa được implement');
};

// Appointment requests
export const getAppointmentRequests = async (uid, status = 'all') => {
    console.warn('getAppointmentRequests chưa được implement');
    return [];
};

// Global templates
export const getGlobalTemplates = async () => {
    console.warn('getGlobalTemplates chưa được implement');
    return [];
};

export const createGlobalTemplate = async (templateData) => {
    console.warn('createGlobalTemplate chưa được implement');
};

export const deleteGlobalTemplate = async (id) => {
    console.warn('deleteGlobalTemplate chưa được implement');
};

// Fake Firebase objects for compatibility
export const db = null;
export const storage = null;
export const provider = null;
