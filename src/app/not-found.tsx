import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="eyebrow mb-3">Erro 404</p>
      <h1 className="section-title mb-4">Página não encontrada</h1>
      <p className="mb-8 max-w-md text-muted">O endereço pode ter mudado ou o perfume não está mais disponível.</p>
      <Link href="/perfumes" className="btn-primary">Ver perfumes</Link>
    </div>
  );
}
