import { NextResponse } from 'next/server';
import {
  ONLYOFFICE_TEMPLATE_KEY_PREFIX,
  getAppBaseUrl,
  getOnlyOfficeDocumentServerUrl,
  getOnlyOfficeTemplateBuffer,
  signOnlyOfficeToken,
} from '@/lib/onlyoffice';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const documentServerUrl = getOnlyOfficeDocumentServerUrl();
  if (!documentServerUrl) {
    return NextResponse.json(
      {
        error: 'ONLYOFFICE_DOCUMENT_SERVER_URL или NEXT_PUBLIC_ONLYOFFICE_DOCUMENT_SERVER_URL не настроен.',
      },
      { status: 500 },
    );
  }

  const baseUrl = getAppBaseUrl(request);
  const template = await getOnlyOfficeTemplateBuffer();
  const key = `${ONLYOFFICE_TEMPLATE_KEY_PREFIX}-${template.version}`;
  const documentUrl = `${baseUrl}/api/onlyoffice/template-file?v=${template.version}`;
  const callbackUrl = `${baseUrl}/api/onlyoffice/callback`;

  const config = {
    document: {
      fileType: 'docx',
      key,
      title: 'ШАҲОДАТНОМАИ НАВ.docx',
      url: documentUrl,
      permissions: {
        edit: true,
        download: true,
        print: true,
        review: false,
      },
    },
    documentType: 'word',
    editorConfig: {
      callbackUrl,
      lang: 'ru',
      mode: 'edit',
      user: {
        id: 'operator',
        name: 'Оператор',
      },
      customization: {
        autosave: true,
        forcesave: true,
        compactToolbar: false,
      },
    },
    height: '100%',
    width: '100%',
  };

  const token = signOnlyOfficeToken(config);

  return NextResponse.json({
    documentServerUrl,
    key,
    config: token ? { ...config, token } : config,
  });
}
