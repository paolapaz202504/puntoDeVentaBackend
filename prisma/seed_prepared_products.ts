import "../src/config/env";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🍹 Iniciando Seed de Productos Preparados, Ingredientes y Recetas (Dev)...");

  // 1. Unidades de Medida
  const unitsData = [
    { name: "Unidad", symbol: "UND" },
    { name: "Mililitro", symbol: "ML" },
    { name: "Gramo", symbol: "G" },
    { name: "Libra", symbol: "LB" },
    { name: "Vaso (16 oz)", symbol: "VASO" },
    { name: "Porción", symbol: "PORCION" },
  ];

  const unitMap = new Map<string, string>();
  for (const u of unitsData) {
    let unit = await prisma.measurementUnit.findUnique({
      where: { symbol: u.symbol },
    });
    if (!unit) {
      unit = await prisma.measurementUnit.create({
        data: { name: u.name, symbol: u.symbol, created_by: "SYSTEM_SEED" },
      });
      console.log(`✅ Unidad creada: ${unit.name} (${unit.symbol})`);
    }
    unitMap.set(u.symbol, unit.id);
  }

  // 2. Categorías de Productos
  const categoriesData = [
    { name: "Refrescos Naturales", description: "Bebidas artesanales elaboradas en cubetas de 1 a 10 Litros" },
    { name: "Licuados", description: "Bebidas preparadas al momento por vaso con base de leche o agua" },
    { name: "Alimentos y Antojitos", description: "Panes y tostadas con rellenos preparados en cocina" },
    { name: "Materias Primas e Insumos", description: "Frutas, verduras, carnes crudas, abarrotes y bases de panadería" },
    { name: "Sub-ensambles de Cocina", description: "Rellenos cocinados y preparados por libra" },
  ];

  const catMap = new Map<string, string>();
  for (const c of categoriesData) {
    let cat = await prisma.category.findUnique({
      where: { name: c.name },
    });
    if (!cat) {
      cat = await prisma.category.create({
        data: { name: c.name, description: c.description, created_by: "SYSTEM_SEED" },
      });
      console.log(`✅ Categoría creada: ${cat.name}`);
    }
    catMap.set(c.name, cat.id);
  }

  // 3. Catálogo de Proveedores
  const suppliersData = [
    {
      name: "Distribuidora Frutas y Verduras La Terminal",
      contact_name: "Pedro Morales",
      phone: "+502 5555-1001",
      email: "frutas.terminal@gmail.com",
      address: "Mercado La Terminal, Zona 4",
      category: "FRUTAS",
    },
    {
      name: "Panadería y Pastelería La Espiga de Oro",
      contact_name: "Doña Marta Gómez",
      phone: "+502 5555-1002",
      email: "espigadeoro@gmail.com",
      address: "Avenida Las Américas, Local 12",
      category: "PANADERIA",
    },
    {
      name: "Carnicería y Pollería El Buen Corte",
      contact_name: "Carlos Méndez",
      phone: "+502 5555-1003",
      email: "buencorte.carnes@gmail.com",
      address: "Mercado Central, Pasillo 3",
      category: "CARNICERIA",
    },
    {
      name: "Distribuidora de Abarrotes y Lácteos El Trébol",
      contact_name: "Lic. Andrea Ruiz",
      phone: "+502 5555-1004",
      email: "ventas@trebolabarrotes.com",
      address: "Calzada San Juan 14-20, Zona 7",
      category: "ABARROTES",
    },
    {
      name: "Fábrica de Tostadas y Tortillas El Maizal",
      contact_name: "Esteban Quezada",
      phone: "+502 5555-1005",
      email: "tostadaselmaizal@gmail.com",
      address: "Colonia El Progreso, Lote 45",
      category: "GENERAL",
    },
  ];

  const suppMap = new Map<string, string>();
  for (const s of suppliersData) {
    let supp = await prisma.supplier.findUnique({
      where: { name: s.name },
    });
    if (!supp) {
      supp = await prisma.supplier.create({
        data: {
          name: s.name,
          contact_name: s.contact_name,
          phone: s.phone,
          email: s.email,
          address: s.address,
          category: s.category,
          created_by: "SYSTEM_SEED",
        },
      });
      console.log(`✅ Proveedor creado: ${supp.name}`);
    }
    suppMap.set(s.name, supp.id);
  }

  const pFrutas = suppMap.get("Distribuidora Frutas y Verduras La Terminal");
  const pPan = suppMap.get("Panadería y Pastelería La Espiga de Oro");
  const pCarnes = suppMap.get("Carnicería y Pollería El Buen Corte");
  const pAbarrotes = suppMap.get("Distribuidora de Abarrotes y Lácteos El Trébol");
  const pMaizal = suppMap.get("Fábrica de Tostadas y Tortillas El Maizal");

  const catInsumos = catMap.get("Materias Primas e Insumos")!;
  const catSub = catMap.get("Sub-ensambles de Cocina")!;
  const catRefrescos = catMap.get("Refrescos Naturales")!;
  const catLicuados = catMap.get("Licuados")!;
  const catAlimentos = catMap.get("Alimentos y Antojitos")!;

  const uUnd = unitMap.get("UND")!;
  const uMl = unitMap.get("ML")!;
  const uLb = unitMap.get("LB")!;
  const uG = unitMap.get("G")!;

  // 4. Materias Primas / Insumos
  const rawMaterials = [
    // Frutas y verduras para bebidas
    { code: "INS-MELON", name: "Melón Fresco", unit: uUnd, supp: pFrutas, cost: 8.00, stock: 30, min: 5 },
    { code: "INS-JAMAICA", name: "Flor de Jamaica Seca", unit: uLb, supp: pFrutas, cost: 22.00, stock: 15, min: 3 },
    { code: "INS-ARROZ", name: "Arroz Blanco para Horchata", unit: uLb, supp: pAbarrotes, cost: 4.50, stock: 50, min: 10 },
    { code: "INS-CANELA", name: "Canela en Rama", unit: uLb, supp: pAbarrotes, cost: 35.00, stock: 5, min: 1 },
    { code: "INS-ESEN-CREMA", name: "Jarabe / Esencia de Crema", unit: uMl, supp: pAbarrotes, cost: 0.05, stock: 5000, min: 1000 },
    { code: "INS-CHILACAYOTE", name: "Chilacayote Fresco Crudo", unit: uLb, supp: pFrutas, cost: 5.00, stock: 25, min: 5 },
    { code: "INS-PANELA", name: "Panela / Raspadura de Dulce", unit: uLb, supp: pAbarrotes, cost: 6.00, stock: 30, min: 5 },
    { code: "INS-PINA", name: "Piña Fresca Madura", unit: uUnd, supp: pFrutas, cost: 7.00, stock: 20, min: 4 },
    { code: "INS-MORA", name: "Mora Fresca Silvestre", unit: uLb, supp: pFrutas, cost: 12.00, stock: 20, min: 4 },
    { code: "INS-TAMARINDO", name: "Tamarindo Seco en Vaina", unit: uLb, supp: pFrutas, cost: 14.00, stock: 15, min: 3 },
    { code: "INS-AZUCAR", name: "Azúcar Blanca Refinada", unit: uLb, supp: pAbarrotes, cost: 4.00, stock: 100, min: 20 },
    { code: "INS-AGUA", name: "Agua Purificada", unit: uMl, supp: pAbarrotes, cost: 0.002, stock: 200000, min: 20000 },
    
    // Insumos Licuados
    { code: "INS-LECHE", name: "Leche Líquida Entera", unit: uMl, supp: pAbarrotes, cost: 0.012, stock: 30000, min: 5000 },
    { code: "INS-BANANO", name: "Banano Maduro", unit: uUnd, supp: pFrutas, cost: 1.00, stock: 60, min: 12 },
    { code: "INS-FRESA", name: "Fresa Fresca / Congelada", unit: uLb, supp: pFrutas, cost: 15.00, stock: 25, min: 5 },
    { code: "INS-CHOCO", name: "Chocomilk / Cacao en Polvo", unit: uLb, supp: pAbarrotes, cost: 18.00, stock: 10, min: 2 },
    { code: "INS-AVENA", name: "Avena en Hojuelas", unit: uLb, supp: pAbarrotes, cost: 6.50, stock: 20, min: 4 },
    { code: "INS-CEREAL", name: "Cereal de Hojuelas de Maíz", unit: uLb, supp: pAbarrotes, cost: 12.00, stock: 15, min: 3 },

    // Insumos Alimentos
    { code: "INS-POLLO-CRUDO", name: "Pollo Crudo en Piezas / Pechuga", unit: uLb, supp: pCarnes, cost: 14.00, stock: 40, min: 10 },
    { code: "INS-ZANAHORIA", name: "Zanahoria Fresca Cruda", unit: uLb, supp: pFrutas, cost: 3.50, stock: 30, min: 5 },
    { code: "INS-REMOLACHA", name: "Remolacha Fresca Cruda", unit: uLb, supp: pFrutas, cost: 4.00, stock: 30, min: 5 },
    { code: "INS-EJOTE", name: "Ejote Fresco Francés", unit: uLb, supp: pFrutas, cost: 5.00, stock: 20, min: 4 },
    { code: "INS-FIDEOS-CHAO", name: "Fideos de Chaomín Crudos", unit: uLb, supp: pAbarrotes, cost: 6.00, stock: 35, min: 8 },
    { code: "INS-MAYONESA", name: "Mayonesa Comercial", unit: uLb, supp: pAbarrotes, cost: 11.00, stock: 25, min: 5 },
    { code: "INS-JAMON", name: "Jamón de Pierna en Lascas", unit: uLb, supp: pCarnes, cost: 24.00, stock: 20, min: 4 },
    { code: "INS-PAN-FRANCES", name: "Pan Francés / Pirujo", unit: uUnd, supp: pPan, cost: 0.50, stock: 200, min: 40 },
    { code: "INS-TOSTADAS", name: "Tostadas de Maíz Horneadas", unit: uUnd, supp: pMaizal, cost: 0.60, stock: 250, min: 50 },
  ];

  const productMap = new Map<string, string>();

  for (const raw of rawMaterials) {
    let p = await prisma.product.findUnique({ where: { code: raw.code } });
    if (!p) {
      p = await prisma.product.create({
        data: {
          code: raw.code,
          name: raw.name,
          category_id: catInsumos,
          base_unit_id: raw.unit,
          supplier_id: raw.supp,
          product_type: "RAW_MATERIAL",
          sale_price: 0,
          current_cost: raw.cost,
          current_stock: raw.stock,
          min_stock_alert: raw.min,
          created_by: "SYSTEM_SEED",
        },
      });
      console.log(`  🌾 Materia Prima creada: ${p.name}`);
    }
    productMap.set(raw.code, p.id);
  }

  // 5. Sub-ensambles de Cocina (Preparados por Libra)
  const subRecipesData = [
    { code: "SUB-POLLO-SECO", name: "Pollo Seco Preparado (Cocido/Deshebrado)", cost: 18.90, stock: 5.0, min: 1.0 },
    { code: "SUB-POLLO-MAYO", name: "Pollo con Mayonesa Preparado", cost: 16.90, stock: 4.0, min: 1.0 },
    { code: "SUB-VERDURA", name: "Verdura Preparada (Zanahoria, Remolacha, Ejote)", cost: 4.80, stock: 6.0, min: 1.0 },
    { code: "SUB-CHAOMIN", name: "Chaomín Cocinado con Verduras", cost: 6.50, stock: 8.0, min: 1.0 },
  ];

  for (const sub of subRecipesData) {
    let p = await prisma.product.findUnique({ where: { code: sub.code } });
    if (!p) {
      p = await prisma.product.create({
        data: {
          code: sub.code,
          name: sub.name,
          category_id: catSub,
          base_unit_id: uLb,
          product_type: "SUB_RECIPE",
          sale_price: 0,
          current_cost: sub.cost,
          current_stock: sub.stock,
          min_stock_alert: sub.min,
          created_by: "SYSTEM_SEED",
        },
      });
      console.log(`  🍲 Sub-ensamble creado: ${p.name}`);
    }
    productMap.set(sub.code, p.id);
  }

  // 6. Productos Terminados: 9 Refrescos Naturales (Cubetas 1-10L / ML)
  const refrescosData = [
    { code: "REF-MELON", name: "Refresco de Melón Natural", price: 10.00, stock: 5000, min: 1000 },
    { code: "REF-JAMAICA", name: "Refresco de Jamaica Natural", price: 10.00, stock: 5000, min: 1000 },
    { code: "REF-HORCHATA", name: "Horchata Artesanal Tradicional", price: 12.00, stock: 5000, min: 1000 },
    { code: "REF-CREMA", name: "Refresco de Crema Tradicional", price: 12.00, stock: 5000, min: 1000 },
    { code: "REF-CHILACAYOTE", name: "Refresco de Chilacayote", price: 12.00, stock: 4000, min: 1000 },
    { code: "REF-VINAGRE", name: "Refresco Tradicional de Vinagre", price: 10.00, stock: 5000, min: 1000 },
    { code: "REF-MORA", name: "Refresco de Mora Silvestre", price: 12.00, stock: 5000, min: 1000 },
    { code: "REF-PINA", name: "Refresco de Piña Natural", price: 10.00, stock: 5000, min: 1000 },
    { code: "REF-TAMARINDO", name: "Refresco de Tamarindo Natural", price: 10.00, stock: 5000, min: 1000 },
  ];

  for (const ref of refrescosData) {
    let p = await prisma.product.findUnique({ where: { code: ref.code } });
    if (!p) {
      p = await prisma.product.create({
        data: {
          code: ref.code,
          name: ref.name,
          category_id: catRefrescos,
          base_unit_id: uMl,
          product_type: "MANUFACTURED",
          sale_price: ref.price,
          current_cost: 3.50,
          current_stock: ref.stock,
          min_stock_alert: ref.min,
          created_by: "SYSTEM_SEED",
        },
      });
      console.log(`  🥤 Refresco creado: ${p.name}`);
    }
    productMap.set(ref.code, p.id);
  }

  // 7. Productos Terminados: 6 Licuados (On-Demand por Vaso)
  const licuadosData = [
    { code: "LIC-BANANO", name: "Licuado de Banano (Vaso 16 oz)", price: 14.00 },
    { code: "LIC-FRESA", name: "Licuado de Fresa (Vaso 16 oz)", price: 16.00 },
    { code: "LIC-CHOCO", name: "Licuado Chocomilk (Vaso 16 oz)", price: 15.00 },
    { code: "LIC-AVENA", name: "Licuado de Avena con Canela (Vaso 16 oz)", price: 15.00 },
    { code: "LIC-CEREAL", name: "Licuado de Cereal de Maíz (Vaso 16 oz)", price: 15.00 },
    { code: "LIC-MIXTO", name: "Licuado Mixto Personalizado (Vaso 16 oz)", price: 18.00 },
  ];

  for (const lic of licuadosData) {
    let p = await prisma.product.findUnique({ where: { code: lic.code } });
    if (!p) {
      p = await prisma.product.create({
        data: {
          code: lic.code,
          name: lic.name,
          category_id: catLicuados,
          base_unit_id: uUnd,
          product_type: "ON_DEMAND",
          sale_price: lic.price,
          current_cost: 5.00,
          current_stock: 0,
          min_stock_alert: 0,
          created_by: "SYSTEM_SEED",
        },
      });
      console.log(`  🍓 Licuado creado: ${p.name}`);
    }
    productMap.set(lic.code, p.id);
  }

  // 8. Productos Terminados: 10 Alimentos (5 Panes y 5 Tostadas)
  const alimentosData = [
    // Panes
    { code: "PAN-POLLO-SECO", name: "Pan con Pollo Seco", price: 14.00 },
    { code: "PAN-POLLO-MAYO", name: "Pan con Pollo y Mayonesa", price: 15.00 },
    { code: "PAN-JAMON", name: "Pan con Jamón", price: 12.00 },
    { code: "PAN-CHAOMIN", name: "Pan con Chaomín", price: 12.00 },
    { code: "PAN-VERDURA", name: "Pan con Verdura", price: 10.00 },
    // Tostadas
    { code: "TOST-POLLO-SECO", name: "Tostada con Pollo Seco", price: 9.00 },
    { code: "TOST-POLLO-MAYO", name: "Tostada con Pollo y Mayonesa", price: 10.00 },
    { code: "TOST-JAMON", name: "Tostada con Jamón", price: 8.00 },
    { code: "TOST-CHAOMIN", name: "Tostada con Chaomín", price: 8.00 },
    { code: "TOST-VERDURA", name: "Tostada con Verdura", price: 7.00 },
  ];

  for (const ali of alimentosData) {
    let p = await prisma.product.findUnique({ where: { code: ali.code } });
    if (!p) {
      p = await prisma.product.create({
        data: {
          code: ali.code,
          name: ali.name,
          category_id: catAlimentos,
          base_unit_id: uUnd,
          product_type: "ON_DEMAND",
          sale_price: ali.price,
          current_cost: 3.50,
          current_stock: 0,
          min_stock_alert: 0,
          created_by: "SYSTEM_SEED",
        },
      });
      console.log(`  🥪 Alimento creado: ${p.name}`);
    }
    productMap.set(ali.code, p.id);
  }

  // 9. Crear Recetas Base y Vínculo de Ingredientes
  console.log("📝 Configurando Recetas y Fórmulas Base...");

  // Auxiliar para crear receta con ingredientes
  async function ensureRecipe(
    productCode: string,
    recipeName: string,
    recipeType: "BATCH_SCALABLE" | "SUB_RECIPE_BATCH" | "ON_DEMAND_UNIT",
    baseYield: number,
    yieldUnit: string,
    instructions: string,
    ingredients: Array<{ code: string; qty: number; unit: string }>
  ) {
    const prodId = productMap.get(productCode);
    if (!prodId) return;

    let recipe = await prisma.recipe.findFirst({
      where: { product_id: prodId },
    });

    if (!recipe) {
      recipe = await prisma.recipe.create({
        data: {
          product_id: prodId,
          name: recipeName,
          recipe_type: recipeType,
          base_yield: baseYield,
          yield_unit: yieldUnit,
          instructions: instructions,
          created_by: "SYSTEM_SEED",
        },
      });

      for (const ing of ingredients) {
        const ingId = productMap.get(ing.code);
        if (ingId) {
          await prisma.recipeItem.create({
            data: {
              recipe_id: recipe.id,
              ingredient_id: ingId,
              quantity: ing.qty,
              unit: ing.unit,
              created_by: "SYSTEM_SEED",
            },
          });
        }
      }
      console.log(`  ✅ Receta configurada: ${recipeName}`);
    }
  }

  // A. Recetas de Sub-ensambles (Base: 1.0 Libra)
  await ensureRecipe(
    "SUB-POLLO-SECO",
    "Fórmula Base Pollo Seco (1 LB)",
    "SUB_RECIPE_BATCH",
    1.0,
    "LB",
    "Cocer pollo con sal, ajo y laurel. Escurrir y deshebrar finamente.",
    [{ code: "INS-POLLO-CRUDO", qty: 1.35, unit: "LB" }]
  );

  await ensureRecipe(
    "SUB-POLLO-MAYO",
    "Fórmula Base Pollo con Mayonesa (1 LB)",
    "SUB_RECIPE_BATCH",
    1.0,
    "LB",
    "Mezclar el pollo seco deshebrado con mayonesa hasta obtener textura homogénea.",
    [
      { code: "SUB-POLLO-SECO", qty: 0.75, unit: "LB" },
      { code: "INS-MAYONESA", qty: 0.25, unit: "LB" },
    ]
  );

  await ensureRecipe(
    "SUB-VERDURA",
    "Fórmula Base Verdura Preparada (1 LB)",
    "SUB_RECIPE_BATCH",
    1.0,
    "LB",
    "Cocer y picar finamente zanahoria, remolacha y ejote. Sazonar con sal y toque de vinagre.",
    [
      { code: "INS-ZANAHORIA", qty: 0.40, unit: "LB" },
      { code: "INS-REMOLACHA", qty: 0.40, unit: "LB" },
      { code: "INS-EJOTE", qty: 0.20, unit: "LB" },
    ]
  );

  await ensureRecipe(
    "SUB-CHAOMIN",
    "Fórmula Base Chaomín Cocinado (1 LB)",
    "SUB_RECIPE_BATCH",
    1.0,
    "LB",
    "Hervir fideos de chaomín, saltear con verdura picada y aderezar con salsa soya.",
    [
      { code: "INS-FIDEOS-CHAO", qty: 0.50, unit: "LB" },
      { code: "INS-ZANAHORIA", qty: 0.35, unit: "LB" },
    ]
  );

  // B. Recetas de Refrescos Naturales (Base: 1,000 ML = 1 Litro, para escalar a cubetas de 1 a 10L)
  await ensureRecipe(
    "REF-MELON",
    "Fórmula Base Refresco de Melón (por 1 Litro)",
    "BATCH_SCALABLE",
    1000,
    "ML",
    "Licuar pulpa de melón para obtener esencia concentrada. Agregar agua purificada y azúcar.",
    [
      { code: "INS-MELON", qty: 0.20, unit: "UND" }, // 1 melón rinde 5 litros
      { code: "INS-AZUCAR", qty: 0.05, unit: "LB" }, // ~22 gramos por litro
      { code: "INS-AGUA", qty: 850, unit: "ML" },
    ]
  );

  await ensureRecipe(
    "REF-JAMAICA",
    "Fórmula Base Refresco de Jamaica (por 1 Litro)",
    "BATCH_SCALABLE",
    1000,
    "ML",
    "Hervir flor de jamaica seca para concentrado. Colar, agregar agua y azúcar al gusto.",
    [
      { code: "INS-JAMAICA", qty: 0.04, unit: "LB" },
      { code: "INS-AZUCAR", qty: 0.07, unit: "LB" },
      { code: "INS-AGUA", qty: 900, unit: "ML" },
    ]
  );

  await ensureRecipe(
    "REF-HORCHATA",
    "Fórmula Base Horchata Tradicional (por 1 Litro)",
    "BATCH_SCALABLE",
    1000,
    "ML",
    "Remojar arroz y canela, licuar finamente, colar con manta. Mezclar con leche, agua y azúcar.",
    [
      { code: "INS-ARROZ", qty: 0.05, unit: "LB" },
      { code: "INS-CANELA", qty: 0.005, unit: "LB" },
      { code: "INS-LECHE", qty: 100, unit: "ML" },
      { code: "INS-AZUCAR", qty: 0.07, unit: "LB" },
      { code: "INS-AGUA", qty: 800, unit: "ML" },
    ]
  );

  await ensureRecipe(
    "REF-CREMA",
    "Fórmula Base Refresco de Crema (por 1 Litro)",
    "BATCH_SCALABLE",
    1000,
    "ML",
    "Diluir jarabe de crema en leche fresca y agua purificada con toque de azúcar.",
    [
      { code: "INS-ESEN-CREMA", qty: 40, unit: "ML" },
      { code: "INS-LECHE", qty: 150, unit: "ML" },
      { code: "INS-AZUCAR", qty: 0.04, unit: "LB" },
      { code: "INS-AGUA", qty: 750, unit: "ML" },
    ]
  );

  await ensureRecipe(
    "REF-CHILACAYOTE",
    "Fórmula Base Refresco de Chilacayote (por 1 Litro)",
    "BATCH_SCALABLE",
    1000,
    "ML",
    "Cocer chilacayote en trozos con panela y canela hasta que caramelice. Servir con agua fresca.",
    [
      { code: "INS-CHILACAYOTE", qty: 0.15, unit: "LB" },
      { code: "INS-PANELA", qty: 0.06, unit: "LB" },
      { code: "INS-AGUA", qty: 850, unit: "ML" },
    ]
  );

  await ensureRecipe(
    "REF-VINAGRE",
    "Fórmula Base Refresco de Vinagre (por 1 Litro)",
    "BATCH_SCALABLE",
    1000,
    "ML",
    "Fermentación dulce tradicional de cáscaras de piña con panela y especias.",
    [
      { code: "INS-PINA", qty: 0.15, unit: "UND" },
      { code: "INS-PANELA", qty: 0.05, unit: "LB" },
      { code: "INS-AGUA", qty: 850, unit: "ML" },
    ]
  );

  await ensureRecipe(
    "REF-MORA",
    "Fórmula Base Refresco de Mora (por 1 Litro)",
    "BATCH_SCALABLE",
    1000,
    "ML",
    "Licuar mora fresca con agua y azúcar. Colar semilla según preferencia.",
    [
      { code: "INS-MORA", qty: 0.08, unit: "LB" },
      { code: "INS-AZUCAR", qty: 0.06, unit: "LB" },
      { code: "INS-AGUA", qty: 880, unit: "ML" },
    ]
  );

  await ensureRecipe(
    "REF-PINA",
    "Fórmula Base Refresco de Piña Natural (por 1 Litro)",
    "BATCH_SCALABLE",
    1000,
    "ML",
    "Picar piña madura, licuar concentrado con agua purificada y azúcar.",
    [
      { code: "INS-PINA", qty: 0.20, unit: "UND" },
      { code: "INS-AZUCAR", qty: 0.05, unit: "LB" },
      { code: "INS-AGUA", qty: 850, unit: "ML" },
    ]
  );

  await ensureRecipe(
    "REF-TAMARINDO",
    "Fórmula Base Refresco de Tamarindo (por 1 Litro)",
    "BATCH_SCALABLE",
    1000,
    "ML",
    "Hervir pulpa de tamarindo en vaina para extraer pulpa ácida. Mezclar con azúcar y agua.",
    [
      { code: "INS-TAMARINDO", qty: 0.06, unit: "LB" },
      { code: "INS-AZUCAR", qty: 0.08, unit: "LB" },
      { code: "INS-AGUA", qty: 880, unit: "ML" },
    ]
  );

  // C. Recetas de Alimentos (Panes y Tostadas - Base 1 Unidad)
  await ensureRecipe(
    "PAN-POLLO-SECO",
    "Ensamble Pan con Pollo Seco",
    "ON_DEMAND_UNIT",
    1,
    "UND",
    "Abrir pan francés y rellenar con porción de pollo seco deshebrado.",
    [
      { code: "INS-PAN-FRANCES", qty: 1, unit: "UND" },
      { code: "SUB-POLLO-SECO", qty: 0.15, unit: "LB" },
    ]
  );

  await ensureRecipe(
    "PAN-POLLO-MAYO",
    "Ensamble Pan con Pollo y Mayonesa",
    "ON_DEMAND_UNIT",
    1,
    "UND",
    "Abrir pan francés y rellenar con pollo con mayonesa.",
    [
      { code: "INS-PAN-FRANCES", qty: 1, unit: "UND" },
      { code: "SUB-POLLO-MAYO", qty: 0.15, unit: "LB" },
    ]
  );

  await ensureRecipe(
    "PAN-JAMON",
    "Ensamble Pan con Jamón",
    "ON_DEMAND_UNIT",
    1,
    "UND",
    "Colocar dos lascas de jamón dentro del pan francés.",
    [
      { code: "INS-PAN-FRANCES", qty: 1, unit: "UND" },
      { code: "INS-JAMON", qty: 0.09, unit: "LB" },
    ]
  );

  await ensureRecipe(
    "PAN-CHAOMIN",
    "Ensamble Pan con Chaomín",
    "ON_DEMAND_UNIT",
    1,
    "UND",
    "Rellenar pan francés con porción caliente de chaomín.",
    [
      { code: "INS-PAN-FRANCES", qty: 1, unit: "UND" },
      { code: "SUB-CHAOMIN", qty: 0.18, unit: "LB" },
    ]
  );

  await ensureRecipe(
    "PAN-VERDURA",
    "Ensamble Pan con Verdura",
    "ON_DEMAND_UNIT",
    1,
    "UND",
    "Rellenar pan francés con ensalada cocida tradicional de verdura.",
    [
      { code: "INS-PAN-FRANCES", qty: 1, unit: "UND" },
      { code: "SUB-VERDURA", qty: 0.16, unit: "LB" },
    ]
  );

  await ensureRecipe(
    "TOST-POLLO-SECO",
    "Ensamble Tostada con Pollo Seco",
    "ON_DEMAND_UNIT",
    1,
    "UND",
    "Montar pollo seco sobre la tostada de maíz.",
    [
      { code: "INS-TOSTADAS", qty: 1, unit: "UND" },
      { code: "SUB-POLLO-SECO", qty: 0.12, unit: "LB" },
    ]
  );

  await ensureRecipe(
    "TOST-POLLO-MAYO",
    "Ensamble Tostada con Pollo y Mayonesa",
    "ON_DEMAND_UNIT",
    1,
    "UND",
    "Untar pollo con mayonesa sobre la tostada de maíz.",
    [
      { code: "INS-TOSTADAS", qty: 1, unit: "UND" },
      { code: "SUB-POLLO-MAYO", qty: 0.12, unit: "LB" },
    ]
  );

  await ensureRecipe(
    "TOST-JAMON",
    "Ensamble Tostada con Jamón",
    "ON_DEMAND_UNIT",
    1,
    "UND",
    "Colocar jamón en lascas sobre tostada con salsa.",
    [
      { code: "INS-TOSTADAS", qty: 1, unit: "UND" },
      { code: "INS-JAMON", qty: 0.09, unit: "LB" },
    ]
  );

  await ensureRecipe(
    "TOST-CHAOMIN",
    "Ensamble Tostada con Chaomín",
    "ON_DEMAND_UNIT",
    1,
    "UND",
    "Montar porción de chaomín sobre la tostada crujiente.",
    [
      { code: "INS-TOSTADAS", qty: 1, unit: "UND" },
      { code: "SUB-CHAOMIN", qty: 0.15, unit: "LB" },
    ]
  );

  await ensureRecipe(
    "TOST-VERDURA",
    "Ensamble Tostada con Verdura",
    "ON_DEMAND_UNIT",
    1,
    "UND",
    "Montar verdura tradicional sobre tostada con perejil y queso.",
    [
      { code: "INS-TOSTADAS", qty: 1, unit: "UND" },
      { code: "SUB-VERDURA", qty: 0.14, unit: "LB" },
    ]
  );

  // D. Recetas de Licuados (Base 1 Vaso 16 oz)
  await ensureRecipe(
    "LIC-BANANO",
    "Fórmula Licuado de Banano (Vaso)",
    "ON_DEMAND_UNIT",
    1,
    "VASO",
    "Licuar 1 banano con 350ml de leche y azúcar.",
    [
      { code: "INS-BANANO", qty: 1, unit: "UND" },
      { code: "INS-LECHE", qty: 350, unit: "ML" },
      { code: "INS-AZUCAR", qty: 0.03, unit: "LB" },
    ]
  );

  await ensureRecipe(
    "LIC-FRESA",
    "Fórmula Licuado de Fresa (Vaso)",
    "ON_DEMAND_UNIT",
    1,
    "VASO",
    "Licuar fresas con 350ml de leche y azúcar.",
    [
      { code: "INS-FRESA", qty: 0.22, unit: "LB" }, // ~100g
      { code: "INS-LECHE", qty: 350, unit: "ML" },
      { code: "INS-AZUCAR", qty: 0.04, unit: "LB" },
    ]
  );

  await ensureRecipe(
    "LIC-CHOCO",
    "Fórmula Licuado Chocomilk (Vaso)",
    "ON_DEMAND_UNIT",
    1,
    "VASO",
    "Batir chocomilk en polvo con leche fresca bien fría.",
    [
      { code: "INS-CHOCO", qty: 0.07, unit: "LB" }, // ~30g
      { code: "INS-LECHE", qty: 380, unit: "ML" },
    ]
  );

  await ensureRecipe(
    "LIC-AVENA",
    "Fórmula Licuado de Avena (Vaso)",
    "ON_DEMAND_UNIT",
    1,
    "VASO",
    "Licuar hojuelas de avena con leche, canela y azúcar.",
    [
      { code: "INS-AVENA", qty: 0.09, unit: "LB" }, // ~40g
      { code: "INS-LECHE", qty: 350, unit: "ML" },
      { code: "INS-CANELA", qty: 0.002, unit: "LB" },
      { code: "INS-AZUCAR", qty: 0.04, unit: "LB" },
    ]
  );

  await ensureRecipe(
    "LIC-CEREAL",
    "Fórmula Licuado de Cereal (Vaso)",
    "ON_DEMAND_UNIT",
    1,
    "VASO",
    "Licuar cereal de maíz con leche entera y azúcar.",
    [
      { code: "INS-CEREAL", qty: 0.09, unit: "LB" },
      { code: "INS-LECHE", qty: 350, unit: "ML" },
      { code: "INS-AZUCAR", qty: 0.03, unit: "LB" },
    ]
  );

  await ensureRecipe(
    "LIC-MIXTO",
    "Fórmula Licuado Mixto Fresa/Banano (Vaso)",
    "ON_DEMAND_UNIT",
    1,
    "VASO",
    "Licuar medio banano con fresas, leche y azúcar.",
    [
      { code: "INS-BANANO", qty: 0.5, unit: "UND" },
      { code: "INS-FRESA", qty: 0.12, unit: "LB" },
      { code: "INS-LECHE", qty: 350, unit: "ML" },
      { code: "INS-AZUCAR", qty: 0.04, unit: "LB" },
    ]
  );

  console.log("✨ Seed de Productos Preparados completado con éxito!");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed de productos preparados:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
