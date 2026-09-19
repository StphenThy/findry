import mammoth from 'mammoth';

// pdf-parse's package entry runs a debug harness when imported under some
// bundlers; importing the library file directly avoids that.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse: (buf: Buffer) => Promise<{ text: string; numpages: number }> = require('pdf-parse/lib/pdf-parse.js');

export const ACCEPTED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

export function extensionOk(name: string): boolean {
  return /\.(pdf|docx|txt)$/i.test(name);
}

/** Turn an uploaded PDF / DOCX / TXT buffer into plain text for the parser. */
export async function extractText(buffer: Buffer, mimeType: string, originalName: string): Promise<string> {
  const isPdf = mimeType === 'application/pdf' || /\.pdf$/i.test(originalName);
  const isDocx =
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    /\.docx$/i.test(originalName);

  let text = '';
  if (isPdf) {
    const out = await pdfParse(buffer);
    text = out.text;
  } else if (isDocx) {
    const out = await mammoth.extractRawText({ buffer });
    text = out.value;
  } else {
    text = buffer.toString('utf8');
  }
  // normalise whitespace but keep line breaks (section detection needs them)
  text = text.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length < 40) {
    throw new Error('Could not read any text from this file. If it is a scanned PDF, please upload a text-based PDF or DOCX.');
  }
  return text;
}
