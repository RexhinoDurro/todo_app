// static/js/api.js - API Communication Layer

const API_BASE = '/api';

// API Client Class
class ApiClient {
    constructor() {
        this.csrfToken = null;
    }
    
    // Initialize CSRF token
    async init() {
        try {
            const response = await fetch(`${API_BASE}/auth/csrf/`);
            const data = await response.json();
            this.csrfToken = data.csrfToken;
        } catch (error) {
            console.error('Failed to get CSRF token:', error);
        }
    }
    
    // Base request method
    async request(url, options = {}) {
        const defaultOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };
        
        // Add CSRF token for non-GET requests
        if (options.method && options.method !== 'GET' && this.csrfToken) {
            defaultOptions.headers['X-CSRFToken'] = this.csrfToken;
        }
        
        const response = await fetch(url, { ...defaultOptions, ...options });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new ApiError(response.status, error);
        }
        
        return response.json();
    }
    
    // GET request
    async get(endpoint, params = {}) {
        const url = new URL(`${API_BASE}${endpoint}`);
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });
        return this.request(url.toString());
    }
    
    // POST request
    async post(endpoint, data = {}) {
        return this.request(`${API_BASE}${endpoint}`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    // PUT request
    async put(endpoint, data = {}) {
        return this.request(`${API_BASE}${endpoint}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    // PATCH request
    async patch(endpoint, data = {}) {
        return this.request(`${API_BASE}${endpoint}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }
    
    // DELETE request
    async delete(endpoint) {
        return this.request(`${API_BASE}${endpoint}`, {
            method: 'DELETE'
        });
    }
    
    // File upload
    async upload(endpoint, formData) {
        return this.request(`${API_BASE}${endpoint}`, {
            method: 'POST',
            body: formData,
            headers: {} // Remove Content-Type to let browser set it
        });
    }
}

// Custom API Error
class ApiError extends Error {
    constructor(status, data) {
        super(data.error || data.message || 'API Error');
        this.status = status;
        this.data = data;
    }
}

// Create API client instance
const api = new ApiClient();

// Authentication API
const authAPI = {
    login: (credentials) => api.post('/auth/login/', credentials),
    
    register: (userData) => api.post('/auth/register/', userData),
    
    logout: () => api.post('/auth/logout/'),
    
    getCurrentUser: () => api.get('/auth/user/'),
    
    updateProfile: (userData) => api.put('/auth/user/update/', userData),
    
    checkAuth: async () => {
        try {
            const response = await api.get('/auth/user/');
            return { isAuthenticated: true, user: response.user };
        } catch (error) {
            return { isAuthenticated: false, user: null };
        }
    }
};

// Todo API
const todoAPI = {
    getAll: (params = {}) => api.get('/todos/', params),
    
    create: (todoData) => api.post('/todos/', todoData),
    
    get: (id) => api.get(`/todos/${id}/`),
    
    update: (id, todoData) => api.put(`/todos/${id}/`, todoData),
    
    delete: (id) => api.delete(`/todos/${id}/`),
    
    toggle: (id) => api.post(`/todos/${id}/toggle/`),
    
    share: (id, userIds) => api.post(`/todos/${id}/share/`, { user_ids: userIds }),
    
    reorder: (positions) => api.post('/todos/reorder/', { positions }),
    
    bulkAction: (action, todoIds) => api.post('/todos/bulk_action/', { 
        action, 
        todo_ids: todoIds 
    }),
    
    getComments: (todoId) => api.get(`/todos/${todoId}/comments/`),
    
    addComment: (todoId, comment) => api.post(`/todos/${todoId}/comments/`, { comment }),
    
    deleteComment: (commentId) => api.delete(`/comments/${commentId}/`),
    
    getAttachments: (todoId) => api.get(`/todos/${todoId}/attachments/`),
    
    uploadAttachment: (todoId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.upload(`/todos/${todoId}/attachments/`, formData);
    },
    
    deleteAttachment: (attachmentId) => api.delete(`/attachments/${attachmentId}/`)
};

// Category API
const categoryAPI = {
    getAll: () => api.get('/categories/'),
    
    create: (categoryData) => api.post('/categories/', categoryData),
    
    update: (id, categoryData) => api.put(`/categories/${id}/`, categoryData),
    
    delete: (id) => api.delete(`/categories/${id}/`)
};

// Template API
const templateAPI = {
    getAll: () => api.get('/templates/'),
    
    create: (templateData) => api.post('/templates/', templateData),
    
    get: (id) => api.get(`/templates/${id}/`),
    
    update: (id, templateData) => api.put(`/templates/${id}/`, templateData),
    
    delete: (id) => api.delete(`/templates/${id}/`),
    
    createTodoFromTemplate: (templateId) => api.post(`/templates/${templateId}/create_todo/`)
};

// Statistics API
const statsAPI = {
    getOverview: () => api.get('/stats/'),
    
    getActivity: (days = 7) => api.get('/activity/', { days }),
    
    getProductivity: (startDate, endDate) => api.get('/stats/productivity/', {
        start_date: startDate,
        end_date: endDate
    })
};

// User API
const userAPI = {
    search: (query) => api.get('/users/search/', { q: query }),
    
    getPreferences: () => api.get('/preferences/'),
    
    updatePreferences: (preferences) => api.put('/preferences/', preferences)
};

// Export functions
const exportAPI = {
    exportTodos: (format = 'json') => api.get('/todos/export/', { format }),
    
    importTodos: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.upload('/todos/import/', formData);
    }
};

// WebSocket connection for real-time updates (if needed)
class RealtimeConnection {
    constructor() {
        this.ws = null;
        this.reconnectInterval = 5000;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.listeners = {};
    }
    
    connect(userId) {
        if (this.ws) return;
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/todos/${userId}/`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.emit(data.type, data.payload);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.ws = null;
            this.attemptReconnect(userId);
        };
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
    
    attemptReconnect(userId) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }
        
        this.reconnectAttempts++;
        setTimeout(() => {
            console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.connect(userId);
        }, this.reconnectInterval);
    }
    
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }
    
    off(event, callback) {
        if (!this.listeners[event]) return;
        
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
    
    emit(event, data) {
        if (!this.listeners[event]) return;
        
        this.listeners[event].forEach(callback => {
            callback(data);
        });
    }
    
    send(type, payload) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket is not connected');
            return;
        }
        
        this.ws.send(JSON.stringify({ type, payload }));
    }
}

// Create realtime connection instance
const realtime = new RealtimeConnection();

// Export all APIs
window.api = api;
window.authAPI = authAPI;
window.todoAPI = todoAPI;
window.categoryAPI = categoryAPI;
window.templateAPI = templateAPI;
window.statsAPI = statsAPI;
window.userAPI = userAPI;
window.exportAPI = exportAPI;
window.realtime = realtime;