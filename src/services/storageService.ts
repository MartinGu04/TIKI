import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Asset, FrequencyConfig } from '../types';

// Thrown when Supabase is unreachable (network down / DNS failure).
// Callers catch this to show a friendly offline notice without console noise.
export class CloudUnavailableError extends Error {
  constructor() { super('cloud-unavailable'); this.name = 'CloudUnavailableError'; }
}

function isNetworkError(err: unknown): boolean {
  const msg = (err as { message?: string })?.message ?? String(err ?? '');
  return (
    msg === 'Failed to fetch' ||
    msg.includes('NetworkError') ||
    msg.includes('network error') ||
    msg.includes('ERR_INTERNET') ||
    msg.includes('ERR_NAME_NOT_RESOLVED')
  );
}

// Throws CloudUnavailableError for network failures; logs everything else.
function handleError(err: unknown, context: string): never {
  if (isNetworkError(err)) throw new CloudUnavailableError();
  console.error(context, err);
  throw err;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppSettings {
  language: 'he' | 'en';
  theme: 'dark' | 'light' | 'mamish';
}

// ─── Mappers (Asset ↔ Supabase row) ──────────────────────────────────────────

function assetToRow(asset: Asset, userId: string) {
  return {
    id: asset.id,
    user_id: userId,
    ticker: asset.ticker,
    symbol: asset.symbol,
    name: asset.name,
    owner: asset.owner,
    currency: asset.currency,
    quantity: asset.quantity,
    average_price: asset.avgBuyPrice,
    current_price: asset.currentPrice,
    monthly_contribution: asset.monthlyContribution,
    recurrence_type: asset.frequency.type,
    recurrence_day: asset.frequency.dayOfMonth ?? null,
    recurrence_weekday: asset.frequency.weekday ?? null,
    recurrence_every_x: asset.frequency.everyXMonths ?? null,
    recurrence_start_date: asset.frequency.startDate ?? null,
    recurrence_last_processed: asset.frequency.lastProcessedDate ?? null,
    color: asset.color,
    last_price_update: asset.lastPriceUpdate
      ? new Date(asset.lastPriceUpdate).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAsset(row: any): Asset {
  const frequency: FrequencyConfig = {
    type: row.recurrence_type,
    dayOfMonth: row.recurrence_day ?? undefined,
    weekday: row.recurrence_weekday ?? undefined,
    everyXMonths: row.recurrence_every_x ?? undefined,
    startDate: row.recurrence_start_date ?? undefined,
    lastProcessedDate: row.recurrence_last_processed ?? undefined,
  };
  return {
    id: row.id,
    ticker: row.ticker,
    symbol: row.symbol,
    name: row.name,
    owner: row.owner,
    currency: row.currency,
    avgBuyPrice: row.average_price,
    quantity: row.quantity,
    currentPrice: row.current_price,
    monthlyContribution: row.monthly_contribution ?? 0,
    frequency,
    color: row.color,
    lastPriceUpdate: row.last_price_update
      ? new Date(row.last_price_update).getTime()
      : undefined,
  };
}

// ─── LocalStorage implementation ──────────────────────────────────────────────

const LOCAL_ASSETS_KEY = 'tiki-assets';
const LOCAL_SETTINGS_KEY = 'tiki-settings';

export const localStorageService = {
  loadInvestments(): Asset[] {
    try {
      const raw = localStorage.getItem(LOCAL_ASSETS_KEY);
      return raw ? (JSON.parse(raw) as Asset[]) : [];
    } catch {
      return [];
    }
  },

  saveInvestment(asset: Asset): void {
    const assets = localStorageService.loadInvestments();
    localStorage.setItem(LOCAL_ASSETS_KEY, JSON.stringify([...assets, asset]));
  },

  updateInvestment(asset: Asset): void {
    const assets = localStorageService.loadInvestments();
    localStorage.setItem(
      LOCAL_ASSETS_KEY,
      JSON.stringify(assets.map((a) => (a.id === asset.id ? asset : a))),
    );
  },

  deleteInvestment(id: string): void {
    const assets = localStorageService.loadInvestments();
    localStorage.setItem(LOCAL_ASSETS_KEY, JSON.stringify(assets.filter((a) => a.id !== id)));
  },

  setInvestments(assets: Asset[]): void {
    localStorage.setItem(LOCAL_ASSETS_KEY, JSON.stringify(assets));
  },

  loadSettings(): AppSettings | null {
    try {
      const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
      return raw ? (JSON.parse(raw) as AppSettings) : null;
    } catch {
      return null;
    }
  },

  saveSettings(settings: Partial<AppSettings>): void {
    const current = localStorageService.loadSettings() ?? {};
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
  },
};

// ─── Supabase implementation ──────────────────────────────────────────────────

export const supabaseStorageService = {
  // Idempotent upsert — guarantees the profile row exists before any
  // investment writes, defensive against DB trigger failures.
  async ensureProfile(user: User): Promise<void> {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email ?? null,
        name: (user.user_metadata?.full_name as string | undefined) ?? null,
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      }, { onConflict: 'id' });
      if (error && !isNetworkError(error)) console.error('ensureProfile:', error);
    } catch (e) {
      // Non-fatal: if this fails the rest of the login flow continues.
      if (!isNetworkError(e)) console.error('ensureProfile:', e);
    }
  },

  async loadInvestments(userId: string): Promise<Asset[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) handleError(error, 'loadInvestments');
      return (data ?? []).map(rowToAsset);
    } catch (e) {
      if (e instanceof CloudUnavailableError) throw e;
      handleError(e, 'loadInvestments');
    }
  },

  async saveInvestment(asset: Asset, userId: string): Promise<void> {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('investments').insert(assetToRow(asset, userId));
      if (error) handleError(error, 'saveInvestment');
    } catch (e) {
      if (e instanceof CloudUnavailableError) throw e;
      handleError(e, 'saveInvestment');
    }
  },

  async updateInvestment(asset: Asset, userId: string): Promise<void> {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('investments')
        .update(assetToRow(asset, userId))
        .eq('id', asset.id)
        .eq('user_id', userId);
      if (error) handleError(error, 'updateInvestment');
    } catch (e) {
      if (e instanceof CloudUnavailableError) throw e;
      handleError(e, 'updateInvestment');
    }
  },

  async deleteInvestment(id: string, userId: string): Promise<void> {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) handleError(error, 'deleteInvestment');
    } catch (e) {
      if (e instanceof CloudUnavailableError) throw e;
      handleError(e, 'deleteInvestment');
    }
  },

  // Returns the migrated assets with Supabase-generated UUIDs so the caller
  // can replace localStorage with the canonical IDs.
  async migrateFromLocalStorage(assets: Asset[], userId: string): Promise<Asset[]> {
    if (!supabase || assets.length === 0) return assets;

    // Omit `id` so Supabase generates a fresh UUID for each row.
    const rows = assets.map((a) => {
      const { id: _omit, ...rest } = assetToRow(a, userId);
      void _omit;
      return rest;
    });

    try {
      const { error } = await supabase.from('investments').insert(rows);
      if (error) handleError(error, 'migrateFromLocalStorage');
    } catch (e) {
      if (e instanceof CloudUnavailableError) throw e;
      handleError(e, 'migrateFromLocalStorage');
    }

    // Reload from Supabase to get the canonical UUIDs for all migrated rows.
    return supabaseStorageService.loadInvestments(userId);
  },

  async loadSettings(userId: string): Promise<AppSettings | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('app_settings')
      .select('language, theme')
      .eq('user_id', userId)
      .single();
    if (error || !data) return null;
    return data as AppSettings;
  },

  async saveSettings(userId: string, settings: Partial<AppSettings>): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('app_settings').upsert({
      user_id: userId,
      ...settings,
      updated_at: new Date().toISOString(),
    });
    if (error) console.error('saveSettings:', error);
  },
};
