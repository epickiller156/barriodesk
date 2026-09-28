import { db } from "./index";
import {
  users, stores, storeSettings, categories, suppliers, products,
  customers, sales, saleItems, fiadoRecords, fiadoPayments,
  cashClosings, purchases, purchaseItems, notifications, stockMovements
} from "./schema";
import bcrypt from "bcryptjs";
import { slugify } from "../lib/utils";

async function seed() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await db.delete(notifications);
  await db.delete(fiadoPayments);
  await db.delete(fiadoRecords);
  await db.delete(saleItems);
  await db.delete(sales);
  await db.delete(purchaseItems);
  await db.delete(purchases);
  await db.delete(cashClosings);
  await db.delete(stockMovements);
  await db.delete(customers);
  await db.delete(products);
  await db.delete(categories);
  await db.delete(suppliers);
  await db.delete(storeSettings);
  await db.delete(stores);
  await db.delete(users);

  // ─── USER ────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("demo1234", 12);
  const [user] = await db.insert(users).values({
    email: "demo@barriodesk.ar",
    passwordHash,
    name: "Carlos Mamani",
    phone: "3816655925",
    role: "OWNER",
  }).returning();

  console.log("✅ User created:", user.email);

  // ─── STORE ───────────────────────────────────────────────────────────────
  const [store] = await db.insert(stores).values({
    name: "Kiosco El Chino",
    slug: "kiosco-el-chino-alberdi",
    address: "Av. Sarmiento 1245",
    neighborhood: "Alberdi",
    city: "San Miguel de Tucumán",
    province: "Tucumán",
    phone: "3816655925",
    whatsappNumber: "+5493816655925",
    plan: "VECINO",
    ownerId: user.id,
    storeType: "kiosco",
    isStorefrontActive: true,
  }).returning();

  await db.insert(storeSettings).values({
    storeId: store.id,
    lowStockThreshold: 5,
    expirationAlertDays: 15,
    cbuAlias: "kiosco.elchino.tuc",
    acceptCash: true,
    acceptMercadoPago: true,
    acceptTransfer: true,
    acceptCard: false,
    welcomeMessage: "¡Bienvenido al Kiosco El Chino! Encontrá todo lo que necesitás.",
    debtReminderTemplate: "Hola {nombre}, te recordamos que tenés una deuda de {monto} en el Kiosco El Chino. ¡Gracias!",
  });

  console.log("✅ Store created:", store.name);

  // ─── CATEGORIES ──────────────────────────────────────────────────────────
  const categoryData = [
    { name: "Golosinas", icon: "🍬", color: "#FF6B9D" },
    { name: "Bebidas", icon: "🥤", color: "#3498DB" },
    { name: "Cigarrillos y tabacos", icon: "🚬", color: "#7F8C8D" },
    { name: "Snacks y papas", icon: "🍟", color: "#F39C12" },
    { name: "Lácteos y refrigerados", icon: "🥛", color: "#ECF0F1" },
    { name: "Panadería", icon: "🍞", color: "#E67E22" },
    { name: "Higiene y limpieza", icon: "🧴", color: "#2ECC71" },
    { name: "Varios", icon: "📦", color: "#9B59B6" },
  ];

  const insertedCategories = await db.insert(categories).values(
    categoryData.map(c => ({ ...c, storeId: store.id }))
  ).returning();

  const catMap = Object.fromEntries(insertedCategories.map(c => [c.name, c.id]));
  console.log("✅ Categories created:", insertedCategories.length);

  // ─── SUPPLIERS ───────────────────────────────────────────────────────────
  const supplierData = [
    { name: "Distribuidora Vital SA", contactName: "Juan Pérez", phone: "3813456789", category: "Bebidas y lácteos" },
    { name: "Arcor Distribución Tucumán", contactName: "María González", phone: "3814567890", category: "Golosinas" },
    { name: "Tabacalera Del Norte", contactName: "Roberto Sosa", phone: "3815678901", category: "Cigarrillos" },
  ];

  const insertedSuppliers = await db.insert(suppliers).values(
    supplierData.map(s => ({ ...s, storeId: store.id }))
  ).returning();

  const supMap: Record<string, string> = {
    "bebidas": insertedSuppliers[0].id,
    "golosinas": insertedSuppliers[1].id,
    "cigarrillos": insertedSuppliers[2].id,
  };

  console.log("✅ Suppliers created:", insertedSuppliers.length);

  // ─── PRODUCTS ────────────────────────────────────────────────────────────
  const productsData = [
    // BEBIDAS
    { name: "Coca-Cola 500ml", barcode: "7790895000107", costPrice: "780", salePrice: "1100", stock: 48, categoryId: catMap["Bebidas"], supplierId: supMap["bebidas"] },
    { name: "Coca-Cola 1.5lt", barcode: "7790895000114", costPrice: "1350", salePrice: "1900", stock: 24, categoryId: catMap["Bebidas"], supplierId: supMap["bebidas"] },
    { name: "Coca-Cola 2.25lt", barcode: "7790895000121", costPrice: "1750", salePrice: "2500", stock: 18, categoryId: catMap["Bebidas"], supplierId: supMap["bebidas"] },
    { name: "Pepsi 500ml", barcode: "7791813421305", costPrice: "720", salePrice: "1000", stock: 36, categoryId: catMap["Bebidas"], supplierId: supMap["bebidas"] },
    { name: "Pepsi 1.5lt", barcode: "7791813421312", costPrice: "1280", salePrice: "1800", stock: 20, categoryId: catMap["Bebidas"], supplierId: supMap["bebidas"] },
    { name: "Sprite 500ml", barcode: "7790895000138", costPrice: "720", salePrice: "1000", stock: 30, categoryId: catMap["Bebidas"], supplierId: supMap["bebidas"] },
    { name: "Fanta Naranja 500ml", barcode: "7790895000145", costPrice: "720", salePrice: "1000", stock: 24, categoryId: catMap["Bebidas"], supplierId: supMap["bebidas"] },
    { name: "7UP 500ml", barcode: "7791813421329", costPrice: "720", salePrice: "1000", stock: 18, categoryId: catMap["Bebidas"], supplierId: supMap["bebidas"] },
    { name: "Agua Villavicencio 500ml", barcode: "7790590010012", costPrice: "380", salePrice: "600", stock: 60, categoryId: catMap["Bebidas"], supplierId: supMap["bebidas"] },
    { name: "Agua Villavicencio 1.5lt", barcode: "7790590010029", costPrice: "650", salePrice: "950", stock: 36, categoryId: catMap["Bebidas"], supplierId: supMap["bebidas"] },
    { name: "Gatorade Limón 500ml", barcode: "7790590011019", costPrice: "850", salePrice: "1200", stock: 24, categoryId: catMap["Bebidas"], supplierId: supMap["bebidas"] },
    { name: "Gatorade Naranja 500ml", barcode: "7790590011026", costPrice: "850", salePrice: "1200", stock: 20, categoryId: catMap["Bebidas"], supplierId: supMap["bebidas"] },
    { name: "Monster Energy 473ml", barcode: "7798109040017", costPrice: "1100", salePrice: "1600", stock: 18, categoryId: catMap["Bebidas"], supplierId: supMap["bebidas"] },
    { name: "Cerveza Quilmes Lata 354ml", barcode: "7792198000413", costPrice: "680", salePrice: "1000", stock: 48, categoryId: catMap["Bebidas"], supplierId: supMap["bebidas"] },
    { name: "Cerveza Quilmes Lata 473ml", barcode: "7792198000420", costPrice: "820", salePrice: "1200", stock: 36, categoryId: catMap["Bebidas"], supplierId: supMap["bebidas"] },
    { name: "Cerveza Heineken 473ml", barcode: "7790971000416", costPrice: "980", salePrice: "1400", stock: 24, categoryId: catMap["Bebidas"], supplierId: supMap["bebidas"] },
    // GOLOSINAS
    { name: "Alfajor Jorgito Chocolate", barcode: "7792590000111", costPrice: "550", salePrice: "850", stock: 30, categoryId: catMap["Golosinas"], supplierId: supMap["golosinas"] },
    { name: "Alfajor Milka Triple", barcode: "7794000000218", costPrice: "650", salePrice: "950", stock: 24, categoryId: catMap["Golosinas"], supplierId: supMap["golosinas"] },
    { name: "Alfajor Havanna Doble", barcode: "7790580000315", costPrice: "850", salePrice: "1300", stock: 18, categoryId: catMap["Golosinas"], supplierId: supMap["golosinas"] },
    { name: "Bon o Bon x1 Chocolate", barcode: "7790580000322", costPrice: "180", salePrice: "300", stock: 60, categoryId: catMap["Golosinas"], supplierId: supMap["golosinas"] },
    { name: "Bon o Bon Cajita x12", barcode: "7790580000339", costPrice: "1800", salePrice: "2800", stock: 12, categoryId: catMap["Golosinas"], supplierId: supMap["golosinas"] },
    { name: "Sugus Surtido x1", barcode: "7790580000346", costPrice: "120", salePrice: "200", stock: 80, categoryId: catMap["Golosinas"], supplierId: supMap["golosinas"] },
    { name: "Mentitas x1", barcode: "7790580000353", costPrice: "100", salePrice: "150", stock: 60, categoryId: catMap["Golosinas"], supplierId: supMap["golosinas"] },
    { name: "Pastillas Halls Cereza", barcode: "7622400000411", costPrice: "180", salePrice: "300", stock: 36, categoryId: catMap["Golosinas"], supplierId: supMap["golosinas"] },
    { name: "Chicle Beldent Pastilla", barcode: "7622400000428", costPrice: "90", salePrice: "150", stock: 48, categoryId: catMap["Golosinas"], supplierId: supMap["golosinas"] },
    { name: "Chupetín Pico Dulce", barcode: "7790580000360", costPrice: "80", salePrice: "150", stock: 80, categoryId: catMap["Golosinas"], supplierId: supMap["golosinas"] },
    { name: "Gomitas Trulala 50g", barcode: "7790580000377", costPrice: "280", salePrice: "450", stock: 36, categoryId: catMap["Golosinas"], supplierId: supMap["golosinas"] },
    { name: "Maná Chocolate x1", barcode: "7790580000384", costPrice: "150", salePrice: "250", stock: 60, categoryId: catMap["Golosinas"], supplierId: supMap["golosinas"] },
    { name: "Chocolatín Jack", barcode: "7790580000391", costPrice: "180", salePrice: "300", stock: 48, categoryId: catMap["Golosinas"], supplierId: supMap["golosinas"] },
    { name: "Turrón El Molino 25g", barcode: "7790580000408", costPrice: "120", salePrice: "200", stock: 48, categoryId: catMap["Golosinas"], supplierId: supMap["golosinas"] },
    { name: "Caramelos Mogul x1", barcode: "7790580000415", costPrice: "80", salePrice: "150", stock: 80, categoryId: catMap["Golosinas"], supplierId: supMap["golosinas"] },
    // SNACKS
    { name: "Papas Pringles 124g", barcode: "6281006519070", costPrice: "1200", salePrice: "1800", stock: 18, categoryId: catMap["Snacks y papas"], supplierId: supMap["golosinas"] },
    { name: "Papas Lays 90g", barcode: "7791813421336", costPrice: "750", salePrice: "1100", stock: 24, categoryId: catMap["Snacks y papas"], supplierId: supMap["golosinas"] },
    { name: "Papas Pehuamar 250g", barcode: "7791813421343", costPrice: "850", salePrice: "1300", stock: 20, categoryId: catMap["Snacks y papas"], supplierId: supMap["golosinas"] },
    { name: "Doritos 200g", barcode: "7791813421350", costPrice: "1000", salePrice: "1500", stock: 18, categoryId: catMap["Snacks y papas"], supplierId: supMap["golosinas"] },
    { name: "Palitos Salados 200g", barcode: "7791813421367", costPrice: "650", salePrice: "950", stock: 24, categoryId: catMap["Snacks y papas"], supplierId: supMap["golosinas"] },
    { name: "Galletitas Oreo 117g", barcode: "7622300000514", costPrice: "680", salePrice: "1000", stock: 24, categoryId: catMap["Snacks y papas"], supplierId: supMap["golosinas"] },
    { name: "Galletitas Toddy 200g", barcode: "7790580000422", costPrice: "780", salePrice: "1150", stock: 20, categoryId: catMap["Snacks y papas"], supplierId: supMap["golosinas"] },
    { name: "Galletitas Bagley Surtidas 200g", barcode: "7790580000439", costPrice: "750", salePrice: "1100", stock: 18, categoryId: catMap["Snacks y papas"], supplierId: supMap["golosinas"] },
    // CIGARRILLOS
    { name: "Cigarrillos Marlboro Rojo x20", barcode: "7790580001211", costPrice: "3200", salePrice: "4200", stock: 30, categoryId: catMap["Cigarrillos y tabacos"], supplierId: supMap["cigarrillos"] },
    { name: "Cigarrillos Marlboro Gold x20", barcode: "7790580001228", costPrice: "3200", salePrice: "4200", stock: 24, categoryId: catMap["Cigarrillos y tabacos"], supplierId: supMap["cigarrillos"] },
    { name: "Cigarrillos Lucky Strike x20", barcode: "7790580001235", costPrice: "3000", salePrice: "4000", stock: 20, categoryId: catMap["Cigarrillos y tabacos"], supplierId: supMap["cigarrillos"] },
    { name: "Cigarrillos Camel x20", barcode: "7790580001242", costPrice: "3000", salePrice: "4000", stock: 18, categoryId: catMap["Cigarrillos y tabacos"], supplierId: supMap["cigarrillos"] },
    // LÁCTEOS
    { name: "Leche La Serenísima 1lt", barcode: "7793090000118", costPrice: "980", salePrice: "1400", stock: 24, categoryId: catMap["Lácteos y refrigerados"], supplierId: supMap["bebidas"], expirationDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) },
    { name: "Yogur Actimel x4", barcode: "7793090000125", costPrice: "1500", salePrice: "2200", stock: 12, categoryId: catMap["Lácteos y refrigerados"], supplierId: supMap["bebidas"], expirationDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) },
    { name: "Queso Cremoso La Paulina 200g", barcode: "7793090000132", costPrice: "1200", salePrice: "1800", stock: 8, categoryId: catMap["Lácteos y refrigerados"], supplierId: supMap["bebidas"], expirationDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
    { name: "Manteca La Serenísima 200g", barcode: "7793090000149", costPrice: "950", salePrice: "1400", stock: 10, categoryId: catMap["Lácteos y refrigerados"], supplierId: supMap["bebidas"], expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    { name: "Dulce de Leche Ilolay 400g", barcode: "7793090000156", costPrice: "1100", salePrice: "1600", stock: 14, categoryId: catMap["Lácteos y refrigerados"], supplierId: supMap["bebidas"], expirationDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
    // PANADERÍA
    { name: "Pan de Molde Bimbo 320g", barcode: "7790590020011", costPrice: "850", salePrice: "1200", stock: 8, categoryId: catMap["Panadería"], supplierId: supMap["bebidas"], expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    { name: "Medialunas x1", barcode: "7790590020028", costPrice: "150", salePrice: "250", stock: 30, minStock: 10, categoryId: catMap["Panadería"], supplierId: supMap["bebidas"], expirationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
    // HIGIENE
    { name: "Lavandina Ayudín 1lt", barcode: "7790590030010", costPrice: "680", salePrice: "1000", stock: 20, categoryId: catMap["Higiene y limpieza"], supplierId: supMap["bebidas"] },
    { name: "Jabón Palmolive 90g", barcode: "7790590030027", costPrice: "350", salePrice: "550", stock: 24, categoryId: catMap["Higiene y limpieza"], supplierId: supMap["bebidas"] },
  ];

  const insertedProducts = await db.insert(products).values(
    productsData.map(p => ({
      storeId: store.id,
      name: p.name,
      barcode: p.barcode || null,
      costPrice: p.costPrice,
      salePrice: p.salePrice,
      stock: p.stock,
      minStock: p.minStock || 5,
      categoryId: p.categoryId || null,
      supplierId: p.supplierId || null,
      expirationDate: p.expirationDate || null,
    }))
  ).returning();

  console.log("✅ Products created:", insertedProducts.length);

  // ─── CUSTOMERS ───────────────────────────────────────────────────────────
  const customersData = [
    { name: "Rosa Gómez", nickname: "Doña Rosa", phone: "3814001234", neighborhood: "Alberdi", riskLevel: "GREEN" as const, creditLimit: "5000", totalDebt: "0" },
    { name: "Juan Carlos Pérez", nickname: "El Gordo", phone: "3814002345", neighborhood: "Alberdi", riskLevel: "GREEN" as const, creditLimit: "8000", totalDebt: "850" },
    { name: "María Luisa Silva", nickname: "La China", phone: "3814003456", neighborhood: "Alberdi", riskLevel: "GREEN" as const, creditLimit: "5000", totalDebt: "1200" },
    { name: "Roberto Flores", nickname: "El Turco", phone: "3814004567", neighborhood: "Alberdi", riskLevel: "GREEN" as const, creditLimit: "10000", totalDebt: "0" },
    { name: "Carmen Rodríguez", nickname: "La Gorda Carmen", phone: "3814005678", neighborhood: "Alberdi", riskLevel: "YELLOW" as const, creditLimit: "6000", totalDebt: "3500" },
    { name: "Miguel Ángel Soria", nickname: "El Flaco González", phone: "3814006789", neighborhood: "Alberdi", riskLevel: "YELLOW" as const, creditLimit: "8000", totalDebt: "5200" },
    { name: "Graciela Valdez", nickname: "La Nena", phone: "3814007890", neighborhood: "Alberdi", riskLevel: "YELLOW" as const, creditLimit: "5000", totalDebt: "4100" },
    { name: "Ramón Juárez", nickname: "El Ramón", phone: "3814008901", neighborhood: "Alberdi", riskLevel: "YELLOW" as const, creditLimit: "7000", totalDebt: "6300" },
    { name: "Norma Acosta", nickname: "Doña Norma", phone: "3814009012", neighborhood: "Alberdi", riskLevel: "RED" as const, creditLimit: "5000", totalDebt: "12500" },
    { name: "Diego Herrera", nickname: "El Dieguito", phone: "3814010123", neighborhood: "Alberdi", riskLevel: "RED" as const, creditLimit: "5000", totalDebt: "18700" },
  ];

  const insertedCustomers = await db.insert(customers).values(
    customersData.map(c => ({ ...c, storeId: store.id }))
  ).returning();

  console.log("✅ Customers created:", insertedCustomers.length);

  // ─── SALES (last 7 days) ─────────────────────────────────────────────────
  const now = new Date();
  const salesData = [];

  const paymentMethods = ["CASH", "MERCADOPAGO_QR", "TRANSFER", "CASH", "CASH", "MERCADOPAGO_QR"] as const;

  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const salesPerDay = daysAgo === 0 ? 4 : 2;
    for (let s = 0; s < salesPerDay; s++) {
      const saleDate = new Date(now);
      saleDate.setDate(saleDate.getDate() - daysAgo);
      saleDate.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0);

      const isFiado = s === 1 && daysAgo > 2;
      const customerId = isFiado ? insertedCustomers[s % 8].id : (s % 3 === 0 ? insertedCustomers[0].id : null);
      const paymentMethod = isFiado ? "FIADO" : paymentMethods[s % paymentMethods.length];

      salesData.push({
        storeId: store.id,
        customerId,
        paymentMethod: paymentMethod as "CASH" | "MERCADOPAGO_QR" | "TRANSFER" | "FIADO",
        paymentStatus: "PAID" as const,
        isFiado,
        cashierId: user.id,
        createdAt: saleDate,
      });
    }
  }

  // Insert sales one by one to get IDs and insert items
  const allProductIds = insertedProducts.map(p => p.id);
  let saleNumberCounter = 1001;

  for (const saleData of salesData) {
    // Pick 1-4 random products
    const numItems = 1 + Math.floor(Math.random() * 3);
    const selectedProducts = [];
    const usedIdx = new Set<number>();
    for (let i = 0; i < numItems; i++) {
      let idx;
      do { idx = Math.floor(Math.random() * allProductIds.length); } while (usedIdx.has(idx));
      usedIdx.add(idx);
      selectedProducts.push(insertedProducts[idx]);
    }

    const items = selectedProducts.map(p => ({
      productId: p.id,
      productName: p.name,
      quantity: "1",
      unitPrice: p.salePrice,
      costPrice: p.costPrice,
      subtotal: p.salePrice,
      discount: "0",
    }));

    const subtotal = items.reduce((sum, i) => sum + parseFloat(i.subtotal), 0);
    const total = subtotal;

    const [sale] = await db.insert(sales).values({
      storeId: saleData.storeId,
      customerId: saleData.customerId,
      subtotal: subtotal.toString(),
      discountAmount: "0",
      taxAmount: "0",
      total: total.toString(),
      paymentMethod: saleData.paymentMethod,
      paymentStatus: saleData.paymentStatus,
      isFiado: saleData.isFiado,
      cashierId: saleData.cashierId,
      createdAt: saleData.createdAt,
    }).returning();

    await db.insert(saleItems).values(items.map(i => ({ ...i, saleId: sale.id })));

    if (saleData.isFiado && saleData.customerId) {
      await db.insert(fiadoRecords).values({
        customerId: saleData.customerId,
        saleId: sale.id,
        amount: total.toString(),
        paidAmount: "0",
        remainingAmount: total.toString(),
        status: "PENDING",
      });
    }

    saleNumberCounter++;
  }

  console.log("✅ Sales created:", salesData.length);

  // ─── CASH CLOSINGS ───────────────────────────────────────────────────────
  for (let daysAgo = 3; daysAgo >= 1; daysAgo--) {
    const closingDate = new Date(now);
    closingDate.setDate(closingDate.getDate() - daysAgo);
    const openedAt = new Date(closingDate);
    openedAt.setHours(8, 0, 0, 0);
    closingDate.setHours(22, 0, 0, 0);

    const cashSales = 15000 + Math.random() * 10000;
    const mpSales = 8000 + Math.random() * 5000;
    const transferSales = 3000 + Math.random() * 3000;
    const totalSales = cashSales + mpSales + transferSales;
    const openingCash = 5000;
    const theoreticalCash = openingCash + cashSales;
    const actualCash = theoreticalCash + (Math.random() - 0.5) * 500;

    await db.insert(cashClosings).values({
      storeId: store.id,
      openedAt,
      closedAt: closingDate,
      openingCash: openingCash.toString(),
      totalCashSales: cashSales.toFixed(2),
      totalMpSales: mpSales.toFixed(2),
      totalTransferSales: transferSales.toFixed(2),
      totalCardSales: "0",
      totalFiadoSales: "2500",
      totalSales: totalSales.toFixed(2),
      theoreticalCash: theoreticalCash.toFixed(2),
      actualCash: actualCash.toFixed(2),
      difference: (actualCash - theoreticalCash).toFixed(2),
      totalTransactions: 20 + Math.floor(Math.random() * 15),
      closedById: user.id,
    });
  }

  console.log("✅ Cash closings created");

  // ─── PURCHASES ───────────────────────────────────────────────────────────
  const purchase1Products = insertedProducts.filter(p => p.categoryId === catMap["Bebidas"]).slice(0, 3);
  const [purchase1] = await db.insert(purchases).values({
    storeId: store.id,
    supplierId: insertedSuppliers[0].id,
    subtotal: "45000",
    total: "45000",
    paymentMethod: "TRANSFER",
    paymentStatus: "PAID",
    invoiceNumber: "FC-0001-00234567",
    purchasedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  }).returning();

  await db.insert(purchaseItems).values(purchase1Products.map(p => ({
    purchaseId: purchase1.id,
    productId: p.id,
    quantity: 24,
    unitCost: p.costPrice,
    subtotal: (parseFloat(p.costPrice) * 24).toString(),
  })));

  const purchase2Products = insertedProducts.filter(p => p.categoryId === catMap["Golosinas"]).slice(0, 4);
  const [purchase2] = await db.insert(purchases).values({
    storeId: store.id,
    supplierId: insertedSuppliers[1].id,
    subtotal: "38000",
    total: "38000",
    paymentMethod: "CASH",
    paymentStatus: "PAID",
    invoiceNumber: "FC-0002-00456789",
    purchasedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  }).returning();

  await db.insert(purchaseItems).values(purchase2Products.map(p => ({
    purchaseId: purchase2.id,
    productId: p.id,
    quantity: 24,
    unitCost: p.costPrice,
    subtotal: (parseFloat(p.costPrice) * 24).toString(),
  })));

  console.log("✅ Purchases created");

  // ─── NOTIFICATIONS ───────────────────────────────────────────────────────
  await db.insert(notifications).values([
    {
      storeId: store.id,
      type: "LOW_STOCK",
      title: "Stock bajo: Queso Cremoso La Paulina",
      message: "Quedan solo 8 unidades. El mínimo configurado es 5.",
      isRead: false,
    },
    {
      storeId: store.id,
      type: "EXPIRATION_ALERT",
      title: "Vencimiento próximo: Medialunas",
      message: "Las Medialunas vencen en 2 días (antes del fin de semana).",
      isRead: false,
    },
    {
      storeId: store.id,
      type: "FIADO_OVERDUE",
      title: "Fiado vencido: Doña Norma",
      message: "Norma Acosta tiene $12.500 de deuda con más de 60 días sin pagar.",
      isRead: false,
    },
    {
      storeId: store.id,
      type: "SYSTEM",
      title: "Bienvenido a BarrioDesk",
      message: "Tu kiosco está listo. Empezá tu primera venta desde el POS.",
      isRead: true,
    },
  ]);

  console.log("✅ Notifications created");
  console.log("\n🎉 Seed completed successfully!");
  console.log("📧 Login: demo@barriodesk.ar / demo1234");
}

seed().catch(console.error).finally(() => process.exit());
