// static/js/auth.js - Authentication Functions

// Authentication State
const auth = {
    isAuthenticated: false,
    user: null
};

// Check if user is authenticated
async function checkAuthentication() {
    try {
        const authData = await authAPI.checkAuth();
        auth.isAuthenticated = authData.isAuthenticated;
        auth.user = authData.user;
        return authData.isAuthenticated;
    } catch (error) {
        console.error('Auth check failed:', error);
        auth.isAuthenticated = false;
        auth.user = null;
        return false;
    }
}

// Show authentication container
function showAuth() {
    const authContainer = document.getElementById('authContainer');
    const appContainer = document.getElementById('appContainer');
    
    if (authContainer) authContainer.style.display = 'block';
    if (appContainer) appContainer.style.display = 'none';
}

// Show app container
function showApp() {
    const authContainer = document.getElementById('authContainer');
    const appContainer = document.getElementById('appContainer');
    
    if (authContainer) authContainer.style.display = 'none';
    if (appContainer) appContainer.style.display = 'block';
    
    // Update user info
    if (auth.user) {
        const initials = auth.user.first_name && auth.user.last_name 
            ? `${auth.user.first_name[0]}${auth.user.last_name[0]}`.toUpperCase()
            : auth.user.username[0].toUpperCase();
        
        document.getElementById('userAvatar').textContent = initials;
        document.getElementById('userName').textContent = auth.user.full_name || auth.user.username;
        document.getElementById('userEmail').textContent = auth.user.email;
    }
}

// Show login form
function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    clearAuthForms();
}

// Show register form
function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    clearAuthForms();
}

// Clear auth forms
function clearAuthForms() {
    // Clear login form
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.querySelectorAll('#loginForm .error-message').forEach(el => el.textContent = '');
    
    // Clear register form
    document.getElementById('registerUsername').value = '';
    document.getElementById('registerEmail').value = '';
    document.getElementById('registerFirstName').value = '';
    document.getElementById('registerLastName').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerPasswordConfirm').value = '';
    document.querySelectorAll('#registerForm .error-message').forEach(el => el.textContent = '');
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    // Clear previous errors
    document.querySelectorAll('#loginForm .error-message').forEach(el => el.textContent = '');
    
    try {
        const response = await authAPI.login({ username, password });
        
        if (response.user) {
            auth.isAuthenticated = true;
            auth.user = response.user;
            
            showApp();
            await initializeApp();
            showSuccess('Login successful!');
        }
    } catch (error) {
        console.error('Login failed:', error);
        
        if (error.status === 401) {
            document.getElementById('loginError').textContent = 'Invalid username or password';
        } else if (error.data && error.data.error) {
            document.getElementById('loginError').textContent = error.data.error;
        } else {
            document.getElementById('loginError').textContent = 'Login failed. Please try again.';
        }
        
        // Add shake animation to form
        const authBox = document.querySelector('.auth-box');
        authBox.classList.add('error');
        setTimeout(() => authBox.classList.remove('error'), 500);
    }
}

