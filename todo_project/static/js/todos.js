// static/js/todos.js - Todo Management Functions

let todos = [];
let categories = [];
let currentFilter = 'all';
let currentCategory = 'all';
let editingId = null;
let selectedTodos = new Set();
let bulkSelectMode = false;

// Load Categories
async function loadCategories() {
    try {
        categories = await categoryAPI.getAll();
        renderCategories();
        updateCategorySelect();
    } catch (error) {
        console.error('Failed to load categories:', error);
        showError('Failed to load categories');
    }
}

// Render Categories
function renderCategories() {
    const categoryList = document.getElementById('categoryList');
    const allCount = todos.length;
    
    categoryList.innerHTML = `
        <li class="category-item ${currentCategory === 'all' ? 'active' : ''}" data-category="all">
            <span>All Tasks</span>
            <span class="category-count">${allCount}</span>
        </li>
    `;
    
    categories.forEach(category => {
        const count = todos.filter(t => t.category?.id === category.id).length;
        const li = createElement('li', {
            className: `category-item ${currentCategory === category.id ? 'active' : ''}`,
            innerHTML: `
                <span>${category.icon} ${escapeHtml(category.name)}</span>
                <span class="category-count">${count}</span>
            `,
            onclick: () => selectCategory(category.id)
        });
        li.dataset.category = category.id;
        categoryList.appendChild(li);
    });
}

// Update Category Select
function updateCategorySelect() {
    const select = document.getElementById('category');
    select.innerHTML = '<option value="">No Category</option>';
    
    categories.forEach(category => {
        const option = createElement('option', {
            value: category.id,
            textContent: `${category.icon} ${category.name}`
        });
        select.appendChild(option);
    });
}

// Select Category
function selectCategory(categoryId) {
    currentCategory = categoryId;
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.toggle('active', item.dataset.category === categoryId);
    });
    loadTodos();
}

// Add Category
async function addCategory(event) {
    event.preventDefault();
    
    const categoryData = {
        name: document.getElementById('categoryName').value,
        color: document.getElementById('categoryColor').value,
        icon: document.getElementById('categoryIcon').value || '📁'
    };
    
    try {
        await categoryAPI.create(categoryData);
        await loadCategories();
        closeModal('categoryModal');
        showSuccess('Category added successfully!');
        document.getElementById('categoryName').value = '';
        document.getElementById('categoryIcon').value = '📁';
    } catch (error) {
        console.error('Failed to add category:', error);
        showError('Failed to add category');
    }
}

// Show Category Modal
function showCategoryModal() {
    showModal('categoryModal');
}

// Load Todos
async function loadTodos() {
    try {
        const params = {};
        
        if (currentCategory !== 'all') {
            params.category = currentCategory;
        }
        
        if (currentFilter !== 'all') {
            switch (currentFilter) {
                case 'active':
                    params.completed = 'false';
                    break;
                case 'completed':
                    params.completed = 'true';
                    break;
                case 'today':
                    params.due_date = 'today';
                    break;
                case 'overdue':
                    params.due_date = 'overdue';
                    break;
                case 'pinned':
                    params.is_pinned = 'true';
                    break;
                case 'shared':
                    params.is_shared = 'true';
                    break;
            }
        }
        
        const response = await todoAPI.getAll(params);
        todos = response.results || response;
        renderTodos();
        updateStats();
    } catch (error) {
        console.error('Failed to load todos:', error);
        showError('Failed to load tasks');
    }
}

// Render Todos
function renderTodos() {
    const todoList = document.getElementById('todoList');
    
    if (todos.length === 0) {
        showEmptyState('todoList', 'No tasks found. Create your first task!', '📝');
        return;
    }
    
    todoList.innerHTML = todos.map(todo => createTodoElement(todo)).join('');
    
    // Setup drag and drop
    setupDragAndDrop();
}

