import { useAuth } from "../../lib/auth";
import { AdminDashboard } from "../../components/dashboard/AdminDashboard";
import { ExecutiveDashboard } from "../../components/dashboard/ExecutiveDashboard";

export default function DashboardScreen() {
  const { user } = useAuth();
  if (user?.role === "executive") return <ExecutiveDashboard />;
  return <AdminDashboard />;
}
