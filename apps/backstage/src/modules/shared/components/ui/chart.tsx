import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/modules/shared/lib/utils"

const THEMES = { light: "", dark: ".dark" } as const
const INITIAL_DIMENSION = { height: 220, width: 320 } as const

export type ChartConfig = Record<
  string,
  {
    icon?: React.ComponentType
    label?: React.ReactNode
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
>

type ChartContextValue = { config: ChartConfig }
const ChartContext = React.createContext<ChartContextValue | null>(null)

export function useChart() {
  const context = React.use(ChartContext)
  if (!context) throw new Error("useChart must be used within a ChartContainer.")
  return context
}

export function ChartContainer({
  children,
  className,
  config,
  id,
  initialDimension = INITIAL_DIMENSION,
  ...props
}: React.ComponentProps<"div"> & {
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
  config: ChartConfig
  initialDimension?: { height: number; width: number }
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext value={{ config }}>
      <div
        className={cn(
          "flex h-56 min-w-0 w-full justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-layer]:outline-hidden [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-surface]:outline-hidden",
          className,
        )}
        data-chart={chartId}
        data-slot="chart"
        {...props}
      >
        <ChartStyle config={config} id={chartId} />
        <RechartsPrimitive.ResponsiveContainer initialDimension={initialDimension}>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext>
  )
}

export function ChartStyle({ config, id }: { config: ChartConfig; id: string }) {
  const colorConfig = Object.entries(config).filter(
    ([, itemConfig]) => itemConfig.theme ?? itemConfig.color,
  )
  if (colorConfig.length === 0) return null

  return (
    <style>
      {Object.entries(THEMES)
        .map(
          ([theme, prefix]) => `${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ?? itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}`,
        )
        .join("\n")}
    </style>
  )
}
