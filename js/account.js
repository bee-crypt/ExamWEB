class AccountPage {
    constructor() {
        this.orders = [];
        this.currentOrder = null;
        this.goodsCache = {};
        this.init();
    }
    
    async init() {
        this.setupModalListeners();
        await this.loadOrders();
        this.updateCartCount();
    }
    
    setupModalListeners() {
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', function() {
                this.closest('.modal').style.display = 'none';
            });
        });
        
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
        
        document.getElementById('save-order-changes').addEventListener('click', () => {
            this.saveOrderChanges();
        });
        
        document.getElementById('cancel-delete').addEventListener('click', () => {
            document.getElementById('delete-modal').style.display = 'none';
        });
        
        document.getElementById('confirm-delete').addEventListener('click', () => {
            this.deleteCurrentOrder();
        });
    }
    
    async loadOrders() {
        try {
            this.orders = await window.api.getOrders();
            await this.loadGoodsForOrders();
            this.displayOrders();
        } catch (error) {
            console.error('Ошибка загрузки заказов:', error);
            this.showNotification('Ошибка загрузки заказов', 'error');
            this.showNoOrdersMessage();
        }
    }
    
    async loadGoodsForOrders() {
        const allGoodIds = [];
        this.orders.forEach(order => {
            if (order.good_ids && Array.isArray(order.good_ids)) {
                allGoodIds.push(...order.good_ids);
            }
        });
        
        const uniqueGoodIds = [...new Set(allGoodIds)];
        
        // Загружаем информацию о товарах
        const promises = uniqueGoodIds.map(id => {
            if (!this.goodsCache[id]) {
                return window.api.getGood(id).then(good => {
                    this.goodsCache[id] = good;
                    return good;
                }).catch(error => {
                    console.error(`Ошибка загрузки товара ${id}:`, error);
                    return { id, name: 'Товар не найден', actual_price: 0 };
                });
            }
            return Promise.resolve(this.goodsCache[id]);
        });
        
        await Promise.all(promises);
    }
    
    displayOrders() {
        const tbody = document.querySelector('#orders-table tbody');
        
        if (!this.orders || this.orders.length === 0) {
            this.showNoOrdersMessage();
            return;
        }
        
        tbody.innerHTML = this.orders.map((order, index) => this.createOrderRow(order, index)).join('');
        
        this.addOrderButtonsListeners();
    }
    
    createOrderRow(order, index) {
        const goodsList = this.getGoodsList(order.good_ids);
        const totalPrice = this.calculateOrderTotal(order.good_ids);
        const formattedDate = this.formatDate(order.created_at);
        const deliveryDate = this.formatDeliveryDate(order.delivery_date, order.delivery_interval);
        
        return `
            <tr data-id="${order.id}">
                <td>${index + 1}</td>
                <td>${formattedDate}</td>
                <td class="goods-list" title="${goodsList.full}">${goodsList.short}</td>
                <td>${totalPrice} руб.</td>
                <td>${deliveryDate}</td>
                <td>
                    <button class="btn-icon view-order" data-id="${order.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon edit-order" data-id="${order.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete-order" data-id="${order.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }
    
    getGoodsList(goodIds) {
        if (!goodIds || goodIds.length === 0) {
            return { short: 'Нет товаров', full: 'Нет товаров' };
        }
        
        const goodsNames = goodIds.map(id => {
            const good = this.goodsCache[id];
            return good ? good.name : `Товар #${id}`;
        });
        
        const fullList = goodsNames.join(', ');
        const shortList = goodsNames.length > 2 
            ? `${goodsNames.slice(0, 2).join(', ')}, +${goodsNames.length - 2} еще...`
            : fullList;
        
        return { short: shortList, full: fullList };
    }
    
    calculateOrderTotal(goodIds) {
        if (!goodIds || goodIds.length === 0) return 0;
        
        let total = 0;
        goodIds.forEach(id => {
            const good = this.goodsCache[id];
            if (good) {
                const price = good.discount_price || good.actual_price || 0;
                total += price;
            }
        });
        
        return total;
    }
    
    formatDate(dateString) {
        if (!dateString) return 'Не указано';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }
    
    formatDeliveryDate(dateString, interval) {
        if (!dateString || !interval) return 'Не указано';
        
        try {
            const [day, month, year] = dateString.split('.');
            const date = new Date(`${year}-${month}-${day}`);
            
            return `${date.toLocaleDateString('ru-RU')} ${interval}`;
        } catch (error) {
            return `${dateString} ${interval}`;
        }
    }
    
    addOrderButtonsListeners() {
        // просмотр заказа
        document.querySelectorAll('.view-order').forEach(button => {
            button.addEventListener('click', (e) => {
                const orderId = e.currentTarget.dataset.id;
                this.viewOrder(orderId);
            });
        });
        
        // редактирование заказа
        document.querySelectorAll('.edit-order').forEach(button => {
            button.addEventListener('click', (e) => {
                const orderId = e.currentTarget.dataset.id;
                this.editOrder(orderId);
            });
        });
        
        // удаление заказа
        document.querySelectorAll('.delete-order').forEach(button => {
            button.addEventListener('click', (e) => {
                const orderId = e.currentTarget.dataset.id;
                this.confirmDeleteOrder(orderId);
            });
        });
    }
    
    async viewOrder(orderId) {
        try {
            const order = await window.api.getOrder(orderId);
            this.currentOrder = order;
            
            const goodsList = this.getGoodsList(order.good_ids);
            const totalPrice = this.calculateOrderTotal(order.good_ids);
            
            document.getElementById('view-modal-title').textContent = `Просмотр заказа #${order.id}`;
            
            document.getElementById('view-modal-body').innerHTML = `
                <div class="order-details">
                    <div class="detail-row">
                        <strong>Имя:</strong> ${order.full_name || 'Не указано'}
                    </div>
                    <div class="detail-row">
                        <strong>Email:</strong> ${order.email || 'Не указано'}
                    </div>
                    <div class="detail-row">
                        <strong>Телефон:</strong> ${order.phone || 'Не указано'}
                    </div>
                    <div class="detail-row">
                        <strong>Адрес доставки:</strong> ${order.delivery_address || 'Не указано'}
                    </div>
                    <div class="detail-row">
                        <strong>Дата и время доставки:</strong> ${this.formatDeliveryDate(order.delivery_date, order.delivery_interval)}
                    </div>
                    <div class="detail-row">
                        <strong>Комментарий:</strong> ${order.comment || 'Нет комментария'}
                    </div>
                    <div class="detail-row">
                        <strong>Подписка на рассылку:</strong> ${order.subscribe ? 'Да' : 'Нет'}
                    </div>
                    <div class="detail-row">
                        <strong>Товары:</strong> ${goodsList.full}
                    </div>
                    <div class="detail-row">
                        <strong>Итоговая стоимость:</strong> ${totalPrice} руб.
                    </div>
                    <div class="detail-row">
                        <strong>Дата создания:</strong> ${this.formatDate(order.created_at)}
                    </div>
                    ${order.updated_at ? `
                    <div class="detail-row">
                        <strong>Дата обновления:</strong> ${this.formatDate(order.updated_at)}
                    </div>` : ''}
                </div>
            `;
            
            document.getElementById('view-modal').style.display = 'flex';
            
        } catch (error) {
            console.error('Ошибка загрузки заказа:', error);
            this.showNotification('Ошибка загрузки данных заказа', 'error');
        }
    }
    
    async editOrder(orderId) {
        try {
            const order = await window.api.getOrder(orderId);
            this.currentOrder = order;
            
            // дата в yyyy-mm-dd
            let formattedDate = order.delivery_date;
            if (order.delivery_date && order.delivery_date.includes('.')) {
                const [day, month, year] = order.delivery_date.split('.');
                formattedDate = `${year}-${month}-${day}`;
            }
            
            // заполн форму редактирования
            document.getElementById('edit-modal-title').textContent = `Редактирование заказа #${order.id}`;
            document.getElementById('edit-full-name').value = order.full_name || '';
            document.getElementById('edit-email').value = order.email || '';
            document.getElementById('edit-phone').value = order.phone || '';
            document.getElementById('edit-address').value = order.delivery_address || '';
            document.getElementById('edit-date').value = formattedDate;
            document.getElementById('edit-interval').value = order.delivery_interval || '';
            document.getElementById('edit-comment').value = order.comment || '';
            
            // минимальная дата сегодня
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const minDate = tomorrow.toISOString().split('T')[0];
            document.getElementById('edit-date').min = minDate;
            
            document.getElementById('edit-modal').style.display = 'flex';
            
        } catch (error) {
            console.error('Ошибка загрузки заказа:', error);
            this.showNotification('Ошибка загрузки данных заказа', 'error');
        }
    }
    
    async saveOrderChanges() {
        const form = document.getElementById('edit-order-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const updateData = {
            full_name: document.getElementById('edit-full-name').value,
            email: document.getElementById('edit-email').value,
            phone: document.getElementById('edit-phone').value,
            delivery_address: document.getElementById('edit-address').value,
            delivery_date: document.getElementById('edit-date').value,
            delivery_interval: document.getElementById('edit-interval').value,
            comment: document.getElementById('edit-comment').value
        };
        
        // дата в dd.mm.yyyy
        if (updateData.delivery_date) {
            const [year, month, day] = updateData.delivery_date.split('-');
            updateData.delivery_date = `${day}.${month}.${year}`;
        }
        
        try {
            const result = await window.api.updateOrder(this.currentOrder.id, updateData);
            
            // обновление заказа в списке
            const orderIndex = this.orders.findIndex(o => o.id === this.currentOrder.id);
            if (orderIndex !== -1) {
                this.orders[orderIndex] = { 
                    ...this.orders[orderIndex], 
                    ...updateData,
                    updated_at: result.updated_at || new Date().toISOString()
                };
                this.displayOrders();
            }
            
            document.getElementById('edit-modal').style.display = 'none';
            this.showNotification('Заказ успешно обновлен', 'success');
            
        } catch (error) {
            console.error('Ошибка обновления заказа:', error);
            this.showNotification(`Ошибка обновления заказа: ${error.message}`, 'error');
        }
    }
    
    confirmDeleteOrder(orderId) {
        const order = this.orders.find(o => o.id === parseInt(orderId));
        if (order) {
            this.currentOrder = order;
            document.getElementById('delete-modal').style.display = 'flex';
        }
    }
    
    async deleteCurrentOrder() {
        if (!this.currentOrder) return;
        
        try {
            await window.api.deleteOrder(this.currentOrder.id);
            
            // удаление заказа
            this.orders = this.orders.filter(order => order.id !== this.currentOrder.id);
            this.displayOrders();
            
            document.getElementById('delete-modal').style.display = 'none';
            this.showNotification('Заказ успешно удален', 'success');
            
        } catch (error) {
            console.error('Ошибка удаления заказа:', error);
            this.showNotification(`Ошибка удаления заказа: ${error.message}`, 'error');
        }
    }
    
    showNoOrdersMessage() {
        const tbody = document.querySelector('#orders-table tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="no-orders">
                        <p>У вас еще нет заказов</p>
                        <a href="index.html" class="btn">Перейти в каталог</a>
                    </td>
                </tr>
            `;
        }
    }
    
    updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            cartCount.textContent = cart.length;
        }
    }
    
    showNotification(message, type = 'info') {
        const notifications = document.querySelector('.notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        notifications.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AccountPage();
});