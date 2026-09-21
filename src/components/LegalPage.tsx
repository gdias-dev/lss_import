export interface LegalSection {
  title: string;
  body: string[];
}

export function LegalPage({ title, sections }: { title: string; sections: LegalSection[] }) {
  return (
    <div className="container-page max-w-3xl py-16">
      <p className="eyebrow mb-3">Informações</p>
      <h1 className="section-title mb-6">{title}</h1>
      <p className="mb-10 rounded-xl border border-gold/40 bg-gold/5 p-4 text-sm text-gold">
        Texto-modelo em rascunho. Revisar com contador ou advogado e preencher os dados da empresa antes de publicar.
      </p>
      <div className="space-y-8">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="mb-3 font-serif text-2xl text-ivory">{s.title}</h2>
            <div className="space-y-3 text-sm leading-relaxed text-ivory/80">
              {s.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
