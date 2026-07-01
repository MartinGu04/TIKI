import { useState } from 'react';
import { CloudUpload, HardDrive, Trash2, X } from 'lucide-react';
import { useT } from '../contexts/LanguageContext';

interface Props {
  assetCount: number;
  onSaveToCloud: () => Promise<void>;
  onKeepLocal: () => void;
  onClearLocal: () => void;
  onDismiss: () => void;
}

export function MigrationPrompt({ assetCount, onSaveToCloud, onKeepLocal, onClearLocal, onDismiss }: Props) {
  const t = useT();
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    await onSaveToCloud();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onDismiss} />
      <div
        className="relative z-10 w-full max-w-sm rounded-3xl p-6 animate-scale-in"
        style={{ background: 'var(--modal)', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}
      >
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-xl transition-opacity hover:opacity-60"
          style={{ color: 'var(--t3)' }}
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--a10)' }}>
          <CloudUpload size={22} style={{ color: 'var(--at)' }} />
        </div>

        <h2 className="text-base font-bold mb-1" style={{ color: 'var(--t1)' }}>
          {t.migrationTitle}
        </h2>
        <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--t3)' }}>
          {t.migrationBody(assetCount)}
        </p>

        <div className="space-y-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--a)' }}
          >
            <CloudUpload size={15} />
            {loading ? t.saving : t.saveToAccount}
          </button>

          <button
            onClick={onKeepLocal}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all hover:opacity-70"
            style={{ color: 'var(--t2)', background: 'var(--card-h)', border: '1px solid var(--border)' }}
          >
            <HardDrive size={15} />
            {t.keepLocal}
          </button>

          <button
            onClick={onClearLocal}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all hover:opacity-70"
            style={{ color: 'var(--dn)', background: 'var(--dn10)', border: '1px solid transparent' }}
          >
            <Trash2 size={15} />
            {t.clearLocalData}
          </button>
        </div>
      </div>
    </div>
  );
}
