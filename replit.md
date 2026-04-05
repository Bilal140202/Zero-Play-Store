# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Primary artifact is PDFX — a fully offline PDF editor mobile app built with Expo React Native.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Mobile framework**: Expo SDK 54 (React Native)
- **Routing**: Expo Router (file-based)
- **API framework**: Express 5 (api-server artifact)
- **Validation**: Zod (`zod/v4`)
- **API codegen**: Orval (from OpenAPI spec)

## PDFX App — Main Artifact

**PDFX** is a fully-offline, no-subscription PDF editor mobile app with "Obsidian Pro" dark design.

### Color Palette (Obsidian Pro)
- Background: #0A0A0F
- Surface: #13131A
- Surface2: #1C1C28
- Accent: #6366F1 (indigo)
- Accent2: #8B5CF6 (purple)
- Success: #10B981
- Warning: #F59E0B
- TextPrimary: #F1F5F9
- TextSecondary: #94A3B8
- Border: #2D2D3A

### Screens (12 total)
- `app/index.tsx` — Home: recent files, quick tools grid (3-col), stats, tips
- `app/viewer.tsx` — PDF editor with tools: Select, Text, Draw, Highlight, Shape, Sign, Image, Comment, Form, Eraser
- `app/merge.tsx` — Merge multiple PDFs
- `app/compress.tsx` — Compress with quality level selector + animated progress
- `app/sign.tsx` — Draw/type/save signatures
- `app/pages.tsx` — Page manager: grid view, rotate, delete, reorder, extract
- `app/protect.tsx` — AES-256 password protection
- `app/watermark.tsx` — Text & image watermarks
- `app/split.tsx` — Split by page range or fixed count
- `app/bookmarks.tsx` — Saved page bookmarks
- `app/forms.tsx` — Form field detection and filling
- `app/settings.tsx` — App settings

### Components
- `components/ToolBar.tsx` — Scrollable bottom toolbar with 10 tools
- `components/ContextToolbar.tsx` — Context-sensitive options bar
- `components/PDFPage.tsx` — Simulated PDF page with realistic content
- `components/RecentFileCard.tsx` — File card with name, size, page count
- `components/ToolCard.tsx` — Quick-action grid cards
- `components/SignatureCanvas.tsx` — PanResponder + SVG drawing canvas
- `components/ErrorBoundary.tsx` / `components/ErrorFallback.tsx`

### Key Dependencies
- **pdf-lib ^1.17.1**: Pure-JS PDF manipulation (merge, split, compress, watermark, rotate, delete pages, extract) — works offline, no native code
- **expo-sharing ~14.0.8**: Android share sheet for saving output PDFs
- **expo-file-system ~19.0.21**: Read/write PDF bytes (base64) for pdf-lib
- **expo-document-picker ~14.0.8**: Real file picker across all tool screens
- **react-native-webview 13.15.0**: PDF.js rendering in viewer
- react-native-svg: SVG drawing for signatures
- react-native-reanimated: Animations
- @react-native-async-storage/async-storage: Local file list persistence
- expo-haptics: Touch feedback
- @expo/vector-icons: All icons (Ionicons)

### Real PDF Operations (pdf-lib)
- `lib/pdfEngine.ts` — Central engine for all PDF operations:
  - `loadPdfDoc(uri)` — reads base64 from FileSystem, loads with pdf-lib
  - `saveAndShare(pdf, filename)` — saves to cache, opens Android share sheet
  - `mergePdfs(uris[], outputName)` — real multi-PDF merge
  - `compressPdf(uri, outputName)` — useObjectStreams compression, returns real before/after sizes
  - `splitPdfByRanges(uri, ranges[], baseName)` — split by page ranges
  - `splitPdfEveryN(uri, n, baseName)` — split every N pages
  - `watermarkPdf(uri, text, opts, outputName)` — diagonal/center/top/bottom text watermark
  - `applyPageOperations(uri, rotations, deletedIndices, outputName)` — rotate + delete pages
  - `extractPages(uri, indices[], outputName)` — extract subset of pages
  - `getPdfPageCount(uri)` — read page count from PDF

### Feature Tracker
- `app/todo.tsx` — In-app feature tracker screen showing all planned/in-progress/done features
- Accessible from home screen via "Feature Tracker" banner
- Filter by status: All / Done / In Progress / Planned
- Progress bar with percentage complete

### Play Store Configuration
- Android package: com.pdfx.editor
- iOS bundle: com.pdfx.editor
- Version: 1.0.0, versionCode: 1
- EAS Build config: `artifacts/mobile/eas.json`
- Guide: `artifacts/mobile/PLAY_STORE_GUIDE.md`

## pdfEngine.ts — Full Function List (artifacts/mobile/lib/pdfEngine.ts)

All functions are real pdf-lib operations, 100% offline:
- `loadPdfDoc(uri)` — load PDF from device URI
- `saveAndShare(pdf, filename)` — write to cache + open share sheet
- `shareExistingPdf(uri, filename)` — share an existing file without modifying it
- `mergePdfs(uris, outputName)` — merge multiple PDFs into one
- `compressPdf(uri, outputName)` — strip unused objects, return size stats
- `splitPdfByRanges(uri, ranges, baseName)` — split into parts by page ranges
- `splitPdfEveryN(uri, n, baseName)` — split every N pages
- `watermarkPdf(uri, text, opts, outputName)` — diagonal/center/top/bottom watermark
- `applyPageOperations(uri, rotations, deletedIndices, outputName)` — rotate/delete pages
- `extractPages(uri, pageIndices, outputName)` — extract subset of pages
- `embedTextSignature(uri, text, opts, outputName)` — embed typed signature with underline on last page
- `embedDrawnSignature(uri, svgPaths, cW, cH, opts, outputName)` — embed drawn paths as line segments
- `protectPdfWithNotice(uri, password, outputName)` — adds RESTRICTED banner + metadata (pdf-lib does not support AES)
- `addTextAnnotation(uri, text, pageIndex, opts, outputName)` — embed free text on a page

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── mobile/              # PDFX Expo mobile app
│   │   ├── app/             # 12 screens (Expo Router)
│   │   ├── components/      # Reusable components
│   │   ├── constants/colors.ts  # Obsidian Pro theme
│   │   ├── assets/images/   # icon, splash, feature-graphic, adaptive-icon
│   │   ├── eas.json         # EAS Build config
│   │   └── PLAY_STORE_GUIDE.md
│   └── api-server/          # Express API server
├── lib/                     # Shared libraries
│   ├── api-spec/            # OpenAPI spec + Orval codegen
│   ├── api-client-react/    # Generated React Query hooks
│   ├── api-zod/             # Generated Zod schemas
│   └── db/                  # Drizzle ORM schema + DB connection
├── scripts/                 # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```
