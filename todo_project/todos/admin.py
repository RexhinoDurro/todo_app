# todos/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Category, Todo, TodoComment, TodoAttachment, 
    ActivityLog, TodoTemplate, UserPreferences
)

# Custom User Admin
@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Enhanced User admin with additional fields"""
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('avatar', 'bio', 'theme_preference', 'notification_enabled')}),
    )
    list_display = ['username', 'email', 'first_name', 'last_name', 'is_staff', 'date_joined']
    list_filter = ['is_staff', 'is_superuser', 'is_active', 'theme_preference']
    search_fields = ['username', 'first_name', 'last_name', 'email']
    ordering = ['-date_joined']

# Category Admin
@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'icon', 'color', 'created_at']
    list_filter = ['created_at']
    search_fields = ['name', 'user__username']
    ordering = ['name']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(user=request.user)

# Todo Admin
@admin.register(Todo)
class TodoAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'category', 'priority', 'due_date', 'completed', 'is_pinned', 'created_at']
    list_filter = ['completed', 'priority', 'is_pinned', 'is_archived', 'is_shared', 'created_at', 'due_date']
    search_fields = ['title', 'description', 'user__username', 'tags']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'title', 'description', 'category', 'tags')
        }),
        ('Task Details', {
            'fields': ('priority', 'due_date', 'estimated_minutes', 'actual_minutes')
        }),
        ('Status', {
            'fields': ('completed', 'completed_at', 'is_pinned', 'is_archived')
        }),
        ('Sharing', {
            'fields': ('is_shared', 'shared_with')
        }),
        ('Recurrence', {
            'fields': ('is_recurring', 'recurrence_pattern', 'recurrence_end_date'),
            'classes': ('collapse',)
        }),
        ('Reminder', {
            'fields': ('reminder_date', 'reminder_sent'),
            'classes': ('collapse',)
        }),
    )
    
    filter_horizontal = ['shared_with']
    readonly_fields = ['completed_at']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(user=request.user)

# TodoComment Admin
@admin.register(TodoComment)
class TodoCommentAdmin(admin.ModelAdmin):
    list_display = ['todo', 'user', 'comment_preview', 'created_at']
    list_filter = ['created_at']
    search_fields = ['comment', 'todo__title', 'user__username']
    ordering = ['-created_at']
    
    def comment_preview(self, obj):
        return obj.comment[:50] + '...' if len(obj.comment) > 50 else obj.comment
    comment_preview.short_description = 'Comment Preview'

# TodoAttachment Admin
@admin.register(TodoAttachment)
class TodoAttachmentAdmin(admin.ModelAdmin):
    list_display = ['filename', 'todo', 'uploaded_by', 'file_size_formatted', 'uploaded_at']
    list_filter = ['uploaded_at']
    search_fields = ['filename', 'todo__title', 'uploaded_by__username']
    ordering = ['-uploaded_at']
    
    def file_size_formatted(self, obj):
        size = obj.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"
    file_size_formatted.short_description = 'File Size'

# ActivityLog Admin
@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'todo_title', 'timestamp']
    list_filter = ['action', 'timestamp']
    search_fields = ['user__username', 'todo_title', 'action']
    ordering = ['-timestamp']
    date_hierarchy = 'timestamp'
    
    def has_add_permission(self, request):
        # Activity logs should only be created programmatically
        return False
    
    def has_change_permission(self, request, obj=None):
        # Activity logs should not be editable
        return False

# TodoTemplate Admin
@admin.register(TodoTemplate)
class TodoTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'created_at', 'updated_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['name', 'description', 'user__username']
    ordering = ['name']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(user=request.user)

# UserPreferences Admin (Inline)
class UserPreferencesInline(admin.StackedInline):
    model = UserPreferences
    can_delete = False
    verbose_name_plural = 'Preferences'
    
    fieldsets = (
        ('Notification Preferences', {
            'fields': ('email_reminders', 'email_daily_summary', 'email_weekly_summary')
        }),
        ('UI Preferences', {
            'fields': ('default_view', 'items_per_page', 'show_completed')
        }),
        ('Default Settings', {
            'fields': ('default_priority', 'default_category')
        }),
        ('Privacy', {
            'fields': ('profile_public', 'allow_sharing')
        }),
    )

# Update UserAdmin to include preferences
UserAdmin.inlines = [UserPreferencesInline]

# Admin Site Configuration
admin.site.site_header = "Todo App Administration"
admin.site.site_title = "Todo App Admin"
admin.site.index_title = "Welcome to Todo App Administration"