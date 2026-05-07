import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { apiClient, handleApiError } from "@/api/base";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function AdminInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    password: ""
  });
  const token = searchParams.get("token") || "";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !formData.password) {
      toast({
        title: "Missing details",
        description: "Invitation token and password are required.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.post("/auth/admin/invites/accept", {
        token,
        username: formData.username || undefined,
        full_name: formData.full_name || undefined,
        password: formData.password
      });

      const authToken = response.data.data?.token;
      const user = response.data.data?.user;
      if (!authToken || !user?.role) {
        throw new Error("Invitation accepted, but login data was missing.");
      }

      apiClient.setToken(authToken);
      sessionStorage.setItem("user_data", JSON.stringify(user));
      toast({
        title: "Invitation accepted",
        description: "Your admin account is ready."
      });

      navigate(user.role === "super_admin" ? "/super-admin" : "/admin", { replace: true });
    } catch (error: any) {
      toast({
        title: "Could not accept invitation",
        description: handleApiError(error),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-white">Accept Admin Invite</h1>
          <p className="text-slate-300">Set your password to activate your ZetechVerse admin account.</p>
        </div>

        <Card className="border-white/10 bg-white/95 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle>Complete Account Setup</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(event) => setFormData({ ...formData, full_name: event.target.value })}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(event) => setFormData({ ...formData, username: event.target.value })}
                  placeholder="admin_user"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                    placeholder="12+ chars with uppercase, number, symbol"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Use at least 12 characters with uppercase, lowercase, number, and symbol.</p>
              </div>
              <Button type="submit" className="h-11 w-full" disabled={loading || !token}>
                {loading ? "Activating..." : "Activate Admin Account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link to="/admin/login" className="inline-flex items-center text-sm font-medium text-blue-200 hover:text-white">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
