export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page flex min-h-[70vh] items-start justify-center py-16">
      <div className="w-full max-w-md rounded-3xl border border-line bg-ink-soft p-8 sm:p-10">{children}</div>
    </div>
  );
}
