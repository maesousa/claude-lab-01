/**
 * Seed script for Chargeback App
 * Run with: npx prisma db seed
 *
 * Seeds:
 *  - 1 admin User
 *  - 5 ServiceCategories (from design docs)
 *  - 3 DSIResponsibles  (AM, PNM, DG — from Excel "Resp" column)
 *  - Org hierarchy: 6 Pelouros → 8 Direcoes → 12 Areas
 *  - 12 representative ITItems (CHARGEBACK) with 2026 prices
 *  - Sample Employees per area
 *  - Sample Assignments and DirectCosts for 2026
 */

import { PrismaClient } from '@prisma/client'

// FundingModel is stored as a plain string in SQLite
const CORPORATE  = 'CORPORATE'
const CHARGEBACK = 'CHARGEBACK'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // ── Admin User ─────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin123!', 12)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@chargeback.local' },
    update: {},
    create: {
      email: 'admin@chargeback.local',
      name: 'Administrador',
      passwordHash,
      isActive: true,
    },
  })
  console.log('  ✅ User:', adminUser.email)

  // ── Service Categories ─────────────────────────────────────────────────────
  const categoryDefs = [
    { code: 'WORKPLACE_HW', name: 'Workplace Hardware',           description: 'Physical devices: laptops, monitors, phones, peripherals', color: '#3B82F6', sortOrder: 1 },
    { code: 'WORKPLACE_SW', name: 'Workplace Software',           description: 'End-user software licences: M365, Adobe, antivirus',       color: '#8B5CF6', sortOrder: 2 },
    { code: 'CLOUD_SVC',    name: 'Cloud Services',               description: 'Cloud infrastructure and platform services',                color: '#06B6D4', sortOrder: 3 },
    { code: 'BUSINESS_APP', name: 'Business Applications',        description: 'Shared business systems: ERP, CRM, BI platforms',           color: '#10B981', sortOrder: 4 },
    { code: 'DIRECT_APP',   name: 'Directly Charged Applications',description: 'Apps charged as a fixed annual cost to a specific area',    color: '#F59E0B', sortOrder: 5 },
  ]

  const categories: Record<string, { id: string }> = {}
  for (const cat of categoryDefs) {
    const record = await prisma.serviceCategory.upsert({
      where: { code: cat.code },
      update: {},
      create: { ...cat, isActive: true },
    })
    categories[cat.code] = record
  }
  console.log('  ✅ ServiceCategories:', Object.keys(categories).length)

  // ── DSI Responsibles ────────────────────────────────────────────────────────
  const responsibleDefs = [
    { code: 'AM',  name: 'André Martins',  email: 'am@dsi.superbock.pt' },
    { code: 'PNM', name: 'Pedro N. Matos', email: 'pnm@dsi.superbock.pt' },
    { code: 'DG',  name: 'Diogo Gomes',   email: 'dg@dsi.superbock.pt' },
  ]

  const responsibles: Record<string, { id: string }> = {}
  for (const r of responsibleDefs) {
    const record = await prisma.dSIResponsible.upsert({
      where: { code: r.code },
      update: {},
      create: { ...r, isActive: true },
    })
    responsibles[r.code] = record
  }
  console.log('  ✅ DSIResponsibles:', Object.keys(responsibles).length)

  // ── Org Hierarchy ──────────────────────────────────────────────────────────
  // Real Pelouro names from the Excel (EstruturaCC sheet)
  const pelouros = await Promise.all([
    prisma.pelouro.upsert({ where: { code: 'AFI' }, update: {}, create: { code: 'AFI', name: 'Administrativo/Financeira', isActive: true } }),
    prisma.pelouro.upsert({ where: { code: 'SUP' }, update: {}, create: { code: 'SUP', name: 'Áreas de Suporte',          isActive: true } }),
    prisma.pelouro.upsert({ where: { code: 'COM' }, update: {}, create: { code: 'COM', name: 'Comercial',                 isActive: true } }),
    prisma.pelouro.upsert({ where: { code: 'MKT' }, update: {}, create: { code: 'MKT', name: 'Marketing',                isActive: true } }),
    prisma.pelouro.upsert({ where: { code: 'SCH' }, update: {}, create: { code: 'SCH', name: 'Supply Chain',             isActive: true } }),
    prisma.pelouro.upsert({ where: { code: 'TUR' }, update: {}, create: { code: 'TUR', name: 'Turismo',                  isActive: true } }),
  ])
  const pelouroMap: Record<string, string> = {}
  for (const p of pelouros) pelouroMap[p.code] = p.id
  console.log('  ✅ Pelouros:', pelouros.length)

  // Direcoes
  const direcoesDefs = [
    { code: 'DIR-AFI-01', name: 'Direção Financeira',          pelouroCode: 'AFI' },
    { code: 'DIR-AFI-02', name: 'Direção Administrativa',      pelouroCode: 'AFI' },
    { code: 'DIR-COM-01', name: 'Direção Comercial Portugal',  pelouroCode: 'COM' },
    { code: 'DIR-COM-02', name: 'Direção Exportação',          pelouroCode: 'COM' },
    { code: 'DIR-MKT-01', name: 'Direção Marketing',           pelouroCode: 'MKT' },
    { code: 'DIR-SCH-01', name: 'Direção Supply Chain',        pelouroCode: 'SCH' },
    { code: 'DIR-SUP-01', name: 'Direção Recursos Humanos',    pelouroCode: 'SUP' },
    { code: 'DIR-TUR-01', name: 'Direção Turismo',             pelouroCode: 'TUR' },
  ]

  const direcoes: Record<string, string> = {}
  for (const d of direcoesDefs) {
    const record = await prisma.direcao.upsert({
      where: { code: d.code },
      update: {},
      create: { code: d.code, name: d.name, pelouroId: pelouroMap[d.pelouroCode], isActive: true },
    })
    direcoes[d.code] = record.id
  }
  console.log('  ✅ Direcoes:', Object.keys(direcoes).length)

  // Areas (Cost Centers)
  const areasDefs = [
    { code: 'CC-101', name: 'Contabilidade & Reporte',  direcaoCode: 'DIR-AFI-01' },
    { code: 'CC-102', name: 'Tesouraria',               direcaoCode: 'DIR-AFI-01' },
    { code: 'CC-201', name: 'Jurídico & Compliance',    direcaoCode: 'DIR-AFI-02' },
    { code: 'CC-301', name: 'Força de Vendas PT',       direcaoCode: 'DIR-COM-01' },
    { code: 'CC-302', name: 'Canal HORECA',             direcaoCode: 'DIR-COM-01' },
    { code: 'CC-401', name: 'Exportação Europa',        direcaoCode: 'DIR-COM-02' },
    { code: 'CC-501', name: 'Marketing Digital',        direcaoCode: 'DIR-MKT-01' },
    { code: 'CC-502', name: 'Marketing Trade',          direcaoCode: 'DIR-MKT-01' },
    { code: 'CC-601', name: 'Logística & Armazém',      direcaoCode: 'DIR-SCH-01' },
    { code: 'CC-701', name: 'Recrutamento & Formação',  direcaoCode: 'DIR-SUP-01' },
    { code: 'CC-702', name: 'Compensação & Benefícios', direcaoCode: 'DIR-SUP-01' },
    { code: 'CC-801', name: 'Operações Turismo',        direcaoCode: 'DIR-TUR-01' },
  ]

  const areas: Record<string, string> = {}
  for (const a of areasDefs) {
    const record = await prisma.area.upsert({
      where: { code: a.code },
      update: {},
      create: { code: a.code, name: a.name, direcaoId: direcoes[a.direcaoCode], isActive: true },
    })
    areas[a.code] = record.id
  }
  console.log('  ✅ Areas:', Object.keys(areas).length)

  // ── Employees ──────────────────────────────────────────────────────────────
  const employeesDefs = [
    // Contabilidade
    { employeeNumber: 'E001', firstName: 'Ana',     lastName: 'Costa',       email: 'ana.costa@superbock.pt',     areaCode: 'CC-101', company: 'Super Bock Bebidas' },
    { employeeNumber: 'E002', firstName: 'Bruno',   lastName: 'Ferreira',    email: 'bruno.ferreira@superbock.pt',areaCode: 'CC-101', company: 'Super Bock Bebidas' },
    { employeeNumber: 'E003', firstName: 'Carla',   lastName: 'Silva',       email: 'carla.silva@superbock.pt',   areaCode: 'CC-102', company: 'Super Bock Bebidas' },
    // Vendas
    { employeeNumber: 'E004', firstName: 'Diogo',   lastName: 'Martins',     email: 'diogo.martins@superbock.pt', areaCode: 'CC-301', company: 'Super Bock Bebidas' },
    { employeeNumber: 'E005', firstName: 'Eva',     lastName: 'Rodrigues',   email: 'eva.rodrigues@superbock.pt', areaCode: 'CC-301', company: 'Super Bock Bebidas' },
    { employeeNumber: 'E006', firstName: 'Fábio',   lastName: 'Alves',       email: 'fabio.alves@superbock.pt',   areaCode: 'CC-302', company: 'Super Bock Bebidas' },
    // Marketing
    { employeeNumber: 'E007', firstName: 'Gisela',  lastName: 'Mendes',      email: 'gisela.mendes@superbock.pt', areaCode: 'CC-501', company: 'VMPS' },
    { employeeNumber: 'E008', firstName: 'Hugo',    lastName: 'Pereira',     email: 'hugo.pereira@superbock.pt',  areaCode: 'CC-501', company: 'VMPS' },
    // Logística
    { employeeNumber: 'E009', firstName: 'Inês',    lastName: 'Sousa',       email: 'ines.sousa@superbock.pt',    areaCode: 'CC-601', company: 'Super Bock Bebidas' },
    { employeeNumber: 'E010', firstName: 'João',    lastName: 'Nunes',       email: 'joao.nunes@superbock.pt',    areaCode: 'CC-601', company: 'Super Bock Bebidas' },
    // RH
    { employeeNumber: 'E011', firstName: 'Lúcia',   lastName: 'Gomes',       email: 'lucia.gomes@superbock.pt',   areaCode: 'CC-701', company: 'Super Bock Bebidas' },
    { employeeNumber: 'E012', firstName: 'Miguel',  lastName: 'Santos',      email: 'miguel.santos@superbock.pt', areaCode: 'CC-702', company: 'Super Bock Bebidas' },
  ]

  const employees: Record<string, string> = {}
  for (const e of employeesDefs) {
    const record = await prisma.employee.upsert({
      where: { employeeNumber: e.employeeNumber },
      update: {},
      create: {
        employeeNumber: e.employeeNumber,
        firstName:      e.firstName,
        lastName:       e.lastName,
        email:          e.email,
        areaId:         areas[e.areaCode],
        company:        e.company,
        isActive:       true,
      },
    })
    employees[e.employeeNumber] = record.id
  }
  console.log('  ✅ Employees:', Object.keys(employees).length)

  // ── IT Items ───────────────────────────────────────────────────────────────
  const itemsDefs = [
    // Workplace Hardware (CHARGEBACK — per employee)
    { code: 'HW-LAPTOP-STD', name: 'Laptop Standard',          catCode: 'WORKPLACE_HW', model: CHARGEBACK, unit: 'device',  respCode: null,   price2026: 450.00 },
    { code: 'HW-MOBILE-STD', name: 'Telemóvel Standard',       catCode: 'WORKPLACE_HW', model: CHARGEBACK, unit: 'device',  respCode: null,   price2026: 180.00 },
    { code: 'HW-MONITOR-27', name: 'Monitor 27"',              catCode: 'WORKPLACE_HW', model: CHARGEBACK, unit: 'device',  respCode: null,   price2026: 120.00 },
    // Workplace Software (CHARGEBACK — per employee)
    { code: 'SW-M365-E3',    name: 'Microsoft 365 E3',         catCode: 'WORKPLACE_SW', model: CHARGEBACK, unit: 'licence', respCode: 'AM',   price2026: 420.00 },
    { code: 'SW-M365-F3',    name: 'Microsoft 365 F3',         catCode: 'WORKPLACE_SW', model: CHARGEBACK, unit: 'licence', respCode: 'AM',   price2026: 120.00 },
    { code: 'SW-ADOBE-CC',   name: 'Adobe Creative Cloud',     catCode: 'WORKPLACE_SW', model: CHARGEBACK, unit: 'licence', respCode: 'PNM',  price2026: 660.00 },
    { code: 'SW-WIN11-ENT',  name: 'Windows 11 Enterprise',    catCode: 'WORKPLACE_SW', model: CORPORATE,  unit: 'licence', respCode: 'AM',   price2026: 80.00  },
    // Business Applications (CORPORATE — shared, absorbed by DSI)
    { code: 'APP-SAP-ERP',   name: 'SAP ERP Core',             catCode: 'BUSINESS_APP', model: CORPORATE,  unit: 'licence', respCode: 'DG',   price2026: 0.00   },
    // Directly Charged Applications (CHARGEBACK — fixed per area)
    { code: 'APP-ORACLE-FSM', name: 'Oracle Field Service Mgmt',catCode: 'DIRECT_APP',  model: CHARGEBACK, unit: 'contract',respCode: 'DG',   price2026: 0.00   },
    { code: 'APP-RPA-UIPATH', name: 'UiPath RPA Platform',     catCode: 'DIRECT_APP',  model: CHARGEBACK, unit: 'contract',respCode: 'PNM',  price2026: 0.00   },
    { code: 'APP-ISQE',       name: 'ISQE Quality System',     catCode: 'DIRECT_APP',  model: CHARGEBACK, unit: 'contract',respCode: 'PNM',  price2026: 0.00   },
    { code: 'SVC-AZURE-VM',   name: 'Azure Virtual Machines',  catCode: 'CLOUD_SVC',   model: CORPORATE,  unit: 'month',   respCode: 'AM',   price2026: 0.00   },
  ]

  const items: Record<string, string> = {}
  for (const item of itemsDefs) {
    const record = await prisma.iTItem.upsert({
      where: { code: item.code },
      update: {},
      create: {
        code:              item.code,
        name:              item.name,
        serviceCategoryId: categories[item.catCode].id,
        fundingModel:      item.model,
        unit:              item.unit,
        dsiResponsibleId:  item.respCode ? responsibles[item.respCode].id : null,
        isActive:          true,
      },
    })
    items[item.code] = record.id

    // Create 2026 price for per-employee items
    if (item.price2026 > 0) {
      await prisma.annualPrice.upsert({
        where: { itItemId_year: { itItemId: record.id, year: 2026 } },
        update: {},
        create: { itItemId: record.id, year: 2026, unitPrice: item.price2026 },
      })
    }
  }
  console.log('  ✅ ITItems:', Object.keys(items).length)

  // ── Sample Assignments 2026 ────────────────────────────────────────────────
  // Per-employee CHARGEBACK items: Laptop, Phone, M365 E3
  const assignmentsDefs = [
    // Each employee gets 1 laptop + 1 M365 licence
    { empNum: 'E001', itemCode: 'HW-LAPTOP-STD', qty: 1 },
    { empNum: 'E001', itemCode: 'SW-M365-E3',    qty: 1 },
    { empNum: 'E002', itemCode: 'HW-LAPTOP-STD', qty: 1 },
    { empNum: 'E002', itemCode: 'SW-M365-E3',    qty: 1 },
    { empNum: 'E003', itemCode: 'HW-LAPTOP-STD', qty: 1 },
    { empNum: 'E003', itemCode: 'SW-M365-E3',    qty: 1 },
    { empNum: 'E004', itemCode: 'HW-LAPTOP-STD', qty: 1 },
    { empNum: 'E004', itemCode: 'SW-M365-E3',    qty: 1 },
    { empNum: 'E004', itemCode: 'HW-MOBILE-STD', qty: 1 }, // Sales rep gets phone
    { empNum: 'E005', itemCode: 'HW-LAPTOP-STD', qty: 1 },
    { empNum: 'E005', itemCode: 'SW-M365-E3',    qty: 1 },
    { empNum: 'E005', itemCode: 'HW-MOBILE-STD', qty: 1 },
    { empNum: 'E006', itemCode: 'HW-LAPTOP-STD', qty: 1 },
    { empNum: 'E006', itemCode: 'SW-M365-E3',    qty: 1 },
    { empNum: 'E007', itemCode: 'HW-LAPTOP-STD', qty: 1 },
    { empNum: 'E007', itemCode: 'SW-M365-E3',    qty: 1 },
    { empNum: 'E007', itemCode: 'SW-ADOBE-CC',   qty: 1 }, // Marketing gets Adobe
    { empNum: 'E008', itemCode: 'HW-LAPTOP-STD', qty: 1 },
    { empNum: 'E008', itemCode: 'SW-M365-E3',    qty: 1 },
    { empNum: 'E008', itemCode: 'SW-ADOBE-CC',   qty: 1 },
    { empNum: 'E009', itemCode: 'HW-LAPTOP-STD', qty: 1 },
    { empNum: 'E009', itemCode: 'SW-M365-F3',    qty: 1 }, // Logistics gets F3 (lighter)
    { empNum: 'E010', itemCode: 'HW-LAPTOP-STD', qty: 1 },
    { empNum: 'E010', itemCode: 'SW-M365-F3',    qty: 1 },
    { empNum: 'E011', itemCode: 'HW-LAPTOP-STD', qty: 1 },
    { empNum: 'E011', itemCode: 'SW-M365-E3',    qty: 1 },
    { empNum: 'E012', itemCode: 'HW-LAPTOP-STD', qty: 1 },
    { empNum: 'E012', itemCode: 'SW-M365-E3',    qty: 1 },
  ]

  for (const a of assignmentsDefs) {
    await prisma.assignment.upsert({
      where: { employeeId_itItemId_year: { employeeId: employees[a.empNum], itItemId: items[a.itemCode], year: 2026 } },
      update: {},
      create: { employeeId: employees[a.empNum], itItemId: items[a.itemCode], year: 2026, quantity: a.qty },
    })
  }
  console.log('  ✅ Assignments:', assignmentsDefs.length)

  // ── Sample Direct Costs 2026 ───────────────────────────────────────────────
  // Fixed-cost apps charged to specific areas (Mechanism B)
  const directCostsDefs = [
    // Oracle FSM charged to Logistics
    { areaCode: 'CC-601', itemCode: 'APP-ORACLE-FSM', total: 28500.00, notes: 'Contrato anual Oracle FSM 2026' },
    // RPA platform split between Marketing and Sales
    { areaCode: 'CC-501', itemCode: 'APP-RPA-UIPATH',  total: 12000.00, notes: 'UiPath licença anual — Marketing Digital' },
    { areaCode: 'CC-301', itemCode: 'APP-RPA-UIPATH',  total:  8000.00, notes: 'UiPath licença anual — Força de Vendas' },
    // ISQE quality system charged to Quality / Turismo (demo)
    { areaCode: 'CC-801', itemCode: 'APP-ISQE',         total:  6500.00, notes: 'ISQE plataforma de qualidade 2026' },
  ]

  for (const dc of directCostsDefs) {
    await prisma.directCost.upsert({
      where: { areaId_itItemId_year: { areaId: areas[dc.areaCode], itItemId: items[dc.itemCode], year: 2026 } },
      update: {},
      create: {
        areaId:    areas[dc.areaCode],
        itItemId:  items[dc.itemCode],
        year:      2026,
        totalCost: dc.total,
        notes:     dc.notes,
      },
    })
  }
  console.log('  ✅ DirectCosts:', directCostsDefs.length)

  console.log('')
  console.log('🎉 Seed complete!')
  console.log(`   Login: admin@chargeback.local / Admin123!`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
