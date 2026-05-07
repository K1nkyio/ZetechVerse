import { useEffect, useMemo, useState } from "react";
import { Activity, Search } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Column, DataTable } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/api/base";

interface AuditLog {
  id: number;
  user_id: number | null;
  entity_id: number | null;
  entity_type: string | null;
  action: string;
  description?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  actor_email?: string | null;
  actor_username?: string | null;
  target_email?: string | null;
  target_username?: string | null;
}

const parseDescription = (value?: string | null) => {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const labelAction = (action: string) => action.replaceAll("_", " ");

export default function SuperAdminAuditLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [action, setAction] = useState("all");

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<AuditLog[]>("/auth/admin/audit", {
        limit: 500,
        entity_type: scope,
        action: action === "all" ? undefined : action,
        q: query || undefined
      });
      setLogs(response.data.data || []);
    } catch (error: any) {
      toast({
        title: "Failed to load audit logs",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, [scope, action]);

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((entry) => {
      const details = parseDescription(entry.description);
      return [
        entry.actor_email,
        entry.actor_username,
        entry.target_email,
        entry.target_username,
        entry.action,
        entry.entity_type,
        details.reason,
        details.email,
        details.role,
        entry.ip_address
      ].some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [logs, query]);

  const columns: Column<AuditLog>[] = [
    {
      key: "created_at",
      header: "Time",
      render: (entry) => formatDateTime(entry.created_at)
    },
    {
      key: "entity_type",
      header: "Scope",
      render: (entry) => <Badge variant="outline">{entry.entity_type || "system"}</Badge>
    },
    {
      key: "actor_email",
      header: "Actor",
      render: (entry) => entry.actor_email || entry.actor_username || "System"
    },
    {
      key: "action",
      header: "Action",
      render: (entry) => <span className="capitalize">{labelAction(entry.action)}</span>
    },
    {
      key: "target_email",
      header: "Target",
      render: (entry) => entry.target_email || entry.target_username || parseDescription(entry.description).email || "-"
    },
    {
      key: "description",
      header: "Details",
      render: (entry) => {
        const details = parseDescription(entry.description);
        return details.reason || details.role || details.invite_id || "-";
      }
    },
    {
      key: "ip_address",
      header: "IP",
      render: (entry) => entry.ip_address || "-"
    }
  ];

  return (
    <AdminLayout variant="super-admin">
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Audit Logs</h1>
              <p className="text-muted-foreground">Review admin invites, approvals, activations, deactivations, and login events.</p>
            </div>
          </div>
        </div>

        <Card className="admin-card">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <CardTitle className="font-display">Access Events</CardTitle>
              <div className="grid gap-3 sm:grid-cols-2 xl:flex">
                <div className="relative min-w-[260px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void loadLogs();
                    }}
                    className="pl-9"
                    placeholder="Search actor, target, reason..."
                  />
                </div>
                <Select value={scope} onValueChange={setScope}>
                  <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All scopes</SelectItem>
                    <SelectItem value="admin_account">Admin accounts</SelectItem>
                    <SelectItem value="user_account">User accounts</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    <SelectItem value="admin_invite_created">Admin invites</SelectItem>
                    <SelectItem value="admin_invite_accepted">Invite accepted</SelectItem>
                    <SelectItem value="admin_approved">Admin approved</SelectItem>
                    <SelectItem value="admin_deactivated">Admin deactivated</SelectItem>
                    <SelectItem value="user_activated">User activated</SelectItem>
                    <SelectItem value="user_deactivated">User deactivated</SelectItem>
                    <SelectItem value="admin_login_success">Admin logins</SelectItem>
                    <SelectItem value="admin_login_failed">Failed admin logins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={filteredLogs}
              columns={columns}
              rowKey="id"
              pageSize={20}
              className={loading ? "opacity-60" : undefined}
              emptyMessage="No audit logs match the current filters."
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
