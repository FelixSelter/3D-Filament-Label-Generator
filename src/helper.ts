export function showUserError(message: string) {
  alert(message);
}

const LABEL_CONTENT_INSET_MM = 1;
const DEFAULT_BRAND_FONT_SIZE = 6;
const DEFAULT_FILAMENT_FONT_SIZE = 5;

const imageAspectRatioCache = new Map<string, Promise<number>>();

function normalizeAspectRatio(aspectRatio: number) {
  return Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
}

export function loadImageAspectRatio(source: string) {
  const cached = imageAspectRatioCache.get(source);
  if (cached) return cached;

  const aspectRatio = new Promise<number>((resolve) => {
    const image = new Image();
    image.onload = () => {
      resolve(normalizeAspectRatio(image.naturalWidth / image.naturalHeight));
    };
    image.onerror = () => resolve(1);
    image.src = source;
  });

  imageAspectRatioCache.set(source, aspectRatio);
  return aspectRatio;
}

export function getMaxLogoSize(
  labelWidth: number,
  labelHeight: number,
  brandFontSize: number,
  filamentFontSize: number,
  aspectRatio: number,
) {
  const contentWidth = Math.max(0, labelWidth - LABEL_CONTENT_INSET_MM * 2);
  const contentHeight = Math.max(
    0,
    labelHeight - LABEL_CONTENT_INSET_MM * 2,
  );
  const fontScale = Math.max(
    brandFontSize / DEFAULT_BRAND_FONT_SIZE,
    filamentFontSize / DEFAULT_FILAMENT_FONT_SIZE,
  );
  // Default fonts reserve half the label width for text. Larger fonts grow
  // that reservation without allowing text to consume the entire label.
  const reservedTextRatio = Math.min(
    0.85,
    0.5 * Math.sqrt(Math.max(0, fontScale)),
  );
  const reservedTextWidth = Math.min(
    contentWidth,
    contentWidth * reservedTextRatio,
  );
  const availableLogoWidth = Math.max(0, contentWidth - reservedTextWidth);
  const normalizedAspectRatio = normalizeAspectRatio(aspectRatio);
  const maxFromWidth =
    normalizedAspectRatio >= 1
      ? availableLogoWidth
      : availableLogoWidth / normalizedAspectRatio;
  const maxFromHeight =
    normalizedAspectRatio >= 1
      ? contentHeight * normalizedAspectRatio
      : contentHeight;

  return Math.max(0, Math.min(maxFromWidth, maxFromHeight));
}

export function getConstrainedLogoSize(
  labelWidth: number,
  labelHeight: number,
  logoSize: number,
  brandFontSize: number,
  filamentFontSize: number,
  aspectRatio: number,
) {
  return Math.max(
    0,
    Math.min(
      logoSize,
      getMaxLogoSize(
        labelWidth,
        labelHeight,
        brandFontSize,
        filamentFontSize,
        aspectRatio,
      ),
    ),
  );
}

export function getLogoDimensions(logoSize: number, aspectRatio: number) {
  const normalizedAspectRatio = normalizeAspectRatio(aspectRatio);

  return normalizedAspectRatio >= 1
    ? { width: logoSize, height: logoSize / normalizedAspectRatio }
    : { width: logoSize * normalizedAspectRatio, height: logoSize };
}
