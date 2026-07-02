'use client';

import React from 'react';
import {
  CertificateFormData,
  DEFAULT_HEAD_NAME,
  DEFAULT_INSPECTION_BODY,
  DEFAULT_STANDARD,
  formatDateForText,
  parseDateParts,
} from '@/lib/certificateTypes';

interface Props {
  formData: CertificateFormData;
  previewBackground: boolean;
}

function Field({
  children,
  width,
  className = '',
  align = 'center',
  minWidth,
}: {
  children?: React.ReactNode;
  width?: string;
  minWidth?: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
}) {
  return (
    <span
      className={`word-field ${className}`}
      style={{
        width,
        minWidth,
        textAlign: align,
      }}
    >
      {children || '\u00a0'}
    </span>
  );
}

function Fit({ value, className = '' }: { value: string; className?: string }) {
  const fit = value.length > 95 ? 'fit-xs' : value.length > 62 ? 'fit-sm' : '';
  return <span className={`${fit} ${className}`}>{value}</span>;
}

export default function CertificateEditor({ formData, previewBackground }: Props) {
  const issue = parseDateParts(formData.issueDate);
  const validTo = parseDateParts(formData.validTo);
  const standard = formData.standard || DEFAULT_STANDARD;
  const inspectionBody = formData.inspectionBody || DEFAULT_INSPECTION_BODY;
  const headName = formData.headName || DEFAULT_HEAD_NAME;

  return (
    <div id="print-area" className="shahodatnoma-page word-shahodatnoma-page">
      {previewBackground && <div className="certificate-preview-bg" aria-hidden="true" />}

      <div className="word-certificate-overlay" aria-label="Печатный слой свидетельства">
        <p className="word-p valid-line">
          <span className="valid-title">Эътибор дорад</span>
          <span>аз</span>
          <Field width="17mm">« {issue.day || ''} »</Field>
          <Field width="26mm">{issue.month}</Field>
          <Field width="19mm">{issue.year}</Field>
          <span>с.</span>
        </p>

        <p className="word-p number-valid-line">
          <Field width="70mm" align="left" className="bold">
            №{formData.certificateNumber}
          </Field>
          <span className="to-label">то</span>
          <Field width="17mm">« {validTo.day || ''} »</Field>
          <Field width="26mm">{validTo.month}</Field>
          <Field width="19mm">{validTo.year}</Field>
          <span>с.</span>
        </p>

        <p className="word-p word-title-line">
          <strong>Шаҳодатномаи мазкур тасдиқ менамояд, ки хизматрасонии</strong>{' '}
          <Field width="70mm" className="strong-field">
            <Fit value={formData.organizationName} />
          </Field>
          <Field width="158mm" className="strong-field block-field">
            <Fit value={formData.address} />
          </Field>
        </p>

        <p className="word-caption center">(номгӯи муассисаи иҷрокунандаи хизматрасонӣ)</p>

        <p className="word-p center">
          <Field width="158mm" className="strong-field">
            <Fit value={formData.entrepreneurName} />
          </Field>
        </p>
        <p className="word-caption center">(ному насаби роҳбари ташкилот)</p>

        <p className="word-p justify law-block">
          дар асоси Қонунҳои Ҷумҳурии Тоҷикистон «Дар бораи баҳодиҳии мутобиқат», «Дар бораи ҳимояи ҳуқуқи истеъмолкунандагон»,
          «Дар бораи бамеъёрдарории техникӣ», «Дар бораи стандартонӣ», «Дар бораи таъмини ченаки ягона», «Дар бораи савдо ва
          хизматрасонии маишӣ», «Дар бораи бехатарии маҳсулоти хӯрокворӣ» аз ҷониби Тоҷикстандарт баҳогузорӣ карда шуда,
          субъекти хоҷагидори мазкур имконияти иҷрои{' '}
          <Field width="118mm" align="left">
            <Fit value={formData.serviceType} />
          </Field>
          <Field width="158mm" className="block-field" />
        </p>

        <p className="word-caption center">(номгӯи кору хизматрасонӣ)</p>

        <p className="word-p justify">
          мутобиқи талаботи{' '}
          <Field width="105mm" align="left" className="standard-field">
            {standard}
          </Field>
          дорад.
        </p>
        <p className="word-caption center">(ифодаи номгӯи ҳуҷҷатҳои меъёрии техникӣ)</p>

        <p className="word-p justify basis-block">
          Шаҳодатнома дода шуд дар асоси хулосаи (тасдиқнома) баҳогузорӣ оид ба тасдиқи мутобиқати хизматрасонии субъекти
          хоҷагидор ба талаботи ҳуҷҷати меъёрии техникӣ аз{' '}
          <Field width="78mm" align="left">
            {formatDateForText(formData.conclusionDate)}
            {formData.applicationNumber ? ` № ${formData.applicationNumber}` : ''}
          </Field>
          Ҳангоми шаҳодатномадиҳӣ ҳуҷҷати муайянкунандаи ҳуқуқи фаъолияти субъекти хоҷагидор{' '}
          <Field width="72mm" align="left">
            <Fit value={formData.patentNumber} />
          </Field>
          ба инобат гирифта шуд.
        </p>

        <p className="word-p justify responsibility-block">
          Дархосткунанда, (иҷрокунандаи кор ва хизматрасонӣ) барои мутобиқати кору хизматрасонӣ ба талаботи муқаррарнамудаи
          ҳуҷҷати меъёрии техникие, ки дар шаҳодатнома дарҷ гардидааст ва огоҳ намудани истеъмолкунанда дар бобати доштани
          шаҳодатнома масъул мебошад.
        </p>

        <p className="word-p inspection-line">
          Назорати инспексионӣ аз ҷониби
          <Field width="48mm">{inspectionBody}</Field>
          амалӣ карда мешавад.
        </p>
        <p className="word-caption center">(номгӯи мақомот оид ба шаҳодатномадиҳӣ)</p>

        <p className="word-p special-line">
          Қайдҳои махсус
          <Field width="112mm" />
        </p>

        <p className="word-p justify cancel-line">
          <strong>Дар ҳолати иҷро накардани талаботи муқарраргардида шаҳодатномаи мазкур аз эътибор соқит дониста мешавад.</strong>
        </p>

        <p className="word-p head-title">Роҳбари мақомот</p>

        <div className="signature-row">
          <div className="stamp">Ҷ.М.</div>
          <div className="signature-line">
            <Field width="36mm" />
            <div className="word-caption">(имзо)</div>
          </div>
          <div className="name-line">
            <Field width="58mm" className="strong-field">
              {headName}
            </Field>
            <div className="word-caption">(ному насаб)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
