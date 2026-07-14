import JSZip from "jszip";
import { jsPDF } from "jspdf";
import type { AppStateType, Label } from "../../types";

export type ExportLayout = "individual" | "sheet";
export type ExportFormat = "pdf" | "png";

type LabelConfig = AppStateType["labelConfig"];
type LogoAsset = {
  image: HTMLImageElement;
  pdfSource: string;
  aspectRatio: number;
};

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const SHEET_MARGIN_MM = 10;
const SHEET_SPACING_MM = 3;
const BORDER_WIDTH_MM = 0.3;
const LABEL_PADDING_MM = 0.5;
const TEXT_PADDING_MM = 1;
const TEXT_LOGO_GAP_MM = 0.5;
export const PNG_DPI = 300;
const PX_PER_MM = PNG_DPI / 25.4;

const imageCache = new Map<string, Promise<LogoAsset | undefined>>();

function getPdfLogoSource(image: HTMLImageElement, source: string) {
  if (/^data:image\/(png|jpe?g|webp);/i.test(source)) return source;

  const maxDimension = 2048;
  const scale = Math.min(
    1,
    maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return source;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

function loadLogo(source: string) {
  const cached = imageCache.get(source);
  if (cached) return cached;

  const asset = new Promise<LogoAsset | undefined>((resolve) => {
    const image = new Image();
    image.onload = () => {
      const aspectRatio =
        image.naturalWidth > 0 && image.naturalHeight > 0
          ? image.naturalWidth / image.naturalHeight
          : 1;
      resolve({
        image,
        pdfSource: getPdfLogoSource(image, source),
        aspectRatio,
      });
    };
    image.onerror = () => resolve(undefined);
    image.src = source;
  });

  imageCache.set(source, asset);
  return asset;
}

async function loadLabelLogos(labels: Label[]) {
  const sources = [
    ...new Set(labels.flatMap((label) => (label.brand.logo ? [label.brand.logo] : []))),
  ];
  const assets = await Promise.all(
    sources.map(async (source) => [source, await loadLogo(source)] as const),
  );
  const loadedAssets = new Map<string, LogoAsset>();
  for (const [source, asset] of assets) {
    if (asset) loadedAssets.set(source, asset);
  }

  return loadedAssets;
}

function fitTextToWidth(
  text: string,
  maxWidth: number,
  measureText: (value: string) => number,
) {
  if (maxWidth <= 0) return "";
  if (measureText(text) <= maxWidth) return text;

  const ellipsis = "...";
  if (measureText(ellipsis) > maxWidth) return "";

  let low = 0;
  let high = text.length;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const candidate = `${text.slice(0, middle).trimEnd()}${ellipsis}`;

    if (measureText(candidate) <= maxWidth) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  return `${text.slice(0, low).trimEnd()}${ellipsis}`;
}

function getLogoLayout(
  config: LabelConfig,
  x: number,
  y: number,
) {
  const maxBoxSize = Math.max(
    0,
    Math.min(config.width - LABEL_PADDING_MM * 2, config.height - LABEL_PADDING_MM * 2),
  );
  const boxSize = Math.min(Math.max(0, config.logoSize), maxBoxSize);
  const boxX = x + config.width - boxSize - LABEL_PADDING_MM;
  const boxY = y + LABEL_PADDING_MM;
  const scale = Math.min(config.width, config.height) / 12;

  return {
    boxSize,
    boxX,
    boxY,
    scale,
  };
}

function getLogoDrawing(
  label: Label,
  config: LabelConfig,
  logo: LogoAsset,
  x: number,
  y: number,
) {
  const layout = getLogoLayout(config, x, y);

  const hasBackground =
    !!label.brand.backgroundColor &&
    label.brand.backgroundColor.toLowerCase() !== "white";
  const padding = hasBackground ? 0.7 * layout.scale : 0;
  const offset = 0.3 * layout.scale;
  const innerSize = Math.max(0, layout.boxSize - offset - padding * 2);

  let width = innerSize;
  let height = innerSize;
  if (logo.aspectRatio > 1) {
    height = innerSize / logo.aspectRatio;
  } else {
    width = innerSize * logo.aspectRatio;
  }

  return {
    ...layout,
    backgroundColor: label.brand.backgroundColor,
    hasBackground,
    padding,
    width,
    height,
    imageX:
      layout.boxX +
      layout.boxSize -
      offset -
      width -
      (hasBackground ? padding : 0),
    imageY: layout.boxY + offset + (hasBackground ? padding : 0),
  };
}

function getTextWidth(
  config: LabelConfig,
  logoDrawing: ReturnType<typeof getLogoDrawing> | undefined,
  x: number,
) {
  const textX = x + TEXT_PADDING_MM;
  const textRight = logoDrawing
    ? logoDrawing.boxX - TEXT_LOGO_GAP_MM
    : x + config.width - TEXT_PADDING_MM;

  return { textX, maxWidth: Math.max(0, textRight - textX) };
}

function drawPdfLabel(
  doc: jsPDF,
  label: Label,
  config: LabelConfig,
  x: number,
  y: number,
  logo: LogoAsset | undefined,
) {
  const borderInset = BORDER_WIDTH_MM / 2;
  const radius = Math.max(
    0,
    Math.min(config.cornerRadius, (config.width - BORDER_WIDTH_MM) / 2, (config.height - BORDER_WIDTH_MM) / 2),
  );
  doc.setDrawColor(0);
  doc.setLineWidth(BORDER_WIDTH_MM);
  doc.roundedRect(
    x + borderInset,
    y + borderInset,
    Math.max(0, config.width - BORDER_WIDTH_MM),
    Math.max(0, config.height - BORDER_WIDTH_MM),
    radius,
    radius,
    "S",
  );

  const logoDrawing = logo ? getLogoDrawing(label, config, logo, x, y) : undefined;
  const { textX, maxWidth } = getTextWidth(config, logoDrawing, x);

  doc.setTextColor(0);
  doc.setFontSize(config.brandFontSize);
  doc.setFont("helvetica", "bold");
  const brandTextHeight = config.brandFontSize * 0.3528;
  doc.text(
    fitTextToWidth(label.brand.name, maxWidth, (text) => doc.getTextWidth(text)),
    textX,
    y + 1 + brandTextHeight,
  );

  doc.setFontSize(config.filamentFontSize);
  doc.setFont("helvetica", "normal");
  const filamentTextHeight = config.filamentFontSize * 0.3528;
  const bottomMargin = 1;
  doc.text(
    fitTextToWidth(label.type, maxWidth, (text) => doc.getTextWidth(text)),
    textX,
    y + config.height - bottomMargin - filamentTextHeight - 0.5,
  );
  doc.text(
    fitTextToWidth(label.name, maxWidth, (text) => doc.getTextWidth(text)),
    textX,
    y + config.height - bottomMargin,
  );

  if (!logo || !logoDrawing || logoDrawing.width <= 0 || logoDrawing.height <= 0)
    return;

  if (logoDrawing.hasBackground) {
    doc.setFillColor(logoDrawing.backgroundColor);
    doc.roundedRect(
      logoDrawing.imageX - logoDrawing.padding,
      logoDrawing.imageY - logoDrawing.padding,
      logoDrawing.width + logoDrawing.padding * 2,
      logoDrawing.height + logoDrawing.padding * 2,
      logoDrawing.padding,
      logoDrawing.padding,
      "F",
    );
  }

  doc.addImage(
    logo.pdfSource,
    logoDrawing.imageX,
    logoDrawing.imageY,
    logoDrawing.width,
    logoDrawing.height,
  );
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height,
  );
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function drawCanvasLabel(
  context: CanvasRenderingContext2D,
  label: Label,
  config: LabelConfig,
  x: number,
  y: number,
  logo: LogoAsset | undefined,
) {
  const borderInset = BORDER_WIDTH_MM / 2;
  roundedRectPath(
    context,
    x + borderInset,
    y + borderInset,
    Math.max(0, config.width - BORDER_WIDTH_MM),
    Math.max(0, config.height - BORDER_WIDTH_MM),
    config.cornerRadius,
  );
  context.strokeStyle = "black";
  context.lineWidth = BORDER_WIDTH_MM;
  context.stroke();

  const logoDrawing = logo ? getLogoDrawing(label, config, logo, x, y) : undefined;
  const { textX, maxWidth } = getTextWidth(config, logoDrawing, x);

  context.fillStyle = "black";
  context.textBaseline = "top";
  context.font = `bold ${config.brandFontSize * 0.3528}px Helvetica, Arial, sans-serif`;
  context.fillText(
    fitTextToWidth(label.brand.name, maxWidth, (text) => context.measureText(text).width),
    textX,
    y + 1,
  );

  const filamentTextHeight = config.filamentFontSize * 0.3528;
  context.font = `${filamentTextHeight}px Helvetica, Arial, sans-serif`;
  const nameY = y + config.height - 1 - filamentTextHeight;
  context.fillText(
    fitTextToWidth(label.type, maxWidth, (text) => context.measureText(text).width),
    textX,
    nameY - filamentTextHeight - 0.5,
  );
  context.fillText(
    fitTextToWidth(label.name, maxWidth, (text) => context.measureText(text).width),
    textX,
    nameY,
  );

  if (!logo || !logoDrawing || logoDrawing.width <= 0 || logoDrawing.height <= 0)
    return;

  if (logoDrawing.hasBackground) {
    context.fillStyle = logoDrawing.backgroundColor;
    roundedRectPath(
      context,
      logoDrawing.imageX - logoDrawing.padding,
      logoDrawing.imageY - logoDrawing.padding,
      logoDrawing.width + logoDrawing.padding * 2,
      logoDrawing.height + logoDrawing.padding * 2,
      logoDrawing.padding,
    );
    context.fill();
  }

  context.drawImage(
    logo.image,
    logoDrawing.imageX,
    logoDrawing.imageY,
    logoDrawing.width,
    logoDrawing.height,
  );
}

function createCanvas(widthMm: number, heightMm: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(widthMm * PX_PER_MM));
  canvas.height = Math.max(1, Math.round(heightMm * PX_PER_MM));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not create the PNG canvas.");
  context.scale(canvas.width / widthMm, canvas.height / heightMm);
  return { canvas, context };
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPngDensityChunk(dpi: number) {
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  const typeAndData = chunk.subarray(4, 17);
  const pixelsPerMeter = Math.round(dpi / 0.0254);

  view.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // pHYs
  view.setUint32(8, pixelsPerMeter);
  view.setUint32(12, pixelsPerMeter);
  chunk[16] = 1;
  view.setUint32(17, crc32(typeAndData));
  return chunk;
}

async function setPngDensity(blob: Blob, dpi: number) {
  const png = new Uint8Array(await blob.arrayBuffer());
  const signature = png.subarray(0, 8);
  const parts: BlobPart[] = [signature];
  let offset = 8;

  while (offset < png.length) {
    const view = new DataView(png.buffer, png.byteOffset + offset);
    const length = view.getUint32(0);
    const chunkEnd = offset + length + 12;
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));

    if (type !== "pHYs") parts.push(png.subarray(offset, chunkEnd));
    if (type === "IHDR") parts.push(createPngDensityChunk(dpi));
    offset = chunkEnd;
  }

  return new Blob(parts, { type: "image/png" });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Your browser could not create the PNG file."));
    }, "image/png");
  }).then((blob) => setPngDensity(blob, PNG_DPI));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilenamePart(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "label"
  );
}

