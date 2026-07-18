import { TruckCreationScreen } from "@/modules/fleet/components/truck-creation-form"

const previewWarehouseOptions = [{ label: "Depósito Central", value: "deposito-central" }] as const

export function TruckCreationPreviewScreen() {
  return <TruckCreationScreen warehouseOptions={previewWarehouseOptions} />
}
