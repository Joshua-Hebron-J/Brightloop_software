import { getDb } from '../../database/db';
import { HttpError } from '../../middlewares/errorHandler';
import { generateId } from '../../utils/dateUtils';
import { Product, ProductVariant } from '../../../shared/types';

export class ProductsService {
  static listProducts(query: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    category?: string;
  }) {
    const db = getDb();
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.search) {
      conditions.push('(name LIKE ? OR code LIKE ? OR description LIKE ?)');
      const term = `%${query.search}%`;
      params.push(term, term, term);
    }

    if (query.status) {
      conditions.push('status = ?');
      params.push(query.status);
    }

    if (query.category) {
      conditions.push('category = ?');
      params.push(query.category);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db.prepare(`SELECT COUNT(*) as count FROM products ${whereClause}`).get(...params) as any;
    const total = countRow ? countRow.count : 0;

    const offset = (query.page - 1) * query.limit;
    const products = db
      .prepare(`SELECT * FROM products ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, query.limit, offset) as any[];

    // Fetch variants for these products
    const productIds = products.map((p) => p.id);
    let variantsByProduct: Record<string, ProductVariant[]> = {};

    if (productIds.length > 0) {
      const placeholders = productIds.map(() => '?').join(',');
      const variantRows = db
        .prepare(`SELECT * FROM product_variants WHERE product_id IN (${placeholders}) ORDER BY created_at ASC`)
        .all(...productIds) as any[];

      for (const row of variantRows) {
        if (!variantsByProduct[row.product_id]) {
          variantsByProduct[row.product_id] = [];
        }
        variantsByProduct[row.product_id].push(this.mapVariant(row));
      }
    }

    const mappedProducts: Product[] = products.map((p) => ({
      ...this.mapProduct(p),
      variants: variantsByProduct[p.id] || [],
    }));

    return { items: mappedProducts, total };
  }

  static getProductById(id: string): Product {
    const db = getDb();
    const productRow = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
    if (!productRow) {
      throw new HttpError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }

    const variantRows = db.prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY created_at ASC').all(id) as any[];

    return {
      ...this.mapProduct(productRow),
      variants: variantRows.map((v) => this.mapVariant(v)),
    };
  }

  static createProduct(data: {
    currency?:string; productType?:string; salesPrice?:number; costPrice?:number;
    name: string;
    code: string;
    description?: string;
    category?: string;
    status?: 'ACTIVE' | 'ARCHIVED';
    variants?: any[];
  }): Product {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM products WHERE code = ?').get(data.code);
    if (existing) {
      throw new HttpError(409, `Product code '${data.code}' is already in use`, 'PRODUCT_CODE_EXISTS');
    }

    const id = generateId('prod');
    const now = new Date().toISOString();
    const status = data.status || 'ACTIVE';

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        INSERT INTO products (id, name, code, description, category, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.name, data.code, data.description || null, data.category || null, status, now, now);

      db.prepare('UPDATE products SET product_type=?,sales_price=?,cost_price=? WHERE id=?').run(data.productType||'Software',data.salesPrice||0,data.costPrice||0,id);
      db.prepare('UPDATE products SET currency=? WHERE id=?').run(data.currency||'INR',id);
      const createdVariants: ProductVariant[] = [];

      if (data.variants && data.variants.length > 0) {
        for (const v of data.variants) {
          const varId = generateId('var');
          db.prepare(`
            INSERT INTO product_variants (id, product_id, name, sku, description, attributes, unit_price, cost_price, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            varId,
            id,
            v.name,
            v.sku,
            v.description || null,
            v.attributes ? JSON.stringify(v.attributes) : null,
            v.unitPrice,
            v.costPrice !== undefined ? v.costPrice : null,
            v.status || 'ACTIVE',
            now,
            now
          );

          db.prepare('UPDATE product_variants SET price_extra=? WHERE id=?').run(v.priceExtra||0,varId);
          createdVariants.push({
            id: varId,
            productId: id,
            name: v.name,
            sku: v.sku,
            description: v.description || null,
            attributes: v.attributes || null,
            unitPrice: v.unitPrice,
            costPrice: v.costPrice ?? null,
            status: v.status || 'ACTIVE',
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      db.exec('COMMIT;');

      return {
        id,
        name: data.name,
        code: data.code,
        description: data.description || null,
        category: data.category || null,
        status,
        ...({currency:data.currency||'INR'} as any),
        variants: createdVariants,
        createdAt: now,
        updatedAt: now,
      };
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  static updateProduct(id: string, data: Partial<{
    currency?:string; productType?:string; salesPrice?:number; costPrice?:number;
    name: string;
    code: string;
    description?: string;
    category?: string;
    status: 'ACTIVE' | 'ARCHIVED';
  }>): Product {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
    if (!existing) {
      throw new HttpError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }

    if (data.code && data.code !== existing.code) {
      const codeTaken = db.prepare('SELECT id FROM products WHERE code = ? AND id != ?').get(data.code, id);
      if (codeTaken) {
        throw new HttpError(409, `Product code '${data.code}' is already in use`, 'PRODUCT_CODE_EXISTS');
      }
    }

    const now = new Date().toISOString();
    const updated = {
      name: data.name ?? existing.name,
      code: data.code ?? existing.code,
      description: data.description !== undefined ? data.description : existing.description,
      category: data.category !== undefined ? data.category : existing.category,
      status: data.status ?? existing.status,
    };

    db.prepare(`
      UPDATE products
      SET name = ?, code = ?, description = ?, category = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(updated.name, updated.code, updated.description, updated.category, updated.status, now, id);

    db.prepare('UPDATE products SET product_type=?,sales_price=?,cost_price=? WHERE id=?').run(data.productType??existing.product_type,data.salesPrice??existing.sales_price,data.costPrice??existing.cost_price,id);
    return this.getProductById(id);
  }

  static deleteProduct(id: string): void {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
    if (!existing) {
      throw new HttpError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    }
    // Delete product and cascade to variants
    db.prepare("UPDATE products SET status='ARCHIVED',updated_at=? WHERE id=?").run(new Date().toISOString(),id);
  }

  // Variant operations
  static createVariant(productId: string, data: {
    name: string;
    sku: string;
    description?: string;
    attributes?: Record<string, any>;
    priceExtra?:number;
    unitPrice: number;
    costPrice?: number;
    status?: 'ACTIVE' | 'ARCHIVED';
  }): ProductVariant {
    const db = getDb();
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
    if (!product) {
      throw new HttpError(404, 'Parent product not found', 'PRODUCT_NOT_FOUND');
    }

    const skuTaken = db.prepare('SELECT id FROM product_variants WHERE sku = ?').get(data.sku);
    if (skuTaken) {
      throw new HttpError(409, `SKU '${data.sku}' is already in use`, 'SKU_ALREADY_EXISTS');
    }

    const id = generateId('var');
    const now = new Date().toISOString();
    const status = data.status || 'ACTIVE';

    db.prepare(`
      INSERT INTO product_variants (id, product_id, name, sku, description, attributes, unit_price, cost_price, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      productId,
      data.name,
      data.sku,
      data.description || null,
      data.attributes ? JSON.stringify(data.attributes) : null,
      data.unitPrice,
      data.costPrice !== undefined ? data.costPrice : null,
      status,
      now,
      now
    );

    db.prepare('UPDATE product_variants SET price_extra=? WHERE id=?').run(data.priceExtra??0,id);
    return {
      id,
      productId,
      name: data.name,
      sku: data.sku,
      description: data.description || null,
      attributes: data.attributes || null,
      unitPrice: data.unitPrice,
      costPrice: data.costPrice ?? null,
      status,
      createdAt: now,
      updatedAt: now,
    };
  }

  static updateVariant(variantId: string, data: Partial<{
    name: string;
    sku: string;
    description?: string;
    attributes?: Record<string, any>;
    priceExtra?:number;
    unitPrice: number;
    costPrice?: number;
    status: 'ACTIVE' | 'ARCHIVED';
  }>): ProductVariant {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(variantId) as any;
    if (!existing) {
      throw new HttpError(404, 'Variant not found', 'VARIANT_NOT_FOUND');
    }

    if (data.sku && data.sku !== existing.sku) {
      const skuTaken = db.prepare('SELECT id FROM product_variants WHERE sku = ? AND id != ?').get(data.sku, variantId);
      if (skuTaken) {
        throw new HttpError(409, `SKU '${data.sku}' is already in use`, 'SKU_ALREADY_EXISTS');
      }
    }

    const now = new Date().toISOString();
    const updated = {
      name: data.name ?? existing.name,
      sku: data.sku ?? existing.sku,
      description: data.description !== undefined ? data.description : existing.description,
      attributes: data.attributes !== undefined ? JSON.stringify(data.attributes) : existing.attributes,
      unitPrice: data.unitPrice ?? existing.unit_price,
      costPrice: data.costPrice !== undefined ? data.costPrice : existing.cost_price,
      status: data.status ?? existing.status,
    };

    db.prepare(`
      UPDATE product_variants
      SET name = ?, sku = ?, description = ?, attributes = ?, unit_price = ?, cost_price = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(
      updated.name,
      updated.sku,
      updated.description,
      updated.attributes,
      updated.unitPrice,
      updated.costPrice,
      updated.status,
      now,
      variantId
    );

    const fresh = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(variantId) as any;
    db.prepare('UPDATE product_variants SET price_extra=? WHERE id=?').run(data.priceExtra??0,variantId);
    return this.mapVariant(fresh);
  }

  static deleteVariant(variantId: string): void {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM product_variants WHERE id = ?').get(variantId);
    if (!existing) {
      throw new HttpError(404, 'Variant not found', 'VARIANT_NOT_FOUND');
    }
    db.prepare('DELETE FROM product_variants WHERE id = ?').run(variantId);
  }

  private static mapProduct(row: any): Product {
    return {
      ...({currency:row.currency,productType:row.product_type,salesPrice:row.sales_price,costPrice:row.cost_price,} as any),
      id: row.id,
      name: row.name,
      code: row.code,
      description: row.description,
      category: row.category,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapVariant(row: any): ProductVariant {
    let parsedAttrs = null;
    if (row.attributes) {
      try {
        parsedAttrs = JSON.parse(row.attributes);
      } catch {
        parsedAttrs = null;
      }
    }

    return {
      ...({priceExtra:row.price_extra,} as any),
      id: row.id,
      productId: row.product_id,
      name: row.name,
      sku: row.sku,
      description: row.description,
      attributes: parsedAttrs,
      unitPrice: row.unit_price,
      costPrice: row.cost_price,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
