import { AdminLayout } from "@/components/admin/AdminLayout";
import { UnifiedCommentManager } from "@/components/admin/UnifiedCommentManager";

export default function AdminComments() {
  return (
    <AdminLayout variant="admin">
      <UnifiedCommentManager variant="admin" />
    </AdminLayout>
  );
}