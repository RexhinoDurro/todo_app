# todos/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Todo, Category, TodoComment, TodoAttachment, 
    ActivityLog, TodoTemplate, UserPreferences
)

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    full_name = serializers.SerializerMethodField()
    todo_count = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'avatar', 'bio', 'theme_preference',
            'notification_enabled', 'date_joined', 'todo_count'
        ]
        read_only_fields = ['id', 'date_joined', 'todo_count']
    
    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username
    
    def get_todo_count(self, obj):
        return obj.todos.filter(is_archived=False).count()

class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 
                 'first_name', 'last_name']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        # Create user preferences
        UserPreferences.objects.create(user=user)
        
        return user

class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile"""
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'bio', 
                 'avatar', 'theme_preference', 'notification_enabled']

class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Category model"""
    todo_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'color', 'icon', 'todo_count', 'created_at']
        read_only_fields = ['id', 'created_at', 'todo_count']
    
    def get_todo_count(self, obj):
        return obj.todo_set.filter(is_archived=False).count()

class TodoCommentSerializer(serializers.ModelSerializer):
    """Serializer for TodoComment model"""
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = TodoComment
        fields = ['id', 'user', 'comment', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

class TodoAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for TodoAttachment model"""
    uploaded_by = UserSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = TodoAttachment
        fields = ['id', 'file', 'file_url', 'filename', 'file_size', 
                 'uploaded_at', 'uploaded_by']
        read_only_fields = ['id', 'uploaded_at', 'uploaded_by']
    
    def get_file_url(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return None

class TodoSerializer(serializers.ModelSerializer):
    """Serializer for Todo model"""
    user = UserSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    category_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    shared_with = UserSerializer(many=True, read_only=True)
    shared_with_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    subtasks = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    attachment_count = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = Todo
        fields = [
            'id', 'user', 'title', 'description', 'category', 'category_id',
            'priority', 'due_date', 'completed', 'completed_at',
            'created_at', 'updated_at', 'is_pinned', 'is_archived',
            'position', 'parent_todo', 'is_shared', 'shared_with',
            'shared_with_ids', 'is_recurring', 'recurrence_pattern',
            'recurrence_end_date', 'tags', 'estimated_minutes',
            'actual_minutes', 'reminder_date', 'reminder_sent',
            'subtasks', 'comment_count', 'attachment_count', 'is_overdue'
        ]
        read_only_fields = [
            'id', 'user', 'created_at', 'updated_at', 'completed_at',
            'subtasks', 'comment_count', 'attachment_count', 'is_overdue'
        ]
    
    def get_subtasks(self, obj):
        subtasks = obj.subtasks.all()
        return TodoSerializer(subtasks, many=True, read_only=True).data
    
    def get_comment_count(self, obj):
        return obj.comments.count()
    
    def get_attachment_count(self, obj):
        return obj.attachments.count()
    
    def get_is_overdue(self, obj):
        if obj.due_date and not obj.completed:
            from django.utils import timezone
            return obj.due_date < timezone.now()
        return False
    
    def create(self, validated_data):
        category_id = validated_data.pop('category_id', None)
        shared_with_ids = validated_data.pop('shared_with_ids', [])
        
        todo = Todo.objects.create(**validated_data)
        
        if category_id:
            try:
                category = Category.objects.get(id=category_id, user=todo.user)
                todo.category = category
                todo.save()
            except Category.DoesNotExist:
                pass
        
        if shared_with_ids:
            users = User.objects.filter(id__in=shared_with_ids)
            todo.shared_with.set(users)
            if users.exists():
                todo.is_shared = True
                todo.save()
        
        return todo
    
    def update(self, instance, validated_data):
        category_id = validated_data.pop('category_id', None)
        shared_with_ids = validated_data.pop('shared_with_ids', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if category_id is not None:
            try:
                category = Category.objects.get(id=category_id, user=instance.user)
                instance.category = category
            except Category.DoesNotExist:
                instance.category = None
        
        if shared_with_ids is not None:
            users = User.objects.filter(id__in=shared_with_ids)
            instance.shared_with.set(users)
            instance.is_shared = users.exists()
        
        instance.save()
        return instance

class ActivityLogSerializer(serializers.ModelSerializer):
    """Serializer for ActivityLog model"""
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = ['id', 'user', 'action', 'todo', 'todo_title', 
                 'timestamp', 'details']
        read_only_fields = fields

class TodoTemplateSerializer(serializers.ModelSerializer):
    """Serializer for TodoTemplate model"""
    
    class Meta:
        model = TodoTemplate
        fields = ['id', 'name', 'description', 'template_data', 
                 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class UserPreferencesSerializer(serializers.ModelSerializer):
    """Serializer for UserPreferences model"""
    default_category = CategorySerializer(read_only=True)
    default_category_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = UserPreferences
        fields = [
            'email_reminders', 'email_daily_summary', 'email_weekly_summary',
            'default_view', 'items_per_page', 'show_completed',
            'default_priority', 'default_category', 'default_category_id',
            'profile_public', 'allow_sharing'
        ]
    
    def update(self, instance, validated_data):
        category_id = validated_data.pop('default_category_id', None)
        
        if category_id:
            try:
                category = Category.objects.get(id=category_id, user=instance.user)
                validated_data['default_category'] = category
            except Category.DoesNotExist:
                pass
        
        return super().update(instance, validated_data)