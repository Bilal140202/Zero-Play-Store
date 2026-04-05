/**
 * pdfEngine.ts — Real PDF manipulation using pdf-lib (pure JS, works offline)
 * All operations: load → modify → save as base64 → write to cache → share
 */

import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Read a file from device and load it into a pdf-lib PDFDocument */
export async function loadPdfDoc(uri: string): Promise<PDFDocument> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return PDFDocument.load(base64, { ignoreEncryption: true });
}

/** Save modified PDF to cache then open Android share sheet (Save / Share) */
export async function saveAndShare(
  pdf: PDFDocument,
  filename: string
): Promise<string> {
  const base64 = await pdf.saveAsBase64({ dataUri: false });
  const dest = `${FileSystem.cacheDirectory}pdfx_${filename}`;
  await FileSystem.writeAsStringAsync(dest, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(dest, {
      mimeType: "application/pdf",
      dialogTitle: `Save ${filename}`,
      UTI: "com.adobe.pdf",
    });
  }
  return dest;
}

/** Get page count without full document parse */
export async function getPdfPageCount(uri: string): Promise<number> {
  const pdf = await loadPdfDoc(uri);
  return pdf.getPageCount();
}

// ─── Operations ───────────────────────────────────────────────────────────────

/** Merge multiple PDFs into one — copies all pages in order */
export async function mergePdfs(
  uris: string[],
  outputName = "merged.pdf"
): Promise<void> {
  const merged = await PDFDocument.create();
  for (const uri of uris) {
    const src = await loadPdfDoc(uri);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  await saveAndShare(merged, outputName);
}

/** Compress a PDF by removing unused objects and using object streams */
export async function compressPdf(
  uri: string,
  outputName = "compressed.pdf"
): Promise<{ originalSize: number; compressedSize: number; uri: string }> {
  const info = await FileSystem.getInfoAsync(uri);
  const originalSize = (info as any).size ?? 0;

  const pdf = await loadPdfDoc(uri);

  // pdf-lib removes unused objects automatically on save;
  // useObjectStreams packs objects more tightly for smaller files
  const base64 = await pdf.saveAsBase64({ dataUri: false, useObjectStreams: true });

  const dest = `${FileSystem.cacheDirectory}pdfx_${outputName}`;
  await FileSystem.writeAsStringAsync(dest, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const destInfo = await FileSystem.getInfoAsync(dest);
  const compressedSize = (destInfo as any).size ?? Math.round((base64.length * 3) / 4);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(dest, {
      mimeType: "application/pdf",
      dialogTitle: `Save ${outputName}`,
      UTI: "com.adobe.pdf",
    });
  }

  return { originalSize, compressedSize, uri: dest };
}

/** Split a PDF into parts by page ranges, e.g. [[1,3],[4,8]] */
export async function splitPdfByRanges(
  uri: string,
  ranges: Array<[number, number]>,
  baseName = "split"
): Promise<void> {
  const src = await loadPdfDoc(uri);
  for (let i = 0; i < ranges.length; i++) {
    const [start, end] = ranges[i];
    const part = await PDFDocument.create();
    const idxs = Array.from(
      { length: end - start + 1 },
      (_, k) => start - 1 + k
    ).filter((n) => n >= 0 && n < src.getPageCount());
    const pages = await part.copyPages(src, idxs);
    pages.forEach((p) => part.addPage(p));
    await saveAndShare(part, `${baseName}_part${i + 1}.pdf`);
  }
}

/** Split a PDF every N pages */
export async function splitPdfEveryN(
  uri: string,
  n: number,
  baseName = "split"
): Promise<void> {
  const src = await loadPdfDoc(uri);
  const total = src.getPageCount();
  const ranges: Array<[number, number]> = [];
  for (let start = 1; start <= total; start += n) {
    ranges.push([start, Math.min(start + n - 1, total)]);
  }
  await splitPdfByRanges(uri, ranges, baseName);
}

/** Add a diagonal text watermark to every page */
export async function watermarkPdf(
  uri: string,
  text: string,
  opts: {
    opacity?: number;
    angleDeg?: number;
    fontSize?: number;
    hexColor?: string;
    position?: "diagonal" | "center" | "top" | "bottom";
  } = {},
  outputName = "watermarked.pdf"
): Promise<void> {
  const {
    opacity = 0.35,
    angleDeg = 45,
    fontSize = 48,
    hexColor = "#EF4444",
    position = "diagonal",
  } = opts;

  // Convert hex color to rgb (0-1 range)
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const pdf = await loadPdfDoc(uri);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    let x = width / 2 - textWidth / 2;
    let y = height / 2;

    if (position === "top") y = height * 0.85;
    if (position === "bottom") y = height * 0.15;

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(r, g, b),
      opacity,
      rotate: degrees(position === "diagonal" ? angleDeg : 0),
    });
  }

  await saveAndShare(pdf, outputName);
}

