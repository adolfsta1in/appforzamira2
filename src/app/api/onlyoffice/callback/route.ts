import { NextResponse } from 'next/server';
import { ONLYOFFICE_TEMPLATE_FILE_NAME, saveOnlyOfficeTemplate } from '@/lib/onlyoffice';

export const dynamic = 'force-dynamic';

interface OnlyOfficeCallbackBody {
  status?: number;
  url?: string;
  filetype?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as OnlyOfficeCallbackBody;

  if ((body.status === 2 || body.status === 6) && body.url) {
    const response = await fetch(body.url);
    if (!response.ok) {
      return NextResponse.json({ error: 1 }, { status: 200 });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await saveOnlyOfficeTemplate(buffer, ONLYOFFICE_TEMPLATE_FILE_NAME);
  }

  return NextResponse.json({ error: 0 });
}
