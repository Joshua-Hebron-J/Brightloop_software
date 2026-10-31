import { savePlanPolicy, planPolicy } from '../official/policy';
import { getDb } from '../../database/db';
import { HttpError } from '../../middlewares/errorHandler';
import { generateId } from '../../utils/dateUtils';
import { BillingFrequency, PlanStatus, SubscriptionPlan } from '../../../shared/types';

export class PlansService {
  static listPlans(query: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    frequency?: BillingFrequency;
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

    if (query.frequency) {
      conditions.push('billing_frequency = ?');
      params.push(query.frequency);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db.prepare(`SELECT COUNT(*) as count FROM subscription_plans ${whereClause}`).get(...params) as any;
    const total = countRow ? countRow.count : 0;

    const offset = (query.page - 1) * query.limit;
    const rows = db
      .prepare(`SELECT * FROM subscription_plans ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, query.limit, offset) as any[];

    return {
      items: rows.map(r => this.mapPlan(r)),
      total,
    };
  }

  static getPlanById(id: string): SubscriptionPlan {
    const db = getDb();
    const row = db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(id) as any;
    if (!row) {
      throw new HttpError(404, 'Subscription plan not found', 'PLAN_NOT_FOUND');
    }
    return this.mapPlan(row);
  }

  static createPlan(data: {
    name: string;
    code: string;
    description?: string;
    billingFrequency: BillingFrequency;
    price: number;
    currency?: string;
    trialPeriodDays?: number;
    setupFee?: number;
    features?: string[];
    status?: PlanStatus;
  }): SubscriptionPlan {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM subscription_plans WHERE code = ?').get(data.code);
    if (existing) {
      throw new HttpError(409, `Plan code '${data.code}' is already in use`, 'PLAN_CODE_EXISTS');
    }

    const id = generateId('plan');
    const now = new Date().toISOString();
    const status = data.status || 'ACTIVE';
    const currency = data.currency || 'INR';
    const trialDays = data.trialPeriodDays ?? 0;
    const setupFee = data.setupFee ?? 0.0;
    const featuresJson = data.features ? JSON.stringify(data.features) : null;

    db.prepare(`
      INSERT INTO subscription_plans (
        id, name, code, description, billing_frequency, price, currency,
        trial_period_days, setup_fee, features, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.code,
      data.description || null,
      data.billingFrequency,
      data.price,
      currency,
      trialDays,
      setupFee,
      featuresJson,
      status,
      now,
      now
    );

    savePlanPolicy(id, data);
    return {
      ...planPolicy(id),
      id,
      name: data.name,
      code: data.code,
      description: data.description || null,
      billingFrequency: data.billingFrequency,
      price: data.price,
      currency,
      trialPeriodDays: trialDays,
      setupFee,
      features: data.features || null,
      status,
      createdAt: now,
      updatedAt: now,
    };
  }

  static updatePlan(id: string, data: Partial<{
    name: string;
    code: string;
    description?: string;
    billingFrequency: BillingFrequency;
    price: number;
    currency: string;
    trialPeriodDays: number;
    setupFee: number;
    features: string[];
    status: PlanStatus;
  }>): SubscriptionPlan {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(id) as any;
    if (!existing) {
      throw new HttpError(404, 'Subscription plan not found', 'PLAN_NOT_FOUND');
    }

    if (data.code && data.code !== existing.code) {
      const codeTaken = db.prepare('SELECT id FROM subscription_plans WHERE code = ? AND id != ?').get(data.code, id);
      if (codeTaken) {
        throw new HttpError(409, `Plan code '${data.code}' is already in use`, 'PLAN_CODE_EXISTS');
      }
    }

    const now = new Date().toISOString();
    const updated = {
      name: data.name ?? existing.name,
      code: data.code ?? existing.code,
      description: data.description !== undefined ? data.description : existing.description,
      billingFrequency: data.billingFrequency ?? existing.billing_frequency,
      price: data.price !== undefined ? data.price : existing.price,
      currency: data.currency ?? existing.currency,
      trialPeriodDays: data.trialPeriodDays !== undefined ? data.trialPeriodDays : existing.trial_period_days,
      setupFee: data.setupFee !== undefined ? data.setupFee : existing.setup_fee,
      features: data.features !== undefined ? JSON.stringify(data.features) : existing.features,
      status: data.status ?? existing.status,
    };

    db.prepare(`
      UPDATE subscription_plans
      SET name = ?, code = ?, description = ?, billing_frequency = ?, price = ?, currency = ?,
          trial_period_days = ?, setup_fee = ?, features = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(
      updated.name,
      updated.code,
      updated.description,
      updated.billingFrequency,
      updated.price,
      updated.currency,
      updated.trialPeriodDays,
      updated.setupFee,
      updated.features,
      updated.status,
      now,
      id
    );

    savePlanPolicy(id, data);
    const fresh = db.prepare('SELECT * FROM subscription_plans WHERE id = ?').get(id) as any;
    return this.mapPlan(fresh);
  }

  static deletePlan(id: string): void {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM subscription_plans WHERE id = ?').get(id);
    if (!existing) {
      throw new HttpError(404, 'Subscription plan not found', 'PLAN_NOT_FOUND');
    }

    // Check if active subscriptions reference this plan
    const activeSub = db.prepare("SELECT id FROM subscriptions WHERE plan_id = ? AND status IN ('ACTIVE', 'TRIALING')").get(id);
    if (activeSub) {
      throw new HttpError(400, 'Cannot delete plan with active or trialing subscriptions. Archive it instead.', 'PLAN_IN_USE');
    }

    db.prepare("UPDATE subscription_plans SET status='ARCHIVED',updated_at=? WHERE id=?").run(new Date().toISOString(),id);
  }

  static getBillingFrequencies() {
    return [
      {key:'DAILY',name:'Daily',intervalDays:1,cyclesPerYear:365},
      { key: 'WEEKLY', name: 'Weekly', intervalDays: 7, cyclesPerYear: 52 },
      { key: 'MONTHLY', name: 'Monthly', intervalMonths: 1, cyclesPerYear: 12 },
      { key: 'QUARTERLY', name: 'Quarterly', intervalMonths: 3, cyclesPerYear: 4 },
      { key: 'SEMI_ANNUALLY', name: 'Semi-Annually', intervalMonths: 6, cyclesPerYear: 2 },
      { key: 'ANNUALLY', name: 'Annually', intervalYears: 1, cyclesPerYear: 1 },
    ];
  }

  private static mapPlan(row: any): SubscriptionPlan {
    let parsedFeatures: string[] | null = null;
    if (row.features) {
      try {
        parsedFeatures = JSON.parse(row.features);
      } catch {
        parsedFeatures = null;
      }
    }

    return {
      ...planPolicy(row.id),
      id: row.id,
      name: row.name,
      code: row.code,
      description: row.description,
      billingFrequency: row.billing_frequency,
      price: row.price,
      currency: row.currency,
      trialPeriodDays: row.trial_period_days,
      setupFee: row.setup_fee,
      features: parsedFeatures,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
