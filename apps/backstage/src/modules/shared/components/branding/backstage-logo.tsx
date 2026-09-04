import { cn } from "@/modules/shared/lib/utils"

type BackstageLogoProps = {
  className?: string
  tone?: "adaptive" | "gold"
  variant?: "horizontal" | "icon"
}

export function BackstageLogo({
  className,
  tone = "adaptive",
  variant = "horizontal",
}: BackstageLogoProps) {
  const kind = variant === "icon" ? "symbol" : "horizontal"

  return (
    <span
      aria-label="TRIAD Backstage"
      className={cn(
        variant === "icon"
          ? "relative inline-flex size-9 items-center justify-center"
          : "inline-flex w-40 flex-col items-end",
        className,
      )}
      role="img"
    >
      {tone === "adaptive" ? (
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
      ) : (
        <img
          alt=""
          aria-hidden="true"
          className="h-auto w-full"
          src={`/brand/crv-triad-${kind}-gold.svg`}
        />
      )}
      {variant === "icon" ? (
        <span
          aria-hidden="true"
          className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-sm bg-primary text-[0.625rem] font-bold leading-none text-primary-foreground ring-2 ring-sidebar"
        >
          B
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="-mt-0.5 pr-[1%] text-xs font-semibold tracking-[0.2em] text-primary uppercase"
        >
          Backstage
        </span>
      )}
    </span>
  )
}
