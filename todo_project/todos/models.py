# todos/models.py

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

class User(AbstractUser):
    """Extended User model with additional fields"""
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    theme_preference = models.CharField(max_length=10, default='light')
    notification_enabled = models.BooleanField(default=True)
    
    def __str__(self):
        return self.username

class Category(models.Model):
    """Custom categories for todos"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='categories')
    color = models.CharField(max_length=7, default='#6366f1')  # Hex color
    icon = models.CharField(max_length=20, default='📁')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = 'Categories'
        unique_together = ['name', 'user']
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.user.username})"

class Todo(models.Model):
    """Main Todo model"""
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    
    RECURRENCE_CHOICES = [
        ('none', 'None'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='todos')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    due_date = models.DateTimeField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # New fields
    is_pinned = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    position = models.IntegerField(default=0)
    parent_todo = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subtasks')
    
    # Sharing
    is_shared = models.BooleanField(default=False)
    shared_with = models.ManyToManyField(User, related_name='shared_todos', blank=True)
    
    # Recurrence
    is_recurring = models.BooleanField(default=False)
    recurrence_pattern = models.CharField(max_length=10, choices=RECURRENCE_CHOICES, default='none')
    recurrence_end_date = models.DateField(null=True, blank=True)
    
    # Tags
    tags = models.JSONField(default=list, blank=True)
    
    # Time tracking
    estimated_minutes = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0)])
    actual_minutes = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0)])
    
    # Reminder
    reminder_date = models.DateTimeField(null=True, blank=True)
    reminder_sent = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['position', '-created_at']
        indexes = [
            models.Index(fields=['user', 'completed']),
            models.Index(fields=['due_date']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.user.username})"
    
    def save(self, *args, **kwargs):
        # Set completed_at when todo is marked as completed
        if self.completed and not self.completed_at:
            from django.utils import timezone
            self.completed_at = timezone.now()
        elif not self.completed:
            self.completed_at = None
        
        super().save(*args, **kwargs)

class TodoAttachment(models.Model):
    """Attachments for todos"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    todo = models.ForeignKey(Todo, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='attachments/%Y/%m/%d/')
    filename = models.CharField(max_length=255)
    file_size = models.IntegerField()  # in bytes
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    def __str__(self):
        return f"Attachment for {self.todo.title}"

class TodoComment(models.Model):
    """Comments on todos"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    todo = models.ForeignKey(Todo, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Comment by {self.user.username} on {self.todo.title}"

class ActivityLog(models.Model):
    """Track user activities"""
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('completed', 'Completed'),
        ('deleted', 'Deleted'),
        ('shared', 'Shared'),
        ('commented', 'Commented'),
        ('attached', 'Attached File'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    todo = models.ForeignKey(Todo, on_delete=models.SET_NULL, null=True, blank=True)
    todo_title = models.CharField(max_length=200)  # Store title in case todo is deleted
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = 'Activity logs'
    
    def __str__(self):
        return f"{self.user.username} {self.action} {self.todo_title}"

class TodoTemplate(models.Model):
    """Reusable todo templates"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='templates')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    template_data = models.JSONField()  # Store todo fields as JSON
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.user.username})"

class UserPreferences(models.Model):
    """User preferences and settings"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    
    # Notification preferences
    email_reminders = models.BooleanField(default=True)
    email_daily_summary = models.BooleanField(default=False)
    email_weekly_summary = models.BooleanField(default=True)
    
    # UI preferences
    default_view = models.CharField(max_length=20, default='list')  # list, kanban, calendar
    items_per_page = models.IntegerField(default=20, validators=[MinValueValidator(10), MaxValueValidator(100)])
    show_completed = models.BooleanField(default=True)
    
    # Default todo settings
    default_priority = models.CharField(max_length=10, choices=Todo.PRIORITY_CHOICES, default='medium')
    default_category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Privacy settings
    profile_public = models.BooleanField(default=False)
    allow_sharing = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Preferences for {self.user.username}"