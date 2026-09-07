import { PlusIcon, XIcon } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/modules/shared/components/ui/badge"
import { Button } from "@/modules/shared/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/modules/shared/components/ui/input-group"

export function TagInput({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  id,
  onValueChange,
  placeholder = "Ex.: Cliente frequente",
  value,
}: {
  "aria-describedby"?: string
  "aria-invalid"?: boolean
  id: string
  onValueChange: (value: string) => void
  placeholder?: string
  value: string
}) {
  const [draft, setDraft] = useState("")
  const tags = parseTags(value)

  function addTag() {
    const tag = draft.trim()
    if (!tag) return
    const next = tags.some(
      (item) => item.toLocaleLowerCase("pt-BR") === tag.toLocaleLowerCase("pt-BR"),
    )
      ? tags
      : [...tags, tag]
    onValueChange(next.join(", "))
    setDraft("")
  }

  function removeTag(tag: string) {
    onValueChange(tags.filter((item) => item !== tag).join(", "))
  }

  return (
    <div className="flex flex-col gap-2">
      <InputGroup>
        <InputGroupInput
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          id={id}
          placeholder={placeholder}
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              addTag()
            }
          }}
        />
        <InputGroupAddon align="inline-end">
          <Button
            aria-label="Adicionar tag"
            disabled={!draft.trim()}
            size="icon-sm"
            type="button"
            variant="ghost"
            onClick={addTag}
          >
            <PlusIcon aria-hidden="true" />
          </Button>
        </InputGroupAddon>
      </InputGroup>
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge className="gap-1 pr-1" key={tag} variant="secondary">
              {tag}
              <button
                aria-label={`Remover tag ${tag}`}
                className="cursor-pointer rounded-full p-0.5 hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                type="button"
                onClick={() => removeTag(tag)}
              >
                <XIcon aria-hidden="true" className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Adicione uma tag por vez.</p>
      )}
    </div>
  )
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
}
