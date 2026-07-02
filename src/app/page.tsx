'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import {
  ALL_COLUMNS,
  COLUMN_LABELS,
  CertificateFormData,
  DEFAULT_HEAD_NAME,
  DEFAULT_INSPECTION_BODY,
  DEFAULT_STANDARD,
  EMPTY_FORM_DATA,
  FORM_DRAFT_KEY,
  FORM_DRAFT_VERSION,
  formToCertificatePayload,
  formToLegacyCertificatePayload,
  formToRegistryRow,
} from '@/lib/certificateTypes';
import WordDocxPreview from './components/WordDocxPreview';
import { describeSupabaseError, getSupabaseConfigError, isMissingSchemaColumnError, supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { applyAutoReplace, initAutoReplacements } from '@/lib/autoReplace';

const FORM_FIELDS: {
  key: keyof CertificateFormData;
  label: string;
  type?: 'text' | 'date' | 'number';
  placeholder?: string;
  multiline?: boolean;
  wide?: boolean;
}[] = [
  { key: 'certificateNumber', label: 'Номер свидетельства', placeholder: '№TJ.762.37100.01.016 – 2025' },
  { key: 'issueDate', label: 'Дата выдачи / действует с', type: 'date' },
  { key: 'validTo', label: 'Действует до', type: 'date' },
  { key: 'applicationNumber', label: 'Номер заявки / заключения', placeholder: '3703' },
  { key: 'conclusionDate', label: 'Дата заключения / основания', type: 'date' },
  { key: 'organizationName', label: 'Наименование', placeholder: 'Магозаи хӯрокворӣ', multiline: true, wide: true },
  { key: 'address', label: 'Адрес', placeholder: 'шаҳри Душанбе, ноҳияи И. Сомонӣ, хиёбони Рӯдакӣ 185', multiline: true, wide: true },
  { key: 'entrepreneurName', label: 'ФИО предпринимателя / руководителя', placeholder: 'Каримов Э.' },
  { key: 'serviceType', label: 'Вид услуги', placeholder: 'хизматрасонии савдои чакана', multiline: true, wide: true },
  { key: 'patentNumber', label: 'Номер патента / документ права деятельности', placeholder: 'Шаҳодатномаи Кумитаи андоз', multiline: true, wide: true },
  { key: 'standard', label: 'Стандарт', placeholder: DEFAULT_STANDARD },
  { key: 'inspectionBody', label: 'Орган инспекционного контроля', placeholder: DEFAULT_INSPECTION_BODY },
  { key: 'inspectorName', label: 'Инспектор' },
  { key: 'amount', label: 'Сумма', type: 'number' },
  { key: 'headName', label: 'Руководитель органа', placeholder: DEFAULT_HEAD_NAME },
];

function loadDraft(): CertificateFormData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(FORM_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== FORM_DRAFT_VERSION) return null;
    const data = parsed.data;
    if (!data || typeof data !== 'object') return null;
    return {
      ...EMPTY_FORM_DATA,
      ...data,
      certificateNumber: data.certificateNumber || EMPTY_FORM_DATA.certificateNumber,
      standard: data.standard || DEFAULT_STANDARD,
      inspectionBody: data.inspectionBody || DEFAULT_INSPECTION_BODY,
      headName: data.headName || DEFAULT_HEAD_NAME,
      text_color_overrides: {},
    };
  } catch {
    return null;
  }
}

function saveDraft(data: CertificateFormData) {
  try {
    localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify({ version: FORM_DRAFT_VERSION, data }));
  } catch {}
}

