import path from 'path';
import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import PizZip from 'pizzip';
import { CertificateFormData, DEFAULT_HEAD_NAME, DEFAULT_INSPECTION_BODY, DEFAULT_STANDARD, formatDateForText, parseDateParts } from '@/lib/certificateTypes';

export const dynamic = 'force-dynamic';

const TEMPLATE_PATH = path.join(process.cwd(), 'public', 'onlyoffice', 'shahodatnoma-template.docx');

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function replaceAll(xml: string, from: string, to: string) {
  return xml.split(escapeXml(from)).join(escapeXml(to));
}

function replaceFirst(xml: string, from: string, to: string) {
  return xml.replace(escapeXml(from), escapeXml(to));
}

function tajikDateText(value: string) {
  const parts = parseDateParts(value);
  return `« ${parts.day || '  '} »        ${parts.month || '        '}        ${parts.year || '    '} с.`;
}

function normalizeServiceType(value: string) {
  return value.trim();
}

export async function POST(request: Request) {
  const data = (await request.json()) as CertificateFormData;
  const template = await fs.readFile(TEMPLATE_PATH);
  const zip = new PizZip(template);
  const document = zip.file('word/document.xml');

  if (!document) {
    return NextResponse.json({ error: 'В DOCX не найден word/document.xml' }, { status: 500 });
  }

  let xml = document.asText();

  xml = replaceFirst(xml, '« 26 »        июни        2026 с.', tajikDateText(data.issueDate));
  xml = replaceFirst(xml, '« 26 »        июни       2027 с.', tajikDateText(data.validTo));
  xml = replaceAll(xml, 'TJ.762.37100.01.016', data.certificateNumber || '');
  xml = replaceAll(xml, 'Дукони фурӯши техникаи маишӣ', data.organizationName || '');
  xml = replaceAll(xml, 'шаҳри Душанбе, ноҳияи Фирдавсӣ, кӯчаи Миралӣ 1', data.address || '');
  xml = replaceAll(xml, 'Ғиёсова С.', data.entrepreneurName || '');
  xml = replaceAll(xml, 'хизматрасонии савдои чаканаро', normalizeServiceType(data.serviceType));
  xml = replaceAll(xml, 'СТ ҶТ 1037-2001', data.standard || DEFAULT_STANDARD);
  xml = replaceAll(
    xml,
    '25.06.2026с. № 3799',
    [formatDateForText(data.conclusionDate).replace(/с\.$/, 'с.'), data.applicationNumber ? `№ ${data.applicationNumber}` : '']
      .filter(Boolean)
      .join(' '),
  );
  xml = replaceAll(xml, 'Шаҳодатномаи Кумитаи андоз', data.patentNumber || '');
  xml = replaceAll(xml, 'Тоҷикстандарт', data.inspectionBody || DEFAULT_INSPECTION_BODY);
  xml = replaceAll(xml, 'Раҳмон И.Х.', data.headName || DEFAULT_HEAD_NAME);

  zip.file('word/document.xml', xml);
  const output = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });

  const fileName = `${(data.certificateNumber || 'shahodatnoma').replace(/[\\/:*?"<>|]/g, '_')}.docx`;
  return new NextResponse(new Uint8Array(output), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'no-store',
    },
  });
}
