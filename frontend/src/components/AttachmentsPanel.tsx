import React, { useEffect, useRef, useState } from 'react';
import { Download, FileText, Image as ImageIcon, Paperclip, Upload } from 'lucide-react';
import { apiError, attachmentApi } from '../services/api';
import { Attachment } from '../types';

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

// Photos and documents on a work order (stored by the backend's storage service).
export const AttachmentsPanel: React.FC<{ workOrderId: number; canUpload?: boolean }> = ({ workOrderId, canUpload = true }) => {
  const [files, setFiles] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    attachmentApi.list(workOrderId).then(setFiles).catch(() => setFiles([]));
  }, [workOrderId]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('The file is too large. The limit is 10 MB.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const saved = await attachmentApi.upload(workOrderId, file);
      setFiles((list) => [saved, ...list]);
    } catch (err) {
      setError(apiError(err, 'Upload failed.'));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <h4 className="ks-section-title" style={{ margin: 0 }}><Paperclip size={16} /> Photos & documents</h4>
        {canUpload && (
          <>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden onChange={(e) => upload(e.target.files?.[0])} />
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => input.current?.click()} disabled={busy}>
              <Upload size={14} /> {busy ? 'Uploading…' : 'Upload'}
            </button>
          </>
        )}
      </div>
      {error && <div className="ks-alert ks-alert-error">{error}</div>}
      {files.length === 0 ? (
        <div className="ks-hint">No files yet. JPEG, PNG, WebP or PDF up to 10 MB.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map((f) => (
            <div key={f.id} className="ks-inset" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
              {f.contentType.startsWith('image/') ? <ImageIcon size={16} className="ks-accent" /> : <FileText size={16} className="ks-accent" />}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.fileName}</span>
                <span className="ks-dim" style={{ fontSize: '0.74rem' }}>{formatSize(f.sizeBytes)} · {f.uploadedByName} · {new Date(f.uploadedAt).toLocaleString()}</span>
              </span>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => attachmentApi.download(workOrderId, f)} aria-label={`Download ${f.fileName}`}>
                <Download size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
