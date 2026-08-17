// ========== КОНФИГУРАЦИЯ ==========
// Зашифрованный вебхук и ключ
const ENCRYPTED_WEBHOOK = 'BQwVQxlWXUkCUBwMCRtcHRUfXh4PSQRXFlYIBB0JDUpAXlNaAApCSQsDXQtfTVQAWFhBUUkBKxUDHXBiBiZ9VVx1WCkudAk4ERQ1XyAHVz96BTgKckUafAIvB2wLQTEXNmE7Xws6VWITR3xSKVIONRh2CwtBByNbAQ=='; 
const ENCRYPTION_KEY = 'edwlgeps52pwlrhhgfdk7'; 

// ========== ФУНКЦИИ РАСШИФРОВКИ ==========
function decryptWebhook(encrypted, key) {
    try {
        let decoded = atob(encrypted);
        let decrypted = '';
        for (let i = 0; i < decoded.length; i++) {
            decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return decrypted;
    } catch (e) {
        console.error('Ошибка расшифровки:', e);
        return null;
    }
}

// Получаем реальный вебхук при загрузке
const DISCORD_WEBHOOK_URL = ENCRYPTED_WEBHOOK && ENCRYPTION_KEY 
    ? decryptWebhook(ENCRYPTED_WEBHOOK, ENCRYPTION_KEY)
    : null;

console.log('🔐 Вебхук загружен и расшифрован');

// ========== ОБРАБОТЧИК ФОРМЫ ==========
document.getElementById('applicationForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Проверка вебхука
    if (!DISCORD_WEBHOOK_URL) {
        console.error('❌ Вебхук не настроен!');
        showError('Ошибка конфигурации. Обратитесь к администратору.');
        return;
    }

    const submitBtn = document.querySelector('.submit-btn');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');

    // Hide messages
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';

    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка...';

    // Get form data
    const formData = {
        nickname: document.getElementById('nickname').value,
        passport: document.getElementById('passport').value,
        age: document.getElementById('age').value,
        playtime: document.getElementById('playtime').value,
        department: document.getElementById('department').value,
        govExperience: document.querySelector('input[name="govExperience"]:checked').value,
        govStructure: document.getElementById('govStructure').value,
    };

    // Валидация
    if (!validateForm(formData)) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Отправить заявку';
        return;
    }

    // Create Discord embed
    const embed = {
        title: '📋 Новая заявка в NEXUS',
        color: 0x89b4fa,
        thumbnail: {
            url: 'https://cdn.discordapp.com/emojis/1038992257786merely114.png'
        },
        fields: [
            {
                name: '👤 Имя и фамилия',
                value: formData.nickname,
                inline: false
            },
            {
                name: '🆔 Номер паспорта',
                value: formData.passport,
                inline: true
            },
            {
                name: '📅 Возраст',
                value: formData.age,
                inline: true
            },
            {
                name: '⏱️ Время в игре',
                value: formData.playtime,
                inline: false
            },
            {
                name: '🏢 Желаемый отдел',
                value: getDepartmentEmoji(formData.department) + ' ' + formData.department,
                inline: true
            },
            {
                name: '🏛️ Опыт в гос структурах',
                value: formData.govExperience,
                inline: true
            },
            {
                name: '🏪 Гос структура',
                value: formData.govStructure,
                inline: false
            }
        ],
        footer: {
            text: 'NEXUS Application System',
            icon_url: 'https://cdn.discordapp.com/emojis/1038992257786merely114.png'
        },
        timestamp: new Date().toISOString()
    };

    const payload = {
        username: 'NEXUS Application Bot',
        avatar_url: 'https://cdn.discordapp.com/emojis/1038992257786merely114.png',
        embeds: [embed]
    };

    try {
        const response = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            // Show success message
            successMessage.style.display = 'block';
            successMessage.innerHTML = '<p>✓ Заявка успешно отправлена! Спасибо за ваш интерес к NEXUS.</p>';
            
            // Reset form
            document.getElementById('applicationForm').reset();
            
            // Scroll to message
            successMessage.scrollIntoView({ behavior: 'smooth' });
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Ошибка при отправке заявки. Попробуйте позже или обратитесь к администратору.');
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Отправить заявку';
    }
});

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.style.display = 'block';
    errorMessage.innerHTML = `<p>✗ ${message}</p>`;
    errorMessage.scrollIntoView({ behavior: 'smooth' });
}

function validateForm(formData) {
    // Проверка пустых полей
    for (let key in formData) {
        if (!formData[key] || formData[key].toString().trim() === '') {
            showError('Заполните все поля формы!');
            return false;
        }
    }

    // Проверка возраста
    if (formData.age < 1 || formData.age > 120) {
        showError('Введите корректный возраст (от 1 до 120)!');
        return false;
    }

    // Проверка имени (мин 2 символа)
    if (formData.nickname.length < 2) {
        showError('Имя должно содержать минимум 2 символа!');
        return false;
    }

    return true;
}

function getDepartmentEmoji(department) {
    const emojiMap = {
        'СБ': '💰',
        'СКЛ': '📦',
        'ТГР': '🛍️',
        'ТТ': '🕵️',
        'ЗАК': '🔖',
        'ФНК': '💸',
        'КОН': '📝',
        'СОТ': '🤝',
        'В будущем выберу': '❓'
    };
    return emojiMap[department] || '📌';
}

// Form validation
document.getElementById('applicationForm').addEventListener('input', (e) => {
    const target = e.target;
    
    if (target.type === 'number' && target.id === 'age') {
        if (target.value > 120) target.value = 120;
        if (target.value < 1) target.value = 1;
    }
});

// Add focus effects
document.querySelectorAll('input, select').forEach(element => {
    element.addEventListener('focus', function() {
        this.parentElement.style.opacity = '1';
    });
});

console.log('📋 Application form loaded successfully!');
console.log('🎮 NEXUS Application System Ready');
console.log('🔐 Webhook encryption enabled!');