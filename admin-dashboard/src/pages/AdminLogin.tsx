import { useState, useEffect, useCallback, useRef } from "react";

import { useNavigate, Link, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useToast } from "@/hooks/use-toast";

import { apiClient } from "@/api/base";

import { Shield, Users, ArrowLeft, Eye, EyeOff } from "lucide-react";



type AuthState = 'checking' | 'authenticated' | 'unauthenticated' | 'error';



export default function AdminLogin() {

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forceLoginPrompt = searchParams.get('prompt') === 'login';

  const { toast } = useToast();

  const [authState, setAuthState] = useState<AuthState>('checking');

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({

    email: "",

    password: "",

  });
  const [showPassword, setShowPassword] = useState(false);

  const authCheckTimeoutRef = useRef<NodeJS.Timeout>();



  // Check if already authenticated - simplified and more reliable

  const checkExistingAuth = useCallback(async () => {
    if (forceLoginPrompt) {
      console.log('AdminLogin: prompt=login detected, showing login form');
      setAuthState('unauthenticated');
      return;
    }

    try {

      const token = apiClient.getToken();

      console.log('AdminLogin: Checking existing auth, token exists:', !!token);



      if (!token) {

        setAuthState('unauthenticated');

        return;

      }



      // Set a maximum timeout to prevent indefinite hanging

      authCheckTimeoutRef.current = setTimeout(() => {

        console.log('AdminLogin: Auth check timeout, clearing token');

        apiClient.setToken(null);

        setAuthState('unauthenticated');

      }, 10000); // 10 second timeout



      const response = await apiClient.get('/auth/profile');



      // Clear the timeout since we got a response

      if (authCheckTimeoutRef.current) {

        clearTimeout(authCheckTimeoutRef.current);

      }



      if (response.data.success && response.data.data?.role) {

        const userRole = response.data.data.role;

        console.log('AdminLogin: User already authenticated, role:', userRole);



        setAuthState('authenticated');



        // Immediate redirect without setTimeout

        if (userRole === 'super_admin') {

          navigate('/super-admin', { replace: true });

        } else if (userRole === 'admin') {

          navigate('/admin', { replace: true });

        } else {

          // Regular user trying to access admin login - redirect to user dashboard

          window.location.href = window.location.origin;

        }

      } else {

        // Token is invalid, clear it

        apiClient.setToken(null);

        setAuthState('unauthenticated');

      }

    } catch (error) {

      console.log('AdminLogin: Token verification failed, clearing token');

      // Clear the timeout

      if (authCheckTimeoutRef.current) {

        clearTimeout(authCheckTimeoutRef.current);

      }

      apiClient.setToken(null);

      setAuthState('unauthenticated');

    }

  }, [forceLoginPrompt, navigate]);



  // Run authentication check once on mount

  useEffect(() => {

    checkExistingAuth();



    // Cleanup timeout on unmount

    return () => {

      if (authCheckTimeoutRef.current) {

        clearTimeout(authCheckTimeoutRef.current);

      }

    };

  }, [checkExistingAuth]);



  // Handle form submission - moved to top with other hooks

  const handleSubmit = useCallback(async (e: React.FormEvent) => {

    e.preventDefault();
    const normalizedEmail = formData.email.trim();



    if (!normalizedEmail || !formData.password) {

      toast({

        title: "Validation Error",

        description: "Please fill in all fields",

        variant: "destructive",

      });

      return;

    }



    try {

      setLoading(true);

      const response = await apiClient.post("/auth/login", {
        email: normalizedEmail,
        password: formData.password,
      });



      if (response.data.success && response.data.data?.token) {

        console.log('AdminLogin: Login successful, processing response');



        // Store token securely

        apiClient.setToken(response.data.data.token);



        // Verify token storage

        const storedToken = apiClient.getToken();

        if (!storedToken) {

          throw new Error('Failed to store authentication token');

        }



        const userRole = response.data.data?.user?.role;

        console.log('AdminLogin: User role:', userRole);



        toast({

          title: "Success",

          description: "Logged in successfully as Admin",

        });



        // Navigate based on user role

        if (userRole === 'super_admin') {

          console.log('AdminLogin: Redirecting super admin');

          navigate("/super-admin", { replace: true });

        } else if (userRole === 'admin') {

          console.log('AdminLogin: Redirecting admin');

          navigate("/admin", { replace: true });

        } else {

          throw new Error('Insufficient permissions. This login is for administrators only.');

        }

      } else {

        throw new Error(response.data.message || "Login failed");

      }

    } catch (error: any) {

      console.error('Admin login error:', error);

      const errorMessage = error.message || "An unexpected error occurred";



      toast({

        title: "Login Failed",

        description: errorMessage,

        variant: "destructive",

      });



      // Clear any potentially corrupted tokens

      apiClient.setToken(null);

    } finally {

      setLoading(false);

    }

  }, [formData, navigate, toast]);



  return (

    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">

      <div className="w-full max-w-md space-y-6">

        {/* Header */}

        <div className="text-center">

          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">

            <Shield className="w-8 h-8 text-white" />

          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Portal</h1>

          <p className="text-gray-600">Access the ZetechVerse Admin Dashboard</p>

        </div>



        {/* Login Card */}

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">

          <CardHeader className="text-center pb-4">

            <CardTitle className="text-xl font-semibold text-gray-800">Administrator Login</CardTitle>

            <p className="text-sm text-gray-500">Enter your admin credentials to continue</p>

          </CardHeader>

          <CardContent>

            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="space-y-2">

                <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>

                <Input

                  id="email"

                  type="email"

                  value={formData.email}

                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}

                  placeholder="admin@yourdomain.com"

                  className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"

                  required

                />

              </div>



              <div className="space-y-2">

                <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>

                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter your password"
                    className="h-11 pr-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

              </div>



              <Button

                type="submit"

                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"

                disabled={loading}

              >

                {loading ? (

                  <>

                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>

                    Signing in...

                  </>

                ) : (

                  <>

                    <Shield className="w-4 h-4 mr-2" />

                    Sign In as Admin

                  </>

                )}

              </Button>

            </form>

            <p className="mt-3 text-xs text-gray-500 text-center">
              Admin access requires super admin approval before login is enabled.
            </p>

            <div className="mt-4 text-center">
              <Link to="/admin/request" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Request admin access
              </Link>
            </div>



          </CardContent>

        </Card>



        {/* Footer Links */}

        <div className="text-center space-y-2">

          <Link

            to="/super-admin/login?prompt=login"

            className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"

          >

            <Users className="w-4 h-4 mr-1" />

            Super Admin Portal

          </Link>

          <div className="text-xs text-gray-500">

            <Link to="/" className="hover:text-gray-700">

              ← Back to ZetechVerse

            </Link>

          </div>

        </div>

      </div>

    </div>

  );

}
