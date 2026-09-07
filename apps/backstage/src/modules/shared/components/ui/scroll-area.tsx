import { ScrollArea as ScrollAreaPrimitive } from "@base-ui-components/react/scroll-area"
import * as React from "react"

import { useTouchPrimary } from "@/modules/shared/hooks/use-has-primary-touch"
import { cn } from "@/modules/shared/lib/utils"

type Mask = {
  bottom: boolean
  left: boolean
  right: boolean
  top: boolean
}

type ScrollAreaBehavior = "auto" | "always" | "scroll" | "hover"
type ScrollAreaScrollbars = "both" | "horizontal" | "none" | "vertical"

type ScrollAreaContextProps = {
  isTouch: boolean
  type: ScrollAreaBehavior
}

type ScrollAreaProps = React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
  maskClassName?: string
  maskHeight?: number
  scrollbars?: ScrollAreaScrollbars
  scrollbarVisibility?: "configured" | "overflow"
  type?: ScrollAreaBehavior
  viewportClassName?: string
  viewportRef?: React.Ref<HTMLDivElement>
}

const ScrollAreaContext = React.createContext<ScrollAreaContextProps>({
  isTouch: false,
  type: "hover",
})

const ScrollArea = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(
  (
    {
      children,
      className,
      maskClassName,
      maskHeight = 30,
      scrollbars = "vertical",
      scrollbarVisibility = "configured",
      type = "hover",
      viewportClassName,
      viewportRef,
      ...props
    },
    ref,
  ) => {
    const [showMask, setShowMask] = React.useState<Mask>({
      bottom: false,
      left: false,
      right: false,
      top: false,
    })
    const [overflow, setOverflow] = React.useState({ horizontal: false, vertical: false })
    const internalViewportRef = React.useRef<HTMLDivElement>(null)
    const isTouch = useTouchPrimary()
    const hasHorizontalScrollbar = scrollbars === "both" || scrollbars === "horizontal"
    const hasVerticalScrollbar = scrollbars === "both" || scrollbars === "vertical"
    const setViewportRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        internalViewportRef.current = node

        if (typeof viewportRef === "function") {
          viewportRef(node)
          return
        }

        if (viewportRef) {
          viewportRef.current = node
        }
      },
      [viewportRef],
    )

    const checkScrollability = React.useCallback(() => {
      const element = internalViewportRef.current

      if (!element) {
        return
      }

      const { clientHeight, clientWidth, scrollHeight, scrollLeft, scrollTop, scrollWidth } =
        element

      setShowMask({
        bottom: scrollTop + clientHeight < scrollHeight - 1,
        left: scrollLeft > 0,
        right: scrollLeft + clientWidth < scrollWidth - 1,
        top: scrollTop > 0,
      })
      setOverflow({
        horizontal: scrollWidth > clientWidth + 1,
        vertical: scrollHeight > clientHeight + 1,
      })
    }, [])

    React.useEffect(() => {
      if (typeof window === "undefined") {
        return
      }

      const element = internalViewportRef.current

      if (!element) {
        return
      }

      const controller = new AbortController()
      const resizeObserver =
        typeof ResizeObserver === "undefined" ? null : new ResizeObserver(checkScrollability)

      resizeObserver?.observe(element)
      if (element.firstElementChild) resizeObserver?.observe(element.firstElementChild)
      element.addEventListener("scroll", checkScrollability, { signal: controller.signal })
      window.addEventListener("resize", checkScrollability, { signal: controller.signal })

      checkScrollability()

      return () => {
        controller.abort()
        resizeObserver?.disconnect()
      }
    }, [checkScrollability])

    return (
      <ScrollAreaContext.Provider value={{ isTouch, type }}>
        {isTouch ? (
          <div
            ref={ref}
            className={cn("relative overflow-hidden", className)}
            data-slot="scroll-area"
            {...props}
          >
            <div ref={setViewportRef} className={cn("size-full overflow-auto", viewportClassName)}>
              {children}
            </div>
            {maskHeight > 0 ? (
              <ScrollMask className={maskClassName} maskHeight={maskHeight} showMask={showMask} />
            ) : null}
          </div>
        ) : (
          <ScrollAreaPrimitive.Root
            ref={ref}
            className={cn("relative overflow-hidden", className)}
            data-slot="scroll-area"
            {...props}
          >
            <ScrollAreaPrimitive.Viewport
              ref={setViewportRef}
              className={cn(
                "size-full rounded-[inherit] outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                viewportClassName,
              )}
              data-slot="scroll-area-viewport"
            >
              {children}
            </ScrollAreaPrimitive.Viewport>
            {hasVerticalScrollbar && (scrollbarVisibility === "configured" || overflow.vertical) ? (
              <ScrollBar orientation="vertical" />
            ) : null}
            {hasHorizontalScrollbar &&
            (scrollbarVisibility === "configured" || overflow.horizontal) ? (
              <ScrollBar orientation="horizontal" />
            ) : null}
            <ScrollAreaPrimitive.Corner />
            {maskHeight > 0 ? (
              <ScrollMask className={maskClassName} maskHeight={maskHeight} showMask={showMask} />
            ) : null}
          </ScrollAreaPrimitive.Root>
        )}
      </ScrollAreaContext.Provider>
    )
  },
)