// Create Todo Element
function createTodoElement(todo) {
    const tagsHtml = todo.tags && todo.tags.length > 0 
        ? todo.tags.map(tag => `<span class="todo-tag">${escapeHtml(tag)}</span>`).join('')
        : '';
    
    const isOverdue = todo.due_date && !todo.completed && new Date(todo.due_date) < new Date();
    
    return `
        <li class="todo-item ${todo.completed ? 'completed' : ''} ${todo.is_pinned ? 'pinned' : ''}" 
            draggable="true" 
            data-id="${todo.id}">
            ${todo.is_shared ? '<span class="shared-indicator">Shared</span>' : ''}
            
            <div class="todo-header">
                ${bulkSelectMode ? `<input type="checkbox" class="bulk-select-checkbox" onchange="toggleBulkSelect('${todo.id}')">` : ''}
                
                <input type="checkbox" 
                       class="todo-checkbox" 
                       ${todo.completed ? 'checked' : ''} 
                       onchange="toggleTodo('${todo.id}')">
                
                <div class="todo-content">
                    <div class="todo-title">${escapeHtml(todo.title)}</div>
                    ${todo.description ? `<div class="todo-description">${escapeHtml(todo.description)}</div>` : ''}
                    
                    <div class="todo-meta">
                        ${todo.category ? `<span class="todo-category" style="background: ${todo.category.color}">${todo.category.icon} ${escapeHtml(todo.category.name)}</span>` : ''}
                        <span class="todo-priority priority-${todo.priority}">${todo.priority.toUpperCase()}</span>
                        ${todo.due_date ? `<span class="todo-date ${isOverdue ? 'status-overdue' : ''}">${isOverdue ? '⚠️' : '📅'} ${formatDate(todo.due_date)}</span>` : ''}
                        ${todo.estimated_minutes ? `<span class="todo-time">⏱️ ${todo.estimated_minutes}m</span>` : ''}
                        ${tagsHtml ? `<div class="todo-tags">${tagsHtml}</div>` : ''}
                    </div>
                    
                    ${todo.comment_count > 0 ? `<div class="todo-comments-count">💬 ${todo.comment_count} comments</div>` : ''}
                    ${todo.attachment_count > 0 ? `<div class="todo-attachments-count">📎 ${todo.attachment_count} files</div>` : ''}
                </div>
                
                <div class="todo-actions">
                    <button class="btn btn-small" onclick="editTodo('${todo.id}')">✏️</button>
                    <button class="btn btn-small" onclick="showTodoDetails('${todo.id}')">👁️</button>
                    <button class="btn btn-small" onclick="showShareModal('${todo.id}')">🤝</button>
                    <button class="btn btn-small btn-danger" onclick="deleteTodo('${todo.id}')">🗑️</button>
                </div>
            </div>
        </li>
    `;
}

// Handle Todo Form Submit
async function handleTodoSubmit(event) {
    event.preventDefault();
    
    const formData = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        category_id: document.getElementById('category').value || null,
        priority: document.getElementById('priority').value,
        due_date: document.getElementById('dueDate').value || null,
        estimated_minutes: parseInt(document.getElementById('estimatedMinutes').value) || null,
        is_pinned: document.getElementById('isPinned').checked,
        is_recurring: document.getElementById('isRecurring').checked,
        tags: document.getElementById('tags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0)
    };
    
    if (formData.is_recurring) {
        formData.recurrence_pattern = document.getElementById('recurrencePattern').value;
        formData.recurrence_end_date = document.getElementById('recurrenceEndDate').value || null;
    }
    
    try {
        if (editingId) {
            await todoAPI.update(editingId, formData);
            showSuccess('Task updated successfully!');
            editingId = null;
        } else {
            await todoAPI.create(formData);
            showSuccess('Task created successfully!');
        }
        
        document.getElementById('todoForm').reset();
        await loadTodos();
        await loadActivity();
    } catch (error) {
        console.error('Failed to save todo:', error);
        showError('Failed to save task');
    }
}

