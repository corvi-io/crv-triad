import { EyeIcon, EyeOffIcon } from "lucide-react"
import { forwardRef, useState } from "react"

import { Button } from "@/modules/shared/components/ui/button"
import { Input } from "@/modules/shared/components/ui/input"
import { cn } from "@/modules/shared/lib/utils"

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type">

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, ...props }, ref) {
    const [isVisible, setIsVisible] = useState(false)

    return (
      <div className="relative">
        <Input
          className={cn("pr-11", className)}
          ref={ref}
          type={isVisible ? "text" : "password"}
          {...props}
        />
        <Button
          aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}
          className="absolute top-0 right-0 text-muted-foreground hover:text-foreground"
          onClick={() => setIsVisible((visible) => !visible)}
          size="icon"
          type="button"
          variant="ghost"
        >
          {isVisible ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
        </Button>
      </div>
    )
  },
)