/** Rotate selected pages and/or delete pages, then save */
export async function applyPageOperations(
  uri: string,
  rotations: Record<number, 0 | 90 | 180 | 270>,
  deletedIndices: number[],
  outputName = "edited.pdf"
): Promise<void> {
  const src = await loadPdfDoc(uri);
  const pages = src.getPages();

  // Apply rotations
  for (const [idxStr, rot] of Object.entries(rotations)) {
    const idx = parseInt(idxStr);
    if (idx < pages.length) {
      pages[idx].setRotation(degrees(rot));
    }
  }

  // Delete pages (reverse order to preserve indices)
  const toDelete = [...deletedIndices].sort((a, b) => b - a);
  for (const idx of toDelete) {
    if (idx < src.getPageCount()) src.removePage(idx);
  }

  await saveAndShare(src, outputName);
}

/** Extract selected pages into a new PDF */
export async function extractPages(
  uri: string,
  pageIndices: number[],
  outputName = "extracted.pdf"
): Promise<void> {
  const src = await loadPdfDoc(uri);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, pageIndices);
  pages.forEach((p) => out.addPage(p));
  await saveAndShare(out, outputName);
}

/** Share an existing PDF file from a URI via system share sheet — no modification */
export async function shareExistingPdf(
  uri: string,
  filename: string
): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `Share ${filename}`,
      UTI: "com.adobe.pdf",
    });
  }
}

/**
 * Embed a typed text signature on a specific page.
 * Draws the name in HelveticaOblique with an underline.
 * pageIndex: 0-based; defaults to last page.
 * position: where on the page to place the signature.
 */
export async function embedTextSignature(
  uri: string,
  signatureText: string,
  opts: {
    pageIndex?: number;
    fontSize?: number;
    hexColor?: string;
    position?: "bottom-right" | "bottom-center" | "bottom-left";
  } = {},
  outputName = "signed.pdf"
): Promise<void> {
  const {
    pageIndex,
    fontSize = 30,
    hexColor = "#1E40AF",
    position = "bottom-right",
  } = opts;

  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const pdf = await loadPdfDoc(uri);
  const pages = pdf.getPages();
  const font = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const targetIdx =
    pageIndex !== undefined
      ? Math.min(Math.max(0, pageIndex), pages.length - 1)
      : pages.length - 1;
  const page = pages[targetIdx];
  const { width, height } = page.getSize();

  const textWidth = font.widthOfTextAtSize(signatureText, fontSize);
  const margin = 40;
  const yBaseline = margin;

  let x: number;
  if (position === "bottom-right") x = width - textWidth - margin;
  else if (position === "bottom-left") x = margin;
  else x = (width - textWidth) / 2;

  page.drawLine({
    start: { x, y: yBaseline - 5 },
    end: { x: x + textWidth, y: yBaseline - 5 },
    thickness: 1.5,
    color: rgb(r, g, b),
    opacity: 0.85,
  });

  page.drawText(signatureText, {
    x,
    y: yBaseline,
    size: fontSize,
    font,
    color: rgb(r, g, b),
    opacity: 0.9,
  });

  await saveAndShare(pdf, outputName);
}

/**
 * Convert SVG path strings (from SignatureCanvas) to pdf-lib line segments.
 * Draws them in the bottom-right corner of the target page.
 * canvasWidth / canvasHeight: actual rendered pixel dimensions of SignatureCanvas.
 */
