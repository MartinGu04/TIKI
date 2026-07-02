import { useRef, useState } from 'react';
import { Download, Upload, FileJson, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Sheet } from './ui/Sheet';
import { ConfirmSheet } from './ui/ConfirmSheet';
import { useT } from '../contexts/LanguageContext';
import { parseImportedJSON, parseImportedCSV, ParsedImport, CSVImportRow } from '../services/importService';
import { Holding } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  holdings: Holding[];
  onExportJSON: () => void;
  onExportCSV: () => void;
  onImportJSON: (data: ParsedImport, mode: 'merge' | 'replace') => Promise<void>;
  onImportCSV: (rows: CSVImportRow[]) => Promise<void>;
}

export function ImportExportSheet({ open, onClose, holdings, onExportJSON, onExportCSV, onImportJSON, onImportCSV }: Props) {
  const t = useT();
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [pendingJSON, setPendingJSON] = useState<ParsedImport | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [csvSummary, setCsvSummary] = useState<{ rows: CSVImportRow[]; errorCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => { setPendingJSON(null); setCsvSummary(null); setError(null); setShowReplaceConfirm(false); };
  const handleClose = () => { reset(); onClose(); };

  const handleJSONFile = async (file: File) => {
    setError(null);
    try {
      const parsed = await parseImportedJSON(file);
      setPendingJSON(parsed);
    } catch {
      setError(t.importInvalidFile);
    }
  };

  const handleCSVFile = async (file: File) => {
    setError(null);
    const { valid, errors } = await parseImportedCSV(file, holdings);
    if (valid.length === 0) { setError(t.importNoValidRows); return; }
    setCsvSummary({ rows: valid, errorCount: errors.length });
  };

  const confirmMerge = async () => {
    if (!pendingJSON) return;
    setBusy(true);
    await onImportJSON(pendingJSON, 'merge');
    setBusy(false);
    handleClose();
  };

  const confirmReplace = async () => {
    if (!pendingJSON) return;
    setBusy(true);
    await onImportJSON(pendingJSON, 'replace');
    setBusy(false);
    handleClose();
  };

  const confirmCSV = async () => {
    if (!csvSummary) return;
    setBusy(true);
    await onImportCSV(csvSummary.rows);
    setBusy(false);
    handleClose();
  };

  return (
    <>
      <Sheet open={open} onClose={handleClose} title={t.importExportTitle} maxWidth="max-w-md">
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--t3)' }}>{t.exportSectionTitle}</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={onExportJSON} className="flex flex-col items-center gap-1.5 py-4 rounded-xl transition-all hover:opacity-80"
                style={{ background: 'var(--input)', border: '1px solid var(--input-b)' }}>
                <FileJson size={18} style={{ color: 'var(--at)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--t1)' }}>{t.exportJSON}</span>
              </button>
              <button onClick={onExportCSV} className="flex flex-col items-center gap-1.5 py-4 rounded-xl transition-all hover:opacity-80"
                style={{ background: 'var(--input)', border: '1px solid var(--input-b)' }}>
                <FileSpreadsheet size={18} style={{ color: 'var(--up)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--t1)' }}>{t.exportCSV}</span>
              </button>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--t3)' }}>{t.importSectionTitle}</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => jsonInputRef.current?.click()} className="flex flex-col items-center gap-1.5 py-4 rounded-xl transition-all hover:opacity-80"
                style={{ background: 'var(--input)', border: '1px solid var(--input-b)' }}>
                <Upload size={18} style={{ color: 'var(--at)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--t1)' }}>{t.importJSON}</span>
              </button>
              <button onClick={() => csvInputRef.current?.click()} className="flex flex-col items-center gap-1.5 py-4 rounded-xl transition-all hover:opacity-80"
                style={{ background: 'var(--input)', border: '1px solid var(--input-b)' }}>
                <Upload size={18} style={{ color: 'var(--up)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--t1)' }}>{t.importCSV}</span>
              </button>
            </div>
            <input ref={jsonInputRef} type="file" accept=".json,application/json" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleJSONFile(f); e.target.value = ''; }} />
            <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCSVFile(f); e.target.value = ''; }} />
          </div>

          {error && <p className="text-xs" style={{ color: 'var(--dn)' }}>{error}</p>}

          {pendingJSON && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--a10)', border: '1px solid var(--a20)' }}>
              <p className="text-xs" style={{ color: 'var(--t2)' }}>
                {t.importFoundSummary(pendingJSON.holdings.length, pendingJSON.transactions.length)}
              </p>
              <div className="flex gap-2">
                <button onClick={confirmMerge} disabled={busy}
                  className="flex-1 py-2 text-xs font-bold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--a)' }}>
                  {busy ? <Loader2 size={13} className="animate-spin mx-auto" /> : t.importMerge}
                </button>
                <button onClick={() => setShowReplaceConfirm(true)} disabled={busy}
                  className="flex-1 py-2 text-xs font-bold rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ color: 'var(--dn)', background: 'var(--dn10)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  {t.importReplace}
                </button>
              </div>
            </div>
          )}

          {csvSummary && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--a10)', border: '1px solid var(--a20)' }}>
              <p className="text-xs" style={{ color: 'var(--t2)' }}>
                {t.importCsvSummary(csvSummary.rows.length, csvSummary.errorCount)}
              </p>
              <button onClick={confirmCSV} disabled={busy}
                className="w-full py-2 text-xs font-bold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--a)' }}>
                {busy ? <Loader2 size={13} className="animate-spin mx-auto" /> : t.importConfirmBtn}
              </button>
            </div>
          )}

          <p className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--t4)' }}>
            <Download size={11} />
            {t.importExportHint}
          </p>
        </div>
      </Sheet>

      <ConfirmSheet
        open={showReplaceConfirm}
        title={t.importReplaceConfirmTitle}
        body={t.importReplaceConfirmBody}
        confirmLabel={t.importReplace}
        cancelLabel={t.cancel}
        onCancel={() => setShowReplaceConfirm(false)}
        onConfirm={() => { setShowReplaceConfirm(false); confirmReplace(); }}
      />
    </>
  );
}
