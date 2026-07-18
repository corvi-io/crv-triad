import { DriverCreationScreen } from "@/modules/fleet/components/driver-creation-form"

const previewTruckOptions = [{ label: "ABC1D23", value: "abc1d23" }] as const

export function DriverCreationPreviewScreen() {
  return <DriverCreationScreen truckOptions={previewTruckOptions} />
}
