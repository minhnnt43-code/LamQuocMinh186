// ============================================================
// LOCALIZATION.JS - Vietnamese Language Support
// Hỗ trợ tiếng Việt cho tất cả AI messages
// ============================================================

export const vi = {
    // ============================================================
    // GENERAL
    // ============================================================
    general: {
        loading: 'Đang tải...',
        error: 'Có lỗi xảy ra',
        success: 'Thành công',
        cancel: 'Hủy',
        confirm: 'Xác nhận',
        save: 'Lưu',
        delete: 'Xóa',
        edit: 'Chỉnh sửa',
        close: 'Đóng',
        yes: 'Có',
        no: 'Không',
        ok: 'OK',
        back: 'Quay lại',
        next: 'Tiếp theo',
        done: 'Hoàn thành',
        today: 'Hôm nay',
        tomorrow: 'Ngày mai',
        yesterday: 'Hôm qua',
        thisWeek: 'Tuần này',
        thisMonth: 'Tháng này'
    },

    // ============================================================
    // PRIORITY
    // ============================================================
    priority: {
        critical: 'Khẩn cấp',
        high: 'Cao',
        medium: 'Trung bình',
        low: 'Thấp'
    },

    // ============================================================
    // STATUS
    // ============================================================
    status: {
        pending: 'Chờ xử lý',
        in_progress: 'Đang thực hiện',
        completed: 'Hoàn thành',
        blocked: 'Bị chặn',
        cancelled: 'Đã hủy',
        overdue: 'Quá hạn'
    },

    // ============================================================
    // AI SCHEDULER
    // ============================================================
    scheduler: {
        scheduleGenerated: 'Đã tạo lịch trình',
        optimalTimeFound: 'Đã tìm thời điểm tối ưu',
        noSlotsAvailable: 'Không có khung giờ trống',
        bufferAdded: 'Đã thêm thời gian dự phòng',
        conflictDetected: 'Phát hiện xung đột lịch',
        parallelTasksIdentified: 'Đã xác định các task có thể làm song song',
        weeklyRhythm: {
            mondayStart: 'Khởi động nhẹ nhàng đầu tuần',
            midweekPeak: 'Giữa tuần - năng suất cao nhất',
            fridayWrapup: 'Cuối tuần - hoàn tất công việc',
            weekendRest: 'Cuối tuần - nghỉ ngơi'
        }
    },

    // ============================================================
    // BOTTLENECK
    // ============================================================
    bottleneck: {
        detected: 'Phát hiện điểm nghẽn',
        overloaded: 'Quá tải',
        atRisk: 'Có nguy cơ',
        manageable: 'Có thể quản lý được',
        recommendation: 'Đề xuất: xem xét lại deadline hoặc giảm khối lượng công việc',
        highUtilization: 'Sử dụng thời gian cao',
        criticalWarning: 'Cảnh báo nghiêm trọng'
    },

    // ============================================================
    // FOCUS
    // ============================================================
    focus: {
        sessionStarted: 'Bắt đầu phiên tập trung',
        sessionEnded: 'Kết thúc phiên tập trung',
        blockFound: 'Đã tìm được khung giờ tập trung',
        noBlockAvailable: 'Không có khung giờ tập trung phù hợp',
        interrupted: 'Phiên tập trung bị gián đoạn',
        perfectTime: 'Thời điểm hoàn hảo để tập trung',
        goodTime: 'Thời điểm tốt để tập trung',
        okTime: 'Có thể tập trung được',
        notIdeal: 'Không phải thời điểm lý tưởng'
    },

    // ============================================================
    // VELOCITY
    // ============================================================
    velocity: {
        sprintStarted: 'Bắt đầu sprint mới',
        sprintEnded: 'Kết thúc sprint',
        velocityUp: 'Tốc độ tăng',
        velocityDown: 'Tốc độ giảm',
        velocityStable: 'Tốc độ ổn định',
        prediction: 'Dự đoán hoàn thành',
        onTrack: 'Đang đúng tiến độ',
        behind: 'Đang chậm tiến độ',
        ahead: 'Đang trước tiến độ'
    },

    // ============================================================
    // DELAY SIMULATION
    // ============================================================
    delay: {
        simulating: 'Đang mô phỏng tác động trễ',
        cascadeEffect: 'Hiệu ứng dây chuyền',
        tasksAffected: 'task bị ảnh hưởng',
        daysDelay: 'ngày trễ',
        mitigationSuggested: 'Đề xuất giải pháp',
        highRisk: 'Rủi ro cao',
        mediumRisk: 'Rủi ro trung bình',
        lowRisk: 'Rủi ro thấp'
    },

    // ============================================================
    // BURNOUT
    // ============================================================
    burnout: {
        riskDetected: 'Phát hiện nguy cơ kiệt sức',
        lowRisk: 'Nguy cơ thấp - Tiếp tục phát huy!',
        moderateRisk: 'Nguy cơ trung bình - Chú ý nghỉ ngơi',
        highRisk: 'Nguy cơ cao - Cần nghỉ ngơi ngay',
        criticalRisk: 'Nguy cơ nghiêm trọng - Dừng lại và nghỉ ngơi!',
        indicators: {
            workHours: 'Giờ làm việc quá nhiều',
            weekendWork: 'Làm việc cuối tuần',
            skipBreaks: 'Bỏ qua giờ nghỉ',
            lateNights: 'Làm khuya thường xuyên',
            taskOverload: 'Quá nhiều task cùng lúc'
        },
        recommendations: {
            takeBreak: 'Nghỉ ngơi 15 phút',
            endEarly: 'Kết thúc sớm hôm nay',
            delegate: 'Giao bớt task cho người khác',
            reduceScope: 'Giảm phạm vi công việc'
        }
    },

    // ============================================================
    // WORKLOAD
    // ============================================================
    workload: {
        balanced: 'Khối lượng công việc cân bằng',
        high: 'Khối lượng công việc cao',
        overloaded: 'Quá tải',
        underutilized: 'Chưa tận dụng hết năng lực',
        capacity: 'Năng lực',
        utilizationRate: 'Tỉ lệ sử dụng',
        recommendation: {
            defer: 'Nên hoãn một số task',
            delegate: 'Nên giao bớt cho người khác',
            decline: 'Có thể từ chối task mới',
            accept: 'Có thể nhận thêm công việc'
        }
    },

    // ============================================================
    // WELLBEING
    // ============================================================
    wellbeing: {
        checkComplete: 'Kiểm tra sức khỏe hoàn tất',
        healthy: 'Trạng thái tốt',
        needsAttention: 'Cần chú ý',
        critical: 'Cần hành động ngay',
        microBreakNeeded: 'Đến lúc nghỉ ngắn',
        energyLow: 'Năng lượng thấp',
        energyPreservation: 'Đang ở chế độ tiết kiệm năng lượng',
        suggestions: {
            walk: 'Đi bộ 5-10 phút',
            stretch: 'Giãn cơ tại chỗ',
            hydrate: 'Uống nước',
            eyeRest: 'Nghỉ mắt 20 giây'
        }
    },

    // ============================================================
    // BOUNDARY
    // ============================================================
    boundary: {
        withinWorkHours: 'Trong giờ làm việc',
        outsideWorkHours: 'Ngoài giờ làm việc',
        afterHoursWarning: 'Bạn đang làm việc ngoài giờ',
        weekendWarning: 'Đây là cuối tuần, nên nghỉ ngơi',
        violation: 'Vi phạm ranh giới công việc',
        meetingOverload: 'Quá nhiều cuộc họp',
        focusTimeProtected: 'Đã bảo vệ thời gian tập trung'
    },

    // ============================================================
    // RECOVERY
    // ============================================================
    recovery: {
        scheduled: 'Đã lên lịch nghỉ ngơi',
        breakNeeded: 'Cần nghỉ ngơi',
        breakTaken: 'Đã nghỉ ngơi',
        breakSkipped: 'Đã bỏ qua giờ nghỉ',
        effectiveness: 'Hiệu quả phục hồi',
        suggestions: {
            shortBreak: 'Nghỉ ngắn 5 phút',
            longBreak: 'Nghỉ dài 15-20 phút',
            dayOff: 'Nên nghỉ ngày hôm nay',
            vacation: 'Cần kỳ nghỉ dài hơn'
        }
    },

    // ============================================================
    // TEAM
    // ============================================================
    team: {
        memberAdded: 'Đã thêm thành viên',
        memberRemoved: 'Đã xóa thành viên',
        workloadEquity: 'Phân bổ công việc công bằng',
        imbalanced: 'Mất cân bằng',
        rebalanceNeeded: 'Cần phân bổ lại',
        skillMatch: 'Phù hợp kỹ năng',
        handoffInitiated: 'Đã bắt đầu bàn giao',
        handoffComplete: 'Hoàn tất bàn giao',
        escalationNeeded: 'Cần escalate',
        dependencyBlocked: 'Bị chặn bởi dependency'
    },

    // ============================================================
    // ANALYTICS
    // ============================================================
    analytics: {
        reportGenerated: 'Đã tạo báo cáo',
        dailyReport: 'Báo cáo ngày',
        weeklyReport: 'Báo cáo tuần',
        monthlyReport: 'Báo cáo tháng',
        productivity: {
            excellent: 'Năng suất xuất sắc!',
            good: 'Năng suất tốt',
            average: 'Năng suất trung bình',
            needsImprovement: 'Cần cải thiện'
        },
        trends: {
            increasing: 'Đang tăng',
            decreasing: 'Đang giảm',
            stable: 'Ổn định'
        },
        insights: {
            peakHours: 'Giờ năng suất cao nhất của bạn',
            bestDay: 'Ngày năng suất nhất của bạn',
            suggestion: 'Gợi ý cải thiện'
        }
    },

    // ============================================================
    // GOALS
    // ============================================================
    goals: {
        created: 'Đã tạo mục tiêu',
        completed: 'Đã hoàn thành mục tiêu!',
        progress: 'Tiến độ',
        onTrack: 'Đang đúng hướng',
        atRisk: 'Có nguy cơ trễ',
        overdue: 'Đã quá hạn',
        streakMaintained: 'Duy trì chuỗi ngày!',
        streakBroken: 'Chuỗi ngày đã bị gián đoạn'
    },

    // ============================================================
    // CONTEXT
    // ============================================================
    context: {
        detected: 'Đã nhận diện ngữ cảnh',
        deepWork: 'Chế độ làm việc sâu',
        collaborative: 'Chế độ cộng tác',
        admin: 'Chế độ quản trị',
        planning: 'Chế độ lên kế hoạch',
        review: 'Chế độ review',
        breakMode: 'Chế độ nghỉ ngơi',
        energyLevel: {
            high: 'Năng lượng cao',
            medium: 'Năng lượng trung bình',
            low: 'Năng lượng thấp',
            declining: 'Năng lượng đang giảm'
        }
    },

    // ============================================================
    // GAMIFICATION
    // ============================================================
    gamification: {
        pointsEarned: 'Điểm đạt được',
        levelUp: 'Lên cấp!',
        newBadge: 'Huy hiệu mới!',
        streakBonus: 'Bonus chuỗi ngày',
        achievementUnlocked: 'Mở khóa thành tích!',
        dailyChallenge: 'Thử thách ngày',
        challengeCompleted: 'Hoàn thành thử thách!',
        badges: {
            streak3: 'Chuỗi 3 ngày',
            streak7: 'Chiến binh tuần',
            streak14: 'Nhà vô địch 2 tuần',
            streak30: 'Bậc thầy tháng',
            tasks10: 'Khởi đầu',
            tasks50: 'Bậc thầy task',
            tasks100: 'Centurion'
        }
    },

    // ============================================================
    // MOTIVATION
    // ============================================================
    motivation: {
        morning: {
            greeting: 'Chào buổi sáng! Sẵn sàng cho một ngày hiệu quả?',
            tip: 'Làm việc quan trọng nhất khi năng lượng còn cao'
        },
        afternoon: {
            greeting: 'Buổi chiều tốt lành!',
            tip: 'Đây thường là lúc năng lượng giảm, nghỉ ngắn nếu cần'
        },
        evening: {
            greeting: 'Buổi tối rồi!',
            tip: 'Tổng kết ngày và lên kế hoạch cho ngày mai'
        },
        encouragement: {
            keepGoing: 'Tiếp tục phát huy!',
            almostThere: 'Sắp xong rồi!',
            greatJob: 'Làm tốt lắm!',
            youGotThis: 'Bạn làm được!',
            welldone: 'Tuyệt vời!',
            impressive: 'Ấn tượng!',
            takeBreak: 'Đến lúc nghỉ ngơi thôi'
        },
        affirmations: [
            'Tôi có khả năng đạt được mục tiêu.',
            'Mỗi ngày tôi đều tiến bộ hơn.',
            'Tôi tập trung vào tiến trình, không phải sự hoàn hảo.',
            'Tôi kiểm soát được thời gian và năng lượng.',
            'Tôi xứng đáng được thành công.'
        ]
    },

    // ============================================================
    // NOTIFICATIONS
    // ============================================================
    notifications: {
        taskDue: 'Task sắp đến hạn',
        taskOverdue: 'Task đã quá hạn',
        reminderTitle: 'Nhắc nhở',
        breakReminder: 'Đến giờ nghỉ ngơi',
        focusReminder: 'Giữ tập trung!',
        meetingSoon: 'Cuộc họp sắp bắt đầu',
        goalProgress: 'Cập nhật tiến độ mục tiêu',
        achievementEarned: 'Đã nhận thành tích mới!'
    },

    // ============================================================
    // ERRORS
    // ============================================================
    errors: {
        taskNotFound: 'Không tìm thấy task',
        memberNotFound: 'Không tìm thấy thành viên',
        invalidDate: 'Ngày không hợp lệ',
        noData: 'Không có dữ liệu',
        notEnoughData: 'Chưa đủ dữ liệu',
        connectionFailed: 'Kết nối thất bại',
        syncFailed: 'Đồng bộ thất bại',
        saveFailed: 'Lưu thất bại',
        unknownError: 'Lỗi không xác định'
    }
};

