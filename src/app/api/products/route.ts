import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq, and, ilike, lte, or, desc, asc } from "drizzle-orm";
import { z } from "zod";
import { sendPushToStore, pushTemplates } from "@/lib/push";

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  costPrice: z.string(),
  salePrice: z.string(),
  wholesalePrice: z.string().optional(),
  stock: z.number().int().default(0),
  minStock: z.number().int().default(5),
  unit: z.string().default("unidad"),
  allowFraction: z.boolean().default(false),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  expirationDate: z.string().optional(),
  batchNumber: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const categoryId = searchParams.get("categoryId");
    const stockFilter = searchParams.get("stock"); // "low" | "out" | "all"
    const sort = searchParams.get("sort") || "name";
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    const conditions = [eq(products.storeId, session.storeId), eq(products.isActive, true)];

    if (search) {
      conditions.push(ilike(products.name, `%${search}%`));
    }
    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }
    if (stockFilter === "low") {
      conditions.push(lte(products.stock, products.minStock));
    } else if (stockFilter === "out") {
      conditions.push(lte(products.stock, 0));
    }

    const orderBy = sort === "price_asc" ? asc(products.salePrice) :
                    sort === "price_desc" ? desc(products.salePrice) :
                    sort === "stock" ? asc(products.stock) :
                    asc(products.name);

    const result = await db.select({
      id: products.id,
      name: products.name,
      description: products.description,
      barcode: products.barcode,
      sku: products.sku,
      imageUrl: products.imageUrl,
      costPrice: products.costPrice,
      salePrice: products.salePrice,
      wholesalePrice: products.wholesalePrice,
      stock: products.stock,
      minStock: products.minStock,
      unit: products.unit,
      allowFraction: products.allowFraction,
      isActive: products.isActive,
      expirationDate: products.expirationDate,
      batchNumber: products.batchNumber,
      storeId: products.storeId,
      categoryId: products.categoryId,
      supplierId: products.supplierId,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    }).from(products)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ products: result, total: result.length });
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await req.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const [product] = await db.insert(products).values({
      ...data,
      storeId: session.storeId,
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
      costPrice: data.costPrice.toString(),
      salePrice: data.salePrice.toString(),
      wholesalePrice: data.wholesalePrice?.toString(),
    }).returning();

    // Enviar notificación push si el producto tiene stock bajo o vencimiento próximo
    try {
      const daysUntilExpiration = data.expirationDate
        ? Math.ceil((new Date(data.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      if (data.stock <= data.minStock) {
        await sendPushToStore(session.storeId, pushTemplates.lowStock(
          data.name,
          data.stock
        ));
      } else if (daysUntilExpiration !== null && daysUntilExpiration <= 15) {
        await sendPushToStore(session.storeId, pushTemplates.expiringProduct(
          data.name,
          daysUntilExpiration
        ));
      }
    } catch (pushError) {
      console.error("Error enviando push:", pushError);
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Products POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
