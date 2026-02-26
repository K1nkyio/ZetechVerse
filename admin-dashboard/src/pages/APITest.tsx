import { useState } from "react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { apiClient } from "@/api/base";



export default function APITest() {

  const [apiUrl, setApiUrl] = useState("http://localhost:3000/api");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [response, setResponse] = useState<any>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);



  const testConnection = async () => {

    setLoading(true);

    setError(null);

    setResponse(null);



    try {

      console.log("Testing API connection to:", apiUrl);

      const result = await fetch(`${apiUrl}/auth/verify`);

      const data = await result.json();

      console.log("Connection test response:", data);

      setResponse({ type: "connection", data });

    } catch (err: any) {

      console.error("Connection test failed:", err);

      setError(err.message || "Connection failed");

    } finally {

      setLoading(false);

    }

  };



  const testLogin = async () => {

    setLoading(true);

    setError(null);

    setResponse(null);



    try {

      console.log("Attempting login...");

      const result = await apiClient.post("/auth/login", { email, password });

      console.log("Login response:", result);

      setResponse({ type: "login", data: result });



      if (result.success && result.data?.token) {

        console.log("✅ Login successful! Token received.");


      }

    } catch (err: any) {

      console.error("Login failed:", err);

      setError(err.message || "Login failed");

    } finally {

      setLoading(false);

    }

  };



  const checkStoredToken = () => {

    const clientToken = apiClient.getToken();

    const storageToken = sessionStorage.getItem('auth_token');

    setResponse({

      type: "token-check",

      data: {

        clientToken: clientToken ? `${clientToken.substring(0, 50)}...` : null,

        storageToken: storageToken ? `${storageToken.substring(0, 50)}...` : null,

      },

    });

  };



  return (

    <div className="min-h-screen bg-background p-8">

      <div className="max-w-2xl mx-auto space-y-6">

        <Card>

          <CardHeader>

            <CardTitle>API Connection Tester</CardTitle>

          </CardHeader>

          <CardContent className="space-y-4">

            <div>

              <label className="block text-sm font-medium mb-2">API URL</label>

              <Input

                value={apiUrl}

                onChange={(e) => setApiUrl(e.target.value)}

                placeholder="http://localhost:3000/api"

              />

            </div>



            <div className="space-y-2">

              <Button onClick={testConnection} disabled={loading} className="w-full">

                {loading ? "Testing..." : "Test Connection"}

              </Button>

            </div>

          </CardContent>

        </Card>



        <Card>

          <CardHeader>

            <CardTitle>Login Tester</CardTitle>

          </CardHeader>

          <CardContent className="space-y-4">

            <div>

              <label className="block text-sm font-medium mb-2">Email</label>

              <Input

                type="email"

                value={email}

                onChange={(e) => setEmail(e.target.value)}

                placeholder="admin@yourdomain.com"

              />

            </div>



            <div>

              <label className="block text-sm font-medium mb-2">Password</label>

              <Input

                type="password"

                value={password}

                onChange={(e) => setPassword(e.target.value)}

                placeholder="Enter your password"

              />

            </div>



            <div className="space-y-2">

              <Button onClick={testLogin} disabled={loading} className="w-full">

                {loading ? "Logging in..." : "Test Login"}

              </Button>

            </div>

          </CardContent>

        </Card>



        <Card>

          <CardHeader>

            <CardTitle>Token Check</CardTitle>

          </CardHeader>

          <CardContent>

            <Button onClick={checkStoredToken} className="w-full">

              Check Stored Token

            </Button>

          </CardContent>

        </Card>



        {error && (

          <Card className="border-red-500 bg-red-50">

            <CardHeader>

              <CardTitle className="text-red-700">Error</CardTitle>

            </CardHeader>

            <CardContent>

              <p className="text-red-600">{error}</p>

            </CardContent>

          </Card>

        )}



        {response && (

          <Card className="bg-gray-50">

            <CardHeader>

              <CardTitle>Response ({response.type})</CardTitle>

            </CardHeader>

            <CardContent>

              <pre className="bg-white p-4 rounded border overflow-auto max-h-96 text-sm">

                {JSON.stringify(response.data, null, 2)}

              </pre>

            </CardContent>

          </Card>

        )}

      </div>

    </div>

  );

}

