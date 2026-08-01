import { RoleGuard } from "../../components/RoleGuard";
import { AdminExecutives } from "../../components/dashboard/AdminExecutives";

export default function ExecutivesScreen() {
  return (
    <RoleGuard allowedRoles={["company_admin"]}>
      <AdminExecutives />
    </RoleGuard>
  );
}
