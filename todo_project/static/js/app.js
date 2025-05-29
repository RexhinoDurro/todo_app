// static/js/app.js - Main Application Initialization and State Management

// Global Application State
const AppState = {
    initialized: false,
    loading: false,
    currentView: 'todos',
    filters: {
        category: 'all',
        status: 'all',
        search: ''
    }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Todo App...');
    
    try {
        // Initialize API client
        await api.init();
        
        // Check authentication
        const isAuthenticated = await checkAuthentication();
        
        if (isAuthenticated) {
            showApp();
            await initializeApp();
        } else {
            showAuth();
        }
        
        // Setup global event listeners
        setupGlobalEventListeners();
        
        // Mark as initialized
        AppState.initialized = true;
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
});

// Initialize authenticated app
async function initializeApp() {
    console.log('Initializing authenticated app...');
    
    try {
        // Load all initial data in parallel
        await Promise.all([
            loadCategories(),
            loadTodos(),
            loadActivity(),
            loadStatistics()
        ]);
        
        // Initialize UI components
        initializeCharts();
        setupSearch();
        setupFilterTabs();
        setupKeyboardShortcuts();
        
        // Setup realtime connection if user is authenticated
        if (auth.user) {
            // realtime.connect(auth.user.id);
            // setupRealtimeHandlers();
        }
        
        console.log('App initialization complete');
        
    } catch (error) {
        console.error('Failed to load app data:', error);
        showError('Failed to load application data');
    }
}

// Load all application data
async function loadAppData() {
    await Promise.all([
        loadCategories(),
        loadTodos(),
        loadActivity(),
        loadStatistics()
    ]);
    
    updateAllCharts();
}

// Load Activity Feed
async function loadActivity() {
    try {
        const activities = await statsAPI.getActivity();
        renderActivityFeed(activities);
    } catch (error) {
        console.error('Failed to load activity:', error);
    }
}

// Render Activity Feed
function renderActivityFeed(activities) {
    const activityList = document.getElementById('activityList');
    if (!activityList) return;
    
    if (!activities || activities.length === 0) {
        activityList.innerHTML = '<p class="text-muted text-center">No recent activity</p>';
        return;
    }
    
    const activityHtml = activities.slice(0, 10).map(activity => {
        const icon = getActivityIcon(activity.action);
        const time = formatRelativeTime(activity.timestamp);
        
        return `
            <div class="activity-item">
                <div class="activity-icon">${icon}</div>
                <div class="activity-content">
                    <div>${getActivityMessage(activity)}</div>
                    <div class="activity-time">${time}</div>
                </div>
            </div>
        `;
    }).join('');
    
    activityList.innerHTML = activityHtml;
}

// Get activity icon
function getActivityIcon(action) {
    const icons = {
        created: '➕',
        updated: '✏️',
        completed: '✅',
        deleted: '🗑️',
        shared: '🤝',
        commented: '💬',
        attached: '📎'
    };
    return icons[action] || '📌';
}

// Get activity message
function getActivityMessage(activity) {
    const action = activity.action;
    const title = escapeHtml(activity.todo_title);
    
    switch (action) {
        case 'created':
            return `Created task "<strong>${title}</strong>"`;
        case 'completed':
            return `Completed task "<strong>${title}</strong>"`;
        case 'updated':
            return `Updated task "<strong>${title}</strong>"`;
        case 'deleted':
            return `Deleted task "<strong>${title}</strong>"`;
        case 'shared':
            return `Shared task "<strong>${title}</strong>"`;
        case 'commented':
            return `Commented on "<strong>${title}</strong>"`;
        case 'attached':
            return `Attached file to "<strong>${title}</strong>"`;
        default:
            return `${capitalizeFirst(action)} "<strong>${title}</strong>"`;
    }
}

// Load Statistics
async function loadStatistics() {
    try {
        const stats = await statsAPI.getOverview();
        updateStatisticsDisplay(stats);
    } catch (error) {
        console.error('Failed to load statistics:', error);
    }
}

