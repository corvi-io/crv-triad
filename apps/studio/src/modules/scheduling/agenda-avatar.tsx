import { Avatar, AvatarFallback, AvatarImage } from "@/modules/shared/components/ui/avatar"

export function AgendaAvatar({
  className,
  name,
  size = "default",
}: {
  className?: string
  name: string
  size?: "default" | "sm" | "lg"
}) {
  return (
    <Avatar className={className} size={size}>
      <AvatarImage alt={`Foto de ${name}`} src={syntheticPortrait(name)} />
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  )
}

function syntheticPortrait(name: string) {
  const seed = hash(name)
  const backgrounds = [
    "hsl(217 33% 17%)",
    "hsl(218 36% 22%)",
    "hsl(218 32% 34%)",
    "hsl(37 45% 25%)",
    "hsl(218 34% 27%)",
  ]
  const shirts = [
    "hsl(42 51% 58%)",
    "hsl(218 28% 56%)",
    "hsl(39 43% 47%)",
    "hsl(217 28% 44%)",
    "hsl(38 45% 35%)",
  ]
  const skins = [
    "hsl(27 70% 80%)",
    "hsl(25 58% 64%)",
    "hsl(24 43% 51%)",
    "hsl(24 44% 39%)",
    "hsl(25 68% 75%)",
  ]
  const hairs = [
    "hsl(34 43% 9%)",
    "hsl(25 28% 15%)",
    "hsl(25 34% 25%)",
    "hsl(221 39% 11%)",
    "hsl(25 51% 28%)",
  ]
  const background = backgrounds[seed % backgrounds.length]
  const shirt = shirts[(seed >> 2) % shirts.length]
  const skin = skins[(seed >> 4) % skins.length]
  const hair = hairs[(seed >> 6) % hairs.length]
  const beard = seed % 3 === 0
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="${background}"/><circle cx="32" cy="27" r="16" fill="${skin}"/><path d="M14 64c1-15 9-23 18-23s17 8 18 23" fill="${shirt}"/><path d="M18 25c0-13 7-20 15-20 9 0 15 7 15 19-6-5-11-7-16-7-5 0-9 2-14 8Z" fill="${hair}"/><circle cx="26" cy="28" r="1.5" fill="hsl(221 39% 15%)"/><circle cx="38" cy="28" r="1.5" fill="hsl(221 39% 15%)"/><path d="M27 35c3 2 7 2 10 0" fill="none" stroke="hsl(24 42% 34%)" stroke-width="1.5" stroke-linecap="round"/>${beard ? `<path d="M20 31c2 13 7 17 12 17s10-4 12-17c-3 7-7 10-12 10s-9-3-12-10Z" fill="${hair}" opacity=".9"/>` : ""}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function hash(value: string) {
  return Array.from(value).reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) >>> 0,
    7,
  )
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("pt-BR")
}
