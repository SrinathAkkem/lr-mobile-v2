import { useAuth } from "../../../lib/auth";
import { AdminProfile } from "../../../components/dashboard/AdminProfile";
import ExecutiveProfileScreen from "../../../components/profile/ExecutiveProfileScreen";

export default function ProfileScreen() {
  const { user } = useAuth();
  if (user?.role === "executive") {
    return <ExecutiveProfileScreen />;
  }
  return <AdminProfile />;
}