// Handle registration
async function handleRegister(event) {
    event.preventDefault();
    
    const formData = {
        username: document.getElementById('registerUsername').value,
        email: document.getElementById('registerEmail').value,
        first_name: document.getElementById('registerFirstName').value,
        last_name: document.getElementById('registerLastName').value,
        password: document.getElementById('registerPassword').value,
        password_confirm: document.getElementById('registerPasswordConfirm').value
    };
    
    // Clear previous errors
    document.querySelectorAll('#registerForm .error-message').forEach(el => el.textContent = '');
    
    // Client-side validation
    let hasError = false;
    
    if (!formData.username) {
        document.getElementById('registerUsernameError').textContent = 'Username is required';
        hasError = true;
    }
    
    if (!isValidEmail(formData.email)) {
        document.getElementById('registerEmailError').textContent = 'Invalid email address';
        hasError = true;
    }
    
    if (formData.password.length < 8) {
        document.getElementById('registerPasswordError').textContent = 'Password must be at least 8 characters';
        hasError = true;
    }
    
    if (formData.password !== formData.password_confirm) {
        document.getElementById('registerPasswordConfirmError').textContent = 'Passwords do not match';
        hasError = true;
    }
    
    if (hasError) {
        const authBox = document.querySelector('.auth-box');
        authBox.classList.add('error');
        setTimeout(() => authBox.classList.remove('error'), 500);
        return;
    }
    
    try {
        const response = await authAPI.register(formData);
        
        if (response.user) {
            auth.isAuthenticated = true;
            auth.user = response.user;
            
            showApp();
            await initializeApp();
            showSuccess('Registration successful! Welcome to Todo App!');
        }
    } catch (error) {
        console.error('Registration failed:', error);
        
        if (error.data) {
            // Display field-specific errors
            if (error.data.username) {
                document.getElementById('registerUsernameError').textContent = error.data.username[0];
            }
            if (error.data.email) {
                document.getElementById('registerEmailError').textContent = error.data.email[0];
            }
            if (error.data.password) {
                document.getElementById('registerPasswordError').textContent = error.data.password[0];
            }
            if (error.data.non_field_errors) {
                document.getElementById('registerError').textContent = error.data.non_field_errors[0];
            }
        } else {
            document.getElementById('registerError').textContent = 'Registration failed. Please try again.';
        }
        
        const authBox = document.querySelector('.auth-box');
        authBox.classList.add('error');
        setTimeout(() => authBox.classList.remove('error'), 500);
    }
}

// Handle logout
async function handleLogout() {
    try {
        await authAPI.logout();
        
        auth.isAuthenticated = false;
        auth.user = null;
        
        // Clear any stored data
        storage.clear();
        
        // Reset app state
        todos = [];
        categories = [];
        editingId = null;
        selectedTodos.clear();
        
        showAuth();
        showLogin();
        showSuccess('Logged out successfully');
        
        // Emit logout event
        window.dispatchEvent(new Event('logout'));
    } catch (error) {
        console.error('Logout failed:', error);
        showError('Logout failed. Please try again.');
    }
}

// Show/Update user profile
async function showProfile() {
    if (!auth.user) return;
    
    // Populate profile form
    document.getElementById('profileFirstName').value = auth.user.first_name || '';
    document.getElementById('profileLastName').value = auth.user.last_name || '';
    document.getElementById('profileEmail').value = auth.user.email || '';
    document.getElementById('profileBio').value = auth.user.bio || '';
    
    showModal('profileModal');
}

// Update user profile
async function updateProfile(event) {
    event.preventDefault();
    
    const profileData = {
        first_name: document.getElementById('profileFirstName').value,
        last_name: document.getElementById('profileLastName').value,
        email: document.getElementById('profileEmail').value,
        bio: document.getElementById('profileBio').value
    };
    
    try {
        const response = await authAPI.updateProfile(profileData);
        
        if (response.user) {
            auth.user = response.user;
            
            // Update UI
            const initials = auth.user.first_name && auth.user.last_name 
                ? `${auth.user.first_name[0]}${auth.user.last_name[0]}`.toUpperCase()
                : auth.user.username[0].toUpperCase();
            
            document.getElementById('userAvatar').textContent = initials;
            document.getElementById('userName').textContent = auth.user.full_name || auth.user.username;
            document.getElementById('userEmail').textContent = auth.user.email;
            
            closeModal('profileModal');
            showSuccess('Profile updated successfully!');
        }
    } catch (error) {
        console.error('Profile update failed:', error);
        showError('Failed to update profile');
    }
}

// Password strength indicator
document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('registerPassword');
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            const password = e.target.value;
            const strength = getPasswordStrength(password);
            
            // You can add a password strength indicator here
            const strengthBar = document.querySelector('.password-strength-bar');
            if (strengthBar) {
                strengthBar.className = `password-strength-bar password-strength-${strength}`;
            }
        });
    }
});