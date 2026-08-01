import { RoleGuard } from "../../components/RoleGuard";
import { AdminReports } from "../../components/dashboard/AdminReports";

export default function ReportsScreen() {
  return (
    <RoleGuard allowedRoles={["company_admin"]}>
      <AdminReports />
    </RoleGuard>
  );
}
