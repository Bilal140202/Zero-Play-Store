# PDFX — Play Store Submission Guide

## Step 1: Build APK with EAS
Install EAS CLI:
  npm install -g eas-cli

Login to Expo:
  eas login

Build preview APK (internal testing):
  eas build --platform android --profile preview

Build production AAB (Play Store):
  eas build --platform android --profile production

## Step 2: Play Store Console
1. Go to play.google.com/console
2. Create new app: PDFX
3. Upload AAB from EAS build
4. Fill metadata (see below)

## App Metadata
Short description (80 chars):
  Edit, annotate, sign & merge PDFs. 100% free. Works offline.

Full description:
  PDFX — The PDF editor that respects you.
  
  No subscriptions. No task limits. No cloud upload.
  Everything works offline, on your device.
  
  EDIT
  • Add and edit text with full formatting
  • Change fonts, size, color, bold/italic
  
  ANNOTATE  
  • Highlight, underline, strikethrough
  • Freehand draw and custom shapes
  • Sticky notes and comments
  
  SIGN
  • Draw your signature or type it
  • Save and reuse across documents
  
  MANAGE
  • Merge multiple PDFs into one
  • Split PDF by page range
  • Compress file size
  • Reorder, rotate, delete pages
  • Password protect with AES-256
  
  FILL FORMS
  • Auto-detect form fields
  • Fill any PDF form instantly
  
  Your files stay on your device. Always.
  No account required. Free forever.

## Keywords
pdf editor, pdf annotate, sign pdf, merge pdf, pdf tools, offline pdf, compress pdf, pdf reader

## Category
Productivity

## Content Rating
Everyone

## Required Assets
- App icon: 512x512px PNG (at artifacts/mobile/assets/images/icon.png)
- Feature graphic: 1024x500px (at artifacts/mobile/assets/images/feature-graphic.png)
- Screenshots: Take screenshots from the app (minimum 2, max 8)