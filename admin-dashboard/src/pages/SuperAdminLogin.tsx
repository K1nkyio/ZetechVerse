import { useState, useEffect, useCallback, useRef } from "react";

import { useNavigate, Link, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useToast } from "@/hooks/use-toast";

import { apiClient } from "@/api/base";

import { Crown, Shield, ArrowLeft, Zap, Eye, EyeOff } from "lucide-react";



type AuthState = 'checking' | 'authenticated' | 'unauthenticated' | 'error';



export default function SuperAdminLogin() {

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
      console.log('SuperAdminLogin: prompt=login detected, showing login form');
      setAuthState('unauthenticated');
      return;
    }

    try {

      const token = apiClient.getToken();

      console.log('SuperAdminLogin: Checking existing auth, token exists:', !!token);



      if (!token) {

        setAuthState('unauthenticated');

        return;

      }



      // Set a maximum timeout to prevent indefinite hanging

      authCheckTimeoutRef.current = setTimeout(() => {

        console.log('SuperAdminLogin: Auth check timeout, clearing token');

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

        console.log('SuperAdminLogin: User already authenticated, role:', userRole);



        setAuthState('authenticated');



        // Immediate redirect without setTimeout

        if (userRole === 'super_admin') {

          navigate('/super-admin', { replace: true });

        } else {

          // Non-super admin trying to access super admin login - redirect to admin login

          navigate('/admin/login', { replace: true });

        }

      } else {

        // Token is invalid, clear it

        apiClient.setToken(null);

        setAuthState('unauthenticated');

      }

    } catch (error) {

      console.log('SuperAdminLogin: Token verification failed, clearing token');

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

        console.log('SuperAdminLogin: Login successful, processing response');



        // Store token securely

        apiClient.setToken(response.data.data.token);



        // Verify token storage

        const storedToken = apiClient.getToken();

        if (!storedToken) {

          throw new Error('Failed to store authentication token');

        }



        const userRole = response.data.data?.user?.role;

        console.log('SuperAdminLogin: User role:', userRole);



        if (userRole !== 'super_admin') {

          throw new Error('Access denied. Super Admin privileges required.');

        }



        toast({

          title: "Success",

          description: "Logged in successfully as Super Admin",

        });



        // Navigate to super admin dashboard

        console.log('SuperAdminLogin: Redirecting super admin');

        navigate("/super-admin", { replace: true });

      } else {

        throw new Error(response.data.message || "Login failed");

      }

    } catch (error: any) {

      console.error('Super admin login error:', error);

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

    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-red-50 p-4">

      <div className="w-full max-w-md space-y-6">

        {/* Header */}

        <div className="text-center">

          <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mb-4 shadow-lg">

            <Crown className="w-10 h-10 text-white" />

            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">

              <Zap className="w-3 h-3 text-yellow-800" />

            </div>

          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Super Admin Portal</h1>

          <p className="text-gray-600">Ultimate control over ZetechVerse ecosystem</p>

        </div>



        {/* Login Card */}

        <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm">

          <CardHeader className="text-center pb-4">

            <div className="flex items-center justify-center mb-2">

              <Shield className="w-5 h-5 text-purple-600 mr-2" />

              <span className="text-sm font-semibold text-purple-600 uppercase tracking-wide">Super Administrator</span>

            </div>

            <CardTitle className="text-xl font-semibold text-gray-800">System Control Center</CardTitle>

            <p className="text-sm text-gray-500">Enter your super admin credentials</p>

          </CardHeader>

          <CardContent>

            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="space-y-2">

                <Label htmlFor="email" className="text-gray-700 font-medium">Super Admin Email</Label>

                <Input

                  id="email"

                  type="email"

                  value={formData.email}

                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}

                  placeholder="superadmin@yourdomain.com"

                  className="h-11 border-gray-300 focus:border-purple-500 focus:ring-purple-500"

                  required

                />

              </div>



              <div className="space-y-2">

                <Label htmlFor="password" className="text-gray-700 font-medium">Access Password</Label>

                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter your secure password"
                    className="h-11 pr-10 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
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

                className="w-full h-11 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium shadow-lg"

                disabled={loading}

              >

                {loading ? (

                  <>

                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>

                    Authenticating...

                  </>

                ) : (

                  <>

                    <Crown className="w-4 h-4 mr-2" />

                    Access Super Admin Panel

                  </>

                )}

              </Button>

            </form>



            {/* Security Notice */}

            <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">

              <div className="flex items-start space-x-3">

                <Shield className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />

                <div>

                  <p className="text-sm font-medium text-purple-800 mb-1">Enhanced Security</p>

                  <p className="text-xs text-purple-700">

                    This portal provides unrestricted access to all system functions.

                    Only authorized super administrators may proceed.

                  </p>

                </div>

              </div>

            </div>



          </CardContent>

        </Card>



        {/* Footer Links */}

        <div className="text-center space-y-2">

          <Link

            to="/admin/login?prompt=login"

            className="inline-flex items-center text-purple-600 hover:text-purple-800 text-sm font-medium"

          >

            <Shield className="w-4 h-4 mr-1" />

            Regular Admin Portal

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
