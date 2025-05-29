# Advanced Todo App - Django Edition

A full-featured todo application built with Django REST API and vanilla JavaScript, featuring user authentication, task management, collaboration, and real-time updates.

## Features

- **User Authentication**: Secure login/registration system with session management
- **Task Management**: Create, read, update, delete todos with rich metadata
- **Categories**: Organize tasks with custom categories
- **Collaboration**: Share tasks with other users
- **Comments & Attachments**: Add comments and files to tasks
- **Activity Feed**: Track all actions in real-time
- **Statistics & Charts**: Visualize productivity with interactive charts
- **Drag & Drop**: Reorder tasks with drag and drop
- **Search & Filter**: Advanced search and filtering options
- **Bulk Operations**: Select and perform actions on multiple tasks
- **Dark Mode**: Toggle between light and dark themes
- **PWA Support**: Install as a progressive web app
- **Responsive Design**: Works on all devices

## Technology Stack

### Backend
- Django 4.2.7
- Django REST Framework
- SQLite (default, can be changed to PostgreSQL/MySQL)
- Python 3.8+

### Frontend
- Vanilla JavaScript (ES6+)
- HTML5 & CSS3
- Chart.js for data visualization
- No frontend framework dependencies

## Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)
- Git

### Setup Instructions

1. **Clone the repository**
```bash
git clone <repository-url>
cd todo_project
```

2. **Create a virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Run migrations**
```bash
python manage.py makemigrations
python manage.py migrate
```

5. **Create a superuser (admin)**
```bash
python manage.py createsuperuser
```

6. **Collect static files**
```bash
python manage.py collectstatic --noinput
```

7. **Run the development server**
```bash
python manage.py runserver
```

8. **Access the application**
- Main app: http://localhost:8000
- Admin panel: http://localhost:8000/admin

## Project Structure

```
todo_project/
├── manage.py                 # Django management script
├── requirements.txt          # Python dependencies
├── todo_project/            # Main project directory
│   ├── settings.py          # Django settings
│   ├── urls.py              # Main URL configuration
│   └── wsgi.py              # WSGI configuration
├── todos/                   # Main app directory
│   ├── models.py            # Database models
│   ├── views.py             # API views
│   ├── serializers.py       # DRF serializers
│   ├── urls.py              # App URL configuration
│   └── admin.py             # Admin configuration
├── static/                  # Frontend static files
│   ├── index.html           # Main HTML file
│   ├── css/                 # Stylesheets
│   │   ├── theme.css        # Theme variables
│   │   ├── components.css   # Reusable components
│   │   ├── auth.css         # Authentication styles
│   │   └── styles.css       # Main app styles
│   └── js/                  # JavaScript files
│       ├── app.js           # Main app initialization
│       ├── auth.js          # Authentication logic
│       ├── api.js           # API communication
│       ├── todos.js         # Todo management
│       ├── ui.js            # UI utilities
│       ├── utils.js         # Helper functions
│       └── charts.js        # Chart configurations
└── templates/               # Django templates
    └── base.html            # Base template

```

## API Endpoints

### Authentication
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `GET /api/auth/user/` - Get current user
- `PUT /api/auth/user/update/` - Update user profile

### Todos
- `GET /api/todos/` - List todos
- `POST /api/todos/` - Create todo
- `GET /api/todos/{id}/` - Get todo details
- `PUT /api/todos/{id}/` - Update todo
- `DELETE /api/todos/{id}/` - Delete todo
- `POST /api/todos/{id}/toggle/` - Toggle completion
- `POST /api/todos/{id}/share/` - Share todo
- `POST /api/todos/reorder/` - Reorder todos
- `POST /api/todos/bulk_action/` - Bulk operations

### Categories
- `GET /api/categories/` - List categories
- `POST /api/categories/` - Create category
- `PUT /api/categories/{id}/` - Update category
- `DELETE /api/categories/{id}/` - Delete category

### Comments & Attachments
- `GET /api/todos/{todo_id}/comments/` - List comments
- `POST /api/todos/{todo_id}/comments/` - Add comment
- `GET /api/todos/{todo_id}/attachments/` - List attachments
- `POST /api/todos/{todo_id}/attachments/` - Upload attachment

### Statistics
- `GET /api/stats/` - Get statistics overview
- `GET /api/activity/` - Get activity feed

## Usage

### Creating an Account
1. Click "Register" on the login page
2. Fill in your details
3. Submit the form to create your account

### Managing Tasks
1. Use the form at the top to create new tasks
2. Click on tasks to edit them
3. Drag and drop to reorder
4. Use checkboxes for bulk operations

### Keyboard Shortcuts
- `Ctrl/Cmd + N` - Add new task
- `Ctrl/Cmd + F` - Focus search
- `Ctrl/Cmd + E` - Export tasks
- `Ctrl/Cmd + T` - Toggle theme
- `Ctrl/Cmd + D` - Delete completed tasks
- `?` - Show shortcuts help

## Configuration

### Database
To use PostgreSQL instead of SQLite:

1. Install psycopg2: `pip install psycopg2-binary`
2. Update `DATABASES` in `settings.py`:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'todo_db',
        'USER': 'your_user',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### Email Configuration
For email notifications, update `settings.py`:
```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@gmail.com'
EMAIL_HOST_PASSWORD = 'your-password'
```

## Production Deployment

### Using Gunicorn and Nginx

1. Install Gunicorn: `pip install gunicorn`
2. Run Gunicorn: `gunicorn todo_project.wsgi:application`
3. Configure Nginx to proxy requests to Gunicorn
4. Set `DEBUG = False` in `settings.py`
5. Update `ALLOWED_HOSTS` with your domain
6. Use environment variables for sensitive settings

### Static Files
In production, serve static files through Nginx or a CDN:
```nginx
location /static/ {
    alias /path/to/todo_project/staticfiles/;
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Create an issue on GitHub
- Check existing issues for solutions
- Review the API documentation

## Future Enhancements

- WebSocket support for real-time updates
- Mobile apps (React Native)
- Calendar integration
- Email reminders
- Time tracking
- Subtasks and dependencies
- Custom fields
- Gantt charts
- Export to various formats
- Third-party integrations