function labelFilename(label: Label, index: number, extension: ExportFormat) {
  const number = String(index + 1).padStart(2, "0");
  const details = [label.brand.name, label.type, label.name]
    .map(safeFilenamePart)
    .join("-");
  return `${number}-${details}.${extension}`;
}

function pdfBlob(doc: jsPDF) {
  return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
}

function createIndividualPdf(config: LabelConfig) {
  return new jsPDF({
    unit: "mm",
    format: [config.width, config.height],
    orientation: config.width >= config.height ? "landscape" : "portrait",
    compress: true,
  });
}

function getSheetGrid(config: LabelConfig) {
  const columns = Math.floor(
    (A4_WIDTH_MM - SHEET_MARGIN_MM * 2 + SHEET_SPACING_MM) /
      (config.width + SHEET_SPACING_MM),
  );
  const rows = Math.floor(
    (A4_HEIGHT_MM - SHEET_MARGIN_MM * 2 + SHEET_SPACING_MM) /
      (config.height + SHEET_SPACING_MM),
  );
  if (columns < 1 || rows < 1) {
    throw new Error(
      "The configured label is too large for an A4 sheet. Use individual label export instead.",
    );
  }
  return { columns, rows, labelsPerPage: columns * rows };
}

async function exportIndividualLabels(
  labels: Label[],
  config: LabelConfig,
  format: ExportFormat,
  logos: Map<string, LogoAsset>,
) {
  const files: Array<{ filename: string; blob: Blob }> = [];

  for (const [index, label] of labels.entries()) {
    const logo = label.brand.logo ? logos.get(label.brand.logo) : undefined;
    let blob: Blob;

    if (format === "pdf") {
      const doc = createIndividualPdf(config);
      drawPdfLabel(doc, label, config, 0, 0, logo);
      blob = pdfBlob(doc);
    } else {
      const { canvas, context } = createCanvas(config.width, config.height);
      drawCanvasLabel(context, label, config, 0, 0, logo);
      blob = await canvasToBlob(canvas);
    }

    files.push({ filename: labelFilename(label, index, format), blob });
  }

  if (files.length === 1 && files[0]) {
    downloadBlob(files[0].blob, files[0].filename);
    return;
  }

  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.filename, await file.blob.arrayBuffer());
  }
  downloadBlob(
    await zip.generateAsync({ type: "blob", compression: "DEFLATE" }),
    `filament-labels-${format}.zip`,
  );
}

