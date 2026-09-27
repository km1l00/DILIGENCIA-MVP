// Exportación real a Word (.docx) y PDF para el boletín y los contratos. Estética institucional F&AA:
// títulos en negro, navy solo como acento del encabezado.
import fs from 'node:fs/promises'
import path from 'node:path'
import { Document, Packer, Paragraph, TextRun, AlignmentType, ExternalHyperlink, ImageRun, BorderStyle, HeadingLevel } from 'docx'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

export type Bloque =
  | { tipo: 'titulo'; texto: string }
  | { tipo: 'subtitulo'; texto: string }
  | { tipo: 'seccion'; texto: string }
  | { tipo: 'item'; titulo: string; url?: string; tema?: string; texto: string; marca?: string }
  | { tipo: 'parrafo'; texto: string; negrita?: string }
  | { tipo: 'nota'; texto: string }

export type Doc = { encabezado: string; subtitulo: string; bloques: Bloque[]; pie: string[] }

let logo: Uint8Array | null = null
async function logoPng(): Promise<Uint8Array | null> {
  if (logo) return logo
  try { logo = new Uint8Array(await fs.readFile(path.join(process.cwd(), 'public', 'logo-emblem.png'))) } catch { logo = null }
  return logo
}

// ---------- Word
export async function aDocx(d: Doc): Promise<Buffer> {
  const img = await logoPng()
  const children: Paragraph[] = []
  if (img) children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data: img, transformation: { width: 70, height: 70 } })] }))
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'FRANCO & ABOGADOS ASOCIADOS', bold: true, size: 20, font: 'Georgia', color: '1D3A45' })] }))
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [new TextRun({ text: d.encabezado, bold: true, size: 34, font: 'Georgia' })] }))
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: 'EABC1F', space: 6 } }, children: [new TextRun({ text: d.subtitulo, size: 20, font: 'Georgia', color: '555555' })] }))
  for (const b of d.bloques) {
    if (b.tipo === 'titulo') children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: b.texto, bold: true, font: 'Georgia', size: 26, color: '000000' })] }))
    else if (b.tipo === 'subtitulo') children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: b.texto, italics: true, font: 'Georgia', size: 20 })] }))
    else if (b.tipo === 'seccion') children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER, spacing: { before: 280, after: 140 }, children: [new TextRun({ text: b.texto.toUpperCase(), bold: true, font: 'Georgia', size: 24, color: '000000' })] }))
    else if (b.tipo === 'item') {
      const tit = new TextRun({ text: (b.marca ? b.marca + '. ' : '') + b.titulo, bold: true, font: 'Georgia', size: 22, ...(b.url ? { style: 'Hyperlink', color: '1F4E8C', underline: {} } : {}) })
      children.push(new Paragraph({ spacing: { before: 160, after: 60 }, children: b.url ? [new ExternalHyperlink({ link: b.url, children: [tit] })] : [tit] }))
      if (b.tema) children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'Tema: ' + b.tema, italics: true, bold: true, font: 'Georgia', size: 20 })] }))
      children.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 120 }, children: [new TextRun({ text: b.texto, font: 'Georgia', size: 21 })] }))
    } else if (b.tipo === 'parrafo') {
      children.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 140 }, children: [
        ...(b.negrita ? [new TextRun({ text: b.negrita + ' ', bold: true, font: 'Georgia', size: 21 })] : []),
        new TextRun({ text: b.texto, font: 'Georgia', size: 21 }),
      ] }))
    } else if (b.tipo === 'nota') children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: b.texto, italics: true, font: 'Georgia', size: 18, color: '555555' })] }))
  }
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360 }, border: { top: { style: BorderStyle.SINGLE, size: 6, color: '1D3A45', space: 6 } }, children: d.pie.map((l, i) => new TextRun({ text: l, break: i ? 1 : 0, font: 'Georgia', size: 16, color: '444444' })) }))
  const doc = new Document({ creator: 'Logicompliance · Franco & Abogados Asociados', title: d.encabezado, sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1247, right: 1247 } } }, children }] })
  return Packer.toBuffer(doc)
}

// ---------- PDF
// Las fuentes estándar de PDF usan WinAnsi: se normalizan los caracteres que no cubre.
const winAnsi = (s: string) => s.replace(/[‐-‒−]/g, '-').replace(/[≤]/g, '<=').replace(/[≥]/g, '>=').replace(/[   ]/g, ' ').replace(/[^\x20-\x7e¡-ÿ–—‘’“”•…€\n]/g, '')

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = []
  for (const para of winAnsi(text).split('\n')) {
    let line = ''
    for (const w of para.split(/\s+/).filter(Boolean)) {
      const test = line ? line + ' ' + w : w
      if (font.widthOfTextAtSize(test, size) > width && line) { out.push(line); line = w } else line = test
    }
    out.push(line)
  }
  return out
}