// Toggle Todo Completion
async function toggleTodo(id) {
    try {
        await todoAPI.toggle(id);
        await loadTodos();
        await loadActivity();
    } catch (error) {
        console.error('Failed to toggle todo:', error);
        showError('Failed to update task');
    }
}

// Edit Todo
async function editTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    editingId = id;
    
    // Populate form
    document.getElementById('title').value = todo.title;
    document.getElementById('description').value = todo.description || '';
    document.getElementById('category').value = todo.category?.id || '';
    document.getElementById('priority').value = todo.priority;
    document.getElementById('dueDate').value = todo.due_date ? new Date(todo.due_date).toISOString().slice(0, 16) : '';
    document.getElementById('estimatedMinutes').value = todo.estimated_minutes || '';
    document.getElementById('isPinned').checked = todo.is_pinned;
    document.getElementById('isRecurring').checked = todo.is_recurring;
    document.getElementById('tags').value = todo.tags ? todo.tags.join(', ') : '';
    
    if (todo.is_recurring) {
        document.getElementById('recurrenceOptions').style.display = 'block';
        document.getElementById('recurrencePattern').value = todo.recurrence_pattern;
        document.getElementById('recurrenceEndDate').value = todo.recurrence_end_date || '';
    }
    
    // Scroll to form
    smoothScrollTo('todoForm');
    document.getElementById('title').focus();
}

// Delete Todo
async function deleteTodo(id) {
    confirmAction(
        'Are you sure you want to delete this task?',
        async () => {
            try {
                await todoAPI.delete(id);
                await loadTodos();
                await loadActivity();
                showSuccess('Task deleted successfully!');
            } catch (error) {
                console.error('Failed to delete todo:', error);
                showError('Failed to delete task');
            }
        }
    );
}

// Show Todo Details
async function showTodoDetails(id) {
    // This would open a modal with full todo details, comments, attachments, etc.
    // For now, just log
    console.log('Show details for todo:', id);
    showInfo('Todo details view coming soon!');
}

// Bulk Selection
function toggleBulkSelect() {
    bulkSelectMode = !bulkSelectMode;
    selectedTodos.clear();
    
    document.getElementById('bulkActions').style.display = bulkSelectMode ? 'inline' : 'none';
    
    renderTodos();
}

function toggleBulkSelect(id) {
    if (selectedTodos.has(id)) {
        selectedTodos.delete(id);
    } else {
        selectedTodos.add(id);
    }
}

async function bulkComplete() {
    if (selectedTodos.size === 0) {
        showWarning('No tasks selected');
        return;
    }
    
    try {
        await todoAPI.bulkAction('complete', Array.from(selectedTodos));
        await loadTodos();
        showSuccess(`${selectedTodos.size} tasks marked as complete`);
        toggleBulkSelect();
    } catch (error) {
        console.error('Bulk complete failed:', error);
        showError('Failed to complete tasks');
    }
}

async function bulkArchive() {
    if (selectedTodos.size === 0) {
        showWarning('No tasks selected');
        return;
    }
    
    try {
        await todoAPI.bulkAction('archive', Array.from(selectedTodos));
        await loadTodos();
        showSuccess(`${selectedTodos.size} tasks archived`);
        toggleBulkSelect();
    } catch (error) {
        console.error('Bulk archive failed:', error);
        showError('Failed to archive tasks');
    }
}

async function bulkDelete() {
    if (selectedTodos.size === 0) {
        showWarning('No tasks selected');
        return;
    }
    
    confirmAction(
        `Are you sure you want to delete ${selectedTodos.size} tasks?`,
        async () => {
            try {
                await todoAPI.bulkAction('delete', Array.from(selectedTodos));
                await loadTodos();
                showSuccess(`${selectedTodos.size} tasks deleted`);
                toggleBulkSelect();
            } catch (error) {
                console.error('Bulk delete failed:', error);
                showError('Failed to delete tasks');
            }
        }
    );
}

