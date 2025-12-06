/* ═══════════════════════════════════════════════════════════════
   SUPABASE INTEGRATION - Email/Password Auth
   Chỉ cho phép email: lqm186005@gmail.com
   ═══════════════════════════════════════════════════════════════ */

const SupabaseClient = {
    // Supabase config
    SUPABASE_URL: 'https://btbckrxctkobjrixpozk.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0YmNrcnhjdGtvYmpyaXhwb3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NTgzMjMsImV4cCI6MjA4MDUzNDMyM30.2HfnoQsLiCKNMMnCGV0JOOO4VY0QEg9IVPqu-kI34d0',

    // ⚠️ CHỈ EMAIL NÀY MỚI ĐƯỢC TRUY CẬP
    ALLOWED_EMAIL: 'lqm186005@gmail.com',

    client: null,
    user: null,

    // Initialize Supabase client
    init() {
        if (typeof supabase === 'undefined') {
            console.error('Supabase SDK not loaded');
            return false;
        }

        this.client = supabase.createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY);
        return true;
    },

    // ═══════════════════════════════════════════════════════════════
    // EMAIL/PASSWORD AUTHENTICATION
    // ═══════════════════════════════════════════════════════════════

    async signUp(email, password) {
        // Kiểm tra email được phép
        if (!this.isAllowedEmail(email)) {
            throw new Error('Email không được phép đăng ký');
        }

        const { data, error } = await this.client.auth.signUp({
            email,
            password
        });

        if (error) throw error;
        this.user = data.user;
        return data;
    },

    async signIn(email, password) {
        // Kiểm tra email được phép
        if (!this.isAllowedEmail(email)) {
            throw new Error('Email không được phép truy cập');
        }

        const { data, error } = await this.client.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        this.user = data.user;
        return data;
    },

    async signOut() {
        const { error } = await this.client.auth.signOut();
        if (error) throw error;
        this.user = null;
    },

    async getSession() {
        const { data: { session } } = await this.client.auth.getSession();
        if (session) {
            // Kiểm tra email có được phép không
            if (!this.isAllowedEmail(session.user.email)) {
                await this.signOut();
                throw new Error('EMAIL_NOT_ALLOWED');
            }
            this.user = session.user;
        }
        return session;
    },

    isAllowedEmail(email) {
        return email && email.toLowerCase() === this.ALLOWED_EMAIL.toLowerCase();
    },

    // ═══════════════════════════════════════════════════════════════
    // DATA SYNC
    // ═══════════════════════════════════════════════════════════════

    async saveUserData(data) {
        if (!this.user) return null;

        const { error } = await this.client
            .from('user_data')
            .upsert({
                user_id: this.user.id,
                profiles: data.profiles || [],
                settings: data.settings || {},
                life_context: data.lifeContext || {},
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });

        if (error) throw error;
        return true;
    },

    async loadUserData() {
        if (!this.user) return null;

        const { data, error } = await this.client
            .from('user_data')
            .select('*')
            .eq('user_id', this.user.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    // ═══════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════

    isConfigured() {
        return this.SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
            this.SUPABASE_ANON_KEY !== 'YOUR_ANON_KEY';
    },

    isLoggedIn() {
        return !!this.user;
    }
};

// Cloud Storage wrapper
const CloudStorage = {
    // Save all data to cloud
    async sync() {
        if (!SupabaseClient.isLoggedIn()) return;

        try {
            await SupabaseClient.saveUserData({
                profiles: App.profiles,
                settings: {
                    geminiApiKey: App.geminiApiKey
                },
                lifeContext: App.activeProfile?.lifeContext || {}
            });
            console.log('✅ Synced to cloud');
        } catch (error) {
            console.error('Cloud sync error:', error);
        }
    },

    // Load from cloud
    async load() {
        if (!SupabaseClient.isLoggedIn()) return null;

        try {
            const data = await SupabaseClient.loadUserData();
            if (data) {
                return {
                    profiles: data.profiles || [],
                    settings: data.settings || {},
                    lifeContext: data.life_context || {}
                };
            }
        } catch (error) {
            console.error('Cloud load error:', error);
        }
        return null;
    }
};

if (typeof module !== 'undefined') {
    module.exports = { SupabaseClient, CloudStorage };
}
