import { isDemoMode } from "@/lib/config/runtime";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return <LoginForm demo={isDemoMode()} />;
}
