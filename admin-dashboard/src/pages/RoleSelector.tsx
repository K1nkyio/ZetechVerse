import { useEffect } from "react";

import { useNavigate, Link } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Shield, Crown, Users, ArrowRight } from "lucide-react";

import { apiClient } from "@/api/base";



export default function RoleSelector() {

  const navigate = useNavigate();



  // Check if already authenticated and redirect accordingly

  useEffect(() => {

    const checkExistingAuth = async () => {

      const token = apiClient.getToken();

      if (token) {

        try {

          const response = await apiClient.get('/auth/profile');

          if (response.data.success && response.data.data?.role) {

            const userRole = response.data.data.role;

            if (userRole === 'super_admin') {

              navigate('/super-admin', { replace: true });

            } else if (userRole === 'admin') {

              navigate('/admin', { replace: true });

            }

          }

        } catch (error) {

          // Token invalid, stay on selector page

          console.log('RoleSelector: Token verification failed');

        }

      }

    };



    checkExistingAuth();

  }, [navigate]);



  return (

    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-4">

      <div className="w-full max-w-2xl space-y-8">

        {/* Header */}

        <div className="text-center">

          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-6">

            <Shield className="w-8 h-8 text-white" />

          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">ZetechVerse Admin Portal</h1>

          <p className="text-gray-600">Choose your access level to continue</p>

        </div>



        {/* Role Selection Cards */}

        <div className="grid md:grid-cols-2 gap-6">

          {/* Admin Card */}

          <Card className="hover:shadow-lg transition-shadow duration-200 border-2 hover:border-blue-200">

            <CardHeader className="text-center pb-4">

              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">

                <Users className="w-6 h-6 text-blue-600" />

              </div>

              <CardTitle className="text-xl text-gray-800">Administrator</CardTitle>

              <p className="text-sm text-gray-600">Manage content, users, and platform operations</p>

            </CardHeader>

            <CardContent className="text-center">

              <ul className="text-sm text-gray-600 space-y-2 mb-4">

                <li>• Manage blog posts and content</li>

                <li>• Moderate user submissions</li>

                <li>• View analytics and reports</li>

                <li>• Handle user support</li>

              </ul>

              <Button

                onClick={() => navigate('/admin/login?prompt=login')}

                className="w-full bg-blue-600 hover:bg-blue-700 text-white"

              >

                Admin Login

                <ArrowRight className="w-4 h-4 ml-2" />

              </Button>

              <div className="mt-3 text-sm">
                <Link to="/admin/request" className="text-blue-600 hover:text-blue-800 font-medium">
                  Request admin access
                </Link>
              </div>

            </CardContent>

          </Card>



          {/* Super Admin Card */}

          <Card className="hover:shadow-lg transition-shadow duration-200 border-2 hover:border-purple-200 relative">

            <div className="absolute top-4 right-4">

              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-medium">

                Premium

              </div>

            </div>

            <CardHeader className="text-center pb-4">

              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full mb-3">

                <Crown className="w-6 h-6 text-purple-600" />

              </div>

              <CardTitle className="text-xl text-gray-800">Super Administrator</CardTitle>

              <p className="text-sm text-gray-600">Full system control and advanced management</p>

            </CardHeader>

            <CardContent className="text-center">

              <ul className="text-sm text-gray-600 space-y-2 mb-4">

                <li>• All admin privileges</li>

                <li>• System configuration</li>

                <li>• User role management</li>

                <li>• Advanced analytics</li>

                <li>• Content moderation</li>

              </ul>

              <Button

                onClick={() => navigate('/super-admin/login?prompt=login')}

                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"

              >

                Super Admin Login

                <ArrowRight className="w-4 h-4 ml-2" />

              </Button>

            </CardContent>

          </Card>

        </div>



        {/* Footer */}

        <div className="text-center space-y-2">

          <p className="text-sm text-gray-500">

            Don't have admin access?{" "}

            <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium">

              Return to ZetechVerse

            </Link>

          </p>

          <div className="text-xs text-gray-400">

            Select the appropriate access level for your role and responsibilities.

          </div>

        </div>

      </div>

    </div>

  );

}
