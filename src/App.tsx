import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LanguageProvider, useT } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { TransactionModal, TransactionSaveResult, SaveOutcome } from './components/TransactionModal';
import { ImportExportSheet } from './components/ImportExportSheet';
import { LoginScreen } from './components/LoginScreen';
import { HomePage } from './pages/HomePage';
import { PortfolioPage } from './pages/PortfolioPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useLivePrices } from './hooks/useLivePrices';
import { Holding, Portfolio, Transaction, TransactionType } from './types';
import { calculatePortfolioStats, overlayLivePrices, calculateDailyChange } from './utils/calculations';
import { sumDividends, deriveHoldings } from './utils/portfolioEngine';
import { inferPrimaryMarket } from './utils/marketStatus';
import { supabaseStorageService, CloudUnavailableError, InsufficientSharesError, AppSettings } from './services/storageService';
import { migrateLegacyInvestments } from './utils/legacyMigration';
import { exportPortfolioJSON, exportTransactionsCSV } from './services/exportService';
import { ParsedImport, CSVImportRow } from './services/importService';
import {
  shouldShowMonthlyReminder, dismissMonthlyReminder, shouldShowDividendReminder, dismissDividendReminder,
} from './utils/reminders';
import { ToastHost } from './components/ui/Toast';
import { ErrorBanner } from './components/ui/ErrorBanner';
import { ReminderBanner } from './components/ui/ReminderBanner';
import { SkeletonCard } from './components/ui/Skeleton';

import type { View } from './types/view';

type ModalState =
  | { kind: 'transaction'; mode: 'add' | 'edit'; transaction?: Transaction; preselectedHolding?: Holding; initialType?: TransactionType }
  | { kind: 'importExport' }
  | null;

// ─── Mamish toast (unchanged easter egg, separate from the generic ToastHost) ─

function MamishToast() {
  const { mamishToast } = useTheme();
  const t = useT();
  if (!mamishToast) return null;
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl animate-mamish pointer-events-none"
      style={{ bottom: 'calc(7rem + env(safe-area-inset-bottom))', background: 'var(--a)', color: '#fff', boxShadow: '0 8px 32px var(--a20)' }}
    >
      {t.mamishActivated}
    </div>
  );
}

// ─── Main app (runs once the user is authenticated) ───────────────────────────

