import { LoadingSpinner } from "@/components/loading-spinner";
import { LoadingToast } from "@/components/loading-toast";

export default function DashboardLoading() {
  return (
    <>
      <LoadingToast />
      <LoadingSpinner />
    </>
  );
}
