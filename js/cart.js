class CartPage {
    constructor() {
        this.cartItems = [];
        this.goodsData = [];
        this.init();
    }
    
    async init() {
        await this.loadCart();
        this.setupEventListeners();
        this.calculateTotal();
        this.updateCartCount();
    }
    
    async loadCart() {
        const cartIds = JSON.parse(localStorage.getItem('cart')) || [];
        
        if (cartIds.length === 0) {
            this.showEmptyCart();
            return;
        }
        
        try {
            const promises = cartIds.map(id => window.api.getGood(id));
            this.goodsData = await Promise.all(promises);
            
            const itemCounts = {};
            cartIds.forEach(id => {
                itemCounts[id] = (itemCounts[id] || 0) + 1;
            });
            
            this.cartItems = this.goodsData.map(good => {
                return {
                    ...good,
                    quantity: itemCounts[good.id] || 1
                };
            });
            
            this.displayCart();
        } catch (error) {
            console.error('Ошибка загрузки корзины:', error);
            showNotification('Ошибка загрузки корзины', 'error');
        }
    }
    
    displayCart() {
        const container = document.getElementById('cart-container');
        const emptyCart = document.getElementById('empty-cart');
        
        if (!container) return;
        
        if (this.cartItems.length === 0) {
            this.showEmptyCart();
            return;
        }
        
        if (container) {
            container.style.display = 'grid';
            container.innerHTML = this.cartItems.map(item => this.createCartItem(item)).join('');
        }
        
        if (emptyCart) {
            emptyCart.classList.add('hidden');
        }
    }
    
    createCartItem(item) {
        const hasDiscount = item.discount_price && item.discount_price < item.actual_price;
        
        return `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-image">
                    <img src="${item.image_url || 'https://via.placeholder.com/150x150?text=No+Image'}" 
                         alt="${item.name || 'Товар'}"
                         onerror="this.src='https://via.placeholder.com/150x150?text=No+Image'">
                </div>
                <div class="cart-item-info">
                    <h3 class="cart-item-title">${item.name || 'Без названия'}</h3>
                    <div class="cart-item-rating">
                        <i class="fas fa-star"></i> ${item.rating ? item.rating.toFixed(1) : 'Нет'}
                    </div>
                    <div class="cart-item-price">
                        ${hasDiscount ? `
                            ${item.discount_price} руб. 
                            <span class="discount">${item.actual_price} руб.</span>
                        ` : `
                            ${item.actual_price} руб.
                        `}
                    </div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn minus" data-id="${item.id}">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn plus" data-id="${item.id}">+</button>
                    </div>
                    <button class="btn btn-secondary remove-from-cart" data-id="${item.id}">
                        <i class="fas fa-trash"></i> Удалить все
                    </button>
                </div>
            </div>
        `;
    }
    
    showEmptyCart() {
        const container = document.getElementById('cart-container');
        const emptyCart = document.getElementById('empty-cart');
        
        if (container) container.style.display = 'none';
        if (emptyCart) {
            emptyCart.classList.remove('hidden');
            emptyCart.style.display = 'block';
        }
    }
    
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-from-cart')) {
                const button = e.target.closest('.remove-from-cart');
                const goodId = button.dataset.id;
                this.removeFromCart(goodId);
            }
            
            if (e.target.closest('.quantity-btn.minus')) {
                const button = e.target.closest('.quantity-btn.minus');
                const goodId = button.dataset.id;
                this.changeQuantity(goodId, -1);
            }
            
            if (e.target.closest('.quantity-btn.plus')) {
                const button = e.target.closest('.quantity-btn.plus');
                const goodId = button.dataset.id;
                this.changeQuantity(goodId, 1);
            }
        });
        
        const deliveryDate = document.getElementById('delivery_date');
        const deliveryInterval = document.getElementById('delivery_interval');
        
        if (deliveryDate) {
            deliveryDate.addEventListener('change', () => this.calculateTotal());
        }
        if (deliveryInterval) {
            deliveryInterval.addEventListener('change', () => this.calculateTotal());
        }
        
        const orderForm = document.getElementById('order-form');
        if (orderForm) {
            orderForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createOrder();
            });
        }
        
        // Устанавливаем минимальную дату как сегодня
        if (deliveryDate) {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const minDate = tomorrow.toISOString().split('T')[0];
            deliveryDate.min = minDate;
            deliveryDate.value = minDate;
        }
    }
    
    changeQuantity(goodId, delta) {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        
        if (delta > 0) {
            cart.push(parseInt(goodId));
        } else {
            const index = cart.indexOf(parseInt(goodId));
            if (index > -1) {
                cart.splice(index, 1);
            }
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        this.loadCart();
        this.updateCartCount();
        this.calculateTotal();
    }
    
    removeFromCart(goodId) {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        cart = cart.filter(id => id !== parseInt(goodId));
        localStorage.setItem('cart', JSON.stringify(cart));
        
        this.cartItems = this.cartItems.filter(item => item.id !== parseInt(goodId));
        
        if (this.cartItems.length === 0) {
            this.showEmptyCart();
        } else {
            this.displayCart();
        }
        
        this.calculateTotal();
        this.updateCartCount();
        showNotification('Товар удален из корзины', 'success');
    }
    
    calculateTotal() {
        const goodsTotal = this.cartItems.reduce((sum, item) => {
            const price = item.discount_price && item.discount_price < item.actual_price 
                ? item.discount_price 
                : item.actual_price;
            return sum + (price * (item.quantity || 1));
        }, 0);
        
        const deliveryDate = document.getElementById('delivery_date')?.value;
        const deliveryInterval = document.getElementById('delivery_interval')?.value;
        const deliveryCost = this.calculateDeliveryCost(deliveryDate, deliveryInterval);
        
        const goodsTotalEl = document.getElementById('goods-total');
        const deliveryCostEl = document.getElementById('delivery-cost');
        const orderTotalEl = document.getElementById('order-total');
        
        if (goodsTotalEl) goodsTotalEl.textContent = `${goodsTotal} руб.`;
        if (deliveryCostEl) deliveryCostEl.textContent = `${deliveryCost} руб.`;
        if (orderTotalEl) orderTotalEl.textContent = `${goodsTotal + deliveryCost} руб.`;
    }
    
    calculateDeliveryCost(date, interval) {
        if (!date || !interval) return 200;
        
        const deliveryDate = new Date(date);
        const dayOfWeek = deliveryDate.getDay();
        
        let cost = 200;
        
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            cost += 300;
        }
        
        if (interval === '18:00-22:00' && dayOfWeek >= 1 && dayOfWeek <= 5) {
            cost += 200;
        }
        
        return cost;
    }
    
    async createOrder() {
        const form = document.getElementById('order-form');
        if (!form) return;
        
        if (this.cartItems.length === 0) {
            showNotification('Добавьте товары в корзину перед оформлением заказа', 'error');
            return;
        }
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const formData = {
            full_name: document.getElementById('full_name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            subscribe: document.getElementById('subscribe').checked,
            delivery_address: document.getElementById('delivery_address').value,
            delivery_date: document.getElementById('delivery_date').value,
            delivery_interval: document.getElementById('delivery_interval').value,
            comment: document.getElementById('comment').value,
            good_ids: this.cartItems.flatMap(item => 
                Array(item.quantity || 1).fill(item.id)
            )
        };
        
        if (formData.delivery_date) {
            const dateParts = formData.delivery_date.split('-');
            formData.delivery_date = `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`;
        }
        
        try {
            const result = await window.api.createOrder(formData);
            
            localStorage.removeItem('cart');
            this.cartItems = [];
            this.displayCart();
            this.updateCartCount();
            
            showNotification('Заказ успешно оформлен!', 'success');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            
        } catch (error) {
            console.error('Ошибка оформления заказа:', error);
            showNotification(`Ошибка оформления заказа: ${error.message}`, 'error');
        }
    }
    
    updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const cartCountElements = document.querySelectorAll('.cart-count');
        
        cartCountElements.forEach(element => {
            element.textContent = cart.length;
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CartPage();
});