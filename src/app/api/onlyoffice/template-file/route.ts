import { NextResponse } from 'next/server';
import { getOnlyOfficeTemplateBuffer } from '@/lib/onlyoffice';

export const dynamic = 'force-dynamic';

export async function GET() {
  const template = await getOnlyOfficeTemplateBuffer();

  return new NextResponse(template.buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `inline; filename="${template.fileName}"`,
      'Cache-Control': 'no-store',
    },
  });
}
