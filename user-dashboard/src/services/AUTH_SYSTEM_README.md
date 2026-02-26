# Authentication System Documentation

## Overview

This is a comprehensive, real authentication system built for the ZetechVerse platform. It provides secure, role-based authentication with OAuth integration, token management, and cross-dashboard consistency.

## Features Implemented

### 1. Unified Authentication Service
- **Singleton AuthService**: Centralized authentication logic
- **Token Management**: Automatic token refresh and expiration handling
- **Cross-Dashboard Sync**: Consistent authentication state across all dashboards

### 2. Token Management & Refresh
- **Automatic Token Refresh**: Refreshes tokens 5 minutes before expiration
- **Graceful 401 Handling**: Silent token refresh on authentication failures
- **Token Expiration Checks**: Built-in expiration validation in ProtectedRoute components

### 3. Role-Based Access Control (RBAC)
- **Role Checking**: User, Admin, Super Admin roles
- **Role-Specific Protected Routes**: Dedicated route components for each role
- **Permission-Based UI Rendering**: Fine-grained permission control

### 4. OAuth Integration
- **Google OAuth**: Full Google authentication support
- **GitHub OAuth**: GitHub authentication integration
- **OAuth Callback Handling**: Proper callback processing and state management
- **Provider Information Storage**: OAuth provider metadata tracking

### 5. Session Management
- **Remember Me**: Persistent login sessions
- **Session Timeout Warnings**: User-friendly timeout notifications
- **Keep Me Signed In**: Extended session options

### 6. Security Enhancements
- **CSRF Protection**: Built-in CSRF token handling
- **Rate Limiting**: Login attempt rate limiting
- **2FA Support**: Two-Factor Authentication ready
- **Encrypted Storage**: Secure localStorage encryption

### 7. User Experience Improvements
- **Loading States**: Comprehensive loading indicators
- **Forgot Password Flow**: Complete password recovery
- **Email Verification**: Email verification process
- **User-Friendly Errors**: Clear error messages

### 8. Cross-Dashboard Consistency
- **Consistent Behavior**: Same login/logout flow across all dashboards
- **Tab Synchronization**: Sync authentication state between tabs/windows
- **Single Logout**: Logout from all dashboards simultaneously

### 9. API Integration
- **Backend API Integration**: Replaced localStorage fallbacks
- **Real Comment Functionality**: Proper comment handling with backend
- **Proper Error Handling**: Robust error handling for authentication failures

### 10. Monitoring & Analytics
- **Login/Logout Tracking**: Event logging
- **Authentication Failures**: Failure monitoring
- **Suspicious Activities**: Security logging

## File Structure

```
src/
├── services/
│   └── auth.service.ts        # Main authentication service
├── hooks/
│   └── use-auth.ts            # Authentication hooks
├── components/
│   ├── ProtectedRoute.tsx     # Role-based protected routes
│   └── LogoutButton.tsx       # Logout component with confirmation
├── contexts/
│   └── auth-context.tsx       # Authentication context provider
└── pages/
    ├── Login.tsx             # Enhanced login with OAuth
    ├── Register.tsx          # Registration page
    ├── Profile.tsx           # Profile management (using real auth)
    └── components/Profile/UserDetailsSection.tsx
```

## Authentication Service

### Usage Example

```typescript
import { authService, authApi } from '@/services/auth.service';
import { useAuthContext } from '@/contexts/auth-context';

// Service direct usage
const user = await authService.login({
  email: 'user@example.com',
  password: 'password',
  remember_me: true
});

// Hook usage (recommended)
const { 
  user, 
  isAuthenticated, 
  login, 
  register, 
  logout, 
  hasPermission,
  isAdmin 
} = useAuthContext();
```

### Authentication States

- `isAuthenticated`: boolean
- `isAdmin`: boolean
- `isSuperAdmin`: boolean
- `role`: 'user' | 'admin' | 'super_admin' | null

## Role-Based Routing

### Available Route Components

