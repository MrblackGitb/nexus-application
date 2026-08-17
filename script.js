const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1538949823225532437/8DzetHQpVNd2L5QOGcTcrSfOh1VB6NzAttEoWf_a-CqPXT0mSmQe7OcGkcMyEag3aEbn';

document.getElementById('applicationForm').addEventListener('submit', async (e) => {
    e.preventDefault();

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
        errorMessage.style.display = 'block';
        errorMessage.innerHTML = '<p>✗ Ошибка при отправке заявки. Попробуйте позже или обратитесь к администратору.</p>';
        errorMessage.scrollIntoView({ behavior: 'smooth' });
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Отправить заявку';
    }
});

// Function to get emoji for department
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
