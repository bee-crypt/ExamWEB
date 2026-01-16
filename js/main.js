class MainPage {
    constructor() {
        this.currentPage = 1;
        this.perPage = 12;
        this.sortOrder = '';
        this.currentQuery = '';
        this.allGoods = [];
        this.filteredGoods = [];
        this.filters = {
            categories: [],
            minPrice: null,
            maxPrice: null,
            discountOnly: false
        };
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadAllGoods();
        await this.loadCategories();
        await this.loadGoods();
        this.updateCartCount();
        this.updateCartButtons();
    }
    
    async loadAllGoods() {
        try {
            const response = await window.api.getGoods(1, 100, '', '');
            this.allGoods = response.goods || response;
            
            if (!this.allGoods || !Array.isArray(this.allGoods)) {
                this.allGoods = [];
            }
        } catch (error) {
            console.error('Ошибка загрузки товаров:', error);
            this.allGoods = [];
            showNotification('Ошибка загрузки товаров', 'error');
        }
    }
    
    setupEventListeners() {
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        const autocompleteDropdown = document.querySelector('.autocomplete-dropdown');
        
        if (searchInput && autocompleteDropdown) {
            const debouncedAutocomplete = debounce((query) => {
                if (query.length >= 2) {
                    this.handleAutocomplete(query);
                } else {
                    autocompleteDropdown.style.display = 'none';
                    autocompleteDropdown.innerHTML = '';
                }
            }, 300);
            
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                debouncedAutocomplete(query);
            });
            
            searchInput.addEventListener('blur', () => {
                setTimeout(() => {
                    autocompleteDropdown.style.display = 'none';
                }, 200);
            });
            
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch();
                    autocompleteDropdown.style.display = 'none';
                }
            });
        }
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.handleSearch();
                const dropdown = document.querySelector('.autocomplete-dropdown');
                if (dropdown) dropdown.style.display = 'none';
            });
        }
        
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortOrder = e.target.value;
                this.currentPage = 1;
                this.processAndDisplayGoods();
            });
        }
        
        const applyBtn = document.getElementById('apply-filters');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyFilters();
            });
        }
        
        const resetBtn = document.getElementById('reset-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetFilters();
            });
        }
        
        const loadMoreBtn = document.getElementById('load-more');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMore();
            });
        }
        
        document.addEventListener('click', (e) => {
            if (e.target.closest('.add-to-cart')) {
                const button = e.target.closest('.add-to-cart');
                const goodId = button.dataset.id;
                if (goodId) {
                    this.toggleCart(goodId);
                }
            }
        });
    }
    
    async handleAutocomplete(query) {
        try {
            const suggestions = await window.api.getAutocomplete(query);
            this.showAutocomplete(suggestions, query);
        } catch (error) {
            console.error('Ошибка автодополнения:', error);
        }
    }
    
    showAutocomplete(suggestions, currentQuery) {
        const dropdown = document.querySelector('.autocomplete-dropdown');
        const searchInput = document.getElementById('search-input');
        
        if (!dropdown || !searchInput) return;
        
        if (!suggestions || suggestions.length === 0) {
            dropdown.style.display = 'none';
            dropdown.innerHTML = '';
            return;
        }
        
        dropdown.innerHTML = '';
        
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = suggestion;
            
            item.addEventListener('click', () => {
                const words = currentQuery.split(' ');
                words[words.length - 1] = suggestion;
                const newQuery = words.join(' ');
                
                searchInput.value = newQuery;
                dropdown.style.display = 'none';
                
                this.currentQuery = newQuery;
                this.currentPage = 1;
                this.searchGoods();
            });
            
            dropdown.appendChild(item);
        });
        
        dropdown.style.display = 'block';
    }
    
    handleSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            this.currentQuery = searchInput.value.trim();
            this.currentPage = 1;
            
            if (this.currentQuery) {
                this.searchGoods();
            } else {
                this.currentQuery = '';
                this.loadAllGoods().then(() => {
                    this.processAndDisplayGoods();
                });
            }
        }
    }
    
    async searchGoods() {
        try {
            const response = await window.api.getGoods(1, 100, this.sortOrder, this.currentQuery);
            this.allGoods = response.goods || response;
            this.processAndDisplayGoods();
            
            const container = document.getElementById('goods-container');
            if (this.allGoods.length === 0 && this.currentQuery) {
                container.innerHTML = '<p>Нет товаров, соответствующих вашему запросу</p>';
                this.updateLoadMoreButton();
            }
        } catch (error) {
            console.error('Ошибка поиска:', error);
            showNotification('Ошибка поиска товаров', 'error');
        }
    }
    
    async loadCategories() {
        try {
            if (!this.allGoods || this.allGoods.length === 0) return;
            
            const categories = [...new Set(this.allGoods
                .map(good => good.main_category)
                .filter(category => category && category.trim() !== '')
                .sort()
            )];
            
            const categoriesList = document.querySelector('.categories-list');
            if (categoriesList) {
                if (categories.length === 0) {
                    categoriesList.innerHTML = '<p>Категории не найдены</p>';
                    return;
                }
                
                categoriesList.innerHTML = categories.map(category => `
                    <label class="checkbox-label">
                        <input type="checkbox" value="${category}">
                        <span>${category}</span>
                    </label>
                `).join('');
                
                categoriesList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                    checkbox.addEventListener('change', () => {
                        this.applyFilters();
                    });
                });
            }
        } catch (error) {
            console.error('Ошибка загрузки категорий:', error);
        }
    }
    
    applyFilters() {
        const checkboxes = document.querySelectorAll('.categories-list input[type="checkbox"]:checked');
        this.filters.categories = Array.from(checkboxes).map(cb => cb.value);
        
        const priceMin = document.getElementById('price-min');
        const priceMax = document.getElementById('price-max');
        const discountOnly = document.getElementById('discount-only');
        
        this.filters.minPrice = priceMin && priceMin.value ? parseInt(priceMin.value) : null;
        this.filters.maxPrice = priceMax && priceMax.value ? parseInt(priceMax.value) : null;
        this.filters.discountOnly = discountOnly ? discountOnly.checked : false;
        
        this.currentPage = 1;
        this.processAndDisplayGoods();
    }
    
    resetFilters() {
        const checkboxes = document.querySelectorAll('.categories-list input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
        
        const priceMin = document.getElementById('price-min');
        const priceMax = document.getElementById('price-max');
        const discountOnly = document.getElementById('discount-only');
        
        if (priceMin) priceMin.value = '';
        if (priceMax) priceMax.value = '';
        if (discountOnly) discountOnly.checked = false;
        
        this.filters = {
            categories: [],
            minPrice: null,
            maxPrice: null,
            discountOnly: false
        };
        
        this.currentPage = 1;
        this.processAndDisplayGoods();
    }
    
    processAndDisplayGoods() {
        this.filteredGoods = this.filterGoods(this.allGoods);
        
        if (this.sortOrder && this.filteredGoods.length > 0) {
            this.filteredGoods = this.sortGoods(this.filteredGoods, this.sortOrder);
        }
        
        this.displayCurrentPage();
    }
    
    filterGoods(goods) {
        if (!goods || !Array.isArray(goods)) return [];
        
        return goods.filter(good => {
            let pass = true;
            
            if (this.filters.categories.length > 0 && good.main_category) {
                pass = pass && this.filters.categories.includes(good.main_category);
            }
            
            const price = good.discount_price || good.actual_price || 0;
            
            if (this.filters.minPrice !== null) {
                pass = pass && price >= this.filters.minPrice;
            }
            
            if (this.filters.maxPrice !== null) {
                pass = pass && price <= this.filters.maxPrice;
            }
            
            if (this.filters.discountOnly) {
                pass = pass && good.discount_price && good.discount_price < good.actual_price;
            }
            
            if (this.currentQuery) {
                const query = this.currentQuery.toLowerCase();
                const name = good.name ? good.name.toLowerCase() : '';
                pass = pass && name.includes(query);
            }
            
            return pass;
        });
    }
    
    sortGoods(goods, sortOrder) {
        const sortedGoods = [...goods];
        
        switch(sortOrder) {
            case 'rating_asc':
                sortedGoods.sort((a, b) => (a.rating || 0) - (b.rating || 0));
                break;
                
            case 'rating_desc':
                sortedGoods.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
                
            case 'price_asc':
                sortedGoods.sort((a, b) => {
                    const priceA = a.discount_price || a.actual_price || 0;
                    const priceB = b.discount_price || b.actual_price || 0;
                    return priceA - priceB;
                });
                break;
                
            case 'price_desc':
                sortedGoods.sort((a, b) => {
                    const priceA = a.discount_price || a.actual_price || 0;
                    const priceB = b.discount_price || b.actual_price || 0;
                    return priceB - priceA;
                });
                break;
        }
        
        return sortedGoods;
    }
    
    displayCurrentPage() {
        const container = document.getElementById('goods-container');
        if (!container) return;
        
        if (!this.filteredGoods || this.filteredGoods.length === 0) {
            const message = this.currentQuery 
                ? '<p>Нет товаров, соответствующих вашему запросу</p>'
                : '<p>Товары не найдены</p>';
            container.innerHTML = message;
            this.updateLoadMoreButton();
            return;
        }
        
        const startIndex = (this.currentPage - 1) * this.perPage;
        const endIndex = Math.min(startIndex + this.perPage, this.filteredGoods.length);
        const goodsToShow = this.filteredGoods.slice(startIndex, endIndex);
        
        if (this.currentPage === 1) {
            container.innerHTML = goodsToShow.map(good => this.createGoodCard(good)).join('');
        } else {
            container.innerHTML += goodsToShow.map(good => this.createGoodCard(good)).join('');
        }
        
        this.updateCartButtons();
        this.updateLoadMoreButton();
    }
    
    updateLoadMoreButton() {
        const loadMoreBtn = document.getElementById('load-more');
        if (loadMoreBtn) {
            const totalPages = Math.ceil(this.filteredGoods.length / this.perPage);
            const hasMore = this.currentPage < totalPages;
            loadMoreBtn.style.display = hasMore ? 'block' : 'none';
        }
    }
    
    loadGoods() {
        this.processAndDisplayGoods();
    }
    
    loadMore() {
        this.currentPage++;
        this.displayCurrentPage();
    }
    
    createGoodCard(good) {
        if (!good || !good.id) return '';
        
        const hasDiscount = good.discount_price && good.discount_price < good.actual_price;
        const actualPrice = good.actual_price || 0;
        const discountPrice = good.discount_price || 0;
        
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const isInCart = cart.includes(good.id);
        
        return `
            <div class="good-card" data-id="${good.id}" data-price="${hasDiscount ? discountPrice : actualPrice}" data-category="${good.main_category || ''}">
                <div class="good-image">
                    <img src="${good.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}" 
                         alt="${good.name || 'Товар'}" 
                         loading="lazy"
                         onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                </div>
                <div class="good-info">
                    <h3 class="good-title" title="${good.name || ''}">${(good.name || '').substring(0, 60)}${good.name && good.name.length > 60 ? '...' : ''}</h3>
                    <div class="good-rating">
                        <i class="fas fa-star"></i>
                        <span>${good.rating ? good.rating.toFixed(1) : 'Нет'}</span>
                    </div>
                    <div class="good-price">
                        ${hasDiscount ? `
                            <span class="discount-price">${actualPrice} руб.</span>
                            <span class="actual-price">${discountPrice} руб.</span>
                        ` : `
                            <span class="actual-price">${actualPrice} руб.</span>
                        `}
                    </div>
                    <button class="btn add-to-cart ${isInCart ? 'in-cart' : ''}" data-id="${good.id}" style="${isInCart ? 'background-color: var(--error-color);' : ''}">
                        ${isInCart ? '<i class="fas fa-trash"></i> Удалить' : '<i class="fas fa-cart-plus"></i> Добавить'}
                    </button>
                </div>
            </div>
        `;
    }
    
    toggleCart(goodId) {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const numericId = parseInt(goodId);
        const index = cart.indexOf(numericId);
        
        if (index === -1) {
            cart.push(numericId);
            showNotification('Товар добавлен в корзину', 'success');
        } else {
            cart.splice(index, 1);
            showNotification('Товар удален из корзины', 'success');
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        this.updateCartCount();
        this.updateCartButtons();
    }
    
    updateCartButtons() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        
        document.querySelectorAll('.good-card').forEach(card => {
            const goodId = parseInt(card.dataset.id);
            const button = card.querySelector('.add-to-cart');
            
            if (!button) return;
            
            const isInCart = cart.includes(goodId);
            
            if (isInCart) {
                button.innerHTML = '<i class="fas fa-trash"></i> Удалить';
                button.classList.add('in-cart');
                button.style.backgroundColor = 'var(--error-color)';
            } else {
                button.innerHTML = '<i class="fas fa-cart-plus"></i> Добавить';
                button.classList.remove('in-cart');
                button.style.backgroundColor = '';
            }
        });
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
    new MainPage();
});