```tsx
// User protection (default for general dashboard)
<UserProtectedRoute>
  <MyProtectedPage />
</UserProtectedRoute>

// Admin protection (dashboard)
<AdminProtectedRoute>
  <AdminOnlyPage />
</AdminProtectedRoute>

// Super Admin protection (for ultimate system access)
<SuperAdminProtectedRoute>
  <SuperAdminPage />
</SuperAdminProtectedRoute>

// Custom permission
<PermissionProtectedRoute permission="moderate_content">
  <ContentModerationPage />
</PermissionProtectedRoute>
```

### UseProtect Hook

```tsx
import { useProtect } from '@/hooks/use-protect';

const MyComponent = () => {
  const { protect } = useProtect();
  
  const handleAdminAction = () => {
    protect(
      () => performAdminAction(),
      { requiredRole: 'admin' }
    );
  };
  
  return <button onClick={handleAdminAction}>Admin Action</button>;
};
```

## OAuth Integration

### Google OAuth Setup

1. Create Google OAuth credentials in Google Cloud Console
2. Add redirect URIs: `http://localhost:5173/auth/callback/google`
3. Set client ID in environment variables

### GitHub OAuth Setup

1. Register OAuth application in GitHub Developer Settings
2. Set callback URL: `http://localhost:5173/auth/callback/github`
3. Add client ID and secret to environment variables

## Environment Variables

```env
VITE_API_URL=http://localhost:3000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_GITHUB_CLIENT_ID=your-github-client-id
```

## API Endpoints

The authentication system expects the following backend endpoints:

```
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/refresh
GET /auth/profile
PUT /auth/profile
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/change-password
POST /auth/verify-email
POST /auth/resend-verification
GET /auth/oauth/google
GET /auth/oauth/github
POST /auth/oauth/google/callback
POST /auth/oauth/github/callback
```

## Security Features

### Token Security
- JWT tokens with expiration
- Automatic refresh before expiration
- Secure storage in localStorage
- Token validation on every request

### Rate Limiting
- Login attempts limited to 5 per minute
- Password reset requests limited to 3 per hour
- Account lockout after 10 failed attempts

### Session Management
- Remember me functionality with extended token lifetime
- Session timeout warnings at 5 minutes
- Automatic logout on token expiration

## Error Handling

### Common Error Responses

```json
{
  "success": false,
  "message": "Invalid credentials",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### Error Types

- Authentication errors (401)
- Authorization errors (403)
- Validation errors (400)
- Rate limit errors (429)

## Testing

### Unit Tests

```bash
npm test auth.service.ts
npm test use-auth.ts
npm test ProtectedRoute.tsx
```

### Integration Tests

```bash
npm run test:integration
```

## Migration from Old System

### Before (Old System)
```typescript
import { apiClient } from '@/api/base';
const token = sessionStorage.getItem('auth_token');
```

### After (New System)
```typescript
import { useAuthContext } from '@/contexts/auth-context';
const { user, isAuthenticated, login, logout } = useAuthContext();
```

## Best Practices

1. **Always use hooks**: Use `useAuthContext` instead of direct service calls
2. **Role-based routing**: Use appropriate ProtectedRoute components
3. **Permission checks**: Use `hasPermission` for fine-grained access control
4. **Error handling**: Always handle authentication errors gracefully
5. **Loading states**: Show loading indicators during authentication operations

## Troubleshooting

### Common Issues

1. **Token expiration**: System automatically handles token refresh
2. **401 errors**: Check if user is properly authenticated
3. **Role access denied**: Verify user role and required permissions
4. **OAuth failures**: Check client IDs and redirect URIs

### Debugging

Enable debug logging:
```typescript
localStorage.setItem('debug_auth', 'true');
```

Check authentication state:
```typescript
console.log('Auth State:', authService.getCurrentUser());
```

## Future Enhancements

- [ ] Biometric authentication
- [ ] Push notification for login alerts
- [ ] Device fingerprinting
- [ ] Advanced session management
- [ ] Multi-factor authentication
- [ ] Single Sign-On (SSO) integration

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure backward compatibility

## License

This authentication system is part of the ZetechVerse platform and is proprietary.