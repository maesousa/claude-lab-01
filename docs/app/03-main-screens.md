# 03 — Main Screens

> 7 screens. Simple navigation. No modals-within-modals.
> All list screens have search + filter. All detail screens have inline edit.

---

## Navigation Structure

```
┌─────────────────────────────────────────────────┐
│  DSI Chargeback   [Dashboard] [year: 2026 ▼]    │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│  📊 Dashboard                                   │
│  🏢 Organização                                 │
│  👥 Colaboradores                               │
│  💻 Catálogo IT  (+ Categorias)                 │
│  💶 Preços Anuais                               │
│  📋 Atribuições                                 │
│  📈 Relatórios                                  │
│                                                  │
└──────────┴──────────────────────────────────────┘
```

The **year selector** in the top bar is global — it filters all screens that are year-dependent (prices, assignments, reports).

---

## Screen 1 — Dashboard

**Purpose:** At-a-glance chargeback summary for the selected year.

```
┌──────────────────────────────────────────────────────┐
│  Dashboard  2026 ▼                                   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Total Chargeback 2026                               │
│  ┌──────────────────────┐                           │
│  │  € 1.284.500          │                           │
│  └──────────────────────┘                           │
│                                                      │
│  Por Pelouro                                         │
│  ┌────────────────┬──────────────┬───────────┐      │
│  │ Pelouro        │ Colaboradores│ Total (€) │      │
│  ├────────────────┼──────────────┼───────────┤      │
│  │ Pelouro Fin.   │ 45           │ 312.400   │      │
│  │ Pelouro Com.   │ 120          │ 687.100   │      │
│  │ Pelouro Ind.   │ 62           │ 285.000   │      │
│  └────────────────┴──────────────┴───────────┘      │
│                                                      │
│  Distribuição por Categoria                          │
│  Hardware & Cloud  ████████████░░░░  54%  € 693.630 │
│  Software & Dados  ██████░░░░░░░░░░  32%  € 411.040 │
│  Comunicações      ████░░░░░░░░░░░░  14%  € 179.830 │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Interactions:**
- Click on a pelouro row → navigate to Reports filtered by that pelouro
- Year selector updates all figures

---

## Screen 2 — Organização

**Purpose:** Manage the three-level org structure (Pelouros → Direções → Áreas).

```
┌──────────────────────────────────────────────────────────┐
│  Organização                              [+ Pelouro]    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ▼ Pelouro Financeiro (FIN)              [Editar]        │
│    ▼  Direção Financeira                 [Editar] [...]  │
│          Área Contabilidade (CC-101)     [Editar] [...]  │
│          Área Tesouraria    (CC-102)     [Editar] [...]  │
│          [+ Área]                                        │
│    ▼  Direção Controlo de Gestão         [Editar] [...]  │
│          Área Planeamento   (CC-110)     [Editar] [...]  │
│          [+ Área]                                        │
│    [+ Direção]                                           │
│                                                          │
│  ▼ Pelouro Comercial (COM)               [Editar]        │
│    ▼  Direção Marketing                  [Editar] [...]  │
│          Área Mk. Digital   (CC-201)     [Editar] [...]  │
│          Área Mk. Produto   (CC-202)     [Editar] [...]  │
│          [+ Área]                                        │
│    ►  Direção Vendas                     [Editar] [...]  │
│    [+ Direção]                                           │
│                                                          │
│  ► Pelouro Industrial (IND)              [Editar]        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Interactions:**
- Expand/collapse at every level (Pelouro, Direção, Area)
- Inline edit: click `Editar` → fields become editable in place, `Guardar / Cancelar`
- `[...]` menu on each Direção: `Ver colaboradores` → jumps to Screen 3 filtered by that Direção
- `[...]` menu on each Área: `Ver colaboradores` → jumps to Screen 3 filtered by that Área
- `[+ Pelouro]` / `[+ Direção]` / `[+ Área]` → opens a simple inline form row at the correct level

---

## Screen 3 — Colaboradores

**Purpose:** Manage employees. See their org unit and their total chargeback for the selected year.

```
┌──────────────────────────────────────────────────────────────┐
│  Colaboradores                              [+ Colaborador]  │
├──────────────────────────────────────────────────────────────┤
│  🔍 Pesquisar...   Pelouro: Todos ▼  Direção: Todas ▼  Área: Todas ▼ │
├──────────────────────────────────────────────────────────────┤
│  Nome               Área               Direção     Total 2026 (€)   │
│  ──────────────     ─────────────      ─────────   ──────────────   │
│  Ana Ferreira        Mk. Digital       Dir. Mktg.    4.820          │
│  Bruno Costa         Área Vendas       Dir. Vendas   3.150          │
│  Carla Mendes        Contabilidade     Dir. Fin.     5.600          │
│  ...                                                                 │
├──────────────────────────────────────────────────────────────┤
│  Showing 1–25 of 227  [< Prev]  [Next >]                     │
└──────────────────────────────────────────────────────────────┘
```

