import {
    registerWithEmail,
    loginWithEmail,
    saveUserData,
    getUserData
} from './firebase.js';

import { showNotification } from './common.js';

/**
 * Quản lý xác thực Email/Password
 */
export const initEmailAuth = () => {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const groupName = document.getElementById('group-name');
    const groupConfirmPass = document.getElementById('group-confirm-pass');
    const btnSubmit = document.getElementById('btn-auth-submit');
    const errorMsg = document.getElementById('login-error');

    // Inputs
    const inputName = document.getElementById('auth-name');
    const inputEmail = document.getElementById('auth-email');
    const inputPass = document.getElementById('auth-password');
    const inputConfirm = document.getElementById('auth-confirm-pass');

    // Toggle Mode state
    let isRegisterMode = false;

    // --- 1. XỬ LÝ CHUYỂN TAB ---
    const switchMode = (mode) => {
        isRegisterMode = (mode === 'register');
        errorMsg.style.display = 'none';
        errorMsg.textContent = '';

        if (isRegisterMode) {
            // UI Register
            tabRegister.classList.add('active');
            tabRegister.style.borderBottom = '2px solid var(--primary-orange)';
            tabRegister.style.color = 'var(--primary-orange)';

            tabLogin.classList.remove('active');
            tabLogin.style.borderBottom = '2px solid transparent';
            tabLogin.style.color = '#ccc';

            groupName.style.display = 'block';
            groupConfirmPass.style.display = 'block';
            btnSubmit.textContent = 'Đăng ký tài khoản';
        } else {
            // UI Login
            tabLogin.classList.add('active');
            tabLogin.style.borderBottom = '2px solid var(--primary-orange)';
            tabLogin.style.color = 'var(--primary-orange)';

            tabRegister.classList.remove('active');
            tabRegister.style.borderBottom = '2px solid transparent';
            tabRegister.style.color = '#ccc';

            groupName.style.display = 'none';
            groupConfirmPass.style.display = 'none';
            btnSubmit.textContent = 'Đăng nhập';
        }
    };

    if (tabLogin) tabLogin.addEventListener('click', () => switchMode('login'));
    if (tabRegister) tabRegister.addEventListener('click', () => switchMode('register'));

    // --- 2. XỬ LÝ SUBMIT ---
    if (btnSubmit) {
        btnSubmit.addEventListener('click', async () => {
            const email = inputEmail.value.trim();
            const password = inputPass.value.trim();

            // Validate sơ bộ
            if (!email || !password) {
                showError('Vui lòng nhập Email và Mật khẩu!');
                return;
            }

            if (isRegisterMode) {
                // --- ĐĂNG KÝ ---
                const name = inputName.value.trim();
                const confirmPass = inputConfirm.value.trim();

                if (!name) return showError('Vui lòng nhập Tên hiển thị!');
                if (password.length < 6) return showError('Mật khẩu phải từ 6 ký tự trở lên!');
                if (password !== confirmPass) return showError('Mật khẩu xác nhận không khớp!');

                try {
                    setLoading(true);
                    const user = await registerWithEmail(email, password, name);

                    // Lưu data vào Firestore
                    await saveUserData(user.uid, {
                        displayName: name,
                        email: email,
                        photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                        createdAt: new Date().toISOString(),
                        role: 'user'
                    });

                    showNotification('Đăng ký thành công! Đang đăng nhập...');
                    setTimeout(() => location.reload(), 1500);

                } catch (err) {
                    handleAuthError(err);
                    setLoading(false);
                }

            } else {
                // --- ĐĂNG NHẬP ---
                try {
                    setLoading(true);
                    await loginWithEmail(email, password);
                    showNotification('Đăng nhập thành công! 🔓');
                    // Auth state change listener trong main.js sẽ tự reload giao diện
                    // Nhưng reload trang để đảm bảo sạch sẽ
                    setTimeout(() => location.reload(), 1000);
                } catch (err) {
                    handleAuthError(err);
                    setLoading(false);
                }
            }
        });
    }

    // Helpers
    const showError = (msg) => {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
    };

    const setLoading = (loading) => {
        if (loading) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang xử lý...';
        } else {
            btnSubmit.disabled = false;
            btnSubmit.textContent = isRegisterMode ? 'Đăng ký tài khoản' : 'Đăng nhập';
        }
    };

    const handleAuthError = (err) => {
        console.error(err);
        let msg = 'Đã có lỗi xảy ra.';
        if (err.code === 'auth/email-already-in-use') msg = 'Email này đã được sử dụng!';
        else if (err.code === 'auth/invalid-email') msg = 'Email không hợp lệ!';
        else if (err.code === 'auth/weak-password') msg = 'Mật khẩu quá yếu!';
        else if (err.code === 'auth/wrong-password') msg = 'Sai mật khẩu!';
        else if (err.code === 'auth/user-not-found') msg = 'Tài khoản không tồn tại!';
        else if (err.code === 'auth/invalid-credential') msg = 'Thông tin đăng nhập không đúng!';

        showError(msg);
    };
};
