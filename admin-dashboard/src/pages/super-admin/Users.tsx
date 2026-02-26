import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, ShieldOff, ShieldPlus, Eye, EyeOff, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/api/base";

interface PendingAdmin {
  id: number;
  email: string;
  username: string;
  full_name: string;
  admin_requested_at: string;
}

interface AdminAccount {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: "admin" | "super_admin";
  admin_status: "pending" | "approved" | "deactivated";
  admin_requested_at: string;
  admin_approved_at: string;
}

interface AdminAudit {
  id: number;
  user_id: number;
  action: string;
  description: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  user_email: string;
  user_username: string;
}

interface UserAccount {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  role: "user";
  course?: string;
  year_of_study?: number;
  phone?: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export default function SuperAdminUsers() {
  const { toast } = useToast();
  const [pendingAdmins, setPendingAdmins] = useState<PendingAdmin[]>([]);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAudit[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    username: "",
    full_name: "",
    password: ""
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pendingRes, accountsRes, usersRes, auditRes] = await Promise.all([
        apiClient.get<PendingAdmin[]>("/auth/admin/pending"),
        apiClient.get<AdminAccount[]>("/auth/admin/accounts"),
        apiClient.get<UserAccount[]>("/auth/users"),
        apiClient.get<AdminAudit[]>("/auth/admin/audit", { limit: 200 })
      ]);
      setPendingAdmins(pendingRes.data.data || []);
      setAdminAccounts(accountsRes.data.data || []);
      setUserAccounts(usersRes.data.data || []);
      setAuditLogs(auditRes.data.data || []);
    } catch (error: any) {
      toast({
        title: "Failed to load account data",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const approveAdmin = async (adminId: number) => {
    try {
      await apiClient.post("/auth/admin/approve", { admin_id: adminId });
      toast({
        title: "Admin Approved",
        description: "The admin account is now active."
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error.message || "Unable to approve admin.",
        variant: "destructive"
      });
    }
  };

  const deactivateAdmin = async (adminId: number) => {
    try {
      await apiClient.post("/auth/admin/deactivate", { admin_id: adminId });
      toast({
        title: "Admin Deactivated",
        description: "The admin account has been deactivated."
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Deactivation Failed",
        description: error.message || "Unable to deactivate admin.",
        variant: "destructive"
      });
    }
  };

  const reactivateAdmin = async (adminId: number) => {
    try {
      await apiClient.post("/auth/admin/approve", { admin_id: adminId });
      toast({
        title: "Admin Reactivated",
        description: "The admin account is now active."
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Reactivation Failed",
        description: error.message || "Unable to reactivate admin.",
        variant: "destructive"
      });
    }
  };

  const createAdmin = async () => {
    try {
      await apiClient.post("/auth/admin/create", createForm);
      toast({
        title: "Admin Created",
        description: "The admin account was created and approved."
      });
      setCreateDialogOpen(false);
      setCreateForm({ email: "", username: "", full_name: "", password: "" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Creation Failed",
        description: error.message || "Unable to create admin.",
        variant: "destructive"
      });
    }
  };

  const deactivateUser = async (userId: number) => {
    try {
      await apiClient.post("/auth/users/deactivate", { user_id: userId });
      toast({
        title: "User Deactivated",
        description: "The user account has been deactivated."
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Deactivation Failed",
        description: error.message || "Unable to deactivate user account.",
        variant: "destructive"
      });
    }
  };

  const activateUser = async (userId: number) => {
    try {
      await apiClient.post("/auth/users/activate", { user_id: userId });
      toast({
        title: "User Activated",
        description: "The user account is now active."
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Activation Failed",
        description: error.message || "Unable to activate user account.",
        variant: "destructive"
      });
    }
  };

  const pendingColumns: Column<PendingAdmin>[] = [
    { key: "email", header: "Email" },
    { key: "username", header: "Username" },
    { key: "full_name", header: "Name" },
    {
      key: "admin_requested_at",
      header: "Requested",
      render: (item) => new Date(item.admin_requested_at).toLocaleString()
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (item) => (
        <Button size="sm" onClick={() => approveAdmin(item.id)}>
          Approve
        </Button>
      )
    }
  ];

  const accountColumns: Column<AdminAccount>[] = [
    { key: "email", header: "Email" },
    { key: "username", header: "Username" },
    {
      key: "role",
      header: "Role",
      render: (item) => (
        <Badge className={item.role === "super_admin" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}>
          {item.role === "super_admin" ? "Super Admin" : "Admin"}
        </Badge>
      )
    },
    {
      key: "admin_status",
      header: "Status",
      render: (item) => <StatusBadge status={item.admin_status === "approved" ? "active" : "inactive"} />
    },
    {
      key: "admin_approved_at",
      header: "Approved",
      render: (item) => item.admin_approved_at ? new Date(item.admin_approved_at).toLocaleString() : "-"
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (item) => (
        item.role === "admin" ? (
          item.admin_status === "deactivated" ? (
            <Button size="sm" onClick={() => reactivateAdmin(item.id)}>
              Reactivate
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => deactivateAdmin(item.id)}>
              Deactivate
            </Button>
          )
        ) : null
      )
    }
  ];

  const auditColumns: Column<AdminAudit>[] = [
    { key: "user_email", header: "Admin Email" },
    { key: "action", header: "Action" },
    { key: "ip_address", header: "IP" },
    {
      key: "created_at",
      header: "Time",
      render: (item) => new Date(item.created_at).toLocaleString()
    }
  ];

  const userColumns: Column<UserAccount>[] = [
    { key: "email", header: "Email" },
    { key: "username", header: "Username" },
    {
      key: "full_name",
      header: "Name",
      render: (item) => item.full_name || "-"
    },
    {
      key: "course",
      header: "Course",
      render: (item) => item.course || "-"
    },
    {
      key: "is_active",
      header: "Status",
      render: (item) => <StatusBadge status={item.is_active ? "active" : "inactive"} />
    },
    {
      key: "last_login_at",
      header: "Last Login",
      render: (item) => item.last_login_at ? new Date(item.last_login_at).toLocaleString() : "-"
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (item) => (
        item.is_active ? (
          <Button size="sm" variant="outline" onClick={() => deactivateUser(item.id)}>
            Deactivate
          </Button>
        ) : (
          <Button size="sm" onClick={() => activateUser(item.id)}>
            Activate
          </Button>
        )
      )
    }
  ];

  const totalAdmins = adminAccounts.filter((a) => a.role === "admin").length;
  const totalSuperAdmins = adminAccounts.filter((a) => a.role === "super_admin").length;
  const activeUsers = userAccounts.filter((user) => user.is_active).length;

  return (
    <AdminLayout variant="super-admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Admin Control Center</h1>
            <p className="text-muted-foreground">Approve, audit, and manage admin and user access</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-primary text-primary-foreground">
            <ShieldPlus className="h-4 w-4 mr-2" />
            Create Admin
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="admin-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-warning/10">
                <ShieldCheck className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{pendingAdmins.length}</p>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
              </div>
            </CardContent>
          </Card>
          <Card className="admin-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{totalAdmins}</p>
                <p className="text-sm text-muted-foreground">Active Admins</p>
              </div>
            </CardContent>
          </Card>
          <Card className="admin-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent/10">
                <ShieldOff className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{totalSuperAdmins}</p>
                <p className="text-sm text-muted-foreground">Super Admins</p>
              </div>
            </CardContent>
          </Card>
          <Card className="admin-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-success/10">
                <Users className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{activeUsers}</p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="font-display">Pending Admin Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={pendingAdmins}
              columns={pendingColumns}
              searchKey="email"
              searchPlaceholder="Search pending requests..."
              className={loading ? "opacity-60" : undefined}
            />
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="font-display">Admin Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={adminAccounts}
              columns={accountColumns}
              searchKey="email"
              searchPlaceholder="Search admin accounts..."
              className={loading ? "opacity-60" : undefined}
            />
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="font-display">User Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={userAccounts}
              columns={userColumns}
              searchKey="email"
              searchPlaceholder="Search user accounts..."
              className={loading ? "opacity-60" : undefined}
            />
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="font-display">Admin Audit Log</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={auditLogs}
              columns={auditColumns}
              searchKey="user_email"
              searchPlaceholder="Search audit logs..."
              pageSize={15}
              className={loading ? "opacity-60" : undefined}
            />
          </CardContent>
        </Card>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>Create Admin Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create_email">Email</Label>
                <Input
                  id="create_email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="admin@yourdomain.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create_username">Username</Label>
                <Input
                  id="create_username"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  placeholder="admin_user"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create_full_name">Full Name</Label>
                <Input
                  id="create_full_name"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create_password">Password</Label>
                <div className="relative">
                  <Input
                    id="create_password"
                    type={showCreatePassword ? "text" : "password"}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="At least 12 characters with a symbol"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword((prev) => !prev)}
                    className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
                    aria-label={showCreatePassword ? "Hide password" : "Show password"}
                  >
                    {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createAdmin}>
                Create Admin
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
