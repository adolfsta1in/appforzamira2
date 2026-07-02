import crypto from 'crypto';
import path from 'path';
import { promises as fs } from 'fs';
import { supabase } from './supabase';

export const ONLYOFFICE_TEMPLATE_NAME = '__onlyoffice_shahodatnoma_template__';
export const ONLYOFFICE_TEMPLATE_FILE_NAME = 'shahodatnoma-template.docx';
export const ONLYOFFICE_TEMPLATE_KEY_PREFIX = 'shahodatnoma-template';

export interface StoredOnlyOfficeTemplate {
  base64: string;
  fileName: string;
  version: number;
  updatedAt: string;
  size: number;
}

export function getOnlyOfficeDocumentServerUrl() {
  return (
    process.env.ONLYOFFICE_DOCUMENT_SERVER_URL ||
    process.env.NEXT_PUBLIC_ONLYOFFICE_DOCUMENT_SERVER_URL ||
    ''
  ).replace(/\/$/, '');
}

export function getAppBaseUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.VERCEL_URL;
  if (configured) {
    return configured.startsWith('http') ? configured.replace(/\/$/, '') : `https://${configured.replace(/\/$/, '')}`;
  }

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export function signOnlyOfficeToken(payload: Record<string, unknown>) {
  const secret = process.env.ONLYOFFICE_JWT_SECRET;
  if (!secret) return undefined;

  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function base64Url(value: string) {
  return Buffer.from(value).toString('base64url');
}

export async function getStoredOnlyOfficeTemplate(): Promise<StoredOnlyOfficeTemplate | null> {
  const { data, error } = await supabase
    .from('templates')
    .select('data')
    .eq('name', ONLYOFFICE_TEMPLATE_NAME)
    .limit(1)
    .maybeSingle();

  if (error || !data?.data) return null;
  const template = data.data as Partial<StoredOnlyOfficeTemplate>;
  if (!template.base64 || !template.version) return null;
  return template as StoredOnlyOfficeTemplate;
}

export async function getOnlyOfficeTemplateBuffer() {
  const stored = await getStoredOnlyOfficeTemplate();
  if (stored?.base64) {
    return {
      buffer: Buffer.from(stored.base64, 'base64'),
      fileName: stored.fileName || ONLYOFFICE_TEMPLATE_FILE_NAME,
      version: stored.version,
    };
  }

  const fallbackPath = path.join(process.cwd(), 'public', 'onlyoffice', ONLYOFFICE_TEMPLATE_FILE_NAME);
  const buffer = await fs.readFile(fallbackPath);
  return {
    buffer,
    fileName: ONLYOFFICE_TEMPLATE_FILE_NAME,
    version: 1,
  };
}

export async function saveOnlyOfficeTemplate(buffer: Buffer, fileName = ONLYOFFICE_TEMPLATE_FILE_NAME) {
  const existing = await getStoredOnlyOfficeTemplate();
  const next: StoredOnlyOfficeTemplate = {
    base64: buffer.toString('base64'),
    fileName,
    version: (existing?.version || 1) + 1,
    updatedAt: new Date().toISOString(),
    size: buffer.byteLength,
  };

  const { data: row } = await supabase
    .from('templates')
    .select('id')
    .eq('name', ONLYOFFICE_TEMPLATE_NAME)
    .limit(1)
    .maybeSingle();

  if (row?.id) {
    const { error } = await supabase.from('templates').update({ data: next }).eq('id', row.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('templates').insert({ name: ONLYOFFICE_TEMPLATE_NAME, data: next });
    if (error) throw error;
  }

  return next;
}
