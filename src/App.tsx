import { useState, useCallback, useEffect, useRef } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LanguageProvider, useT } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { EmptyState } from './components/EmptyState';
import { AssetModal } from './components/AssetModal';
import { LoginScreen } from './components/LoginScreen';
import { MigrationPrompt } from './components/MigrationPrompt';
import { HomePage } from './pages/HomePage';
import { AdvancedPage } from './pages/AdvancedPage';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Asset } from './types';
import { DEMO_ASSETS } from './data/seed';
import { calculatePortfolioStats } from './utils/calculations';
import { applyRecurringCatchUp, applyRecurringCatchUpAll } from './utils/recurringEngine';
import { supabaseStorageService, CloudUnavailableError } from './services/storageService';

import type { View } from './types/view';

type ModalMode = 'add' | 'edit' | null;

// ─── Mamish toast ─────────────────────────────────────────────────────────────

function MamishToast() {
  const { mamishToast } = useTheme();
  const t = useT();
  if (!mamishToast) return null;
  return (
    <div
      className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl animate-mamish pointer-events-none"
      style={{ background: 'var(--a)', color: '#fff', boxShadow: '0 8px 32px var(--a20)' }}
    >
      {t.mamishActivated}
    </div>
  );
}

// ─── Main app (runs once user is authenticated OR chose local mode) ───────────

