export function WorkspaceOverview() {
  return (
    <section aria-labelledby="dashboard-title" className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight" id="dashboard-title">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">Ambiente autenticado do TRIAD Studio.</p>
      </header>

      <section className="max-w-3xl rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
        <h2 className="text-base font-semibold">Base pronta para gestão</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Os fluxos da barbearia serão adicionados somente quando tiverem contratos de produto,
          autorização e dados definidos.
        </p>
      </section>
    </section>
  )
}
