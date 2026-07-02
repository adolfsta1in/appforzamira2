'use client';

import { useCallback, useEffect, useState } from 'react';

interface TemplateInfo {
  exists: boolean;
  fileName: string;
  version: number;
  updatedAt: string | null;
  size: number | null;
}

const PLACEHOLDERS = [
  ['{{certificateNumber}}', 'Номер свидетельства'],
  ['{{issueDay}} {{issueMonth}} {{issueYear}}', 'Дата начала по частям'],
  ['{{validToDay}} {{validToMonth}} {{validToYear}}', 'Дата окончания по частям'],
  ['{{applicationNumber}}', 'Номер заявки / заключения'],
  ['{{conclusionText}}', 'Дата основания + номер'],
  ['{{organizationName}}', 'Наименование'],
  ['{{address}}', 'Адрес'],
  ['{{entrepreneurName}}', 'ФИО предпринимателя / руководителя'],
  ['{{serviceType}}', 'Вид услуги'],
  ['{{patentNumber}}', 'Номер патента / документ'],
  ['{{standard}}', 'Стандарт'],
  ['{{inspectionBody}}', 'Орган инспекционного контроля'],
  ['{{headName}}', 'Руководитель органа'],
  ['{{inspectorName}}', 'Инспектор, только для реестра если нужен в шаблоне'],
  ['{{amount}}', 'Сумма, только для реестра если нужна в шаблоне'],
];

export default function WordTemplateManager() {
  const [info, setInfo] = useState<TemplateInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadInfo = useCallback(async () => {
    const response = await fetch('/api/word-template', { cache: 'no-store' });
    setInfo((await response.json()) as TemplateInfo);
  }, []);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  const saveTemplate = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const body = new FormData();
      if (file) body.set('file', file);
      if (text.trim()) body.set('text', text.trim());

      const response = await fetch('/api/word-template', {
        method: 'POST',
        body,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Не удалось сохранить шаблон.');
      }

      setMessage('Шаблон сохранён. Теперь DOCX будет генерироваться из него.');
      setFile(null);
      setText('');
      await loadInfo();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [file, loadInfo, text]);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-950">Главный Word-шаблон</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Загрузи `.docx` или вставь текст шаблона. Приложение сохранит его в Supabase и будет использовать всегда при кнопке
          «Скачать DOCX». Чтобы поля подставлялись автоматически, вставь placeholders прямо в Word-документ на месте подчёркнутых
          строк.
        </p>
      </div>

      <section className="mb-6 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Текущий шаблон</h2>
        <div className="mt-2 text-sm text-slate-600">
          {info ? (
            <>
              <div>Файл: <span className="font-semibold">{info.fileName}</span></div>
              <div>Версия: {info.version}</div>
              <div>Размер: {info.size ? `${Math.round(info.size / 1024)} KB` : 'fallback из проекта'}</div>
              <div>Обновлён: {info.updatedAt ? new Date(info.updatedAt).toLocaleString('ru-RU') : 'ещё не сохранялся в Supabase'}</div>
            </>
          ) : (
            'Загружаю...'
          )}
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Загрузить `.docx`</h2>
          <input
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={event => setFile(event.target.files?.[0] || null)}
            className="mt-4 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          {file && <p className="mt-2 text-xs text-slate-500">{file.name}</p>}
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Или вставить текст</h2>
          <textarea
            value={text}
            onChange={event => setText(event.target.value)}
            rows={8}
            placeholder="Вставь текст Word-шаблона с {{placeholders}}"
            className="mt-4 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </section>

      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

      <button
        onClick={saveTemplate}
        disabled={saving || (!file && !text.trim())}
        className="rounded-md bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
      >
        {saving ? 'Сохраняю...' : 'Сохранить как главный шаблон'}
      </button>

      <section className="mt-8 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Placeholders для Word</h2>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          {PLACEHOLDERS.map(([code, label]) => (
            <div key={code} className="flex items-center justify-between gap-3 rounded border border-slate-100 bg-slate-50 px-3 py-2">
              <span className="text-slate-600">{label}</span>
              <code className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-950">{code}</code>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
