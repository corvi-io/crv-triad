import { describe, expect, it } from "vitest"
import {
  getPermissionProfileDefaultValues,
  permissionProfileSchema,
} from "@/modules/access-control/components/permission-profile-creation-form"
import {
  companySchema,
  getCompanyDefaultValues,
} from "@/modules/companies/components/company-creation-form"
import {
  customerSchema,
  getCustomerDefaultValues,
} from "@/modules/customers/components/customer-creation-form"
import {
  driverSchema,
  getDriverDefaultValues,
} from "@/modules/fleet/components/driver-creation-form"
import { getTruckDefaultValues, truckSchema } from "@/modules/fleet/components/truck-creation-form"
import {
  getProductDefaultValues,
  productSchema,
} from "@/modules/inventory/components/product-creation-form"
import {
  getWarehouseDefaultValues,
  warehouseSchema,
} from "@/modules/inventory/components/warehouse-creation-form"
import {
  collaboratorSchema,
  getCollaboratorDefaultValues,
} from "@/modules/workforce/components/collaborator-creation-form"

describe("reference domain schemas", () => {
  it("validates a minimal company without transport payload assumptions", () => {
    expect(
      companySchema.safeParse({
        ...getCompanyDefaultValues(),
        cnpj: "12345678000190",
        legalName: "Empresa Exemplo",
        phone: "81999990000",
        email: "contato@example.com",
        sefazEnvironment: "homologation",
      }).success,
    ).toBe(true)
  })

  it("applies customer document rules according to person type", () => {
    const base = {
      ...getCustomerDefaultValues(),
      legalName: "Maria",
      postalCode: "50000000",
      contactName: "Maria",
    }
    expect(
      customerSchema.safeParse({ ...base, personType: "person", document: "123" }).success,
    ).toBe(false)
    expect(
      customerSchema.safeParse({ ...base, personType: "person", document: "12345678901" }).success,
    ).toBe(true)
  })

  it("validates product and warehouse local-reference contracts", () => {
    expect(
      productSchema.safeParse({
        ...getProductDefaultValues(),
        category: "sand",
        code: "PROD-01",
        name: "Produto",
        unit: "t",
        ncm: "25171000",
        cfop: "5102",
        cst: "00",
        minimumStock: "1.00",
        maximumStock: "10.00",
      }).success,
    ).toBe(true)
    expect(
      warehouseSchema.safeParse({
        ...getWarehouseDefaultValues(),
        name: "Pátio",
        company: "Empresa",
        type: "yard",
        postalCode: "50000000",
        responsible: "Responsável",
        minimumStock: "1",
        maximumStock: "10",
      }).success,
    ).toBe(true)
  })

  it("rejects incomplete localized decimal states in every domain decimal field", () => {
    const product = {
      ...getProductDefaultValues(),
      category: "sand",
      code: "PROD-01",
      name: "Produto",
      unit: "t",
      ncm: "25171000",
      cfop: "5102",
      cst: "00",
      minimumStock: "0.",
      maximumStock: "10",
    }
    const warehouse = {
      ...getWarehouseDefaultValues(),
      name: "Pátio",
      company: "Empresa",
      type: "yard",
      postalCode: "50000000",
      responsible: "Responsável",
      minimumStock: "0.",
      maximumStock: "10",
    }
    const truck = {
      ...getTruckDefaultValues(),
      plate: "BRA1A23",
      brand: "volvo",
      model: "pending-model",
      baseWarehouse: "Pátio",
    }

    expect(productSchema.safeParse(product).success).toBe(false)
    expect(productSchema.safeParse({ ...product, minimumStock: "0.25" }).success).toBe(true)
    expect(warehouseSchema.safeParse(warehouse).success).toBe(false)
    expect(warehouseSchema.safeParse({ ...warehouse, minimumStock: "0.25" }).success).toBe(true)
    expect(truckSchema.safeParse({ ...truck, capacity: "0." }).success).toBe(false)
    expect(truckSchema.safeParse({ ...truck, capacity: "0.25" }).success).toBe(true)
    expect(truckSchema.safeParse({ ...truck, volume: "0." }).success).toBe(false)
    expect(truckSchema.safeParse({ ...truck, volume: "0.25" }).success).toBe(true)
  })

  it("accepts only normalized legacy or Mercosur Brazilian truck plates", () => {
    const truck = {
      ...getTruckDefaultValues(),
      brand: "volvo",
      model: "pending-model",
      baseWarehouse: "Pátio",
    }

    expect(truckSchema.safeParse({ ...truck, plate: "ABC1234" }).success).toBe(true)
    expect(truckSchema.safeParse({ ...truck, plate: "BRA1A23" }).success).toBe(true)

    for (const plate of ["1111111", "AAAAAAA"]) {
      const result = truckSchema.safeParse({ ...truck, plate })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Informe uma placa brasileira válida no formato AAA0000 ou AAA0A00.",
        )
      }
    }
  })

  it("validates driver local formats", () => {
    expect(
      driverSchema.safeParse({
        ...getDriverDefaultValues(),
        name: "João",
        phone: "81999990000",
        cnhNumber: "12345678900",
        cnhValidity: "2030-07-14",
        mainTruck: "BRA1A23",
      }).success,
    ).toBe(true)
  })

  it("validates collaborator credentials and permissions as form booleans", () => {
    expect(
      collaboratorSchema.safeParse({
        ...getCollaboratorDefaultValues(),
        name: "Ana",
        username: "ana.silva",
        password: "Forte!Senha2026",
        company: "Empresa",
        profile: "Operação",
      }).success,
    ).toBe(true)
    expect(
      permissionProfileSchema.safeParse({
        ...getPermissionProfileDefaultValues(),
        name: "Operação",
        companiesView: true,
      }).success,
    ).toBe(true)
  })

  it("compares stock decimal strings without binary floating-point coercion", () => {
    const product = {
      ...getProductDefaultValues(),
      category: "sand",
      code: "PROD-01",
      name: "Produto",
      unit: "t",
      ncm: "25171000",
      cfop: "5102",
      cst: "00",
      minimumStock: "9999999999999999.999",
      maximumStock: "10000000000000000.000",
    }
    expect(productSchema.safeParse(product).success).toBe(true)
    expect(
      productSchema.safeParse({
        ...product,
        minimumStock: "10.001",
        maximumStock: "10.000",
      }).success,
    ).toBe(false)
  })
})
