# todos/views.py

from django.shortcuts import render
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import ensure_csrf_cookie
from django.middleware.csrf import get_token
from django.http import JsonResponse
from django.db.models import Q, Count, Avg, Sum, F  # Added F here
from django.utils import timezone
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from datetime import datetime, timedelta
import json

from .models import User, Todo, Category, TodoComment, TodoAttachment, ActivityLog, TodoTemplate
from .serializers import (
    UserSerializer, TodoSerializer, CategorySerializer, 
    TodoCommentSerializer, TodoAttachmentSerializer, 
    ActivityLogSerializer, TodoTemplateSerializer,
    UserRegistrationSerializer, UserUpdateSerializer
)

# Serve the main app
def index(request):
    return render(request, 'base.html')

# CSRF Token endpoint
@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({'csrfToken': get_token(request)})

# Authentication Views
@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """Register a new user"""
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        login(request, user)
        
        # Create default categories for new user
        default_categories = [
            {'name': 'Personal', 'color': '#6366f1', 'icon': '👤'},
            {'name': 'Work', 'color': '#8b5cf6', 'icon': '💼'},
            {'name': 'Shopping', 'color': '#10b981', 'icon': '🛒'},
            {'name': 'Health', 'color': '#ef4444', 'icon': '❤️'},
            {'name': 'Learning', 'color': '#f59e0b', 'icon': '📚'},
        ]
        
        for cat_data in default_categories:
            Category.objects.create(user=user, **cat_data)
        
        # Log activity
        ActivityLog.objects.create(
            user=user,
            action='created',
            todo_title='Account',
            details={'message': 'User account created'}
        )
        
        return Response({
            'user': UserSerializer(user).data,
            'message': 'Registration successful'
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    """Login user"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({
            'error': 'Please provide both username and password'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(request, username=username, password=password)
    
    if user is not None:
        login(request, user)
        return Response({
            'user': UserSerializer(user).data,
            'message': 'Login successful'
        }, status=status.HTTP_200_OK)
    
    return Response({
        'error': 'Invalid credentials'
    }, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """Logout user"""
    logout(request)
    return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """Get current authenticated user"""
    return Response({
        'user': UserSerializer(request.user).data
    }, status=status.HTTP_200_OK)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_user_profile(request):
    """Update user profile"""
    serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response({
            'user': UserSerializer(request.user).data,
            'message': 'Profile updated successfully'
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Todo ViewSet
class TodoViewSet(viewsets.ModelViewSet):
    """ViewSet for Todo CRUD operations"""
    serializer_class = TodoSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = PageNumberPagination
    
    def get_queryset(self):
        """Get todos for current user with filters"""
        queryset = Todo.objects.filter(
            Q(user=self.request.user) | Q(shared_with=self.request.user)
        ).distinct()
        
        # Apply filters
        category = self.request.query_params.get('category', None)
        priority = self.request.query_params.get('priority', None)
        completed = self.request.query_params.get('completed', None)
        archived = self.request.query_params.get('archived', None)
        search = self.request.query_params.get('search', None)
        due_date = self.request.query_params.get('due_date', None)
        
        if category and category != 'all':
            queryset = queryset.filter(category__id=category)
        
        if priority:
            queryset = queryset.filter(priority=priority)
        
        if completed is not None:
            queryset = queryset.filter(completed=completed.lower() == 'true')
        
        if archived is not None:
            queryset = queryset.filter(is_archived=archived.lower() == 'true')
        else:
            queryset = queryset.filter(is_archived=False)
        
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(description__icontains=search) |
                Q(tags__icontains=search)
            )
        
        if due_date:
            today = timezone.now().date()
            if due_date == 'today':
                queryset = queryset.filter(due_date__date=today)
            elif due_date == 'week':
                week_end = today + timedelta(days=7)
                queryset = queryset.filter(due_date__date__range=[today, week_end])
            elif due_date == 'overdue':
                queryset = queryset.filter(due_date__lt=timezone.now(), completed=False)
        
        return queryset
    
    def perform_create(self, serializer):
        """Create todo and log activity"""
        todo = serializer.save(user=self.request.user)
        
        ActivityLog.objects.create(
            user=self.request.user,
            action='created',
            todo=todo,
            todo_title=todo.title
        )
    
    def perform_update(self, serializer):
        """Update todo and log activity"""
        todo = serializer.save()
        
        ActivityLog.objects.create(
            user=self.request.user,
            action='updated',
            todo=todo,
            todo_title=todo.title,
            details={'changes': serializer.validated_data}
        )
    
    def perform_destroy(self, instance):
        """Delete todo and log activity"""
        ActivityLog.objects.create(
            user=self.request.user,
            action='deleted',
            todo_title=instance.title
        )
        instance.delete()
    
    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        """Toggle todo completion status"""
        todo = self.get_object()
        todo.completed = not todo.completed
        todo.save()
        
        ActivityLog.objects.create(
            user=request.user,
            action='completed' if todo.completed else 'updated',
            todo=todo,
            todo_title=todo.title
        )
        
        return Response(TodoSerializer(todo).data)
    
    @action(detail=True, methods=['post'])
    def share(self, request, pk=None):
        """Share todo with other users"""
        todo = self.get_object()
        user_ids = request.data.get('user_ids', [])
        
        if not user_ids:
            return Response({'error': 'No users specified'}, status=status.HTTP_400_BAD_REQUEST)
        
        users = User.objects.filter(id__in=user_ids)
        todo.shared_with.set(users)
        todo.is_shared = True
        todo.save()
        
        ActivityLog.objects.create(
            user=request.user,
            action='shared',
            todo=todo,
            todo_title=todo.title,
            details={'shared_with': [u.username for u in users]}
        )
        
        return Response({
            'message': 'Todo shared successfully',
            'todo': TodoSerializer(todo).data
        })
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Update todo positions for drag and drop"""
        positions = request.data.get('positions', {})
        
        for todo_id, position in positions.items():
            Todo.objects.filter(id=todo_id, user=request.user).update(position=position)
        
        return Response({'message': 'Positions updated successfully'})
    
    @action(detail=False, methods=['post'])
    def bulk_action(self, request):
        """Perform bulk actions on multiple todos"""
        action = request.data.get('action')
        todo_ids = request.data.get('todo_ids', [])
        
        if not action or not todo_ids:
            return Response({'error': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)
        
        todos = Todo.objects.filter(id__in=todo_ids, user=request.user)
        
        if action == 'complete':
            todos.update(completed=True, completed_at=timezone.now())
        elif action == 'incomplete':
            todos.update(completed=False, completed_at=None)
        elif action == 'archive':
            todos.update(is_archived=True)
        elif action == 'unarchive':
            todos.update(is_archived=False)
        elif action == 'delete':
            todos.delete()
        
        return Response({'message': f'Bulk {action} completed successfully'})

# Category ViewSet
class CategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for Category CRUD operations"""
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Category.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

# Comment Views
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def todo_comments(request, todo_id):
    """Get or create comments for a todo"""
    try:
        todo = Todo.objects.get(id=todo_id)
        
        # Check permissions
        if todo.user != request.user and request.user not in todo.shared_with.all():
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        if request.method == 'GET':
            comments = TodoComment.objects.filter(todo=todo)
            serializer = TodoCommentSerializer(comments, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            serializer = TodoCommentSerializer(data=request.data)
            if serializer.is_valid():
                comment = serializer.save(user=request.user, todo=todo)
                
                ActivityLog.objects.create(
                    user=request.user,
                    action='commented',
                    todo=todo,
                    todo_title=todo.title
                )
                
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    except Todo.DoesNotExist:
        return Response({'error': 'Todo not found'}, status=status.HTTP_404_NOT_FOUND)

# Statistics Views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_statistics(request):
    """Get user statistics"""
    user = request.user
    now = timezone.now()
    
    # Basic stats
    total_todos = Todo.objects.filter(user=user).count()
    completed_todos = Todo.objects.filter(user=user, completed=True).count()
    active_todos = Todo.objects.filter(user=user, completed=False, is_archived=False).count()
    overdue_todos = Todo.objects.filter(
        user=user, 
        completed=False, 
        due_date__lt=now
    ).count()
    
    # Completion rate
    completion_rate = (completed_todos / total_todos * 100) if total_todos > 0 else 0
    
    # Category breakdown
    category_stats = Todo.objects.filter(user=user).values(
        'category__name', 'category__color'
    ).annotate(
        total=Count('id'),
        completed=Count('id', filter=Q(completed=True))
    )
    
    # Weekly activity
    week_ago = now - timedelta(days=7)
    daily_activity = []
    for i in range(7):
        day = week_ago + timedelta(days=i)
        created = Todo.objects.filter(
            user=user,
            created_at__date=day.date()
        ).count()
        completed = Todo.objects.filter(
            user=user,
            completed=True,
            completed_at__date=day.date()
        ).count()
        
        daily_activity.append({
            'date': day.strftime('%Y-%m-%d'),
            'day': day.strftime('%a'),
            'created': created,
            'completed': completed
        })
    
    # Productivity insights
    avg_completion_time = Todo.objects.filter(
        user=user,
        completed=True,
        completed_at__isnull=False
    ).annotate(
        completion_time=F('completed_at') - F('created_at')
    ).aggregate(
        avg_time=Avg('completion_time')
    )['avg_time']
    
    return Response({
        'overview': {
            'total': total_todos,
            'completed': completed_todos,
            'active': active_todos,
            'overdue': overdue_todos,
            'completion_rate': round(completion_rate, 1)
        },
        'categories': list(category_stats),
        'daily_activity': daily_activity,
        'productivity': {
            'avg_completion_time': avg_completion_time.days if avg_completion_time else None,
            'most_productive_day': max(daily_activity, key=lambda x: x['completed'])['day'] if daily_activity else None
        }
    })

# Activity Feed
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_activity_feed(request):
    """Get user's activity feed"""
    activities = ActivityLog.objects.filter(user=request.user)[:50]
    serializer = ActivityLogSerializer(activities, many=True)
    return Response(serializer.data)

# Template Views
class TodoTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for Todo Templates"""
    serializer_class = TodoTemplateSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return TodoTemplate.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

# Search Users (for sharing)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_users(request):
    """Search users for sharing todos"""
    query = request.query_params.get('q', '')
    
    if len(query) < 2:
        return Response([])
    
    users = User.objects.filter(
        Q(username__icontains=query) | 
        Q(email__icontains=query) |
        Q(first_name__icontains=query) |
        Q(last_name__icontains=query)
    ).exclude(id=request.user.id)[:10]
    
    return Response([{
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'full_name': user.get_full_name()
    } for user in users])