/* ═══════════════════════════════════════════════════════════════
   GEMINI AI SERVICE MODULE - Enhanced with Life Context
   Lá Số Lâm Quốc Minh
   ═══════════════════════════════════════════════════════════════ */

const GeminiAI = {
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',

    // Query Gemini API
    async query(prompt, apiKey) {
        if (!apiKey) {
            throw new Error('API_KEY_MISSING');
        }

        try {
            const response = await fetch(`${this.API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 2048
                    }
                })
            });

            if (!response.ok) {
                if (response.status === 400 || response.status === 401) {
                    throw new Error('API_KEY_INVALID');
                }
                throw new Error(`API_ERROR_${response.status}`);
            }

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        } catch (error) {
            console.error('Gemini API Error:', error);
            throw error;
        }
    },

    // Format response to HTML
    formatResponse(text) {
        if (!text) return '';
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/### (.*?)$/gm, '<h4>$1</h4>')
            .replace(/## (.*?)$/gm, '<h3>$1</h3>')
            .replace(/# (.*?)$/gm, '<h2>$1</h2>')
            .replace(/\n/g, '<br>');
    },

    // Lấy context từ AIChat
    getLifeContext() {
        if (typeof AIChat !== 'undefined' && AIChat.hasContext()) {
            return AIChat.getContextForAI();
        }
        return '';
    },

    // Luận giải Bát Tự
    async analyzeBatTu(battuData, profile, apiKey) {
        const lifeContext = this.getLifeContext();

        const prompt = `Bạn là một chuyên gia Tử Vi và Bát Tự hàng đầu Việt Nam. Hãy luận giải chi tiết lá số Bát Tự sau:

**Thông tin:**
- Họ tên: ${profile.name}
- Giới tính: ${profile.gender === 'male' ? 'Nam' : 'Nữ'}
- Ngày sinh: ${profile.birthDate}

**Tứ Trụ:**
- Năm: ${battuData.pillars.year.can} ${battuData.pillars.year.chi} (${battuData.pillars.year.nguHanh})
- Tháng: ${battuData.pillars.month.can} ${battuData.pillars.month.chi} (${battuData.pillars.month.nguHanh})
- Ngày: ${battuData.pillars.day.can} ${battuData.pillars.day.chi} (${battuData.pillars.day.nguHanh})
- Giờ: ${battuData.pillars.hour.can} ${battuData.pillars.hour.chi} (${battuData.pillars.hour.nguHanh})

**Ngũ Hành:**
- Kim: ${battuData.elements['Kim']}, Mộc: ${battuData.elements['Mộc']}, Thủy: ${battuData.elements['Thủy']}
- Hỏa: ${battuData.elements['Hỏa']}, Thổ: ${battuData.elements['Thổ']}

**Nhật Chủ:** ${battuData.dayMaster} - ${battuData.strength.level}
${lifeContext}

${lifeContext ? `
⚠️ QUAN TRỌNG: Hãy ĐỐI CHIẾU lá số với TÌNH HUỐNG THỰC TẾ ở trên. Đưa ra phân tích CÁ NHÂN HÓA dựa trên những gì người này đang trải qua.
` : ''}

Hãy phân tích CHI TIẾT:
1. **Tổng quan bản mệnh** (tính cách, điểm mạnh, điểm yếu)
2. **Sự nghiệp** ${lifeContext ? '- ĐỐI CHIẾU với công việc hiện tại' : '(nghề nghiệp phù hợp)'}
3. **Tình duyên** ${lifeContext ? '- ĐỐI CHIẾU với tình trạng hiện tại' : '(đặc điểm người phù hợp)'}
4. **Tài lộc** ${lifeContext ? '- ĐỐI CHIẾU với tình hình tài chính' : '(nguồn tài chính)'}
5. **Sức khỏe** ${lifeContext ? '- ĐỐI CHIẾU với sức khỏe hiện tại' : '(vấn đề cần lưu ý)'}
6. **Lời khuyên CỤ THỂ** ${lifeContext ? 'cho TÌNH HUỐNG HIỆN TẠI của người này' : ''}

Viết bằng tiếng Việt, văn phong dễ hiểu, có emoji. Khoảng 500-600 từ.`;

        return await this.query(prompt, apiKey);
    },

    // Luận giải Thần Số Học
    async analyzeNumerology(numData, profile, apiKey) {
        const lifeContext = this.getLifeContext();

        const prompt = `Bạn là chuyên gia Thần Số Học hàng đầu. Hãy luận giải chi tiết các con số của người này:

**Thông tin:**
- Họ tên: ${profile.name}
- Ngày sinh: ${profile.birthDate}

**Các Con Số:**
- Số Chủ Đạo: ${numData.coreNumbers.lifePath.value} (${numData.coreNumbers.lifePath.meaning?.title || ''})
- Số Linh Hồn: ${numData.coreNumbers.soul.value}
- Số Biểu Đạt: ${numData.coreNumbers.expression.value}
- Số Nhân Cách: ${numData.coreNumbers.personality.value}
- Số Ngày Sinh: ${numData.coreNumbers.birthday.value}
- Số Thái Độ: ${numData.coreNumbers.attitude.value}
- Năm Cá Nhân ${new Date().getFullYear()}: ${numData.cycles.personalYear}
${numData.isMasterNumber ? '⭐ ĐÂY LÀ SỐ CHỦ (MASTER NUMBER)!' : ''}

**Mũi tên trong biểu đồ:**
${numData.arrows.map(a => `- ${a.name}: ${a.type === 'full' ? '✅ Có' : '❌ Thiếu'}`).join('\n')}
${lifeContext}

${lifeContext ? `
⚠️ QUAN TRỌNG: Hãy ĐỐI CHIẾU các con số với TÌNH HUỐNG THỰC TẾ ở trên. Giải thích TẠI SAO cuộc sống hiện tại của họ lại diễn ra như vậy dựa trên Thần Số Học.
` : ''}

Hãy phân tích CHI TIẾT:
1. **Sứ mệnh cuộc đời** (dựa trên Số Chủ Đạo) ${lifeContext ? '- Họ đang đi đúng đường chưa?' : ''}
2. **Khao khát nội tâm** ${lifeContext ? '- Đang được thỏa mãn chưa?' : '(Số Linh Hồn)'}
3. **Năm ${new Date().getFullYear()} của bạn** (Personal Year ${numData.cycles.personalYear}) ${lifeContext ? '- Đây là năm thế nào với TÌNH HUỐNG HIỆN TẠI?' : ''}
4. **Điểm mạnh & Điểm cần cải thiện** ${lifeContext ? '- ĐỐI CHIẾU với mục tiêu và lo lắng hiện tại' : ''}
5. **Lời khuyên CỤ THỂ** ${lifeContext ? 'dựa trên TÌNH HUỐNG THỰC TẾ' : 'cho giai đoạn hiện tại'}

Viết bằng tiếng Việt, văn phong dễ hiểu, có emoji. Khoảng 500-600 từ.`;

        return await this.query(prompt, apiKey);
    },

    // Luận giải Cung Hoàng Đạo
    async analyzeZodiac(zodiacData, profile, apiKey) {
        const lifeContext = this.getLifeContext();

        const prompt = `Bạn là chuyên gia Chiêm tinh học. Hãy luận giải chi tiết 12 Cung Hoàng Đạo của người này:

**Thông tin:**
- Họ tên: ${profile.name}
- Ngày sinh: ${profile.birthDate}

**Cung Hoàng Đạo:**
- Cung Mặt Trời (Sun Sign): ${zodiacData.sunSign.name} (${zodiacData.sunSign.nameEn}) ${zodiacData.sunSign.emoji}
- Cung Mặt Trăng (Moon Sign): ${zodiacData.moonSign.name} ${zodiacData.moonSign.emoji}
${zodiacData.risingSign ? `- Cung Mọc (Rising): ${zodiacData.risingSign.name} ${zodiacData.risingSign.emoji}` : ''}
- Nguyên tố: ${zodiacData.element}
- Chất lượng: ${zodiacData.quality}
- Hành tinh chủ quản: ${zodiacData.ruler}
${lifeContext}

${lifeContext ? `
⚠️ QUAN TRỌNG: Đây là người THỰC với tình huống THỰC. Hãy luận giải cung hoàng đạo trong BỐI CẢNH cuộc sống hiện tại của họ.
` : ''}

Hãy phân tích:
1. **Bản chất Sun Sign ${zodiacData.sunSign.name}** ${lifeContext ? '- Đang thể hiện thế nào trong cuộc sống?' : ''}
2. **Cảm xúc Moon Sign ${zodiacData.moonSign.name}** ${lifeContext ? '- Ảnh hưởng tới tình cảm hiện tại' : ''}
3. **Tương hợp tình cảm** ${lifeContext ? '- Phù hợp với tình trạng hiện tại?' : '(các cung phù hợp)'}
4. **Sự nghiệp theo cung** ${lifeContext ? '- Phù hợp với công việc hiện tại?' : ''}
5. **Lời khuyên** ${lifeContext ? 'CỤ THỂ cho TÌNH HUỐNG của họ' : ''}

Viết tiếng Việt, có emoji, khoảng 400-500 từ.`;

        return await this.query(prompt, apiKey);
    },

    // Luận giải Con Giáp
    async analyzeChineseZodiac(congapData, profile, apiKey) {
        const lifeContext = this.getLifeContext();
        const currentYear = new Date().getFullYear();

        const prompt = `Bạn là chuyên gia Phong thủy và Tử vi Đông phương. Hãy luận giải chi tiết 12 Con Giáp:

**Thông tin:**
- Họ tên: ${profile.name}
- Tuổi: ${congapData.yearAnimal.name} (${congapData.yearAnimal.animal}) ${congapData.yearAnimal.emoji}
- Hành: ${congapData.element}
- Tháng sinh: ${congapData.monthAnimal.name}
${congapData.hourAnimal ? `- Giờ sinh: ${congapData.hourAnimal.name}` : ''}

**Tương hợp:**
${congapData.tamHop ? `- Tam Hợp: ${congapData.tamHop.compatible.join(', ')}` : ''}
${congapData.lucHop ? `- Lục Hợp: ${congapData.lucHop.compatible.join(', ')}` : ''}
${congapData.lucXung ? `- Lục Xung: ${congapData.lucXung.conflict.join(', ')}` : ''}

**Năm ${currentYear}:**
${congapData.taiSui.warning ? `⚠️ ${congapData.taiSui.warning}` : 'Không phạm Thái Tuế'}
${lifeContext}

${lifeContext ? `
⚠️ QUAN TRỌNG: Hãy ĐỐI CHIẾU con giáp với CUỘC SỐNG THỰC của họ. Năm nay có thuận lợi cho tình huống hiện tại không?
` : ''}

Hãy phân tích:
1. **Tính cách tuổi ${congapData.yearAnimal.animal}** ${lifeContext ? '- Đang thể hiện thế nào?' : ''}
2. **Vận năm ${currentYear}** ${lifeContext ? '- Ảnh hưởng tới công việc/tình cảm hiện tại' : ''}
3. **Đối tác phù hợp** ${lifeContext ? '- Đối chiếu với mối quan hệ hiện tại' : '(tuổi hợp)'}
4. **Sự nghiệp theo con giáp** ${lifeContext ? '- Công việc hiện tại có phù hợp?' : ''}
5. **Lời khuyên phong thủy** ${lifeContext ? 'để cải thiện TÌNH HUỐNG HIỆN TẠI' : ''}

Viết tiếng Việt, có emoji, khoảng 400-500 từ.`;

        return await this.query(prompt, apiKey);
    },

    // Dự đoán hàng ngày
    async getDailyForecast(profile, battuData, numData, apiKey) {
        const today = new Date();
        const dayOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][today.getDay()];
        const lifeContext = this.getLifeContext();

        const prompt = `Bạn là thầy phong thủy và tử vi nổi tiếng. Hãy đưa ra DỰ ĐOÁN CHI TIẾT cho ngày hôm nay:

**Thông tin người xem:**
- Họ tên: ${profile.name}
- Mệnh: ${battuData?.dayMaster || 'Chưa rõ'}
- Số Chủ Đạo: ${numData?.coreNumbers?.lifePath?.value || 'Chưa rõ'}
- Ngày Cá Nhân hôm nay: ${numData?.cycles?.personalDay || 'Chưa rõ'}

**Ngày hôm nay:** ${dayOfWeek}, ${today.toLocaleDateString('vi-VN')}
${lifeContext}

${lifeContext ? `
⚠️ QUAN TRỌNG: Đây là dự đoán CÁ NHÂN HÓA. Hãy đưa ra lời khuyên CỤ THỂ dựa trên:
- Công việc/học tập HIỆN TẠI của họ
- Tình trạng tình cảm HIỆN TẠI
- Mục tiêu và lo lắng ĐANG CÓ
` : ''}

Hãy dự đoán CHI TIẾT (bằng tiếng Việt):

1. **📊 Vận May Tổng Quan** (điểm 1-100 + nhận xét ${lifeContext ? 'RIÊNG cho tình huống của họ' : ''})

2. **💕 Tình Duyên** ${lifeContext ? '- Lời khuyên cho TÌNH TRẠNG HIỆN TẠI' : '(cơ hội gặp gỡ)'}

3. **💰 Tài Lộc** ${lifeContext ? '- Phù hợp với tình hình tài chính hiện tại' : '(thu chi hôm nay)'}

4. **💼 Công Việc** ${lifeContext ? '- Cụ thể cho NGHỀ NGHIỆP của họ' : '(việc nên làm, nên tránh)'}

5. **🏥 Sức Khỏe** (lưu ý)

6. **🍀 May Mắn:**
   - 3 con số may mắn
   - 2 màu sắc may mắn
   - Hướng may mắn
   - Giờ đẹp nhất

7. **💡 Lời Khuyên QUAN TRỌNG NHẤT** ${lifeContext ? 'cho NGÀY HÔM NAY của họ' : ''}

Viết ngắn gọn, có emoji. Khoảng 350-450 từ.`;

        return await this.query(prompt, apiKey);
    },

    // Tư vấn trực tiếp (free-form)
    async askQuestion(question, profile, battuData, numData, apiKey) {
        const lifeContext = this.getLifeContext();

        const prompt = `Bạn là chuyên gia Tử vi, Bát Tự, Thần Số Học, Phong thủy hàng đầu Việt Nam.

**Thông tin người hỏi:**
- Họ tên: ${profile.name}
- Ngày sinh: ${profile.birthDate}
${battuData ? `- Mệnh: ${battuData.dayMaster}` : ''}
${numData ? `- Số Chủ Đạo: ${numData.coreNumbers?.lifePath?.value}` : ''}
${lifeContext}

**Câu hỏi của họ:**
"${question}"

Hãy trả lời CỤ THỂ, RÕ RÀNG dựa trên:
1. Thông tin lá số của họ
2. Tình huống cuộc sống hiện tại (nếu có)
3. Kiến thức Tử vi / Thần số / Phong thủy

Trả lời bằng tiếng Việt, thân thiện, có emoji. Khoảng 200-300 từ.`;

        return await this.query(prompt, apiKey);
    }
};

if (typeof module !== 'undefined') module.exports = GeminiAI;
