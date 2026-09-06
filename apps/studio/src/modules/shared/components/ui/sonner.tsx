"use client"

import type { ComponentProps, CSSProperties } from "react"
import { Toaster as Sonner } from "sonner"

type ToasterProps = ComponentProps<typeof Sonner>

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      style={
        {
          "--success-bg": "var(--feedback-success)",
          "--success-border": "var(--feedback-success-border)",
          "--success-text": "var(--feedback-success-foreground)",
          "--info-bg": "var(--feedback-info)",
          "--info-border": "var(--feedback-info-border)",
          "--info-text": "var(--feedback-info-foreground)",
          "--warning-bg": "var(--feedback-warning)",
          "--warning-border": "var(--feedback-warning-border)",
          "--warning-text": "var(--feedback-warning-foreground)",
          "--error-bg": "var(--feedback-destructive)",
          "--error-border": "var(--feedback-destructive-border)",
          "--error-text": "var(--feedback-destructive-foreground)",
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
