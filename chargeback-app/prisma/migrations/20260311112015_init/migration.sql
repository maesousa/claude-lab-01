-- CreateTable
CREATE TABLE "pelouros" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "direcoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pelouroId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "direcoes_pelouroId_fkey" FOREIGN KEY ("pelouroId") REFERENCES "pelouros" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "direcaoId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "areas_direcaoId_fkey" FOREIGN KEY ("direcaoId") REFERENCES "direcoes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "company" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "employees_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "service_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "dsi_responsibles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "it_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serviceCategoryId" TEXT NOT NULL,
    "fundingModel" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "description" TEXT,
    "dsiResponsibleId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "it_items_serviceCategoryId_fkey" FOREIGN KEY ("serviceCategoryId") REFERENCES "service_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "it_items_dsiResponsibleId_fkey" FOREIGN KEY ("dsiResponsibleId") REFERENCES "dsi_responsibles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "annual_prices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itItemId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "notes" TEXT,
    CONSTRAINT "annual_prices_itItemId_fkey" FOREIGN KEY ("itItemId") REFERENCES "it_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "itItemId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "notes" TEXT,
    CONSTRAINT "assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "assignments_itItemId_fkey" FOREIGN KEY ("itItemId") REFERENCES "it_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "direct_costs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "areaId" TEXT NOT NULL,
    "itItemId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalCost" DECIMAL NOT NULL,
    "notes" TEXT,
    CONSTRAINT "direct_costs_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "direct_costs_itItemId_fkey" FOREIGN KEY ("itItemId") REFERENCES "it_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateIndex
CREATE UNIQUE INDEX "pelouros_code_key" ON "pelouros"("code");

-- CreateIndex
CREATE UNIQUE INDEX "direcoes_code_key" ON "direcoes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "areas_code_key" ON "areas"("code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeNumber_key" ON "employees"("employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_code_key" ON "service_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "dsi_responsibles_code_key" ON "dsi_responsibles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "it_items_code_key" ON "it_items"("code");

-- CreateIndex
CREATE UNIQUE INDEX "annual_prices_itItemId_year_key" ON "annual_prices"("itItemId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_employeeId_itItemId_year_key" ON "assignments"("employeeId", "itItemId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "direct_costs_areaId_itItemId_year_key" ON "direct_costs"("areaId", "itItemId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
