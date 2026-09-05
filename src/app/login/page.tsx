import LoginForm from "@/components/LoginForm";
import { totpRequired } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginForm totpRequired={totpRequired()} />;
}
