import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Sign in to BuildCityBulk</h1>
        <p className="text-sm text-zinc-500">
          Enter your phone number — we&apos;ll send a one-time code to verify it.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
