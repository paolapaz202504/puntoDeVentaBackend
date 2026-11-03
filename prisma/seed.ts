import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed ampliado de la base de datos (RBAC N:M)...");

  // 1. Roles del sistema
  const defaultRoles = [
    { name: "Administrador" },
    { name: "Gerente / Supervisor" },
    { name: "Cajero" },
    { name: "Mesero" },
    { name: "Cocina / Barra" },
  ];

  const roleMap = new Map<string, string>();

  for (const roleData of defaultRoles) {
    const existing = await prisma.role.findFirst({
      where: { name: roleData.name },
    });

    if (!existing) {
      const created = await prisma.role.create({
        data: {
          name: roleData.name,
          created_by: "SYSTEM_SEED",
        },
      });
      console.log(`✅ Rol creado: ${created.name} (${created.id})`);
      roleMap.set(created.name, created.id);
    } else {
      console.log(`ℹ️ Rol existente: ${existing.name} (${existing.id})`);
      roleMap.set(existing.name, existing.id);
    }
  }

  // 2. Catálogo de Permisos por Módulo
  const defaultPermissions = [
    // Seguridad
    { slug: "users:read", name: "Ver catálogo de usuarios", module: "Seguridad", description: "Permite listar y consultar detalles de usuarios" },
    { slug: "users:create", name: "Crear usuarios", module: "Seguridad", description: "Permite registrar nuevos empleados y usuarios" },
    { slug: "users:update", name: "Editar usuarios", module: "Seguridad", description: "Permite modificar datos, contraseñas y roles de usuarios" },
    { slug: "users:delete", name: "Eliminar usuarios", module: "Seguridad", description: "Permite eliminar o desactivar usuarios" },
    { slug: "roles:manage", name: "Gestionar roles y permisos", module: "Seguridad", description: "Permite crear roles y asignar matrices de permisos" },
    { slug: "settings:manage", name: "Gestionar configuración general, respaldos y datos de la empresa", module: "Seguridad", description: "Acceso exclusivo a configuración, backups y restauración" },

    // Menú y Catálogos
    { slug: "menu:read", name: "Ver menú y productos", module: "Menú", description: "Permite consultar platillos, categorías y precios" },
    { slug: "menu:create", name: "Crear platillos y categorías", module: "Menú", description: "Permite registrar nuevos productos en el menú" },
    { slug: "menu:update", name: "Modificar platillos y precios", module: "Menú", description: "Permite editar productos, recetas y precios" },
    { slug: "menu:delete", name: "Eliminar productos del menú", module: "Menú", description: "Permite eliminar o desactivar platillos" },

    // Restaurante / Áreas y Mesas
    { slug: "areas:read", name: "Ver catálogo de áreas", module: "Restaurante", description: "Permite listar y consultar áreas del restaurante" },
    { slug: "areas:manage", name: "Gestionar áreas", module: "Restaurante", description: "Permite crear, editar y eliminar áreas" },
    { slug: "tables:read", name: "Ver mapa y catálogo de mesas", module: "Restaurante", description: "Permite visualizar y listar mesas y espacios" },
    { slug: "tables:manage", name: "Configurar salones y mesas", module: "Restaurante", description: "Permite crear, mover, renombrar o eliminar mesas" },

    // Inventario y Catálogos de Productos
    { slug: "inventory:read", name: "Ver catálogo de inventario y productos", module: "Inventario", description: "Permite listar y consultar productos, categorías y unidades" },
    { slug: "inventory:manage", name: "Gestionar inventario y productos", module: "Inventario", description: "Permite crear, editar y eliminar productos, categorías y unidades de medida" },
    { slug: "brands:read", name: "Ver catálogo de marcas", module: "Inventario", description: "Permite listar y consultar marcas y empresas fabricantes" },
    { slug: "brands:manage", name: "Gestionar catálogo de marcas", module: "Inventario", description: "Permite crear, editar y eliminar marcas" },

    { slug: "orders:create", name: "Abrir comanda en mesa", module: "Mesas", description: "Permite abrir órdenes y asignar comensales" },
    { slug: "orders:add_items", name: "Comandar platillos a cocina", module: "Mesas", description: "Permite añadir productos a una orden activa" },
    { slug: "orders:cancel_items", name: "Anular platillos comandados", module: "Mesas", description: "Autoriza cancelar productos ya enviados a cocina" },
    { slug: "orders:close", name: "Solicitar precuenta y cerrar mesa", module: "Mesas", description: "Imprime la precuenta y prepara comanda para pago" },

    // Caja y Cobranza
    { slug: "cash:open", name: "Apertura de turno en caja", module: "Caja", description: "Permite registrar fondo inicial de caja" },
    { slug: "cash:movements", name: "Entradas y salidas de efectivo", module: "Caja", description: "Permite registrar gastos menores o ingresos" },
    { slug: "cash:close", name: "Cierre y arqueo de caja (Corte Z)", module: "Caja", description: "Permite realizar el corte de turno y balance" },
    { slug: "sales:charge", name: "Cobrar cuentas (POS)", module: "Caja", description: "Permite procesar cobros en efectivo, tarjeta o transferencia" },
    { slug: "sales:discount", name: "Aplicar descuentos y cortesías", module: "Caja", description: "Autoriza aplicar rebajas especiales en la cuenta" },
    { slug: "sales:cancel", name: "Anular ventas cobradas", module: "Caja", description: "Permite cancelar transacciones fiscales o tickets cobrados" },
    { slug: "sales:reprint", name: "Reimprimir comprobantes", module: "Caja", description: "Permite reimprimir tickets de comanda o venta" },

    // Reportes
    { slug: "reports:sales_daily", name: "Ver ventas del día", module: "Reportes", description: "Permite consultar totales del día y corte X" },
    { slug: "reports:financial", name: "Ver reportes financieros avanzados", module: "Reportes", description: "Permite consultar ingresos mensuales, ganancias y costos" },
    { slug: "reports:audit", name: "Consultar auditoría del sistema", module: "Reportes", description: "Permite ver la bitácora de acciones de empleados" },
  ];

  const permissionMap = new Map<string, string>();

  for (const perm of defaultPermissions) {
    const existing = await prisma.permission.findUnique({
      where: { slug: perm.slug },
    });

    if (!existing) {
      const created = await prisma.permission.create({
        data: {
          slug: perm.slug,
          name: perm.name,
          module: perm.module,
          description: perm.description,
          created_by: "SYSTEM_SEED",
        },
      });
      permissionMap.set(perm.slug, created.id);
    } else {
      permissionMap.set(perm.slug, existing.id);
    }
  }
  console.log(`✅ Permisos configurados (${permissionMap.size} permisos en total).`);

  // 3. Asignar Permisos a Roles
  const adminRoleId = roleMap.get("Administrador")!;
  const gerenteRoleId = roleMap.get("Gerente / Supervisor")!;
  const cajeroRoleId = roleMap.get("Cajero")!;
  const meseroRoleId = roleMap.get("Mesero")!;
  const cocinaRoleId = roleMap.get("Cocina / Barra")!;

  // A. Administrador: 100% de los permisos
  for (const permissionId of permissionMap.values()) {
    await prisma.rolePermission.upsert({
      where: {
        role_id_permission_id: {
          role_id: adminRoleId,
          permission_id: permissionId,
        },
      },
      update: {},
      create: {
        role_id: adminRoleId,
        permission_id: permissionId,
        created_by: "SYSTEM_SEED",
      },
    });
  }
  console.log("✅ Permisos totales (100%) asignados al rol Administrador.");

  // B. Gerente: Operativa completa + autorizaciones
  const gerentePerms = [
    "users:read", "menu:read", "menu:create", "menu:update",
    "tables:read", "tables:manage", "orders:create", "orders:add_items", "orders:cancel_items", "orders:close",
    "cash:open", "cash:movements", "cash:close", "sales:charge", "sales:discount", "sales:cancel", "sales:reprint",
    "reports:sales_daily", "reports:audit"
  ];
  for (const slug of gerentePerms) {
    const pId = permissionMap.get(slug);
    if (pId) {
      await prisma.rolePermission.upsert({
        where: { role_id_permission_id: { role_id: gerenteRoleId, permission_id: pId } },
        update: {},
        create: { role_id: gerenteRoleId, permission_id: pId, created_by: "SYSTEM_SEED" },
      });
    }
  }

  // C. Cajero: Caja y Cobranza
  const cajeroPerms = [
    "menu:read", "tables:read", "orders:close",
    "cash:open", "cash:movements", "cash:close", "sales:charge", "sales:reprint",
    "reports:sales_daily"
  ];
  for (const slug of cajeroPerms) {
    const pId = permissionMap.get(slug);
    if (pId) {
      await prisma.rolePermission.upsert({
        where: { role_id_permission_id: { role_id: cajeroRoleId, permission_id: pId } },
        update: {},
        create: { role_id: cajeroRoleId, permission_id: pId, created_by: "SYSTEM_SEED" },
      });
    }
  }

  // D. Mesero: Mesas y Comandas
  const meseroPerms = [
    "menu:read", "tables:read", "orders:create", "orders:add_items", "orders:close"
  ];
  for (const slug of meseroPerms) {
    const pId = permissionMap.get(slug);
    if (pId) {
      await prisma.rolePermission.upsert({
        where: { role_id_permission_id: { role_id: meseroRoleId, permission_id: pId } },
        update: {},
        create: { role_id: meseroRoleId, permission_id: pId, created_by: "SYSTEM_SEED" },
      });
    }
  }

  // E. Cocina: Ver comandas
  const cocinaPerms = ["menu:read", "tables:read"];
  for (const slug of cocinaPerms) {
    const pId = permissionMap.get(slug);
    if (pId) {
      await prisma.rolePermission.upsert({
        where: { role_id_permission_id: { role_id: cocinaRoleId, permission_id: pId } },
        update: {},
        create: { role_id: cocinaRoleId, permission_id: pId, created_by: "SYSTEM_SEED" },
      });
    }
  }

  // 4. Usuario Administrador Predeterminado (admin / 123)
  const existingAdmin = await prisma.user.findFirst({
    where: { user: "admin" },
  });

  let adminUser;
  if (!existingAdmin) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash("123", saltRounds);

    adminUser = await prisma.user.create({
      data: {
        name: "Administrador General",
        user: "admin",
        email: "admin@puntov.com",
        password_hash: passwordHash,
        pin_code: "1234",
        is_active: true,
        created_by: "SYSTEM_SEED",
      },
    });
    console.log(`✅ Usuario inicial creado: admin / 123 (${adminUser.id})`);
  } else {
    adminUser = existingAdmin;
    console.log(`ℹ️ Usuario 'admin' ya existe (${adminUser.id}).`);
  }

  // Vincular usuario admin con rol Administrador en user_roles
  await prisma.userRole.upsert({
    where: {
      user_id_role_id: {
        user_id: adminUser.id,
        role_id: adminRoleId,
      },
    },
    update: {},
    create: {
      user_id: adminUser.id,
      role_id: adminRoleId,
      created_by: "SYSTEM_SEED",
    },
  });

  // 5. Configuración del Sistema Inicial
  const existingSettings = await prisma.systemSetting.findFirst();
  if (!existingSettings) {
    await prisma.systemSetting.create({
      data: {
        company_name: "Restaurante puntoV",
        currency_symbol: "$",
        created_by: "SYSTEM_SEED",
      },
    });
    console.log("✅ Configuración inicial de empresa creada.");
  }

  // 6. Catálogo de Áreas y Mesas Iniciales
  const defaultAreas = [
    {
      name: "Refresquería Grande",
      tables: ["Espacio 1", "Espacio 2", "Espacio 3"],
    },
    {
      name: "Refresquería Pequeña",
      tables: ["Espacio 4", "Espacio 5"],
    },
    {
      name: "Mesas",
      tables: ["Mesa 1", "Mesa 2", "Mesa 3"],
    },
  ];

  for (const areaData of defaultAreas) {
    let area = await prisma.area.findUnique({
      where: { name: areaData.name },
    });

    if (!area) {
      area = await prisma.area.create({
        data: {
          name: areaData.name,
          created_by: "SYSTEM_SEED",
        },
      });
      console.log(`✅ Área creada: ${area.name} (${area.id})`);
    } else {
      console.log(`ℹ️ Área existente: ${area.name}`);
    }

    // Crear mesas asociadas al área si no existen
    for (const tableName of areaData.tables) {
      const existingTable = await prisma.restaurantTable.findFirst({
        where: {
          area_id: area.id,
          name: tableName,
        },
      });

      if (!existingTable) {
        await prisma.restaurantTable.create({
          data: {
            name: tableName,
            area_id: area.id,
            created_by: "SYSTEM_SEED",
          },
        });
        console.log(`  ✅ Mesa/Espacio creado: ${tableName} en ${area.name}`);
      } else {
        console.log(`  ℹ️ Mesa/Espacio existente: ${tableName} en ${area.name}`);
      }
    }
  }

  // 7. Unidades de Medida Iniciales
  const defaultUnits = [
    { name: "Unidad", symbol: "UND" },
    { name: "Vaso (16 oz)", symbol: "VASO" },
    { name: "Mililitro", symbol: "ML" },
    { name: "Gramo", symbol: "G" },
    { name: "Libra", symbol: "LB" },
  ];

  const unitMap = new Map<string, string>();
  for (const u of defaultUnits) {
    let unit = await prisma.measurementUnit.findUnique({
      where: { symbol: u.symbol },
    });
    if (!unit) {
      unit = await prisma.measurementUnit.create({
        data: {
          name: u.name,
          symbol: u.symbol,
          created_by: "SYSTEM_SEED",
        },
      });
      console.log(`✅ Unidad creada: ${unit.name} (${unit.symbol})`);
    } else {
      console.log(`ℹ️ Unidad existente: ${unit.symbol}`);
    }
    unitMap.set(u.symbol, unit.id);
  }

  // 8. Categorías de Inventario Iniciales
  const defaultCategories = [
    { name: "Gaseosas", description: "Bebidas carbonatadas en lata y vidrio" },
    { name: "Aguas Puras", description: "Agua purificada en bolsa y botella" },
    { name: "Jugos", description: "Jugos en lata y néctares" },
    { name: "Bebidas Isotónicas", description: "Bebidas rehidratantes deportivas" },
  ];

  const catMap = new Map<string, string>();
  for (const c of defaultCategories) {
    let cat = await prisma.category.findUnique({
      where: { name: c.name },
    });
    if (!cat) {
      cat = await prisma.category.create({
        data: {
          name: c.name,
          description: c.description,
          created_by: "SYSTEM_SEED",
        },
      });
      console.log(`✅ Categoría creada: ${cat.name}`);
    } else {
      console.log(`ℹ️ Categoría existente: ${cat.name}`);
    }
    catMap.set(c.name, cat.id);
  }

  // 9. Catálogo de Marcas Iniciales
  const defaultBrands = [
    { name: "The Coca-Cola Company", description: "The Coca-Cola Company (Embotelladora ABASA / FEMSA)" },
    { name: "PepsiCo / cbc", description: "PepsiCo y Central American Bottling Corporation" },
    { name: "Cervecería Centro Americana", description: "Cervecería Centro Americana, S.A." },
    { name: "Grupo AJE", description: "Grupo AJE Guatemala" },
    { name: "Kern's / Riviana Pozuelo", description: "Kern's Beverage Group" },
    { name: "Campbell's", description: "Campbell Soup Company" },
    { name: "Tampico Beverages", description: "Tampico Beverages Inc. / Maravilla" },
  ];

  const brandMap = new Map<string, string>();
  for (const b of defaultBrands) {
    let brand = await prisma.brand.findUnique({
      where: { name: b.name },
    });
    if (!brand) {
      brand = await prisma.brand.create({
        data: {
          name: b.name,
          description: b.description,
          created_by: "SYSTEM_SEED",
        },
      });
      console.log(`✅ Marca creada: ${brand.name} (${brand.id})`);
    } else {
      console.log(`ℹ️ Marca existente: ${brand.name}`);
    }
    brandMap.set(b.name, brand.id);
  }

  // 10. Catálogo de Bebidas Embotelladas (27 Productos y Presentaciones)
  const defaultProducts = [
    // Gaseosas Coca-Cola
    {
      code: "BEB-CC-V355",
      name: "Coca-Cola Clásica Vidrio 355 ml",
      brand: "The Coca-Cola Company",
      category: "Gaseosas",
      sale_price: 5.00,
      current_cost: 3.42,
      image_url: "/files/products/coca_cola_vidrio_355.png",
      presentations: [{ name: "Caja de 24", conversion_factor: 24, default_cost: 82.00 }],
    },
    {
      code: "BEB-CC-V600",
      name: "Coca-Cola Clásica Vidrio 600 ml",
      brand: "The Coca-Cola Company",
      category: "Gaseosas",
      sale_price: 10.00,
      current_cost: 6.25,
      image_url: "/files/products/coca_cola_vidrio_600.png",
      presentations: [{ name: "Caja de 12", conversion_factor: 12, default_cost: 75.00 }],
    },
    {
      code: "BEB-CC-L354",
      name: "Coca-Cola Clásica Lata 354 ml",
      brand: "The Coca-Cola Company",
      category: "Gaseosas",
      sale_price: 6.00,
      current_cost: 4.00,
      image_url: "/files/products/coca_cola_lata_354.png",
      presentations: [
        { name: "Caja de 24", conversion_factor: 24, default_cost: 96.00 },
        { name: "Paquete de 6", conversion_factor: 6, default_cost: 24.00 },
      ],
    },
    {
      code: "BEB-CZ-L354",
      name: "Coca-Cola Zero Lata 354 ml",
      brand: "The Coca-Cola Company",
      category: "Gaseosas",
      sale_price: 6.00,
      current_cost: 4.00,
      image_url: "/files/products/coca_cola_zero_lata_354.png",
      presentations: [
        { name: "Caja de 24", conversion_factor: 24, default_cost: 96.00 },
        { name: "Paquete de 6", conversion_factor: 6, default_cost: 24.00 },
      ],
    },
    {
      code: "BEB-SP-V355",
      name: "Sprite Vidrio 355 ml",
      brand: "The Coca-Cola Company",
      category: "Gaseosas",
      sale_price: 5.00,
      current_cost: 3.33,
      image_url: "/files/products/sprite_vidrio_355.png",
      presentations: [{ name: "Caja de 24", conversion_factor: 24, default_cost: 80.00 }],
    },
    {
      code: "BEB-FN-V355",
      name: "Fanta Naranja Vidrio 355 ml",
      brand: "The Coca-Cola Company",
      category: "Gaseosas",
      sale_price: 5.00,
      current_cost: 3.33,
      image_url: "/files/products/fanta_naranja_vidrio_355.png",
      presentations: [{ name: "Caja de 24", conversion_factor: 24, default_cost: 80.00 }],
    },
    {
      code: "BEB-FR-V355",
      name: "Fanta Roja (Fresa) Vidrio 355 ml",
      brand: "The Coca-Cola Company",
      category: "Gaseosas",
      sale_price: 5.00,
      current_cost: 3.33,
      image_url: "/files/products/fanta_roja_vidrio_355.png",
      presentations: [{ name: "Caja de 24", conversion_factor: 24, default_cost: 80.00 }],
    },
    {
      code: "BEB-CAN-V355",
      name: "Agua Mineral Cantinero Vidrio 355 ml",
      brand: "The Coca-Cola Company",
      category: "Gaseosas",
      sale_price: 5.00,
      current_cost: 3.25,
      image_url: "/files/products/mineral_cantinero_vidrio_355.png",
      presentations: [{ name: "Caja de 24", conversion_factor: 24, default_cost: 78.00 }],
    },

    // Gaseosas CBC / PepsiCo
    {
      code: "BEB-PC-V450",
      name: "Pepsi Cola 450 ml (Medio Litro)",
      brand: "PepsiCo / cbc",
      category: "Gaseosas",
      sale_price: 5.00,
      current_cost: 3.54,
      image_url: "/files/products/pepsi_450_vidrio.png",
      presentations: [{ name: "Caja de 24", conversion_factor: 24, default_cost: 85.00 }],
    },
    {
      code: "BEB-PC-V355",
      name: "Pepsi Cola Clásica Vidrio 355 ml",
      brand: "PepsiCo / cbc",
      category: "Gaseosas",
      sale_price: 5.00,
      current_cost: 3.25,
      image_url: "/files/products/pepsi_vidrio_355.png",
      presentations: [{ name: "Caja de 24", conversion_factor: 24, default_cost: 78.00 }],
    },
    {
      code: "BEB-PC-L354",
      name: "Pepsi Cola Lata 354 ml",
      brand: "PepsiCo / cbc",
      category: "Gaseosas",
      sale_price: 6.00,
      current_cost: 3.75,
      image_url: "/files/products/pepsi_lata_354.png",
      presentations: [
        { name: "Caja de 24", conversion_factor: 24, default_cost: 90.00 },
        { name: "Paquete de 6", conversion_factor: 6, default_cost: 22.50 },
      ],
    },
    {
      code: "BEB-GR-V355",
      name: "Grapette Uva Vidrio 355 ml",
      brand: "PepsiCo / cbc",
      category: "Gaseosas",
      sale_price: 5.00,
      current_cost: 3.25,
      image_url: "/files/products/grapette_vidrio_355.png",
      presentations: [{ name: "Caja de 24", conversion_factor: 24, default_cost: 78.00 }],
    },
    {
      code: "BEB-SAL-V355",
      name: "Agua Mineral Salutaris Vidrio 355 ml",
      brand: "Cervecería Centro Americana",
      category: "Gaseosas",
      sale_price: 5.00,
      current_cost: 3.25,
      image_url: "/files/products/mineral_salutaris_vidrio_355.png",
      presentations: [{ name: "Caja de 24", conversion_factor: 24, default_cost: 78.00 }],
    },
    {
      code: "BEB-TK-V355",
      name: "Tiky Piña Vidrio 355 ml",
      brand: "PepsiCo / cbc",
      category: "Gaseosas",
      sale_price: 5.00,
      current_cost: 3.25,
      image_url: "/files/products/tiky_vidrio_355.png",
      presentations: [{ name: "Caja de 24", conversion_factor: 24, default_cost: 78.00 }],
    },

    // Aguas Puras
    {
      code: "BEB-ASV-B250",
      name: "Agua Pura Salvavidas en Bolsa 250 ml",
      brand: "Cervecería Centro Americana",
      category: "Aguas Puras",
      sale_price: 2.00,
      current_cost: 0.75,
      image_url: "/files/products/salvavidas_bolsa_250.png",
      presentations: [{ name: "Fardo de 24", conversion_factor: 24, default_cost: 18.00 }],
    },
    {
      code: "BEB-ASV-P375",
      name: "Agua Pura Salvavidas Botella 375 ml",
      brand: "Cervecería Centro Americana",
      category: "Aguas Puras",
      sale_price: 5.00,
      current_cost: 2.05,
      image_url: "/files/products/salvavidas_botella_375.png",
      presentations: [{ name: "Charola / Fardo de 20", conversion_factor: 20, default_cost: 41.00 }],
    },
    {
      code: "BEB-ASV-P600",
      name: "Agua Pura Salvavidas Botella 600 ml",
      brand: "Cervecería Centro Americana",
      category: "Aguas Puras",
      sale_price: 6.00,
      current_cost: 2.50,
      image_url: "/files/products/salvavidas_botella_600.png",
      presentations: [{ name: "Paquete de 24", conversion_factor: 24, default_cost: 60.00 }],
    },
    {
      code: "BEB-ACI-P350",
      name: "Agua Pura Cielo Botella 350 ml",
      brand: "Grupo AJE",
      category: "Aguas Puras",
      sale_price: 4.00,
      current_cost: 1.75,
      image_url: "/files/products/agua_cielo_botella_350.png",
      presentations: [{ name: "Paquete de 24", conversion_factor: 24, default_cost: 42.00 }],
    },

    // Jugos
    {
      code: "BEB-JUG-KMEL",
      name: "Jugo Kern's Melocotón en Lata 330 ml",
      brand: "Kern's / Riviana Pozuelo",
      category: "Jugos",
      sale_price: 5.00,
      current_cost: 4.00,
      image_url: "/files/products/jugo_kerns_melocoton_330.png",
      presentations: [
        { name: "Unidad", conversion_factor: 1, default_cost: 4.00 },
        { name: "Caja de 24", conversion_factor: 24, default_cost: 96.00 },
      ],
    },
    {
      code: "BEB-JUG-KMAN",
      name: "Jugo Kern's Manzana en Lata 330 ml",
      brand: "Kern's / Riviana Pozuelo",
      category: "Jugos",
      sale_price: 5.00,
      current_cost: 4.00,
      image_url: "/files/products/jugo_kerns_manzana_330.png",
      presentations: [
        { name: "Unidad", conversion_factor: 1, default_cost: 4.00 },
        { name: "Caja de 24", conversion_factor: 24, default_cost: 96.00 },
      ],
    },
    {
      code: "BEB-JUG-KPER",
      name: "Jugo Kern's Pera en Lata 330 ml",
      brand: "Kern's / Riviana Pozuelo",
      category: "Jugos",
      sale_price: 5.00,
      current_cost: 4.00,
      image_url: "/files/products/jugo_kerns_pera_330.png",
      presentations: [
        { name: "Unidad", conversion_factor: 1, default_cost: 4.00 },
        { name: "Caja de 24", conversion_factor: 24, default_cost: 96.00 },
      ],
    },
    {
      code: "BEB-JUG-V8",
      name: "Jugo V8 Original Lata 340 ml",
      brand: "Campbell's",
      category: "Jugos",
      sale_price: 5.00,
      current_cost: 4.00,
      image_url: "/files/products/jugo_v8_lata_340.png",
      presentations: [
        { name: "Unidad", conversion_factor: 1, default_cost: 4.00 },
        { name: "Caja de 24", conversion_factor: 24, default_cost: 96.00 },
      ],
    },
    {
      code: "BEB-TAM-B250",
      name: "Tampico Citrus Punch Botellita 250 ml",
      brand: "Tampico Beverages",
      category: "Jugos",
      sale_price: 5.00,
      current_cost: 3.50,
      image_url: "/files/products/tampico_botellita_250.png",
      presentations: [
        { name: "Unidad", conversion_factor: 1, default_cost: 3.50 },
        { name: "Paquete de 24", conversion_factor: 24, default_cost: 84.00 },
      ],
    },
    {
      code: "BEB-TAM-P350",
      name: "Pachón Tampico Citrus Punch 350 ml",
      brand: "Tampico Beverages",
      category: "Jugos",
      sale_price: 6.00,
      current_cost: 3.75,
      image_url: "/files/products/tampico_pachon_350.png",
      presentations: [{ name: "Paquete de 12", conversion_factor: 12, default_cost: 45.00 }],
    },

    // Bebidas Isotónicas
    {
      code: "BEB-GAT-MORA",
      name: "Gatorade Mora Azul (Cool Blue) 600 ml",
      brand: "PepsiCo / cbc",
      category: "Bebidas Isotónicas",
      sale_price: 12.00,
      current_cost: 8.50,
      image_url: "/files/products/gatorade_mora_azul_600.png",
      presentations: [{ name: "Paquete de 12", conversion_factor: 12, default_cost: 102.00 }],
    },
    {
      code: "BEB-GAT-FRUT",
      name: "Gatorade Frutas Tropicales 600 ml",
      brand: "PepsiCo / cbc",
      category: "Bebidas Isotónicas",
      sale_price: 12.00,
      current_cost: 8.50,
      image_url: "/files/products/gatorade_frutas_600.png",
      presentations: [{ name: "Paquete de 12", conversion_factor: 12, default_cost: 102.00 }],
    },
    {
      code: "BEB-POW-MORA",
      name: "Powerade Mountain Blast (Mora) 600 ml",
      brand: "The Coca-Cola Company",
      category: "Bebidas Isotónicas",
      sale_price: 12.00,
      current_cost: 8.50,
      image_url: "/files/products/powerade_mora_600.png",
      presentations: [{ name: "Paquete de 12", conversion_factor: 12, default_cost: 102.00 }],
    },
  ];

  const undUnitId = unitMap.get("UND")!;

  for (const prodData of defaultProducts) {
    const categoryId = catMap.get(prodData.category)!;
    const brandId = brandMap.get(prodData.brand) || null;

    let product = await prisma.product.findUnique({
      where: { code: prodData.code },
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          code: prodData.code,
          name: prodData.name,
          brand_id: brandId,
          category_id: categoryId,
          base_unit_id: undUnitId,
          product_type: "DIRECT_SALE",
          sale_price: prodData.sale_price,
          current_cost: prodData.current_cost,
          current_stock: 0,
          min_stock_alert: 5,
          image_url: prodData.image_url,
          is_active: true,
          created_by: "SYSTEM_SEED",
        },
      });
      console.log(`✅ Producto creado: ${product.name} (Q ${product.sale_price})`);
    } else {
      product = await prisma.product.update({
        where: { id: product.id },
        data: {
          brand_id: brandId,
          image_url: prodData.image_url,
        },
      });
      console.log(`ℹ️ Producto existente actualizado (Marca ID: ${brandId}): ${product.name}`);
    }

    // Crear presentaciones de compra asociadas
    for (const pres of prodData.presentations) {
      const existingPres = await prisma.productPurchasePresentation.findFirst({
        where: {
          product_id: product.id,
          name: pres.name,
        },
      });

      if (!existingPres) {
        await prisma.productPurchasePresentation.create({
          data: {
            product_id: product.id,
            name: pres.name,
            conversion_factor: pres.conversion_factor,
            default_cost: pres.default_cost,
            created_by: "SYSTEM_SEED",
          },
        });
        console.log(`  📦 Presentación: ${pres.name} (Factor ${pres.conversion_factor}x) -> Q ${pres.default_cost}`);
      }
    }
  }

  console.log("🎉 Seed completo finalizado con éxito.");
}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