**Click on an employee → Employee Detail:**

```
┌──────────────────────────────────────────────────────┐
│  ← Colaboradores  /  Ana Ferreira                    │
├──────────────────────────────────────────────────────┤
│  Nome: Ana Ferreira          Nº: 1042                │
│  Email: ana.ferreira@sbg.pt                          │
│  Área: Mk. Digital (CC-201) › Dir. Marketing › Pelouro Comercial │
│  Estado: Ativo             [Editar colaborador]      │
├──────────────────────────────────────────────────────┤
│  Atribuições IT — 2026 ▼            [+ Atribuição]   │
│  ┌───────────────────┬────────┬──────────┬─────────┐ │
│  │ Item IT           │  Qtd.  │ P. Unit. │ Total   │ │
│  ├───────────────────┼────────┼──────────┼─────────┤ │
│  │ Laptop            │  1     │ 1.200    │ 1.200   │ │
│  │ Office 365        │  1     │  180     │   180   │ │
│  │ Telemóvel         │  1     │  480     │   480   │ │
│  │ Monitor extra     │  2     │  290     │   580   │ │
│  ├───────────────────┼────────┼──────────┼─────────┤ │
│  │                   │        │  Total   │ 2.440   │ │
│  └───────────────────┴────────┴──────────┴─────────┘ │
│  [Exportar CSV]                                      │
└──────────────────────────────────────────────────────┘
```

**Interactions:**
- Each assignment row: inline edit for `quantity` and `notes`; `🗑` to remove
- `[+ Atribuição]` → item picker (only CHARGEBACK items with a price for the selected year)

---

## Screen 4 — Catálogo IT

**Purpose:** Manage the list of IT items, organised by service category.

### 4a — List view (default: grouped by category)

```
┌──────────────────────────────────────────────────────────────────┐
│  Catálogo IT                          [Gerir Categorias] [+ Item]│
├──────────────────────────────────────────────────────────────────┤
│  🔍 Pesquisar...   Categoria: Todas ▼   Modelo: Todos ▼          │
│  Vista: [● Agrupada]  [○ Lista]                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔵 Workplace Hardware  (4 itens)                      [+ Item]  │
│  ┌────────────────┬──────────────────┬──────────┬────────────┐   │
│  │ Código         │ Nome             │ Unidade  │ Modelo     │   │
│  ├────────────────┼──────────────────┼──────────┼────────────┤   │
│  │ HW-LAPTOP      │ Laptop           │ unidade  │ Chargeback │   │
│  │ HW-DESKTOP     │ Desktop          │ unidade  │ Chargeback │   │
│  │ HW-TABLET      │ Tablet           │ unidade  │ Chargeback │   │
│  │ HW-MONITOR     │ Monitor adicional│ unidade  │ Chargeback │   │
│  └────────────────┴──────────────────┴──────────┴────────────┘   │
│                                                                  │
│  🟢 Workplace Software  (3 itens)                      [+ Item]  │
│  ┌────────────────┬──────────────────┬──────────────┬──────────┐ │
│  │ SW-O365        │ Office 365       │ utilizador/mês│Chargeback│ │
│  │ SW-VPN         │ VPN Client       │ utilizador   │Chargeback│ │
│  │ SW-SAP         │ SAP ERP          │ —            │Corporativo│ │
│  └────────────────┴──────────────────┴──────────────┴──────────┘ │
│                                                                  │
│  🟠 Cloud Services  (5 itens)                          [+ Item]  │
│  ...                                                             │
│                                                                  │
│  🟣 Business Applications  (7 itens)                   [+ Item]  │
│  ...                                                             │
│                                                                  │
│  🔴 Directly Charged Applications  (2 itens)           [+ Item]  │
│  ...                                                             │
└──────────────────────────────────────────────────────────────────┘
```

**Visual rules:**
- Each category has a colour badge consistent across the app
- `Corporativo` items shown with a grey badge and muted text — cannot be assigned
- `Chargeback` items shown with a green badge — assignable

### 4b — List view (flat)

Same columns but all items in a single flat table, sortable by any column.
Triggered by clicking `[○ Lista]` toggle.

