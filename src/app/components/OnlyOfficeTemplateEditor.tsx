'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (placeholderId: string, config: Record<string, unknown>) => {
        destroyEditor?: () => void;
      };
    };
  }
}

interface OnlyOfficeConfigResponse {
  documentServerUrl: string;
  key: string;
  config: Record<string, unknown>;
  error?: string;
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (window.DocsAPI) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Не удалось загрузить ONLYOFFICE script: ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Не удалось загрузить ONLYOFFICE script: ${src}`));
    document.body.appendChild(script);
  });
}

export default function OnlyOfficeTemplateEditor() {
  const editorRef = useRef<{ destroyEditor?: () => void } | null>(null);
  const [documentKey, setDocumentKey] = useState('');
  const [scriptUrl, setScriptUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/onlyoffice/config', { cache: 'no-store' });
        const payload = (await response.json()) as OnlyOfficeConfigResponse;

        if (!response.ok || payload.error) {
          throw new Error(payload.error || 'Не удалось получить конфигурацию ONLYOFFICE.');
        }

        const nextScriptUrl = `${payload.documentServerUrl}/web-apps/apps/api/documents/api.js`;
        setScriptUrl(nextScriptUrl);
        await loadScript(nextScriptUrl);

        if (cancelled) return;
        if (!window.DocsAPI) throw new Error('ONLYOFFICE DocsAPI не загрузился после подключения script.');

        editorRef.current?.destroyEditor?.();
        editorRef.current = new window.DocsAPI.DocEditor('onlyoffice-template-editor', payload.config);
        setDocumentKey(payload.key);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      editorRef.current?.destroyEditor?.();
      editorRef.current = null;
    };
  }, []);

  const forceSave = useCallback(async () => {
    if (!documentKey) return;
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const response = await fetch('/api/onlyoffice/force-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: documentKey }),
      });
      const result = await response.json();

      if (!response.ok || (typeof result.error !== 'undefined' && result.error !== 0)) {
        throw new Error(`ONLYOFFICE save error: ${JSON.stringify(result)}`);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [documentKey]);

  return (
    <div className="flex h-[calc(100dvh-84px)] min-h-[680px] flex-col bg-slate-100">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <div>
          <h2 className="text-base font-bold text-slate-950">Главный Word-шаблон «Шаҳодатнома»</h2>
          <p className="mt-1 text-xs text-slate-500">
            Изменения сохраняются в Supabase и используются как постоянный исходный шаблон.
          </p>
        </div>

        <button
          onClick={forceSave}
          disabled={!documentKey || saving}
          className="rounded-md bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? 'Сохраняю...' : saved ? 'Сохранено' : 'Сохранить шаблон'}
        </button>
      </div>

      {error && (
        <div className="no-print border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">
          <div className="font-semibold">{error}</div>
          {scriptUrl && (
            <div className="mt-2 space-y-1 text-xs leading-5">
              <div>
                Проверь, что этот URL открывается в браузере:{' '}
                <a href={scriptUrl} target="_blank" rel="noreferrer" className="font-mono underline">
                  {scriptUrl}
                </a>
              </div>
              <div>Если он не открывается, в Vercel указан не Document Server URL или ONLYOFFICE недоступен публично.</div>
              <div>Если сайт на Vercel работает по HTTPS, ONLYOFFICE URL тоже должен быть HTTPS.</div>
            </div>
          )}
        </div>
      )}
      {loading && <div className="no-print border-b border-blue-100 bg-blue-50 px-5 py-3 text-sm text-blue-700">Загружаю ONLYOFFICE...</div>}

      <div id="onlyoffice-template-editor" className="min-h-0 flex-1 bg-white" />
    </div>
  );
}