// Update Statistics Display
function updateStatisticsDisplay(stats) {
    if (!stats || !stats.overview) return;
    
    const { overview } = stats;
    
    document.getElementById('totalTasks').textContent = overview.total || 0;
    document.getElementById('completedTasks').textContent = overview.completed || 0;
    document.getElementById('activeTasks').textContent = overview.active || 0;
    document.getElementById('completionRate').textContent = `${overview.completion_rate || 0}%`;
    
    updateProgress('progressBar', overview.completion_rate || 0);
}

// Setup Global Event Listeners
function setupGlobalEventListeners() {
    // Todo form submission
    const todoForm = document.getElementById('todoForm');
    if (todoForm) {
        todoForm.addEventListener('submit', handleTodoSubmit);
    }
    
    // Profile form submission
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', updateProfile);
    }
    
    // Recurring task checkbox
    const isRecurring = document.getElementById('isRecurring');
    if (isRecurring) {
        isRecurring.addEventListener('change', (e) => {
            document.getElementById('recurrenceOptions').style.display = 
                e.target.checked ? 'block' : 'none';
        });
    }
    
    // Window resize handler
    window.addEventListener('resize', debounce(() => {
        if (window.productivityChart) window.productivityChart.resize();
        if (window.categoryChart) window.categoryChart.resize();
    }, 250));
    
    // Online/Offline handlers
    window.addEventListener('online', () => {
        showSuccess('Connection restored');
        loadAppData();
    });
    
    window.addEventListener('offline', () => {
        showWarning('You are offline. Some features may not work.');
    });
    
    // Before unload warning for unsaved changes
    window.addEventListener('beforeunload', (e) => {
        const form = document.getElementById('todoForm');
        if (form && form.querySelector('#title').value) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

// Setup Keyboard Shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Check if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        if (e.ctrlKey || e.metaKey) {
            switch(e.key.toLowerCase()) {
                case 'n':
                    e.preventDefault();
                    document.getElementById('title').focus();
                    break;
                case 'f':
                    e.preventDefault();
                    document.getElementById('searchInput').focus();
                    break;
                case 'e':
                    e.preventDefault();
                    exportTodos();
                    break;
                case 't':
                    e.preventDefault();
                    toggleTheme();
                    break;
                case 'd':
                    e.preventDefault();
                    deleteCompleted();
                    break;
                case 's':
                    e.preventDefault();
                    if (window.editingId) {
                        document.getElementById('todoForm').dispatchEvent(new Event('submit'));
                    }
                    break;
            }
        }
        
        // Single key shortcuts
        switch(e.key) {
            case '?':
                if (!e.shiftKey) return;
                e.preventDefault();
                showShortcuts();
                break;
            case 'Escape':
                if (window.editingId) {
                    window.editingId = null;
                    document.getElementById('todoForm').reset();
                }
                break;
        }
    });
}

// Delete all completed todos
async function deleteCompleted() {
    const completedTodos = window.todos.filter(t => t.completed);
    
    if (completedTodos.length === 0) {
        showInfo('No completed tasks to delete');
        return;
    }
    
    confirmAction(
        `Delete ${completedTodos.length} completed tasks?`,
        async () => {
            try {
                const todoIds = completedTodos.map(t => t.id);
                await todoAPI.bulkAction('delete', todoIds);
                await loadTodos();
                showSuccess(`${completedTodos.length} completed tasks deleted`);
            } catch (error) {
                console.error('Failed to delete completed todos:', error);
                showError('Failed to delete completed tasks');
            }
        }
    );
}

// Setup Realtime Handlers
function setupRealtimeHandlers() {
    realtime.on('todo.created', (data) => {
        if (data.user_id !== auth.user.id) {
            showInfo(`New task created: ${data.title}`);
            loadTodos();
        }
    });
    
    realtime.on('todo.updated', (data) => {
        if (data.user_id !== auth.user.id) {
            loadTodos();
        }
    });
    
    realtime.on('todo.deleted', (data) => {
        if (data.user_id !== auth.user.id) {
            loadTodos();
        }
    });
    
    realtime.on('todo.shared', (data) => {
        if (data.shared_with.includes(auth.user.id)) {
            showInfo(`A task was shared with you: ${data.title}`);
            loadTodos();
        }
    });
}

// Share Todo
let currentTodoForShare = null;
let selectedUsersForShare = [];

