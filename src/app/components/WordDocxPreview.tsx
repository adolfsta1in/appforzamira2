'use client';

import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import { CertificateFormData } from '@/lib/certificateTypes';

interface Props {
  formData: CertificateFormData;
}

export default function WordDocxPreview({ formData }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (!containerRef.current) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/certificate-docx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || 'Не удалось создать DOCX для предпросмотра.');
        }

        const blob = await response.blob();
        containerRef.current.innerHTML = '';
        await renderAsync(blob, containerRef.current, undefined, {
          className: 'docx-preview-root',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          useBase64URL: true,
        });
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [formData]);

  return (
    <div className="word-preview-shell">
      <div className="no-print flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
        <div>
          <h2 className="text-sm font-bold text-slate-950">Предпросмотр Word-документа</h2>
          <p className="text-xs text-slate-500">Ниже отображается настоящий DOCX после подстановки полей.</p>
        </div>
        {loading && <span className="text-xs font-semibold text-blue-700">Обновляю...</span>}
      </div>
      {error && <div className="no-print border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      <div id="word-docx-preview" ref={containerRef} className="word-docx-preview" />
    </div>
  );
}
