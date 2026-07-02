import { NextResponse } from 'next/server';
import { getOnlyOfficeDocumentServerUrl, signOnlyOfficeToken } from '@/lib/onlyoffice';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { key } = (await request.json().catch(() => ({}))) as { key?: string };
  const documentServerUrl = getOnlyOfficeDocumentServerUrl();

  if (!documentServerUrl) {
    return NextResponse.json({ error: 'ONLYOFFICE Document Server URL не настроен.' }, { status: 500 });
  }

  if (!key) {
    return NextResponse.json({ error: 'Не найден ключ открытого документа ONLYOFFICE.' }, { status: 400 });
  }

  const command = {
    c: 'forcesave',
    key,
    userdata: 'save-template',
  };
  const token = signOnlyOfficeToken(command);

  const response = await fetch(`${documentServerUrl}/coauthoring/CommandService.ashx?shardkey=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(token ? { ...command, token } : command),
  });

  const result = await response.json().catch(() => ({ error: 'Invalid ONLYOFFICE response' }));
  return NextResponse.json(result, { status: response.ok ? 200 : 502 });
}
