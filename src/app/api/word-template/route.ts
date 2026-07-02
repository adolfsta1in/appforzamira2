import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { ONLYOFFICE_TEMPLATE_FILE_NAME, getStoredOnlyOfficeTemplate, saveOnlyOfficeTemplate } from '@/lib/onlyoffice';

export const dynamic = 'force-dynamic';

function textToParagraphs(text: string) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  return lines.map(line => new Paragraph({ children: [new TextRun(line || ' ')] }));
}

export async function GET() {
  const template = await getStoredOnlyOfficeTemplate();
  return NextResponse.json({
    exists: Boolean(template),
    fileName: template?.fileName || ONLYOFFICE_TEMPLATE_FILE_NAME,
    version: template?.version || 1,
    updatedAt: template?.updatedAt || null,
    size: template?.size || null,
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');
  const text = String(formData.get('text') || '').trim();

  if (file instanceof File && file.size > 0) {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      return NextResponse.json({ error: 'Загрузите файл .docx' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await saveOnlyOfficeTemplate(buffer, file.name);
    return NextResponse.json({ ok: true, template: saved });
  }

  if (text) {
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: { top: 425, right: 1106, bottom: 902, left: 1077 },
            },
          },
          children: textToParagraphs(text),
        },
      ],
    });
    const buffer = await Packer.toBuffer(doc);
    const saved = await saveOnlyOfficeTemplate(buffer, ONLYOFFICE_TEMPLATE_FILE_NAME);
    return NextResponse.json({ ok: true, template: saved });
  }

  return NextResponse.json({ error: 'Загрузите .docx или вставьте текст шаблона.' }, { status: 400 });
}