### 4c — Item Detail (click any row)

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Catálogo IT  /  Office 365                                    │
├──────────────────────────────────────────────────────────────────┤
│  Código: SW-O365              [Editar]                           │
│  Nome: Office 365                                                │
│  Categoria: 🟢 Workplace Software                                │
│  Modelo: ● Chargeback  ○ Corporativo                             │
│  Unidade: utilizador/mês                                         │
│  Descrição: Suite de produtividade Microsoft (Word, Excel, ...)  │
│  Estado: ● Ativo                                                 │
├──────────────────────────────────────────────────────────────────┤
│  Preço por ano                                    [+ Novo ano]   │
│  ┌──────┬──────────────┬──────────────────────────────────────┐  │
│  │ Ano  │ Preço/unidade│ Notas                                │  │
│  ├──────┼──────────────┼──────────────────────────────────────┤  │
│  │ 2026 │ € 180,00     │ Contrato Microsoft EA 2026      [✏] │  │
│  │ 2025 │ € 165,00     │ Contrato Microsoft EA 2025          │  │
│  │ 2024 │ € 148,00     │                                     │  │
│  └──────┴──────────────┴──────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│  Atribuições ativas em 2026                                      │
│  123 colaboradores   →  [Ver no relatório]                       │
└──────────────────────────────────────────────────────────────────┘
```

### 4d — Gerir Categorias (modal / side panel)

Accessible via `[Gerir Categorias]` button. Allows DSI team to:

```
┌──────────────────────────────────────────────────────┐
│  Categorias de Serviço                    [+ Categoria│
├──────────────────────────────────────────────────────┤
│  ⠿  🔵 Workplace Hardware      4 itens  [✏]  [...]  │
│  ⠿  🟢 Workplace Software      3 itens  [✏]  [...]  │
│  ⠿  🟠 Cloud Services          5 itens  [✏]  [...]  │
│  ⠿  🟣 Business Applications   7 itens  [✏]  [...]  │
│  ⠿  🔴 Directly Charged Apps   2 itens  [✏]  [...]  │
│                                                      │
│  ⠿ = drag to reorder                                 │
│  [...] = disable (only if 0 items assigned)          │
└──────────────────────────────────────────────────────┘
```

**Interactions:**
- `[✏]` → edit name, description, and color
- `[+ Categoria]` → add a new category (code + name + color)
- Drag `⠿` handle to reorder (updates `sortOrder`)
- Cannot delete a category that has items — must reassign items first

---

## Screen 5 — Preços Anuais

**Purpose:** Set and review unit prices per item for the selected year.

```
┌──────────────────────────────────────────────────────┐
│  Preços Anuais — 2026 ▼            [Copiar de 2025]  │
├──────────────────────────────────────────────────────┤
│  🔍 Pesquisar item...   Categoria: Todas ▼  (service categories)│
├──────────────────────────────────────────────────────┤
│  Item                  Unidade       Preço (€)       │
│  ──────────────────    ──────────    ───────────      │
│  Laptop                unidade        1.200,00  [✏]  │
│  Monitor extra         unidade          290,00  [✏]  │
│  Office 365            utilizador/mês   180,00  [✏]  │
│  Telemóvel             unidade          480,00  [✏]  │
│  ── sem preço 2026 ──────────────────────────────    │
│  Tablet (sem preço)    unidade              —   [+]  │
│  ...                                                  │
└──────────────────────────────────────────────────────┘
```

**Interactions:**
- `[✏]` → inline edit the price for that year
- `[+]` → add a price for items not yet priced this year
- `[Copiar de 2025]` → bulk-copy all prices from the previous year as a starting point (editable afterwards)
- Items without a price for the selected year are shown at the bottom — they cannot be assigned this year

---

## Screen 6 — Atribuições

**Purpose:** Manage all cost allocations for the selected year — both per-employee assignments and direct area charges. Two tabs in one screen.

### 6a — Tab: Por Colaborador *(per-employee assignments)*

```
┌──────────────────────────────────────────────────────────┐
│  Atribuições — 2026 ▼                  [Importar CSV]    │
├──────────────────────────────────────────────────────────┤
│  [● Por Colaborador]  [○ Custos Diretos por Área]        │
├──────────────────────────────────────────────────────────┤
│  🔍 Pesquisar...  Item: Todos ▼  Área: Todas ▼  Direção: Todas ▼ │
├──────────────────────────────────────────────────────────┤
│  Colaborador        Item IT         Qtd.   Total (€)     │
│  ────────────────   ────────────    ────   ────────      │
│  Ana Ferreira        Laptop          1      1.200        │
│  Ana Ferreira        Office 365      1        180        │
│  Bruno Costa         Laptop          1      1.200        │
│  Bruno Costa         Telemóvel       1        480        │
│  ...                                                      │
├──────────────────────────────────────────────────────────┤
│  [Exportar CSV]                                          │
└──────────────────────────────────────────────────────────┘
```

**`[Importar CSV]`** — bulk-load assignments from a CSV file (columns: `employee_number`, `item_code`, `year`, `quantity`). Useful for the initial data migration from Excel.

---

### 6b — Tab: Custos Diretos por Área *(fixed charges at cost-center level)*

Used for IT services that are not broken down per employee — Oracle FSM, ISQE, Hightail, RPA processes, SharePoint storage, etc.

```
┌──────────────────────────────────────────────────────────┐
│  Atribuições — 2026 ▼                                    │
├──────────────────────────────────────────────────────────┤
│  [○ Por Colaborador]  [● Custos Diretos por Área]        │
├──────────────────────────────────────────────────────────┤
│  🔍 Pesquisar...   Item: Todos ▼   Direção: Todas ▼      │
├──────────────────────────────────────────────────────────┤
│  Área (CC)               Item IT         Total (€)  [+]  │
│  ──────────────────────  ────────────    ──────────────  │
│  Contabilidade (CC-101)  Oracle FSM        43.375        │
│  Assistência Técnica     Oracle FSM        43.376        │
│  Jurídica (CC-S02900)    Rolling Legal      6.396        │
│  Pessoas (CC-S02075)     ISQE / Cornerst   51.025        │
│  Log. e PO               Optrak            41.000        │
│  SAT (CC-D08500)         Thingsboard        9.411        │
│  ...                                                      │
├──────────────────────────────────────────────────────────┤
│  [Exportar CSV]                                          │
└──────────────────────────────────────────────────────────┘
```

**`[+]`** → inline form row: pick an Area, pick a CHARGEBACK item, enter total cost and optional notes.
**Interactions:**
- Each row: inline edit for `totalCost` and `notes`; `🗑` to remove
- No quantity or unit price — only the fixed `totalCost` for this area + item + year
- `[Exportar CSV]` — export direct costs for the year

---

## Screen 7 — Relatórios

**Purpose:** Aggregated chargeback view with four tabs (one per org level).

**Tab A — Por Colaborador**
```
  Colaborador         Área               Direção          Pelouro        Total (€)
  ────────────────    ──────────────     ───────────────  ────────────   ─────────
  Ana Ferreira        Mk. Digital        Dir. Marketing   P. Comercial   4.820
  Bruno Costa         Área Vendas        Dir. Vendas      P. Comercial   3.150
  Carla Mendes        Contabilidade      Dir. Financeira  P. Financeiro  5.600
```

**Tab B — Por Área**
```
  Área (CC)            Direção            Colaboradores  Total (€)
  ──────────────────   ─────────────────  ─────────────  ─────────
  Mk. Digital (CC-201) Dir. Marketing     8              38.640
  Mk. Produto (CC-202) Dir. Marketing     10             48.120
  Área Vendas (CC-301) Dir. Vendas        32            100.800
  Contabilidade(CC-101)Dir. Financeira    12             67.200
```

**Tab C — Por Direção**
```
  Direção             Pelouro             Áreas  Colaboradores  Total (€)
  ─────────────────   ────────────────    ─────  ─────────────  ─────────
  Dir. Marketing      P. Comercial        2      18             86.760
  Dir. Vendas         P. Comercial        3      32            100.800
  Dir. Financeira     P. Financeiro       2      12             67.200
```

**Tab D — Por Pelouro**
```
  Pelouro             Direções   Áreas   Colaboradores  Total (€)
  ────────────────    ────────   ─────   ─────────────  ─────────
  Pelouro Comercial   5          12      120            687.100
  Pelouro Financeiro  3           7       45            312.400
  Pelouro Industrial  4           9       62            285.000
  ─────────────────────────────────────────────────────────────
  TOTAL                                  227          1.284.500
```

**Controls available on all tabs:**
- Year selector
- Filter by Pelouro, Direção, Área, Category
- `[Exportar CSV]` button

---

## Screen flow summary

```
Dashboard ──────────────────────────────────────────────────────────┐
    │                                                               │
    ├── Organização                                                 │
    │       └── [Editar] inline                                     │
    │                                                               │
    ├── Colaboradores (list)                                        │
    │       └── Colaborador Detail ──── [+ Atribuição]             │
    │                                                               │
    ├── Catálogo IT (list)                                          │
    │       └── Item Detail ──── Preços por ano                    │
    │                                                               │
    ├── Preços Anuais                                               │
    │       └── [Copiar de ano anterior]                            │
    │                                                               │
    ├── Atribuições ──── Tab A: Por Colaborador ──── [Importar CSV] │
    │                   └── Tab B: Custos Diretos por Área         │
    │                                                               │
    └── Relatórios ─── Por Colaborador / Área / Direção / Pelouro ◄─┘
                            └── [Exportar CSV]
```
