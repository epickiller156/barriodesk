import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { stores, storeSettings, products, categories } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const [store] = await db.select({
      id: stores.id,
      name: stores.name,
      slug: stores.slug,
      address: stores.address,
      neighborhood: stores.neighborhood,
      city: stores.city,
      phone: stores.phone,
      whatsappNumber: stores.whatsappNumber,
      logoUrl: stores.logoUrl,
      isStorefrontActive: stores.isStorefrontActive,
    }).from(stores).where(eq(stores.slug, slug)).limit(1);

    if (!store) return NextResponse.json({ error: "Kiosco no encontrado" }, { status: 404 });
    if (!store.isStorefrontActive) return NextResponse.json({ error: "Este kiosco no tiene catálogo activo" }, { status: 403 });

    const [settings] = await db.select({
      acceptCash: storeSettings.acceptCash,
      acceptMercadoPago: storeSettings.acceptMercadoPago,
      acceptTransfer: storeSettings.acceptTransfer,
      acceptDelivery: storeSettings.acceptDelivery,
      acceptPickup: storeSettings.acceptPickup,
      minOrderAmount: storeSettings.minOrderAmount,
      estimatedPickupMinutes: storeSettings.estimatedPickupMinutes,
      welcomeMessage: storeSettings.welcomeMessage,
    }).from(storeSettings).where(eq(storeSettings.storeId, store.id)).limit(1);

    const storeProducts = await db.select({
      id: products.id,
      name: products.name,
      salePrice: products.salePrice,
      imageUrl: products.imageUrl,
      stock: products.stock,
      categoryId: products.categoryId,
      unit: products.unit,
    }).from(products).where(and(eq(products.storeId, store.id), eq(products.isActive, true)));

    const storeCategories = await db.select().from(categories).where(eq(categories.storeId, store.id));

    return NextResponse.json({ store, settings, products: storeProducts, categories: storeCategories });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
