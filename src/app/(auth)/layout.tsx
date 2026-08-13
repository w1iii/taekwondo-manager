import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 px-4 py-12">
      <Logo />
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}