// Search
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    
    if (!searchInput) {
        console.warn('Search input not found');
        return;
    }
    
    searchInput.addEventListener('input', debounce(async (e) => {
        const query = e.target.value.trim();
        
        if (query.length === 0) {
            await loadTodos();
            return;
        }
        
        if (query.length < 2) return;
        
        try {
            const params = { search: query };
            if (currentCategory !== 'all') {
                params.category = currentCategory;
            }
            
            const response = await todoAPI.getAll(params);
            todos = response.results || response;
            renderTodos();
        } catch (error) {
            console.error('Search failed:', error);
        }
    }, 300));
}

// Filter Tabs
function setupFilterTabs() {
    const filterTabs = document.querySelectorAll('.filter-tab');
    
    if (!filterTabs || filterTabs.length === 0) {
        console.warn('Filter tabs not found');
        return;
    }
    
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            loadTodos();
        });
    });
}

// Drag and Drop
let draggedElement = null;

function setupDragAndDrop() {
    const items = document.querySelectorAll('.todo-item');
    
    items.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('dragend', handleDragEnd);
    });
}

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    this.style.borderTop = '3px solid var(--primary)';
}

function handleDragLeave(e) {
    this.style.borderTop = '';
}

async function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (draggedElement !== this) {
        const draggedId = draggedElement.dataset.id;
        const targetId = this.dataset.id;
        
        const draggedIndex = todos.findIndex(t => t.id === draggedId);
        const targetIndex = todos.findIndex(t => t.id === targetId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
            // Reorder locally
            const [draggedTodo] = todos.splice(draggedIndex, 1);
            todos.splice(targetIndex, 0, draggedTodo);
            
            // Update positions
            const positions = {};
            todos.forEach((todo, index) => {
                positions[todo.id] = index;
            });
            
            try {
                await todoAPI.reorder(positions);
                renderTodos();
            } catch (error) {
                console.error('Failed to reorder todos:', error);
                // Reload to restore correct order
                await loadTodos();
            }
        }
    }
    
    return false;
}

function handleDragEnd(e) {
    const items = document.querySelectorAll('.todo-item');
    items.forEach(item => {
        item.classList.remove('dragging');
        item.style.borderTop = '';
    });
}

// Export Todos
async function exportTodos() {
    try {
        const format = 'json'; // Could add format selector
        const response = await exportAPI.exportTodos(format);
        
        const filename = `todos_${new Date().toISOString().split('T')[0]}.${format}`;
        
        if (format === 'json') {
            exportToJSON(response, filename);
        } else if (format === 'csv') {
            exportToCSV(response, filename);
        }
        
        showSuccess('Tasks exported successfully!');
    } catch (error) {
        console.error('Export failed:', error);
        showError('Failed to export tasks');
    }
}

// Show Templates
function showTemplates() {
    showInfo('Templates feature coming soon!');
}

// Show Shortcuts
function showShortcuts() {
    showModal('shortcutsModal');
}

// Update Stats
async function updateStats() {
    const stats = {
        total: todos.length,
        completed: todos.filter(t => t.completed).length,
        active: todos.filter(t => !t.completed && !t.is_archived).length,
        overdue: todos.filter(t => !t.completed && t.due_date && new Date(t.due_date) < new Date()).length
    };
    
    const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    
    document.getElementById('totalTasks').textContent = stats.total;
    document.getElementById('completedTasks').textContent = stats.completed;
    document.getElementById('activeTasks').textContent = stats.active;
    document.getElementById('completionRate').textContent = `${completionRate}%`;
    
    updateProgress('progressBar', completionRate);
}

// Recurring Task Toggle
document.addEventListener('DOMContentLoaded', () => {
    const isRecurring = document.getElementById('isRecurring');
    if (isRecurring) {
        isRecurring.addEventListener('change', (e) => {
            document.getElementById('recurrenceOptions').style.display = 
                e.target.checked ? 'block' : 'none';
        });
    }
});