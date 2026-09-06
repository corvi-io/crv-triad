import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ProfileScreen } from "@/modules/profile/components/profile-screen"

const removeProfileImage = vi.fn()
const uploadProfileImage = vi.fn()

vi.mock("@/modules/auth/services/auth-client", () => ({
  removeProfileImage: () => removeProfileImage(),
  uploadProfileImage: (file: File) => uploadProfileImage(file),
}))

describe("profile screen", () => {
  const onSessionChanged = vi.fn()

  beforeEach(() => {
    onSessionChanged.mockReset()
    removeProfileImage.mockReset()
    uploadProfileImage.mockReset()
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:profile-preview")
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined)
  })

  function renderProfile(image: string | null = null) {
    return render(
      <ProfileScreen
        session={{ user: { email: "ana@example.invalid", image, name: "Ana" } }}
        onSessionChanged={onSessionChanged}
      />,
    )
  }

  it("validates image type and size before upload", () => {
    const { container } = renderProfile()
    const input = container.querySelector("input[type=file]") as HTMLInputElement

    fireEvent.change(input, { target: { files: [new File(["x"], "avatar.gif")] } })
    expect(screen.getByRole("alert")).toHaveTextContent("Escolha uma imagem PNG, JPEG ou WebP.")

    const oversized = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "avatar.png", {
      type: "image/png",
    })
    fireEvent.change(input, { target: { files: [oversized] } })
    expect(screen.getByRole("alert")).toHaveTextContent("Escolha uma imagem de até 2 MB.")
    expect(uploadProfileImage).not.toHaveBeenCalled()
  })

  it("uploads an accepted image and refreshes the session", async () => {
    uploadProfileImage.mockResolvedValue({ image: "https://images.invalid/avatar.png" })
    const { container } = renderProfile()
    const file = new File(["image"], "avatar.png", { type: "image/png" })

    fireEvent.change(container.querySelector("input[type=file]") as HTMLInputElement, {
      target: { files: [file] },
    })

    await waitFor(() => expect(uploadProfileImage).toHaveBeenCalledWith(file))
    expect(onSessionChanged).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:profile-preview")
  })

  it("shows upload failures and restores the current image", async () => {
    uploadProfileImage.mockRejectedValue(new Error("Falha sintética"))
    const { container } = renderProfile("https://images.invalid/current.png")

    fireEvent.change(container.querySelector("input[type=file]") as HTMLInputElement, {
      target: { files: [new File(["image"], "avatar.webp", { type: "image/webp" })] },
    })

    expect(await screen.findByRole("alert")).toHaveTextContent("Falha sintética")
    expect(onSessionChanged).not.toHaveBeenCalled()
  })

  it("removes the current image and reports removal failures", async () => {
    const user = userEvent.setup()
    removeProfileImage.mockResolvedValueOnce(undefined)
    const { unmount } = renderProfile("https://images.invalid/current.png")

    await user.click(screen.getByRole("button", { name: "Remover" }))
    await waitFor(() => expect(onSessionChanged).toHaveBeenCalledOnce())
    expect(screen.queryByRole("button", { name: "Remover" })).not.toBeInTheDocument()

    unmount()
    removeProfileImage.mockRejectedValueOnce("failure")
    render(
      <ProfileScreen
        session={{ user: { email: null, image: "https://images.invalid/again.png", name: null } }}
        onSessionChanged={onSessionChanged}
      />,
    )
    await user.click(screen.getByRole("button", { name: "Remover" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível remover a foto.")
    expect(screen.getByDisplayValue("Nome não informado")).toBeInTheDocument()
    expect(screen.getByDisplayValue("E-mail não informado")).toBeInTheDocument()
  })
})
