export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <section className="bg-ink pb-16 pt-36 text-white">
        <div className="mx-auto max-w-3xl px-5">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        </div>
      </section>
      <section className="py-16">
        <div className="mx-auto max-w-3xl space-y-8 px-5 leading-relaxed text-muted [&_a]:text-brand [&_a:hover]:underline [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_strong]:text-ink">
          {children}
        </div>
      </section>
    </>
  );
}
