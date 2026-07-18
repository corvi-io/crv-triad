import { describe, expect, it } from "vitest"
import driverForm from "../../src/modules/fleet/components/driver-creation-form.tsx?raw"
import driverPreview from "../../src/modules/fleet/components/driver-creation-preview.tsx?raw"
import truckForm from "../../src/modules/fleet/components/truck-creation-form.tsx?raw"
import truckPreview from "../../src/modules/fleet/components/truck-creation-preview.tsx?raw"
import warehouseForm from "../../src/modules/inventory/components/warehouse-creation-form.tsx?raw"
import warehousePreview from "../../src/modules/inventory/components/warehouse-creation-preview.tsx?raw"
import collaboratorForm from "../../src/modules/workforce/components/collaborator-creation-form.tsx?raw"
import collaboratorPreview from "../../src/modules/workforce/components/collaborator-creation-preview.tsx?raw"
import authenticatedDriverRoute from "../../src/routes/_authenticated/drivers/index.lazy.tsx?raw"
import authenticatedTruckRoute from "../../src/routes/_authenticated/fleet/trucks/index.lazy.tsx?raw"
import authenticatedWarehouseRoute from "../../src/routes/_authenticated/inventory/warehouses/index.lazy.tsx?raw"
import authenticatedCollaboratorRoute from "../../src/routes/_authenticated/users/collaborators/index.lazy.tsx?raw"
import previewCollaboratorRoute from "../../src/routes/workspace-preview/forms/collaborators/index.lazy.tsx?raw"
import previewDriverRoute from "../../src/routes/workspace-preview/forms/drivers/index.lazy.tsx?raw"
import previewTruckRoute from "../../src/routes/workspace-preview/forms/trucks/index.lazy.tsx?raw"
import previewWarehouseRoute from "../../src/routes/workspace-preview/forms/warehouses/index.lazy.tsx?raw"

const fixtureBoundaries = [
  {
    authenticatedRoute: authenticatedWarehouseRoute,
    fixtures: ["Empresa Exemplo", "Responsável local"],
    form: warehouseForm,
    preview: warehousePreview,
    previewRoute: previewWarehouseRoute,
  },
  {
    authenticatedRoute: authenticatedTruckRoute,
    fixtures: ["Depósito Central"],
    form: truckForm,
    preview: truckPreview,
    previewRoute: previewTruckRoute,
  },
  {
    authenticatedRoute: authenticatedDriverRoute,
    fixtures: ["ABC1D23"],
    form: driverForm,
    preview: driverPreview,
    previewRoute: previewDriverRoute,
  },
  {
    authenticatedRoute: authenticatedCollaboratorRoute,
    fixtures: ["Empresa Exemplo", "Operação"],
    form: collaboratorForm,
    preview: collaboratorPreview,
    previewRoute: previewCollaboratorRoute,
  },
] as const

describe("preview fixture boundaries", () => {
  it.each(fixtureBoundaries)("keeps sample catalogs exclusive to their explicit preview wrapper", ({
    authenticatedRoute,
    fixtures,
    form,
    preview,
    previewRoute,
  }) => {
    expect(authenticatedRoute).not.toContain("-creation-preview")
    expect(previewRoute).toContain("-creation-preview")

    for (const fixture of fixtures) {
      expect(form).not.toContain(fixture)
      expect(preview).toContain(fixture)
    }
  })
})