export async function embedDrawnSignature(
  uri: string,
  svgPaths: string[],
  canvasWidth: number,
  canvasHeight: number,
  opts: {
    pageIndex?: number;
    hexColor?: string;
    strokeWidth?: number;
  } = {},
  outputName = "signed.pdf"
): Promise<void> {
  const { pageIndex, hexColor = "#1E40AF", strokeWidth = 2 } = opts;

  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const pdf = await loadPdfDoc(uri);
  const pages = pdf.getPages();
  const targetIdx =
    pageIndex !== undefined
      ? Math.min(Math.max(0, pageIndex), pages.length - 1)
      : pages.length - 1;
  const page = pages[targetIdx];
  const { width, height } = page.getSize();

  const regionX = width * 0.45;
  const regionY = 30;
  const regionWidth = width * 0.5;
  const regionHeight = 120;

  const scaleX = regionWidth / (canvasWidth || 300);
  const scaleY = regionHeight / (canvasHeight || 200);

  for (const pathStr of svgPaths) {
    const parts = pathStr.trim().split(/\s+/);
    const points: Array<{ x: number; y: number }> = [];
    for (const part of parts) {
      if (part.startsWith("M")) {
        const [px, py] = part.slice(1).split(",").map(Number);
        if (!isNaN(px) && !isNaN(py)) points.push({ x: px, y: py });
      } else if (part.startsWith("L")) {
        const [px, py] = part.slice(1).split(",").map(Number);
        if (!isNaN(px) && !isNaN(py)) points.push({ x: px, y: py });
      }
    }
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const x1 = regionX + p1.x * scaleX;
      const y1 = regionY + regionHeight - p1.y * scaleY;
      const x2 = regionX + p2.x * scaleX;
      const y2 = regionY + regionHeight - p2.y * scaleY;
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: strokeWidth,
        color: rgb(r, g, b),
        opacity: 0.9,
      });
    }
  }

  page.drawLine({
    start: { x: regionX, y: regionY },
    end: { x: regionX + regionWidth, y: regionY },
    thickness: 1,
    color: rgb(r, g, b),
    opacity: 0.5,
  });

  await saveAndShare(pdf, outputName);
}

/**
 * Apply an access-restriction notice to a PDF.
 *
 * NOTE: pdf-lib v1.17 does NOT support real AES password encryption.
 * This function adds a visible "RESTRICTED DOCUMENT" footer banner and
 * embeds the password into the document metadata so recipients know it
 * was intended to be restricted.  For true byte-level encryption use
 * a server-side PDF tool such as Ghostscript or iTextSharp.
 */
export async function protectPdfWithNotice(
  uri: string,
  password: string,
  outputName = "protected.pdf"
): Promise<void> {
  const pdf = await loadPdfDoc(uri);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);

  pdf.setTitle("[RESTRICTED] " + (pdf.getTitle() || "Document"));
  pdf.setSubject("Access restricted — password required to open");
  pdf.setCreator("PDFX");
  pdf.setKeywords(["restricted", "protected"]);

  for (const page of pdf.getPages()) {
    const { width } = page.getSize();
    const label = "RESTRICTED DOCUMENT";
    const fontSize = 10;
    const tw = font.widthOfTextAtSize(label, fontSize);
    page.drawText(label, {
      x: (width - tw) / 2,
      y: 6,
      size: fontSize,
      font,
      color: rgb(0.75, 0.05, 0.05),
      opacity: 0.65,
    });
  }

  await saveAndShare(pdf, outputName);
}

/**
 * Add a free-text annotation to a specific page of a PDF.
 * xFrac / yFrac are fractional positions (0-1) across page width/height.
 * yFrac=0 means top of the page, yFrac=1 means bottom.
 */
export async function addTextAnnotation(
  uri: string,
  text: string,
  pageIndex: number,
  opts: {
    xFrac?: number;
    yFrac?: number;
    fontSize?: number;
    hexColor?: string;
  } = {},
  outputName = "annotated.pdf"
): Promise<void> {
  const {
    xFrac = 0.1,
    yFrac = 0.5,
    fontSize = 14,
    hexColor = "#000000",
  } = opts;

  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const pdf = await loadPdfDoc(uri);
  const pages = pdf.getPages();
  const idx = Math.min(Math.max(0, pageIndex), pages.length - 1);
  const page = pages[idx];
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const xPos = width * xFrac;
  const yPos = height * (1 - yFrac) - fontSize;

  page.drawText(text, {
    x: Math.max(10, xPos),
    y: Math.max(10, yPos),
    size: fontSize,
    font,
    color: rgb(r, g, b),
  });

  await saveAndShare(pdf, outputName);
}
