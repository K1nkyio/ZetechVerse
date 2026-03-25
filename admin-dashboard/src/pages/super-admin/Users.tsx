import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Search, ShieldCheck, ShieldOff, ShieldPlus, UserCheck, Users } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Column, DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/api/base";

interface PendingAdmin { id: number; email: string; username: string; full_name: string; admin_requested_at: string; }
interface AdminAccount {
  id: number; email: string; username: string; full_name: string; role: "admin" | "super_admin";
  admin_status: "pending" | "approved" | "deactivated"; is_active: boolean; created_at: string;
  admin_requested_at?: string; admin_approved_at?: string; admin_approved_by?: number | null;
  approved_by_email?: string | null; approved_by_username?: string | null; last_login_at?: string | null;
}
interface AccessAudit {
  id: number; user_id: number | null; entity_id: number | null; entity_type: "admin_account" | "user_account";
  action: string; description?: string | null; ip_address?: string | null; user_agent?: string | null;
  created_at: string; actor_email?: string | null; actor_username?: string | null; target_email?: string | null; target_username?: string | null;
}
interface UserAccount {
  id: number; email: string; username: string; full_name?: string | null; student_id?: string | null;
  course?: string | null; year_of_study?: number | null; phone?: string | null; role: "user";
  is_active: boolean; email_verified: boolean; created_at: string; updated_at: string; last_login_at?: string | null;
}
type PreviewEntity = { kind: "pending-admin"; data: PendingAdmin } | { kind: "admin"; data: AdminAccount } | { kind: "user"; data: UserAccount };
type WorkflowAction = "approve-admin" | "deactivate-admin" | "reactivate-admin" | "deactivate-user" | "activate-user";
interface WorkflowDialogState { action: WorkflowAction; ids: number[]; label: string; reasonRequired: boolean; }

const parseAuditDescription = (value?: string | null) => { try { return value ? JSON.parse(value) : {}; } catch { return {}; } };
const matchesSearch = (values: Array<string | number | boolean | null | undefined>, query: string) => !query.trim() || values.some((value) => String(value ?? "").toLowerCase().includes(query.trim().toLowerCase()));
const getDaysSince = (value?: string | null) => { if (!value) return null; const t = new Date(value).getTime(); return Number.isNaN(t) ? null : Math.floor((Date.now() - t) / 86400000); };
const formatDateTime = (value?: string | null) => { if (!value) return "—"; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString(); };

