# todos/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for viewsets
router = DefaultRouter()
router.register(r'todos', views.TodoViewSet, basename='todo')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'templates', views.TodoTemplateViewSet, basename='template')

urlpatterns = [
    # Authentication endpoints
    path('auth/csrf/', views.get_csrf_token, name='csrf_token'),
    path('auth/register/', views.register_user, name='register'),
    path('auth/login/', views.login_user, name='login'),
    path('auth/logout/', views.logout_user, name='logout'),
    path('auth/user/', views.get_current_user, name='current_user'),
    path('auth/user/update/', views.update_user_profile, name='update_profile'),
    
    # Todo-related endpoints
    path('todos/<uuid:todo_id>/comments/', views.todo_comments, name='todo_comments'),
    
    # Statistics and activity
    path('stats/', views.get_statistics, name='statistics'),
    path('activity/', views.get_activity_feed, name='activity_feed'),
    
    # User search
    path('users/search/', views.search_users, name='search_users'),
    
    # Include router URLs
    path('', include(router.urls)),
]