function TikiApp({ userId }: { userId: string | null }) {
  const { user, signOut } = useAuth();
  const t = useT();
  const [assets, setAssetsState] = useLocalStorage<Asset[]>('tiki-assets', []);
  const [view, setView] = useLocalStorage<View>('tiki-view', 'home');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showMigration, setShowMigration] = useState(false);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState(false);

  // Display name: prefer Google full name, fallback to email prefix
  const userLabel = user
    ? (user.user_metadata?.full_name as string | undefined)?.split(' ')[0]
      ?? user.email?.split('@')[0]
      ?? user.email
    : undefined;
  const userAvatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  // Guards the local-only catch-up effect below so it only ever runs once
  // per mount (it's skipped entirely when a cloud session is active, since
  // the cloud-load effect handles catch-up for that path instead).
  const localCatchUpRanRef = useRef(false);

  // When a user logs in: ensure profile row exists, then load cloud assets.
  // Recurring deposits due since the app was last opened are caught up here
  // too, before the data is shown or (if there's nothing in the cloud yet)
  // offered for migration.
  useEffect(() => {
    if (!userId || !user) return;

    setCloudLoading(true);
    supabaseStorageService.ensureProfile(user)
      .then(() => supabaseStorageService.loadInvestments(userId))
      .then(async (cloudAssets) => {
        if (cloudAssets.length > 0) {
          const [updated, changed] = await applyRecurringCatchUpAll(cloudAssets);
          setAssetsState(updated);
          setCloudLoading(false);
          if (changed) {
            updated.forEach((a, i) => {
              if (a !== cloudAssets[i]) supabaseStorageService.updateInvestment(a, userId).catch(() => {});
            });
          }
        } else if (assets.length > 0) {
          const [updated, changed] = await applyRecurringCatchUpAll(assets);
          if (changed) setAssetsState(updated);
          setCloudLoading(false);
          setShowMigration(true);
        } else {
          setCloudLoading(false);
        }
      })
      .catch((e) => {
        setCloudLoading(false);
        if (e instanceof CloudUnavailableError) setCloudError(true);
      });
    // Only run on login (userId becoming non-null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Local-only mode (no cloud session): catch up recurring deposits once on
  // mount using whatever's in localStorage.
  useEffect(() => {
    if (userId || localCatchUpRanRef.current) return;
    localCatchUpRanRef.current = true;
    if (assets.length === 0) return;
    applyRecurringCatchUpAll(assets).then(([updated, changed]) => {
      if (changed) setAssetsState(updated);
    });
    // Runs once per mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = calculatePortfolioStats(assets);
  const hasAssets = assets.length > 0;

  // ─── CRUD handlers ──────────────────────────────────────────────────────────

  const handleSaveAsset = useCallback(async (asset: Asset) => {
    // Update local state first — cloud is best-effort
    if (modalMode === 'add') {
      // Backfill any recurring deposits already due if the purchase date is in the past.
      const processed = await applyRecurringCatchUp(asset);
      setAssetsState([...assets, processed]);
      if (userId) await supabaseStorageService.saveInvestment(processed, userId).catch((e) => {
        if (e instanceof CloudUnavailableError) setCloudError(true);
      });
    } else {
      setAssetsState(assets.map((a) => (a.id === asset.id ? asset : a)));
      if (userId) await supabaseStorageService.updateInvestment(asset, userId).catch((e) => {
        if (e instanceof CloudUnavailableError) setCloudError(true);
      });
    }
    setModalMode(null);
    setEditingAsset(null);
  }, [assets, modalMode, setAssetsState, userId]);

  const handleDeleteAsset = useCallback(async (id: string) => {
    setAssetsState(assets.filter((a) => a.id !== id));
    if (userId) await supabaseStorageService.deleteInvestment(id, userId).catch((e) => {
      if (e instanceof CloudUnavailableError) setCloudError(true);
    });
  }, [assets, setAssetsState, userId]);

  const openEditModal = useCallback((asset: Asset) => {
    setEditingAsset(asset);
    setModalMode('edit');
  }, []);

  const closeModal = useCallback(() => {
    setModalMode(null);
    setEditingAsset(null);
  }, []);

  const loadDemo = useCallback(() => setAssetsState(DEMO_ASSETS), [setAssetsState]);

  // ─── Migration handlers ──────────────────────────────────────────────────────

  const handleMigrateToCloud = async () => {
    if (!userId) return;
    try {
      const migrated = await supabaseStorageService.migrateFromLocalStorage(assets, userId);
      setAssetsState(migrated);
    } catch (e) {
      if (e instanceof CloudUnavailableError) setCloudError(true);
    }
    setShowMigration(false);
  };

  const handleKeepLocal = () => setShowMigration(false);

  const handleClearLocal = () => {
    setAssetsState([]);
    setShowMigration(false);
  };

  if (cloudLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--a)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--t1)' }}>
      <Header
        view={view}
        onViewChange={setView}
        onAddAsset={() => setModalMode('add')}
        hasAssets={hasAssets}
        userLabel={userLabel}
        userEmail={user?.email}
        userAvatarUrl={userAvatarUrl}
        onSignOut={user ? signOut : undefined}
      />

      {/* Cloud unavailable banner */}
      {cloudError && (
        <div
          className="flex items-center justify-between px-4 py-2 text-xs"
          style={{
            background: 'rgba(251,191,36,0.12)',
            borderBottom: '1px solid rgba(251,191,36,0.3)',
            color: 'var(--t2)',
          }}
        >
          <span>{t.cloudUnavailable}</span>
          <button
            onClick={() => setCloudError(false)}
            className="ms-4 font-bold opacity-50 hover:opacity-100 transition-opacity"
          >
            ×
          </button>
        </div>
      )}

      <main>
        {!hasAssets ? (
          <EmptyState onAddAsset={() => setModalMode('add')} onLoadDemo={loadDemo} userLabel={userLabel} />
        ) : view === 'home' ? (
          <HomePage assets={assets} stats={stats} onAddAsset={() => setModalMode('add')} userLabel={userLabel} />
        ) : (
          <AdvancedPage assets={assets} stats={stats} onEdit={openEditModal} onDelete={handleDeleteAsset} />
        )}
      </main>

      {hasAssets && (
        <BottomNav view={view} onViewChange={setView} onAddAsset={() => setModalMode('add')} />
      )}

      {modalMode && (
        <AssetModal mode={modalMode} asset={editingAsset} onSave={handleSaveAsset} onClose={closeModal} />
      )}

      {showMigration && (
        <MigrationPrompt
          assetCount={assets.length}
          onSaveToCloud={handleMigrateToCloud}
          onKeepLocal={handleKeepLocal}
          onClearLocal={handleClearLocal}
          onDismiss={handleKeepLocal}
        />
      )}

      <MamishToast />
    </div>
  );
}

// ─── Auth gate ────────────────────────────────────────────────────────────────

function AuthGate() {
  const { user, loading, isConfigured } = useAuth();
  const [localMode, setLocalMode] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--a)' }} />
      </div>
    );
  }

  // No Supabase configured → skip login entirely, run in LocalStorage mode
  if (!isConfigured || localMode || user) {
    return <TikiApp userId={user?.id ?? null} />;
  }

  return <LoginScreen onContinueLocal={() => setLocalMode(true)} />;
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