export async function aPdf(d: Doc): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(d.encabezado); pdf.setAuthor('Franco & Abogados Asociados'); pdf.setCreator('Logicompliance')
  const serif = await pdf.embedFont(StandardFonts.TimesRoman)
  const serifB = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const serifI = await pdf.embedFont(StandardFonts.TimesRomanItalic)
  const serifBI = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic)
  const img = await logoPng()
  const png = img ? await pdf.embedPng(img) : null
  const W = 595.28, H = 841.89, M = 56, CW = W - 2 * M
  const navy = rgb(0.114, 0.227, 0.271), gold = rgb(0.918, 0.737, 0.122), black = rgb(0, 0, 0), grey = rgb(0.3, 0.3, 0.3), link = rgb(0.12, 0.31, 0.55)
  let page: PDFPage = pdf.addPage([W, H])
  let y = H - M

  // Encabezado navy (acento institucional)
  page.drawRectangle({ x: 0, y: H - 150, width: W, height: 150, color: navy })
  if (png) { const s = 56 / png.height; page.drawImage(png, { x: W / 2 - (png.width * s) / 2, y: H - 72, width: png.width * s, height: 56 }) }
  const center = (t: string, f: PDFFont, size: number, yy: number, color = rgb(1, 1, 1)) => { const tt = winAnsi(t); page.drawText(tt, { x: W / 2 - f.widthOfTextAtSize(tt, size) / 2, y: yy, size, font: f, color }) }
  center('FRANCO & ABOGADOS ASOCIADOS', serifB, 10, H - 88)
  center(d.encabezado, serifB, 20, H - 114)
  page.drawLine({ start: { x: W / 2 - 150, y: H - 122 }, end: { x: W / 2 + 150, y: H - 122 }, thickness: 1.2, color: gold })
  center(d.subtitulo, serif, 10, H - 138, rgb(0.92, 0.92, 0.92))
  y = H - 175

  const ensure = (h: number) => { if (y - h < M + 40) { page = pdf.addPage([W, H]); y = H - M } }
  const lines = (t: string, f: PDFFont, size: number, color = black, indent = 0, lh = 1.35) => {
    for (const l of wrap(t, f, size, CW - indent)) { ensure(size * lh); page.drawText(l, { x: M + indent, y, size, font: f, color }); y -= size * lh }
  }
  for (const b of d.bloques) {
    if (b.tipo === 'titulo') { y -= 6; lines(b.texto, serifB, 13) ; y -= 4 }
    else if (b.tipo === 'subtitulo') { lines(b.texto, serifI, 10.5, grey); y -= 6 }
    else if (b.tipo === 'seccion') { y -= 10; ensure(30); const t = winAnsi(b.texto.toUpperCase()); page.drawText(t, { x: W / 2 - serifB.widthOfTextAtSize(t, 12.5) / 2, y, size: 12.5, font: serifB, color: black }); y -= 20 }
    else if (b.tipo === 'item') {
      y -= 4; ensure(40)
      const titulo = (b.marca ? b.marca + '. ' : '') + b.titulo
      const yStart = y
      lines(titulo, serifB, 11.5, b.url ? link : black)
      if (b.url) {
        const ls = wrap(titulo, serifB, 11.5, CW)
        // subrayado + anotación de enlace sobre el título
        let yy = yStart
        for (const l of ls) {
          const w = serifB.widthOfTextAtSize(l, 11.5)
          page.drawLine({ start: { x: M, y: yy - 1.5 }, end: { x: M + w, y: yy - 1.5 }, thickness: 0.6, color: link })
          const annot = pdf.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [M, yy - 3, M + w, yy + 11], Border: [0, 0, 0], A: { Type: 'Action', S: 'URI', URI: pdf.context.obj(b.url) as never } })
          page.node.addAnnot(pdf.context.register(annot))
          yy -= 11.5 * 1.35
        }
      }
      if (b.tema) lines('Tema: ' + b.tema, serifBI, 10.5, navy, 0)
      lines(b.texto, serif, 10.5, black, 0, 1.4)
      y -= 6
    } else if (b.tipo === 'parrafo') { if (b.negrita) lines(b.negrita, serifB, 10.5); lines(b.texto, serif, 10.5, black, 0, 1.4); y -= 6 }
    else if (b.tipo === 'nota') { y -= 8; lines(b.texto, serifI, 9.5, grey); y -= 4 }
  }
  // Pie en cada página
  const pages = pdf.getPages()
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: 44 }, end: { x: W - M, y: 44 }, thickness: 0.6, color: navy })
    const l1 = winAnsi(d.pie.join(' · '))
    const size = serif.widthOfTextAtSize(l1, 8) > CW - 40 ? 6.8 : 8
    p.drawText(l1, { x: M, y: 32, size, font: serif, color: grey })
    const n = `${i + 1} / ${pages.length}`
    p.drawText(n, { x: W - M - serif.widthOfTextAtSize(n, 8), y: 20, size: 8, font: serif, color: grey })
  })
  return pdf.save()
}

export function descarga(bytes: Uint8Array | Buffer, nombre: string, tipo: 'pdf' | 'docx') {
  const ct = tipo === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  return new Response(new Uint8Array(bytes), {
    headers: {
      'content-type': ct,
      'content-disposition': `attachment; filename="${nombre}"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
      'cache-control': 'no-store',
    },
  })
}

export const PIE_FAA = ['FRANCO & ABOGADOS ASOCIADOS S.A.S.', 'Teléfono: (+57) (1) 7035633 · contactenos@francoabogados.com.co', 'Calle 75 # 13 – 51, Oficina 408 · Bogotá, D.C., Colombia']
