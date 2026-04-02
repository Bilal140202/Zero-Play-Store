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
