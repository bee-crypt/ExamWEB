const API = {
    baseURL: 'https://edu.std-900.ist.mospolytech.ru/exam-2024-1/api',
    apiKey: 'c30b46cc-2071-4915-a50e-9e5e0e77682a',
    
    async request(endpoint, method = 'GET', data = null) {
        const url = `${this.baseURL}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${this.apiKey}`;
        
        const options = {
            method,
            headers: {'Accept': 'application/json'}
        };
        
        if (data) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            const result = await response.json();
            
            if (!response.ok) throw new Error(result.error || 'Ошибка запроса');
            
            return result;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    async getGoods(page = 1, perPage = 10, sortOrder = '', query = '') {
        let url = `/goods?page=${page}&per_page=${perPage}`;
        if (sortOrder) url += `&sort_order=${sortOrder}`;
        if (query) url += `&query=${encodeURIComponent(query)}`;
        return this.request(url);
    },
    
    async getGood(id) {
        return this.request(`/goods/${id}`);
    },
    
    async getAutocomplete(query) {
        try {
            const result = await this.request(`/autocomplete?query=${encodeURIComponent(query)}`);
            return Array.isArray(result) ? result : [];
        } catch (error) {
            console.error('Autocomplete error:', error);
            return [];
        }
    },
    
    async getOrders() {
        return this.request('/orders');
    },
    
    async getOrder(id) {
        return this.request(`/orders/${id}`);
    },
    
    async createOrder(orderData) {
        return this.request('/orders', 'POST', orderData);
    },
    
    async updateOrder(id, orderData) {
        return this.request(`/orders/${id}`, 'PUT', orderData);
    },
    
    async deleteOrder(id) {
        return this.request(`/orders/${id}`, 'DELETE');
    }
};

window.api = API;