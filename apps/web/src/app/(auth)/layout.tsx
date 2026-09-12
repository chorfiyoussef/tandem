import { LogoMark, Wordmark } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-10">
      <div className="mb-8 flex items-center gap-2.5">
        <LogoMark size={32} />
        <Wordmark className="text-lg" />
      </div>
      <div className="w-full max-w-[380px]">{children}</div>
    </div>
  );
}
