import { AdminLayout } from "@/components/admin/AdminLayout";
import { UnifiedCommentManager } from "@/components/admin/UnifiedCommentManager";

export default function SuperAdminComments() {
  return (
    <AdminLayout variant="super-admin">
      <UnifiedCommentManager variant="super-admin" />
    </AdminLayout>
  );
}