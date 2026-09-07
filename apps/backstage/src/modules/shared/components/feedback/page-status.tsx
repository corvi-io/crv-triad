import { LoaderCircle } from "lucide-react"

type PageStatusProps = {
  title: string
  description?: string
}

export function PageStatus({ description, title }: PageStatusProps) {
  return (
    <main
      id="main-content"
      className="grid min-h-svh place-items-center bg-background px-5 py-10 text-foreground"
    >
      <div className="max-w-sm text-center" role="status">
        <LoaderCircle className="mx-auto size-6 animate-spin text-primary" aria-hidden="true" />
        <h1 className="mt-4 text-lg font-semibold">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>
    </main>
  )
}