function TikiApp({ userId }: { userId: string }) {
  const { user, signOut } = useAuth();
  const t = useT();
  const { showToast } = useToast();
  const [view, setView] = useLocalStorage<View>('tiki-view', 'home');
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    language: 'he', theme: 'dark', dividendReminder: false, monthlyReminder: false, monthlyReminderDay: 1,
  });
  const [modal, setModal] = useState<ModalState>(null);
  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudError, setCloudError] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useLocalStorage(`tiki-onboarding-seen:${userId}`, false);
  const onboardingRanRef = useRef(false);
  const [reminderDismissTick, setReminderDismissTick] = useState(0);

  const userLabel = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? user?.email;
  const userAvatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  // ─── Initial load ───────────────────────────────────────────────────────────

  useEffect(() => {
    let alive = true;
    setCloudLoading(true);
    (async () => {
      if (!user) return;
      try {
        await supabaseStorageService.ensureProfile(user);
        const loadedPortfolio = await supabaseStorageService.loadPortfolio(userId);
        await migrateLegacyInvestments(userId, loadedPortfolio.id);
        const [loadedHoldings, loadedTransactions, loadedSettings] = await Promise.all([
          supabaseStorageService.loadHoldings(loadedPortfolio.id),
          supabaseStorageService.loadTransactions(loadedPortfolio.id),
          supabaseStorageService.loadSettings(userId),
        ]);
        if (!alive) return;
        setPortfolio(loadedPortfolio);
        setHoldings(loadedHoldings);
        setTransactions(loadedTransactions);
        if (loadedSettings) setSettings(loadedSettings);
        setCloudLoading(false);

        // Onboarding: auto-open Add First Investment once, only if the user
        // has never seen it and truly has zero holdings. Dismissing it just
        // shows Home's normal empty state — it never re-forces itself open.
        if (!onboardingRanRef.current && !hasSeenOnboarding && loadedHoldings.length === 0) {
          onboardingRanRef.current = true;
          setHasSeenOnboarding(true);
          setModal({ kind: 'transaction', mode: 'add' });
        }
      } catch {
        if (!alive) return;
        setCloudLoading(false);
        // Any failure to load the user's core data should be visible, not
        // silent — e.g. a missing table/column from an unapplied schema
        // migration is not a network error, but the user still needs to see
        // that something is wrong rather than a confusingly-empty app.
        setCloudError(true);
      }
    })();
    return () => { alive = false; };
    // Runs once per login (userId is stable for the session)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Re-derive quantity/avgCost/realizedPnL from the actual transaction
  // records rather than trusting each holding's persisted cache column —
  // this is what keeps Home, Portfolio, the transaction form, and History
  // from ever disagreeing with each other (or with the data layer's own
  // independent re-check on sell) about how much of a holding is actually
  // owned, even if the cache was ever left stale by an earlier bug or a
  // partially-failed write. See utils/portfolioEngine.ts's deriveHoldings.
  const derivedHoldings = useMemo(() => deriveHoldings(holdings, transactions), [holdings, transactions]);

  // A fully-sold-out holding (quantity settles to ~0 via average-cost math,
  // so an epsilon guards against float residue) stays in `derivedHoldings` —
  // its transaction history must remain visible in History — but drops out
  // of every portfolio-facing view/calculation: Home, Portfolio, allocation,
  // and position counts. `derivedHoldings` (unfiltered) is still what's
  // passed to History and the transaction form (re-buying the same ticker
  // must match this existing, now-zero-quantity row, not create a duplicate).
  const ZERO_QUANTITY_EPSILON = 1e-6;
  const activeHoldings = derivedHoldings.filter((h) => h.quantity > ZERO_QUANTITY_EPSILON);

  // Live-price overlay: purely a render-time view over `holdings` — never
  // written back to storage. Supabase stays the source of truth for owned
  // data (symbol, quantity, avg cost, transactions); this just keeps
  // displayed value/ROI/change figures live.
  const { quotes: livePrices, staleSymbols } = useLivePrices(activeHoldings);
  const displayHoldings = overlayLivePrices(activeHoldings, livePrices);
  const totalDividends = sumDividends(transactions);
  const stats = calculatePortfolioStats(displayHoldings, totalDividends);
  const dailyChange = calculateDailyChange(displayHoldings, livePrices);
  const pricesStale = activeHoldings.some((h) => staleSymbols.has(h.symbol));
  const primaryMarket = inferPrimaryMarket(activeHoldings);

  // ─── Transaction CRUD ───────────────────────────────────────────────────────

  const handleSaveTransaction = useCallback(async (result: TransactionSaveResult): Promise<SaveOutcome> => {
    if (!portfolio) return { ok: false, reason: 'error' };
    try {
      if (result.mode === 'add') {
        const { transaction, holding } = await supabaseStorageService.saveTransaction(
          result.transaction, portfolio.id, userId, result.newHolding,
        );
        setTransactions((prev) => [...prev, transaction]);
        setHoldings((prev) => {
          const exists = prev.some((h) => h.id === holding.id);
          return exists ? prev.map((h) => (h.id === holding.id ? holding : h)) : [...prev, holding];
        });
        showToast(transaction.type === 'dividend' ? t.dividendAdded : t.transactionAdded, 'success');
      } else {
        const fullTx = result.transaction as Transaction;
        const holding = await supabaseStorageService.updateTransaction(fullTx, portfolio.id, userId);
        setTransactions((prev) => prev.map((tx) => (tx.id === fullTx.id ? fullTx : tx)));
        setHoldings((prev) => prev.map((h) => (h.id === holding.id ? holding : h)));
        showToast(t.transactionUpdated, 'success');
      }
      setModal(null);
      return { ok: true };
    } catch (e) {
      if (e instanceof InsufficientSharesError) return { ok: false, reason: 'insufficientShares' };
      if (e instanceof CloudUnavailableError) setCloudError(true);
      return { ok: false, reason: 'error' };
    }
  }, [portfolio, userId, showToast, t]);

  const handleDeleteTransaction = useCallback(async (tx: Transaction) => {
    if (!portfolio) return;
    try {
      const holding = await supabaseStorageService.deleteTransaction(tx.id, tx.holdingId, portfolio.id, userId);
      setTransactions((prev) => prev.filter((x) => x.id !== tx.id));
      setHoldings((prev) => prev.map((h) => (h.id === holding.id ? holding : h)));
      showToast(t.transactionDeleted, 'success');
    } catch (e) {
      if (e instanceof CloudUnavailableError) setCloudError(true);
    }
  }, [portfolio, userId, showToast, t]);

  const handleDeleteHolding = useCallback(async (id: string) => {
    try {
      await supabaseStorageService.deleteHolding(id, userId);
      setHoldings((prev) => prev.filter((h) => h.id !== id));
      setTransactions((prev) => prev.filter((tx) => tx.holdingId !== id));
      showToast(t.holdingDeleted, 'success');
    } catch (e) {
      if (e instanceof CloudUnavailableError) setCloudError(true);
    }
  }, [userId, showToast, t]);

  const handleUpdateNotifications = useCallback(async (patch: Partial<AppSettings>) => {
    const previous = settings;
    setSettings((prev) => ({ ...prev, ...patch }));
    try {
      await supabaseStorageService.saveSettings(userId, patch);
    } catch {
      setSettings(previous);
      showToast(t.genericSaveError, 'error');
    }
  }, [userId, settings, showToast, t]);

  // ─── Import / Export ────────────────────────────────────────────────────────

  const handleExportJSON = useCallback(() => {
    if (!portfolio) { showToast(t.genericSaveError, 'error'); return; }
    exportPortfolioJSON(portfolio, derivedHoldings, transactions);
    showToast(t.backupExported, 'success');
  }, [portfolio, derivedHoldings, transactions, showToast, t]);

  const handleExportCSV = useCallback(() => {
    exportTransactionsCSV(transactions, derivedHoldings);
    showToast(t.backupExported, 'success');
  }, [transactions, derivedHoldings, showToast, t]);

  const handleImportJSON = useCallback(async (data: ParsedImport, mode: 'merge' | 'replace') => {
    if (!portfolio) return;
    try {
      const result = await supabaseStorageService.importHoldingsAndTransactions(
        portfolio.id, userId, data.holdings, data.transactions, mode,
      );
      setHoldings((prev) => (mode === 'replace' ? result.holdings : [...prev, ...result.holdings]));
      setTransactions(result.transactions);
      showToast(t.importSuccess, 'success');
    } catch (e) {
      if (e instanceof CloudUnavailableError) setCloudError(true);
    }
  }, [portfolio, userId, showToast, t]);

  const handleImportCSV = useCallback(async (rows: CSVImportRow[]) => {
    if (!portfolio) return;
    try {
      for (const row of rows) {
        const holding = derivedHoldings.find((h) => h.ticker === row.ticker);
        if (!holding) continue;
        const { transaction, holding: updatedHolding } = await supabaseStorageService.saveTransaction(
          { holdingId: holding.id, type: row.type, date: row.date, quantity: row.quantity, price: row.price, amount: row.amount, note: row.note },
          portfolio.id, userId,
        );
        setTransactions((prev) => [...prev, transaction]);
        setHoldings((prev) => prev.map((h) => (h.id === updatedHolding.id ? updatedHolding : h)));
      }
      showToast(t.importSuccess, 'success');
    } catch (e) {
      if (e instanceof CloudUnavailableError) setCloudError(true);
    }
  }, [portfolio, derivedHoldings, userId, showToast, t]);

  // ─── Modal helpers ──────────────────────────────────────────────────────────

  const openAddTransaction = useCallback((holding?: Holding, initialType?: TransactionType) => {
    setModal({ kind: 'transaction', mode: 'add', preselectedHolding: holding, initialType });
  }, []);
  const openAddDividend = useCallback((holding?: Holding) => {
    setModal({ kind: 'transaction', mode: 'add', preselectedHolding: holding, initialType: 'dividend' });
  }, []);
  const openEditTransaction = useCallback((tx: Transaction) => {
    setModal({ kind: 'transaction', mode: 'edit', transaction: tx });
  }, []);

  // ─── Reminders (in-app banners only — see utils/reminders.ts) ──────────────
  // Both checks read dismiss state from localStorage fresh on every render;
  // `reminderDismissTick` exists purely to force a re-render right after a
  // dismiss writes to localStorage (nothing else would otherwise change).
  void reminderDismissTick;
  const monthlyReminderDue = shouldShowMonthlyReminder(settings.monthlyReminder, settings.monthlyReminderDay, transactions);
  const dividendReminderDue = shouldShowDividendReminder(settings.dividendReminder, transactions);

  const reminderBanner = monthlyReminderDue ? (
    <ReminderBanner
      message={t.monthlyReminderBannerMsg}
      actionLabel={t.logInvestmentBtn}
      onAction={() => openAddTransaction()}
      onDismiss={() => { dismissMonthlyReminder(); setReminderDismissTick((n) => n + 1); }}
    />
  ) : dividendReminderDue ? (
    <ReminderBanner
      message={t.dividendReminderBannerMsg}
      actionLabel={t.addDividendBtn}
      onAction={() => openAddDividend()}
      onDismiss={() => { dismissDividendReminder(); setReminderDismissTick((n) => n + 1); }}
    />
  ) : undefined;

  if (cloudLoading) {
    return (
      <div className="min-h-screen p-4 max-w-2xl mx-auto pt-6 space-y-4" style={{ background: 'var(--bg)' }}>
        <SkeletonCard height="8rem" />
        <SkeletonCard height="4rem" />
        <SkeletonCard height="4rem" />
        <SkeletonCard height="4rem" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--t1)' }}>
      <Header onViewChange={setView} userLabel={userLabel} userEmail={user?.email} userAvatarUrl={userAvatarUrl} />

      {cloudError && (
        <div className="px-4 py-2">
          <ErrorBanner message={t.cloudUnavailable} retryLabel={t.tryAgain} onRetry={() => setCloudError(false)} />
        </div>
      )}

      <main>
        {view === 'home' && (
          <HomePage
            holdings={displayHoldings} transactions={transactions} stats={stats}
            onAddTransaction={() => openAddTransaction()} onQuickSell={(h) => openAddTransaction(h, 'sell')} userLabel={userLabel}
            dailyChange={dailyChange} pricesStale={pricesStale} livePrices={livePrices}
            reminderBanner={reminderBanner}
          />
        )}
        {view === 'portfolio' && (
          <PortfolioPage
            holdings={displayHoldings} stats={stats}
            onAddTransaction={openAddTransaction} onDeleteHolding={handleDeleteHolding}
            onQuickSell={(h) => openAddTransaction(h, 'sell')}
            livePrices={livePrices}
          />
        )}
        {view === 'history' && (
          <HistoryPage
            transactions={transactions} holdings={derivedHoldings}
            onEditTransaction={openEditTransaction} onDeleteTransaction={handleDeleteTransaction}
            onAddTransaction={() => openAddTransaction()} onAddDividend={() => openAddDividend()}
          />
        )}
        {view === 'settings' && (
          <SettingsPage
            userLabel={userLabel} userEmail={user?.email} userAvatarUrl={userAvatarUrl}
            onSignOut={signOut} primaryMarket={primaryMarket}
            dividendReminder={settings.dividendReminder} monthlyReminder={settings.monthlyReminder}
            monthlyReminderDay={settings.monthlyReminderDay} onUpdateNotifications={handleUpdateNotifications}
            onOpenImportExport={() => setModal({ kind: 'importExport' })}
            version="1.0.0"
          />
        )}
      </main>

      <BottomNav view={view} onViewChange={setView} onAddTransaction={() => openAddTransaction()} />

      {modal?.kind === 'transaction' && (
        <TransactionModal
          mode={modal.mode} holdings={derivedHoldings} transaction={modal.transaction}
          preselectedHolding={modal.preselectedHolding} initialType={modal.initialType}
          onSave={handleSaveTransaction} onClose={() => setModal(null)}
        />
      )}

      {modal?.kind === 'importExport' && (
        <ImportExportSheet
          open onClose={() => setModal(null)} holdings={derivedHoldings}
          onExportJSON={handleExportJSON} onExportCSV={handleExportCSV}
          onImportJSON={handleImportJSON} onImportCSV={handleImportCSV}
        />
      )}

      <ToastHost />
      <MamishToast />
    </div>
  );
}

// ─── Auth gate ────────────────────────────────────────────────────────────────

function AuthGate() {
  const { user, loading, isConfigured } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--a)' }} />
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center" style={{ background: 'var(--bg)' }}>
        <p className="text-sm max-w-sm" style={{ color: 'var(--t3)' }}>
          TIKI isn't configured yet — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to continue.
        </p>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return <TikiApp userId={user.id} />;
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <AuthGate />
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
