import { redirect } from "next/navigation";

export default function PlatformAdminIndexPage() {
  redirect("/admin/tenants");
}