export default function SuperAdminUsers() {
  const { toast } = useToast();
  const [pendingAdmins, setPendingAdmins] = useState<PendingAdmin[]>([]);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [auditLogs, setAuditLogs] = useState<AccessAudit[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [previewEntity, setPreviewEntity] = useState<PreviewEntity | null>(null);
  const [workflowDialog, setWorkflowDialog] = useState<WorkflowDialogState | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", username: "", full_name: "", password: "" });
  const [pendingSearch, setPendingSearch] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [adminRoleFilter, setAdminRoleFilter] = useState("all");
  const [adminStatusFilter, setAdminStatusFilter] = useState("all");
  const [adminActivityFilter, setAdminActivityFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userVerificationFilter, setUserVerificationFilter] = useState("all");
  const [userActivityFilter, setUserActivityFilter] = useState("all");
  const [auditTypeFilter, setAuditTypeFilter] = useState("all");
  const [auditActionFilter, setAuditActionFilter] = useState("all");
  const [selectedPendingIds, setSelectedPendingIds] = useState<number[]>([]);
  const [selectedAdminIds, setSelectedAdminIds] = useState<number[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pendingRes, accountsRes, usersRes, auditRes] = await Promise.all([
        apiClient.get<PendingAdmin[]>("/auth/admin/pending"),
        apiClient.get<AdminAccount[]>("/auth/admin/accounts"),
        apiClient.get<UserAccount[]>("/auth/users"),
        apiClient.get<AccessAudit[]>("/auth/admin/audit", { limit: 400, entity_type: "all" }),
      ]);
      setPendingAdmins(pendingRes.data.data || []);
      setAdminAccounts(accountsRes.data.data || []);
      setUserAccounts(usersRes.data.data || []);
      setAuditLogs(auditRes.data.data || []);
    } catch (error: any) {
      toast({ title: "Failed to load account data", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const filteredPendingAdmins = useMemo(() => pendingAdmins.filter((item) => matchesSearch([item.email, item.username, item.full_name], pendingSearch)), [pendingAdmins, pendingSearch]);
  const filteredAdminAccounts = useMemo(() => adminAccounts.filter((item) => {
    const days = getDaysSince(item.last_login_at || item.created_at);
    const matchesActivity = adminActivityFilter === "all" || (adminActivityFilter === "inactive14" && (days === null || days >= 14)) || (adminActivityFilter === "active7" && days !== null && days < 7);
    return matchesSearch([item.email, item.username, item.full_name, item.role, item.admin_status], adminSearch) && (adminRoleFilter === "all" || item.role === adminRoleFilter) && (adminStatusFilter === "all" || item.admin_status === adminStatusFilter) && matchesActivity;
  }), [adminAccounts, adminActivityFilter, adminRoleFilter, adminSearch, adminStatusFilter]);
  const filteredUserAccounts = useMemo(() => userAccounts.filter((item) => {
    const days = getDaysSince(item.last_login_at || item.created_at);
    const matchesActivity = userActivityFilter === "all" || (userActivityFilter === "inactive30" && (days === null || days >= 30)) || (userActivityFilter === "active7" && days !== null && days < 7);
    const matchesStatus = userStatusFilter === "all" || (userStatusFilter === "active" && item.is_active) || (userStatusFilter === "inactive" && !item.is_active);
    const matchesVerification = userVerificationFilter === "all" || (userVerificationFilter === "verified" && item.email_verified) || (userVerificationFilter === "unverified" && !item.email_verified);
    return matchesSearch([item.email, item.username, item.full_name, item.course, item.student_id, item.phone], userSearch) && matchesStatus && matchesVerification && matchesActivity;
  }), [userAccounts, userActivityFilter, userSearch, userStatusFilter, userVerificationFilter]);
  const filteredAuditLogs = useMemo(() => auditLogs.filter((entry) => {
    const parsed = parseAuditDescription(entry.description);
    return matchesSearch([entry.actor_email, entry.actor_username, entry.target_email, entry.target_username, entry.action, parsed.reason], auditSearch) && (auditTypeFilter === "all" || entry.entity_type === auditTypeFilter) && (auditActionFilter === "all" || entry.action.toLowerCase().includes(auditActionFilter.toLowerCase()));
  }), [auditActionFilter, auditLogs, auditSearch, auditTypeFilter]);

  const totalAdmins = adminAccounts.filter((item) => item.role === "admin" && item.admin_status === "approved").length;
  const inactiveAdmins = adminAccounts.filter((item) => { const days = getDaysSince(item.last_login_at || item.created_at); return days === null || days >= 14; }).length;
  const activeUsers = userAccounts.filter((item) => item.is_active).length;
  const previewAuditLog = useMemo(() => {
    if (!previewEntity) return [];
    const entityType = previewEntity.kind === "user" ? "user_account" : "admin_account";
    return auditLogs.filter((entry) => entry.entity_id === previewEntity.data.id && entry.entity_type === entityType).slice(0, 6);
  }, [auditLogs, previewEntity]);

  const toggleSelectedId = (ids: number[], targetId: number) => ids.includes(targetId) ? ids.filter((id) => id !== targetId) : [...ids, targetId];
  const openWorkflowDialog = (action: WorkflowAction, ids: number[], label: string, reasonRequired = false) => { setActionReason(""); setWorkflowDialog({ action, ids, label, reasonRequired }); };

  const submitWorkflowAction = async () => {
    if (!workflowDialog) return;
    if (workflowDialog.reasonRequired && !actionReason.trim()) {
      toast({ title: "Reason required", description: "Please provide a short reason before continuing.", variant: "destructive" });
      return;
    }
    try {
      setActionLoading(true);
      for (const id of workflowDialog.ids) {
        if (workflowDialog.action === "approve-admin" || workflowDialog.action === "reactivate-admin") await apiClient.post("/auth/admin/approve", { admin_id: id, reason: actionReason.trim() || undefined });
        if (workflowDialog.action === "deactivate-admin") await apiClient.post("/auth/admin/deactivate", { admin_id: id, reason: actionReason.trim() || undefined });
        if (workflowDialog.action === "activate-user") await apiClient.post("/auth/users/activate", { user_id: id, reason: actionReason.trim() || undefined });
        if (workflowDialog.action === "deactivate-user") await apiClient.post("/auth/users/deactivate", { user_id: id, reason: actionReason.trim() || undefined });
      }
      toast({ title: "Workflow updated", description: `${workflowDialog.label} completed for ${workflowDialog.ids.length} account(s).` });
      setSelectedPendingIds([]); setSelectedAdminIds([]); setSelectedUserIds([]); setWorkflowDialog(null); await loadData();
    } catch (error: any) {
      toast({ title: "Action failed", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const createAdmin = async () => {
    try {
      await apiClient.post("/auth/admin/create", createForm);
      toast({ title: "Admin created", description: "The admin account was created and approved." });
      setCreateDialogOpen(false); setCreateForm({ email: "", username: "", full_name: "", password: "" }); await loadData();
    } catch (error: any) {
      toast({ title: "Creation failed", description: error.message || "Unable to create admin.", variant: "destructive" });
    }
  };

  const pendingColumns: Column<PendingAdmin>[] = [
    {
      key: "select",
      header: <Checkbox checked={filteredPendingAdmins.length > 0 && filteredPendingAdmins.every((item) => selectedPendingIds.includes(item.id))} onCheckedChange={(checked) => setSelectedPendingIds(checked ? filteredPendingAdmins.map((item) => item.id) : [])} aria-label="Select all pending admins" />,
      className: "w-12",
      render: (item) => <Checkbox checked={selectedPendingIds.includes(item.id)} onCheckedChange={() => setSelectedPendingIds((prev) => toggleSelectedId(prev, item.id))} aria-label={`Select ${item.email}`} />,
    },
    { key: "email", header: "Email" },
    { key: "username", header: "Username" },
    { key: "full_name", header: "Name" },
    { key: "admin_requested_at", header: "Requested", render: (item) => formatDateTime(item.admin_requested_at) },
    { key: "preview", header: "Preview", render: (item) => <Button variant="ghost" size="sm" onClick={() => setPreviewEntity({ kind: "pending-admin", data: item })}>View</Button> },
    { key: "actions", header: "Actions", className: "text-right", render: (item) => <Button size="sm" onClick={() => openWorkflowDialog("approve-admin", [item.id], "Admin approval")}>Approve</Button> },
  ];

  const accountColumns: Column<AdminAccount>[] = [
    {
      key: "select",
      header: <Checkbox checked={filteredAdminAccounts.length > 0 && filteredAdminAccounts.every((item) => selectedAdminIds.includes(item.id))} onCheckedChange={(checked) => setSelectedAdminIds(checked ? filteredAdminAccounts.map((item) => item.id) : [])} aria-label="Select all admins" />,
      className: "w-12",
      render: (item) => <Checkbox checked={selectedAdminIds.includes(item.id)} onCheckedChange={() => setSelectedAdminIds((prev) => toggleSelectedId(prev, item.id))} aria-label={`Select ${item.email}`} />,
    },
    { key: "email", header: "Email" },
    { key: "username", header: "Username" },
    { key: "role", header: "Role", render: (item) => <Badge className={item.role === "super_admin" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}>{item.role === "super_admin" ? "Super Admin" : "Admin"}</Badge> },
    { key: "admin_status", header: "Status", render: (item) => <StatusBadge status={item.admin_status === "approved" ? "active" : "inactive"} /> },
    { key: "last_login_at", header: "Last Login", render: (item) => formatDateTime(item.last_login_at || item.created_at) },
    { key: "preview", header: "Preview", render: (item) => <Button variant="ghost" size="sm" onClick={() => setPreviewEntity({ kind: "admin", data: item })}>View</Button> },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (item) => item.role === "admin"
        ? item.admin_status === "deactivated"
          ? <Button size="sm" onClick={() => openWorkflowDialog("reactivate-admin", [item.id], "Admin reactivation")}>Reactivate</Button>
          : <Button size="sm" variant="outline" onClick={() => openWorkflowDialog("deactivate-admin", [item.id], "Admin deactivation", true)}>Deactivate</Button>
        : <Badge variant="outline">Protected</Badge>,
    },
  ];

  const userColumns: Column<UserAccount>[] = [
    {
      key: "select",
      header: <Checkbox checked={filteredUserAccounts.length > 0 && filteredUserAccounts.every((item) => selectedUserIds.includes(item.id))} onCheckedChange={(checked) => setSelectedUserIds(checked ? filteredUserAccounts.map((item) => item.id) : [])} aria-label="Select all users" />,
      className: "w-12",
      render: (item) => <Checkbox checked={selectedUserIds.includes(item.id)} onCheckedChange={() => setSelectedUserIds((prev) => toggleSelectedId(prev, item.id))} aria-label={`Select ${item.email}`} />,
    },
    { key: "email", header: "Email" },
    { key: "username", header: "Username" },
    { key: "full_name", header: "Name", render: (item) => item.full_name || "—" },
    { key: "course", header: "Course", render: (item) => item.course || "—" },
    { key: "email_verified", header: "Verification", render: (item) => <Badge variant={item.email_verified ? "default" : "outline"}>{item.email_verified ? "Verified" : "Unverified"}</Badge> },
    { key: "is_active", header: "Status", render: (item) => <StatusBadge status={item.is_active ? "active" : "inactive"} /> },
    { key: "last_login_at", header: "Last Login", render: (item) => formatDateTime(item.last_login_at || item.created_at) },
    { key: "preview", header: "Preview", render: (item) => <Button variant="ghost" size="sm" onClick={() => setPreviewEntity({ kind: "user", data: item })}>View</Button> },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (item) => item.is_active
        ? <Button size="sm" variant="outline" onClick={() => openWorkflowDialog("deactivate-user", [item.id], "User deactivation", true)}>Deactivate</Button>
        : <Button size="sm" onClick={() => openWorkflowDialog("activate-user", [item.id], "User activation")}>Activate</Button>,
    },
  ];

  const auditColumns: Column<AccessAudit>[] = [
    { key: "entity_type", header: "Scope", render: (item) => <Badge variant="outline">{item.entity_type === "admin_account" ? "Admin Access" : "User Access"}</Badge> },
    { key: "actor_email", header: "Actor", render: (item) => item.actor_email || item.actor_username || "System" },
    { key: "action", header: "Action", render: (item) => item.action.replaceAll("_", " ") },
    { key: "target_email", header: "Target", render: (item) => item.target_email || item.target_username || "—" },
    { key: "description", header: "Reason", render: (item) => parseAuditDescription(item.description).reason || "—" },
    { key: "created_at", header: "Time", render: (item) => formatDateTime(item.created_at) },
  ];

  return (
    <AdminLayout variant="super-admin">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Admin Control Center</h1>
            <p className="text-muted-foreground">Filter, investigate, preview, and act on user or admin access from one place.</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-primary text-primary-foreground">
            <ShieldPlus className="mr-2 h-4 w-4" />
            Create Admin
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="admin-card"><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl border border-warning/20 bg-warning/10 p-3"><ShieldCheck className="h-5 w-5 text-warning" /></div><div><p className="text-3xl font-bold font-display">{pendingAdmins.length}</p><p className="text-sm text-muted-foreground">Pending Requests</p></div></CardContent></Card>
          <Card className="admin-card"><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl border border-primary/20 bg-primary/10 p-3"><UserCheck className="h-5 w-5 text-primary" /></div><div><p className="text-3xl font-bold font-display">{totalAdmins}</p><p className="text-sm text-muted-foreground">Approved Admins</p></div></CardContent></Card>
          <Card className="admin-card"><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl border border-accent/20 bg-accent/10 p-3"><ShieldOff className="h-5 w-5 text-accent" /></div><div><p className="text-3xl font-bold font-display">{inactiveAdmins}</p><p className="text-sm text-muted-foreground">Inactive 14+ Days</p></div></CardContent></Card>
          <Card className="admin-card"><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl border border-success/20 bg-success/10 p-3"><Users className="h-5 w-5 text-success" /></div><div><p className="text-3xl font-bold font-display">{activeUsers}</p><p className="text-sm text-muted-foreground">Active Users</p></div></CardContent></Card>
        </div>

        <Card className="admin-card">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="font-display">Pending Admin Requests</CardTitle>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-[240px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={pendingSearch} onChange={(event) => setPendingSearch(event.target.value)} className="pl-9" placeholder="Search pending requests..." /></div>
                {selectedPendingIds.length > 0 ? <Button onClick={() => openWorkflowDialog("approve-admin", selectedPendingIds, "Bulk admin approval")}>Approve Selected ({selectedPendingIds.length})</Button> : null}
              </div>
            </div>
          </CardHeader>
          <CardContent><DataTable data={filteredPendingAdmins} columns={pendingColumns} rowKey="id" className={loading ? "opacity-60" : undefined} emptyMessage="No pending admin requests match the current filters." /></CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <CardTitle className="font-display">Admin Accounts</CardTitle>
              <div className="grid gap-3 sm:grid-cols-2 xl:flex">
                <div className="relative min-w-[240px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} className="pl-9" placeholder="Search admin accounts..." /></div>
                <Select value={adminRoleFilter} onValueChange={setAdminRoleFilter}><SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Role" /></SelectTrigger><SelectContent><SelectItem value="all">All roles</SelectItem><SelectItem value="admin">Admins</SelectItem><SelectItem value="super_admin">Super admins</SelectItem></SelectContent></Select>
                <Select value={adminStatusFilter} onValueChange={setAdminStatusFilter}><SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="deactivated">Deactivated</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent></Select>
                <Select value={adminActivityFilter} onValueChange={setAdminActivityFilter}><SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Activity" /></SelectTrigger><SelectContent><SelectItem value="all">Any activity</SelectItem><SelectItem value="active7">Active in 7d</SelectItem><SelectItem value="inactive14">Inactive 14d+</SelectItem></SelectContent></Select>
              </div>
            </div>
            {selectedAdminIds.length > 0 ? <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => openWorkflowDialog("deactivate-admin", selectedAdminIds, "Bulk admin deactivation", true)}>Deactivate Selected ({selectedAdminIds.length})</Button><Button onClick={() => openWorkflowDialog("reactivate-admin", selectedAdminIds, "Bulk admin reactivation")}>Reactivate Selected</Button></div> : null}
          </CardHeader>
          <CardContent><DataTable data={filteredAdminAccounts} columns={accountColumns} rowKey="id" className={loading ? "opacity-60" : undefined} emptyMessage="No admin accounts match the current filters." /></CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <CardTitle className="font-display">User Accounts</CardTitle>
              <div className="grid gap-3 sm:grid-cols-2 xl:flex">
                <div className="relative min-w-[240px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} className="pl-9" placeholder="Search users..." /></div>
                <Select value={userStatusFilter} onValueChange={setUserStatusFilter}><SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
                <Select value={userVerificationFilter} onValueChange={setUserVerificationFilter}><SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Verification" /></SelectTrigger><SelectContent><SelectItem value="all">All users</SelectItem><SelectItem value="verified">Verified</SelectItem><SelectItem value="unverified">Unverified</SelectItem></SelectContent></Select>
                <Select value={userActivityFilter} onValueChange={setUserActivityFilter}><SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Activity" /></SelectTrigger><SelectContent><SelectItem value="all">Any activity</SelectItem><SelectItem value="active7">Active in 7d</SelectItem><SelectItem value="inactive30">Inactive 30d+</SelectItem></SelectContent></Select>
              </div>
            </div>
            {selectedUserIds.length > 0 ? <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => openWorkflowDialog("deactivate-user", selectedUserIds, "Bulk user deactivation", true)}>Deactivate Selected ({selectedUserIds.length})</Button><Button onClick={() => openWorkflowDialog("activate-user", selectedUserIds, "Bulk user activation")}>Activate Selected</Button></div> : null}
          </CardHeader>
          <CardContent><DataTable data={filteredUserAccounts} columns={userColumns} rowKey="id" className={loading ? "opacity-60" : undefined} emptyMessage="No user accounts match the current filters." /></CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <CardTitle className="font-display">Access Audit Log</CardTitle>
              <div className="grid gap-3 sm:grid-cols-2 xl:flex">
                <div className="relative min-w-[240px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={auditSearch} onChange={(event) => setAuditSearch(event.target.value)} className="pl-9" placeholder="Search actor, target, or reason..." /></div>
                <Select value={auditTypeFilter} onValueChange={setAuditTypeFilter}><SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Scope" /></SelectTrigger><SelectContent><SelectItem value="all">All scopes</SelectItem><SelectItem value="admin_account">Admin access</SelectItem><SelectItem value="user_account">User access</SelectItem></SelectContent></Select>
                <Select value={auditActionFilter} onValueChange={setAuditActionFilter}><SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Action" /></SelectTrigger><SelectContent><SelectItem value="all">All actions</SelectItem><SelectItem value="approved">Approvals</SelectItem><SelectItem value="deactivated">Deactivations</SelectItem><SelectItem value="activated">Activations</SelectItem><SelectItem value="login">Logins</SelectItem></SelectContent></Select>
              </div>
            </div>
          </CardHeader>
          <CardContent><DataTable data={filteredAuditLogs} columns={auditColumns} rowKey="id" pageSize={15} className={loading ? "opacity-60" : undefined} emptyMessage="No audit entries match the current filters." /></CardContent>
        </Card>

        <Dialog open={Boolean(previewEntity)} onOpenChange={(open) => !open && setPreviewEntity(null)}>
          <DialogContent className="max-w-2xl bg-card">
            <DialogHeader><DialogTitle className="font-display">Quick Profile Preview</DialogTitle><DialogDescription>A fast investigation snapshot with recent access history.</DialogDescription></DialogHeader>
            {previewEntity ? <div className="space-y-6"><div className="rounded-2xl border border-border/70 bg-background/70 p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-semibold font-display">{"full_name" in previewEntity.data && previewEntity.data.full_name ? previewEntity.data.full_name : previewEntity.data.username}</h3><p className="mt-1 text-sm text-muted-foreground">{previewEntity.data.email}</p></div><Badge variant="outline">{previewEntity.kind === "user" ? "User" : previewEntity.kind === "admin" ? previewEntity.data.role === "super_admin" ? "Super Admin" : "Admin" : "Pending Admin"}</Badge></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{"student_id" in previewEntity.data ? <><div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Student ID</p><p className="mt-1 text-sm">{previewEntity.data.student_id || "—"}</p></div><div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Course</p><p className="mt-1 text-sm">{previewEntity.data.course || "—"}</p></div><div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Year of study</p><p className="mt-1 text-sm">{previewEntity.data.year_of_study || "—"}</p></div><div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Phone</p><p className="mt-1 text-sm">{previewEntity.data.phone || "—"}</p></div></> : null}{"admin_status" in previewEntity.data ? <><div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Admin status</p><p className="mt-1 text-sm capitalize">{previewEntity.data.admin_status}</p></div><div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Last login</p><p className="mt-1 text-sm">{formatDateTime(previewEntity.data.last_login_at || previewEntity.data.created_at)}</p></div></> : null}{"created_at" in previewEntity.data ? <div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Created</p><p className="mt-1 text-sm">{formatDateTime(previewEntity.data.created_at)}</p></div> : null}{"updated_at" in previewEntity.data ? <div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Updated</p><p className="mt-1 text-sm">{formatDateTime(previewEntity.data.updated_at)}</p></div> : null}</div></div><div className="space-y-3"><div className="flex items-center justify-between"><h4 className="font-semibold text-foreground">Recent Audit Trail</h4><Badge variant="outline">{previewAuditLog.length}</Badge></div>{previewAuditLog.length === 0 ? <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">No recent access audit entries for this account.</div> : <div className="space-y-3">{previewAuditLog.map((entry) => { const details = parseAuditDescription(entry.description); return <div key={entry.id} className="rounded-xl border border-border/70 bg-background/70 p-4"><div className="flex items-center justify-between gap-3"><p className="font-medium">{entry.action.replaceAll("_", " ")}</p><span className="text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</span></div><p className="mt-1 text-sm text-muted-foreground">Actor: {entry.actor_email || entry.actor_username || "System"}</p>{details.reason ? <p className="mt-2 text-sm">Reason: {details.reason}</p> : null}</div>; })}</div>}</div></div> : null}
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(workflowDialog)} onOpenChange={(open) => !open && setWorkflowDialog(null)}>
          <DialogContent className="bg-card">
            <DialogHeader><DialogTitle className="font-display">{workflowDialog?.label}</DialogTitle><DialogDescription>{workflowDialog?.ids.length || 0} account(s) will be affected.</DialogDescription></DialogHeader>
            <div className="space-y-4"><div className="rounded-xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">Capture a short reason so the audit trail stays useful for future reviews.</div><div className="space-y-2"><Label htmlFor="action_reason">Reason / note</Label><Textarea id="action_reason" value={actionReason} onChange={(event) => setActionReason(event.target.value)} placeholder="Explain why this approval, activation, or deactivation is happening..." rows={4} /></div></div>
            <DialogFooter><Button variant="outline" onClick={() => setWorkflowDialog(null)}>Cancel</Button><Button onClick={() => void submitWorkflowAction()} disabled={actionLoading}>{actionLoading ? "Saving..." : "Confirm"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="bg-card">
            <DialogHeader><DialogTitle className="font-display">Create Admin Account</DialogTitle><DialogDescription>Provision an approved admin account directly from the control center.</DialogDescription></DialogHeader>
            <div className="space-y-4"><div className="space-y-2"><Label htmlFor="create_email">Email</Label><Input id="create_email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="admin@yourdomain.com" /></div><div className="space-y-2"><Label htmlFor="create_username">Username</Label><Input id="create_username" value={createForm.username} onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} placeholder="admin_user" /></div><div className="space-y-2"><Label htmlFor="create_full_name">Full Name</Label><Input id="create_full_name" value={createForm.full_name} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} placeholder="Jane Doe" /></div><div className="space-y-2"><Label htmlFor="create_password">Password</Label><div className="relative"><Input id="create_password" type={showCreatePassword ? "text" : "password"} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="At least 12 characters with a symbol" className="pr-10" /><button type="button" onClick={() => setShowCreatePassword((prev) => !prev)} className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground" aria-label={showCreatePassword ? "Hide password" : "Show password"}>{showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div></div>
            <DialogFooter><Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button><Button onClick={() => void createAdmin()}>Create Admin</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