export default function Home() {
  const [formData, setFormData] = useState<CertificateFormData>(EMPTY_FORM_DATA);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) setFormData(draft);
    setDraftLoaded(true);
  }, []);

  useEffect(() => {
    initAutoReplacements();
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    const timer = setTimeout(() => saveDraft(formData), 300);
    return () => clearTimeout(timer);
  }, [formData, draftLoaded]);

  const updateField = useCallback((key: keyof CertificateFormData, value: string) => {
    setFormData(prev => ({ ...prev, [key]: applyAutoReplace(value) }));
  }, []);

  const saveToRegistry = useCallback(async (): Promise<boolean> => {
    setSaved(false);
    setError(null);

    const configError = getSupabaseConfigError();
    if (configError) {
      setError(configError);
      return false;
    }

    try {
      const payload = formToCertificatePayload(formData);
      let saveError;
      let savedId: string | undefined;

      if (formData.id) {
        const { error: updateError } = await supabase.from('certificates').update(payload).eq('id', formData.id);
        saveError = updateError;
      } else {
        const { data, error: insertError } = await supabase.from('certificates').insert(payload).select('id').single();
        saveError = insertError;
        savedId = data?.id;
      }

      if (saveError && isMissingSchemaColumnError(saveError)) {
        const legacyPayload = formToLegacyCertificatePayload(formData);
        if (formData.id) {
          const { error: legacyUpdateError } = await supabase.from('certificates').update(legacyPayload).eq('id', formData.id);
          saveError = legacyUpdateError;
        } else {
          const { data, error: legacyInsertError } = await supabase.from('certificates').insert(legacyPayload).select('id').single();
          saveError = legacyInsertError;
          savedId = data?.id;
        }
      }

      if (saveError) {
        setError('Ошибка при сохранении в реестр: ' + describeSupabaseError(saveError));
        return false;
      }

      if (savedId) setFormData(prev => ({ ...prev, id: savedId }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      return true;
    } catch (err) {
      setError('Ошибка при сохранении в реестр: ' + describeSupabaseError(err));
      return false;
    }
  }, [formData]);

  const downloadDocx = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch('/api/certificate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Не удалось создать DOCX.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(formData.certificateNumber || 'shahodatnoma').replace(/[\\/:*?"<>|]/g, '_')}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Ошибка создания DOCX: ' + describeSupabaseError(err));
    }
  }, [formData]);

  const downloadExcel = useCallback(() => {
    const row = formToRegistryRow(formData);
    const headers = ALL_COLUMNS.map(column => COLUMN_LABELS[column]);
    const values = ALL_COLUMNS.map(column => row[column] || '');
    const ws = XLSX.utils.aoa_to_sheet([headers, values]);
    ws['!cols'] = ALL_COLUMNS.map(column => {
      if (['recipient_name', 'recipient_address', 'service_type'].includes(column)) return { wch: 42 };
      return { wch: 18 };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Реестр');
    XLSX.writeFile(wb, 'reestr_shahodatnoma.xlsx');
  }, [formData]);

  const copyRow = useCallback(async () => {
    const row = formToRegistryRow(formData);
    const text = ALL_COLUMNS.map(column => row[column] || '').join('\t');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }, [formData]);

  const handlePrint = useCallback(async () => {
    setPrinting(true);
    const savedBeforePrint = await saveToRegistry();
    setPrinting(false);
    if (savedBeforePrint) window.print();
  }, [saveToRegistry]);

  const clearForm = useCallback(() => {
    setFormData(EMPTY_FORM_DATA);
    setError(null);
    setSaved(false);
    setCopied(false);
    try {
      localStorage.removeItem(FORM_DRAFT_KEY);
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="mx-auto max-w-[1500px] p-4">
        <div className="no-print mb-4 flex flex-wrap items-center gap-3">
          <button
            onClick={saveToRegistry}
            className={`rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-colors ${
              saved ? 'bg-emerald-600' : 'bg-slate-900 hover:bg-slate-700'
            }`}
          >
            {saved ? 'Сохранено' : 'Сохранить'}
          </button>
          <button
            onClick={handlePrint}
            disabled={printing}
            className="rounded-md bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
          >
            {printing ? 'Сохраняю...' : 'Печать'}
          </button>
          <button onClick={downloadDocx} className="rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
            Скачать DOCX
          </button>
          <button onClick={downloadExcel} className="rounded-md bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">
            Excel
          </button>
          <button
            onClick={copyRow}
            className={`rounded-md px-5 py-2.5 text-sm font-semibold text-white ${copied ? 'bg-emerald-600' : 'bg-cyan-700 hover:bg-cyan-800'}`}
          >
            {copied ? 'Скопировано' : 'Копировать строку'}
          </button>
          <button onClick={clearForm} className="rounded-md bg-slate-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-600">
            Очистить
          </button>
        </div>

        {error && <div className="no-print mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}

        <section className="no-print mb-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-base font-bold text-slate-950">Заполнение прямо в документе</h2>
            <p className="mt-1 text-xs text-slate-500">
              Эти поля подставляются в Word-шаблон и сразу обновляют предпросмотр сертификата ниже.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {FORM_FIELDS.map(field => (
              <label key={field.key} className={`block ${field.wide ? 'xl:col-span-2' : ''}`}>
                <span className="mb-1 block text-xs font-semibold text-slate-700">{field.label}</span>
                {field.multiline ? (
                  <textarea
                    value={String(formData[field.key] || '')}
                    onChange={event => updateField(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    rows={2}
                    className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={String(formData[field.key] || '')}
                    onChange={event => updateField(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                )}
              </label>
            ))}
          </div>
        </section>

        <section className="min-w-0 overflow-auto">
          <div id="print-area-wrapper" className="mx-auto w-fit overflow-hidden border border-slate-300 bg-white shadow-xl">
            <WordDocxPreview formData={formData} />
          </div>
        </section>
      </main>
    </div>
  );
}