// ============================================================
// LOCALIZATION HELPER
// ============================================================

export class Localization {
    constructor(locale = 'vi') {
        this.locale = locale;
        this.translations = { vi };
    }

    /**
     * Get translation
     * @param {string} key - Key path like 'burnout.riskDetected'
     * @param {Object} params - Replacement params
     * @returns {string} Translated string
     */
    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations[this.locale];

        for (const k of keys) {
            if (value && value[k] !== undefined) {
                value = value[k];
            } else {
                return key; // Return key if not found
            }
        }

        if (typeof value !== 'string') {
            return key;
        }

        // Replace parameters
        return value.replace(/\{(\w+)\}/g, (match, param) => {
            return params[param] !== undefined ? params[param] : match;
        });
    }

    /**
     * Set locale
     * @param {string} locale - Locale code
     */
    setLocale(locale) {
        if (this.translations[locale]) {
            this.locale = locale;
        }
    }

    /**
     * Get current locale
     * @returns {string} Current locale
     */
    getLocale() {
        return this.locale;
    }
}

// ============================================================
// SINGLETON
// ============================================================

export const localization = new Localization('vi');

export function t(key, params = {}) {
    return localization.t(key, params);
}

export function initLocalization(locale = 'vi') {
    localization.setLocale(locale);
    console.log(`🌐 [Localization] Initialized with locale: ${locale}`);
    return localization;
}