ScrollArea.displayName = "ScrollArea"

const ScrollBar = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.Scrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Scrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => {
  const { isTouch, type } = React.useContext(ScrollAreaContext)

  if (isTouch) {
    return null
  }

  return (
    <ScrollAreaPrimitive.Scrollbar
      ref={ref}
      className={cn(
        "flex touch-none select-none p-px opacity-100 transition-[colors,opacity] duration-150 ease-out hover:bg-muted dark:hover:bg-muted/50",
        orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent px-1",
        type === "hover" && "opacity-0 data-[hovering]:opacity-100",
        type === "scroll" && "opacity-0 data-[scrolling]:opacity-100",
        className,
      )}
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        className={cn(
          "relative flex-1 rounded-full bg-border transition-[scale]",
          orientation === "vertical" && "my-1 active:scale-y-95",
          orientation === "horizontal" && "active:scale-x-98",
        )}
        data-slot="scroll-area-thumb"
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
})

ScrollBar.displayName = "ScrollBar"

function ScrollMask({
  className,
  maskHeight,
  showMask,
  ...props
}: React.ComponentProps<"div"> & {
  maskHeight: number
  showMask: Mask
}) {
  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 z-10",
          "before:absolute before:inset-x-0 before:top-0 before:transition-[height,opacity] before:duration-300 before:content-['']",
          "after:absolute after:inset-x-0 after:bottom-0 after:transition-[height,opacity] after:duration-300 after:content-['']",
          "before:h-(--top-fade-height) after:h-(--bottom-fade-height)",
          showMask.top ? "before:opacity-100" : "before:opacity-0",
          showMask.bottom ? "after:opacity-100" : "after:opacity-0",
          "before:bg-gradient-to-b before:from-background before:to-transparent",
          "after:bg-gradient-to-t after:from-background after:to-transparent",
          className,
        )}
        style={
          {
            "--bottom-fade-height": showMask.bottom ? `${maskHeight}px` : "0px",
            "--top-fade-height": showMask.top ? `${maskHeight}px` : "0px",
          } as React.CSSProperties
        }
        {...props}
      />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 z-10",
          "before:absolute before:inset-y-0 before:left-0 before:transition-[width,opacity] before:duration-300 before:content-['']",
          "after:absolute after:inset-y-0 after:right-0 after:transition-[width,opacity] after:duration-300 after:content-['']",
          "before:w-(--left-fade-width) after:w-(--right-fade-width)",
          showMask.left ? "before:opacity-100" : "before:opacity-0",
          showMask.right ? "after:opacity-100" : "after:opacity-0",
          "before:bg-gradient-to-r before:from-background before:to-transparent",
          "after:bg-gradient-to-l after:from-background after:to-transparent",
          className,
        )}
        style={
          {
            "--left-fade-width": showMask.left ? `${maskHeight}px` : "0px",
            "--right-fade-width": showMask.right ? `${maskHeight}px` : "0px",
          } as React.CSSProperties
        }
        {...props}
      />
    </>
  )
}

export { ScrollArea, ScrollBar }
