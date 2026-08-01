import { useLocalSearchParams } from "expo-router";
import { useAuth } from "../../../lib/auth";
import { ExecutiveLRDetail } from "../../../components/ExecutiveLRDetail";
import { AdminLRDetail } from "../../../components/dashboard/AdminLRDetail";

export default function LRDetailScreen() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const { user } = useAuth();

  if (user?.role === "executive" && id) {
    return <ExecutiveLRDetail id={id} initialEdit={edit === "1"} />;
  }

  if (!id) {
    return null;
  }

  return <AdminLRDetail id={id} />;
}
