import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Sign in to BuildBid</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Enter your phone number — we&apos;ll send a one-time code to verify it.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