window.showShareModal = function(todoId) {
    currentTodoForShare = todoId;
    selectedUsersForShare = [];
    document.getElementById('selectedUsersList').innerHTML = '';
    showModal('shareModal');
}

window.searchUsers = async function() {
    const query = document.getElementById('userSearchInput').value;
    
    if (query.length < 2) {
        document.getElementById('userSearchResults').style.display = 'none';
        return;
    }
    
    try {
        const users = await userAPI.search(query);
        renderUserSearchResults(users);
    } catch (error) {
        console.error('User search failed:', error);
    }
}

function renderUserSearchResults(users) {
    const resultsContainer = document.getElementById('userSearchResults');
    
    if (users.length === 0) {
        resultsContainer.innerHTML = '<div class="user-search-item">No users found</div>';
    } else {
        resultsContainer.innerHTML = users.map(user => `
            <div class="user-search-item" onclick="selectUserForShare('${user.id}', '${escapeHtml(user.username)}')">
                <strong>${escapeHtml(user.full_name || user.username)}</strong>
                <br>
                <small>${escapeHtml(user.email)}</small>
            </div>
        `).join('');
    }
    
    resultsContainer.style.display = 'block';
}

window.selectUserForShare = function(userId, username) {
    if (selectedUsersForShare.find(u => u.id === userId)) return;
    
    selectedUsersForShare.push({ id: userId, username });
    
    const selectedList = document.getElementById('selectedUsersList');
    const userEl = createElement('div', {
        className: 'selected-user',
        innerHTML: `
            ${escapeHtml(username)}
            <button onclick="removeUserFromShare('${userId}')">✕</button>
        `
    });
    
    selectedList.appendChild(userEl);
    
    document.getElementById('userSearchInput').value = '';
    document.getElementById('userSearchResults').style.display = 'none';
}

window.removeUserFromShare = function(userId) {
    selectedUsersForShare = selectedUsersForShare.filter(u => u.id !== userId);
    
    const selectedList = document.getElementById('selectedUsersList');
    selectedList.innerHTML = selectedUsersForShare.map(user => `
        <div class="selected-user">
            ${escapeHtml(user.username)}
            <button onclick="removeUserFromShare('${user.id}')">✕</button>
        </div>
    `).join('');
}

window.shareTodo = async function() {
    if (!currentTodoForShare || selectedUsersForShare.length === 0) {
        showWarning('Please select at least one user to share with');
        return;
    }
    
    try {
        const userIds = selectedUsersForShare.map(u => u.id);
        await todoAPI.share(currentTodoForShare, userIds);
        
        closeModal('shareModal');
        await loadTodos();
        showSuccess('Task shared successfully!');
    } catch (error) {
        console.error('Failed to share todo:', error);
        showError('Failed to share task');
    }
}

// Periodic data refresh
let refreshInterval;

function startPeriodicRefresh() {
    // Refresh data every 5 minutes
    refreshInterval = setInterval(() => {
        if (auth.isAuthenticated) {
            loadTodos();
            loadActivity();
        }
    }, 5 * 60 * 1000);
}

function stopPeriodicRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Start refresh when app loads
startPeriodicRefresh();

// Stop refresh when user logs out
window.addEventListener('logout', stopPeriodicRefresh);

// Service Worker Registration (for PWA)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/static/sw.js')
            .then(registration => {
                console.log('ServiceWorker registered:', registration);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}

// Export global functions for HTML onclick handlers
window.showLogin = showLogin;
window.showRegister = showRegister;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.toggleTheme = toggleTheme;
window.showProfile = showProfile;
window.showCategoryModal = showCategoryModal;
window.addCategory = addCategory;
window.exportTodos = exportTodos;
window.showTemplates = showTemplates;
window.showShortcuts = showShortcuts;
window.toggleBulkSelect = toggleBulkSelect;
window.bulkComplete = bulkComplete;
window.bulkArchive = bulkArchive;
window.bulkDelete = bulkDelete;
window.toggleTodo = toggleTodo;
window.editTodo = editTodo;
window.deleteTodo = deleteTodo;
window.showTodoDetails = showTodoDetails;
window.closeModal = closeModal;
window.hideSuccessMessage = hideSuccessMessage;

console.log('Todo App loaded successfully!');