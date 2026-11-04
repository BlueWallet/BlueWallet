import { base64ToUint8Array, stringToUint8Array, uint8ArrayToBase64 } from './uint8array-extras';
import type { AccountingHistoryCell } from './wallet-history-export';
import { createZip, readZip } from './zip';

const utf8Decoder = new TextDecoder('utf-8');
const decodeUtf8 = (bytes: Uint8Array): string => utf8Decoder.decode(bytes);

const encodeCsvRow = (values: AccountingHistoryCell[]): string =>
  values
    .map(value => {
      const stringValue = String(value);
      return /[",\r\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
    })
    .join(',');

const escapeXml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const unescapeXml = (value: string): string =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const columnName = (index: number): string => {
  let result = '';
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    result = String.fromCharCode(65 + ((value - 1) % 26)) + result;
  }
  return result;
};

const excelDate = (isoDate: string): number => Date.parse(isoDate) / 86_400_000 + 25_569;

const cellXml = (value: AccountingHistoryCell, rowIndex: number, columnIndex: number): string => {
  const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
  if (rowIndex === 0) {
    return `<c r="${reference}" s="1" t="inlineStr"><is><t>${escapeXml(String(value))}</t></is></c>`;
  }
  if ((columnIndex === 0 || columnIndex === 26) && typeof value === 'string' && value && !Number.isNaN(Date.parse(value))) {
    return `<c r="${reference}" s="2"><v>${excelDate(value)}</v></c>`;
  }
  if ([3, 5].includes(columnIndex) && value !== '') {
    return `<c r="${reference}" s="3"><v>${Number(value)}</v></c>`;
  }
  if ([4, 6, 9, 11, 12, 13, 14, 15, 16, 17].includes(columnIndex) && value !== '') {
    return `<c r="${reference}" s="4"><v>${Number(value)}</v></c>`;
  }
  if (typeof value === 'number') return `<c r="${reference}"><v>${value}</v></c>`;
  return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`;
};

export const createAccountingHistoryXlsx = (rows: AccountingHistoryCell[][]): string => {
  if (rows.length === 0 || rows[0].length === 0) throw new Error('Accounting workbook requires headers');
  const lastColumn = columnName(rows[0].length - 1);
  const lastRow = rows.length;
  const sheetRows = rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}"${rowIndex === 0 ? ' ht="30" customHeight="1"' : ''}>${row
          .map((value, columnIndex) => cellXml(value, rowIndex, columnIndex))
          .join('')}</row>`,
    )
    .join('');
  const widths = rows[0]
    .map((header, index) => {
      const width = Math.min(60, Math.max(String(header).length + 2, index === 1 || index === 10 ? 34 : index === 7 ? 28 : 12));
      return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
    })
    .join('');
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths}</cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:${lastColumn}${lastRow}"/></worksheet>`;
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': stringToUint8Array(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    ),
    '_rels/.rels': stringToUint8Array(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ),
    'xl/workbook.xml': stringToUint8Array(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Transactions" sheetId="1" r:id="rId1"/></sheets></workbook>',
    ),
    'xl/_rels/workbook.xml.rels': stringToUint8Array(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    ),
    'xl/styles.xml': stringToUint8Array(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="3"><numFmt numFmtId="164" formatCode="yyyy-mm-dd hh:mm:ss"/><numFmt numFmtId="165" formatCode="0.00000000;[Red](0.00000000);-"/><numFmt numFmtId="166" formatCode="#,##0;[Red](#,##0);-"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    ),
    'xl/worksheets/sheet1.xml': stringToUint8Array(worksheet),
  };
  return uint8ArrayToBase64(createZip(files));
};

const cellColumnIndex = (reference: string): number =>
  reference
    .replace(/\d/g, '')
    .split('')
    .reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;

export const accountingHistoryXlsxToCsv = (base64: string): string => {
  const files = readZip(base64ToUint8Array(base64));
  const workbookSource = files['xl/workbook.xml'] ? decodeUtf8(files['xl/workbook.xml']) : '';
  const relationshipSource = files['xl/_rels/workbook.xml.rels'] ? decodeUtf8(files['xl/_rels/workbook.xml.rels']) : '';
  const firstSheetRelationshipId = /<sheet\b[^>]*\br:id="([^"]+)"/.exec(workbookSource)?.[1];
  const relationshipTarget = [...relationshipSource.matchAll(/<Relationship\b([^>]*)\/?>(?:<\/Relationship>)?/g)]
    .map(match => match[1])
    .find(attributes => new RegExp(`\\bId="${firstSheetRelationshipId}"`).test(attributes))
    ?.match(/\bTarget="([^"]+)"/)?.[1];
  const sheetPath = relationshipTarget
    ? relationshipTarget.startsWith('/')
      ? relationshipTarget.slice(1)
      : relationshipTarget.startsWith('xl/')
        ? relationshipTarget
        : `xl/${relationshipTarget.replace(/^\.\//, '')}`
    : 'xl/worksheets/sheet1.xml';
  const sheet = files[sheetPath];
  if (!sheet) throw new Error('Excel workbook has no worksheet');
  const sharedStringsSource = files['xl/sharedStrings.xml'] ? decodeUtf8(files['xl/sharedStrings.xml']) : '';
  const sharedStrings = [...sharedStringsSource.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(match =>
    [...match[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(text => unescapeXml(text[1])).join(''),
  );
  const rows: string[][] = [];
  for (const rowMatch of decodeUtf8(sheet).matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\s+([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attributes = cellMatch[1];
      const reference = /\br="([A-Z]+\d+)"/.exec(attributes)?.[1];
      if (!reference) continue;
      const inlineText = [...cellMatch[2].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(text => unescapeXml(text[1])).join('');
      const rawValue = /<v>([\s\S]*?)<\/v>/.exec(cellMatch[2])?.[1] ?? '';
      const value = /\bt="s"/.test(attributes) ? (sharedStrings[Number(rawValue)] ?? '') : inlineText || unescapeXml(rawValue);
      row[cellColumnIndex(reference)] = value;
    }
    rows.push(Array.from({ length: Math.max(row.length, 1) }, (_, index) => row[index] ?? ''));
  }
  if (rows.length === 0) throw new Error('Excel worksheet is empty');
  return rows.map(encodeCsvRow).join('\r\n');
};
