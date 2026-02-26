# Authentication Flow Debugging Guide



## Changes Made



### 1. **Created ProtectedRoute Component** (`src/components/ProtectedRoute.tsx`)

   - Handles authentication checking at the route level

   - Shows loading state while verifying token

   - Redirects to login if no token found

   - Syncs token between apiClient and localStorage

   - Listens for storage changes to handle multi-tab scenarios



### 2. **Updated App.tsx Routing**

   - Wrapped all admin and super-admin routes with `<ProtectedRoute>` wrapper

   - Ensures authentication is checked before component renders



### 3. **Simplified AdminLayout Component**

   - Removed duplicate authentication logic

   - Cleaner component since ProtectedRoute handles auth checking



### 4. **Improved API Client Logging** (`src/api/base.ts`)

   - Added detailed console logs for API requests/responses

   - Logs token presence, status codes, and response data

   - Better error reporting



### 5. **Enhanced Login Page** (`src/pages/Login.tsx`)

   - Better token verification before navigation

   - Improved error handling

   - Console logs to track the flow



### 6. **Created .env Files**

   - Admin Dashboard: `.env` with `VITE_API_URL=http://localhost:3000/api`

   - User Dashboard: `.env` with `VITE_API_URL=http://localhost:3000/api`



## Expected Flow



1. User submits login form with email and password

2. API POST `/auth/login` is called

3. Backend validates credentials and returns token

4. Login page stores token via `apiClient.setToken()`

5. Token is stored in both:

   - apiClient internal variable

   - localStorage as `auth_token`

6. Navigate to `/admin`

7. ProtectedRoute checks for token (in apiClient or localStorage)

8. If token exists → Shows AdminDashboard

9. If token doesn't exist → Redirects to `/login`



## How to Debug



1. **Open Browser DevTools (F12)**

2. **Go to Console tab**

3. **Look for these log messages:**



   - `API Client initialized with base URL: http://localhost:3000/api`

   - `Login: Checking existing auth...`

   - `API Request: POST /auth/login`

   - `API Response Status: 200` (or error code)

   - `API Response Data: {...}`

   - `Login: Response successful, token received`

   - `Login: Token in apiClient: true`

   - `Login: Token in localStorage: true`

   - `Login: Navigating to /admin`

   - `ProtectedRoute: Checking auth...`

   - `ProtectedRoute: Token found, allowing access`



## Common Issues & Solutions



### Issue: "No token found" error

**Solution:** 

- Check if backend is running on `http://localhost:3000`

- Check network tab in DevTools to see if `/auth/login` request is succeeding

- Verify response includes `data.token`



### Issue: Token stored but still redirected to login

**Solution:**

- Clear browser localStorage: `localStorage.clear()` in console

- Refresh the page

- Try logging in again



### Issue: API returning 401/401 errors

**Solution:**

- Check backend logs for authentication issues

- Verify database has test user credentials

- Check if JWT_SECRET is configured in backend



### Issue: Stuck on loading screen

**Solution:**

- Check browser console for JavaScript errors

- Check network tab to see if API call is hanging

- Hard refresh the page (Ctrl+Shift+R)



## Test Credentials



Use an admin account created through the new approval flow:

- Admins submit a request from the admin portal.
- Super admins approve pending requests in the super admin dashboard.

For direct admin creation (super admin only), use `npm run create-admin-users`.



## Environment Variables



Make sure `.env` files exist in:

- `ZetechVerse - Admin Dashboard - Frontend/.env`

- `ZetechVerse - User Dashboard - Frontend/.env`



Both should contain:

```

VITE_API_URL=http://localhost:3000/api

```



## Further Help



If issues persist:

1. Open DevTools Console

2. Note all error messages

3. Check the Network tab for failed requests

4. Verify backend is running and accessible

5. Check backend .env file has JWT_SECRET configured

