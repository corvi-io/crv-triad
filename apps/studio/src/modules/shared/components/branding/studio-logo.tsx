import { cn } from "@/modules/shared/lib/utils"

type StudioLogoProps = {
  className?: string
  tone?: "adaptive" | "gold" | "inverse"
  variant?: "horizontal" | "icon"
}

export function StudioLogo({
  className,
  tone = "adaptive",
  variant = "horizontal",
}: StudioLogoProps) {
  if (variant === "icon") {
    return (
      <span
        aria-label="TRIAD Studio"
        className={cn("relative inline-flex size-9 items-center justify-center", className)}
        role="img"
      >
        <LogoAsset kind="symbol" tone={tone} />
        <span
          aria-hidden="true"
          className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-sm bg-primary text-xs font-bold leading-none text-primary-foreground ring-2 ring-sidebar"
        >
          S
        </span>
      </span>
    )
  }

  return (
    <span
      aria-label="TRIAD Studio"
      className={cn("inline-flex w-40 flex-col items-end", className)}
      role="img"
    >
      <LogoAsset kind="horizontal" tone={tone} />
      <span
        aria-hidden="true"
        className={cn(
          "-mt-0.5 pr-[1%] text-xs font-semibold tracking-[0.22em] uppercase",
          tone === "inverse" ? "text-workspace-selection-muted" : "text-primary",
        )}
      >
        Studio
      </span>
    </span>
  )
}

function LogoAsset({
  kind,
  tone,
}: {
  kind: "horizontal" | "symbol"
  tone: NonNullable<StudioLogoProps["tone"]>
}) {
  if (tone === "adaptive") {
    return (
      <>
        <img
          alt=""
          aria-hidden="true"
          className="h-auto w-full dark:hidden"
          src={`/brand/crv-triad-${kind}-gold.svg`}
        />
        <img
          alt=""
          aria-hidden="true"
          className="hidden h-auto w-full dark:block"
          src={`/brand/crv-triad-${kind}-white.svg`}
        />
      </>
    )
  }

  return (
    <img
      alt=""
      aria-hidden="true"
      className="h-auto w-full"
      src={`/brand/crv-triad-${kind}-${tone === "gold" ? "gold" : "white"}.svg`}
    />
  )
}