function exportSheetPdf(
  labels: Label[],
  config: LabelConfig,
  logos: Map<string, LogoAsset>,
) {
  const { columns, rows } = getSheetGrid(config);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let currentLabel = 0;
  let page = 0;

  while (currentLabel < labels.length) {
    if (page > 0) doc.addPage();
    page++;

    for (let row = 0; row < rows && currentLabel < labels.length; row++) {
      for (let column = 0; column < columns && currentLabel < labels.length; column++) {
        const label = labels[currentLabel];
        if (!label) break;
        const x = SHEET_MARGIN_MM + column * (config.width + SHEET_SPACING_MM);
        const y = SHEET_MARGIN_MM + row * (config.height + SHEET_SPACING_MM);
        const logo = label.brand.logo ? logos.get(label.brand.logo) : undefined;
        drawPdfLabel(doc, label, config, x, y, logo);
        currentLabel++;
      }
    }
  }

  downloadBlob(pdfBlob(doc), "filament-labels.pdf");
}

async function exportSheetPng(
  labels: Label[],
  config: LabelConfig,
  logos: Map<string, LogoAsset>,
) {
  const { columns, labelsPerPage } = getSheetGrid(config);
  const pageCount = Math.ceil(labels.length / labelsPerPage);
  const files: Array<{ filename: string; blob: Blob }> = [];

  for (let page = 0; page < pageCount; page++) {
    const { canvas, context } = createCanvas(A4_WIDTH_MM, A4_HEIGHT_MM);
    const pageLabels = labels.slice(page * labelsPerPage, (page + 1) * labelsPerPage);

    for (const [pageIndex, label] of pageLabels.entries()) {
      const row = Math.floor(pageIndex / columns);
      const column = pageIndex % columns;
      const x = SHEET_MARGIN_MM + column * (config.width + SHEET_SPACING_MM);
      const y = SHEET_MARGIN_MM + row * (config.height + SHEET_SPACING_MM);
      const logo = label.brand.logo ? logos.get(label.brand.logo) : undefined;
      drawCanvasLabel(context, label, config, x, y, logo);
    }

    files.push({
      filename: `filament-labels-page-${page + 1}.png`,
      blob: await canvasToBlob(canvas),
    });
  }

  if (files.length === 1 && files[0]) {
    downloadBlob(files[0].blob, "filament-labels.png");
    return;
  }

  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.filename, await file.blob.arrayBuffer());
  }
  downloadBlob(
    await zip.generateAsync({ type: "blob", compression: "DEFLATE" }),
    "filament-label-sheets-png.zip",
  );
}

export async function exportCreatedLabels(
  labels: Label[],
  config: LabelConfig,
  layout: ExportLayout,
  format: ExportFormat,
) {
  const logos = await loadLabelLogos(labels);

  if (layout === "individual") {
    await exportIndividualLabels(labels, config, format, logos);
  } else if (format === "pdf") {
    exportSheetPdf(labels, config, logos);
  } else {
    await exportSheetPng(labels, config, logos);
  }
}
