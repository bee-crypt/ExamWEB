function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU').format(price);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[\d\s\-\+\(\)]+$/;
    return re.test(phone);
}

function showNotification(message, type = 'info') {
    const notifications = document.querySelector('.notifications');
    if (!notifications) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notifications.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function replaceLastWord(text, newWord) {
    const words = text.trim().split(' ');
    words[words.length - 1] = newWord;
    return words.join(' ');
}

window.formatPrice = formatPrice;
window.debounce = debounce;
window.validateEmail = validateEmail;
window.validatePhone = validatePhone;
window.showNotification = showNotification;