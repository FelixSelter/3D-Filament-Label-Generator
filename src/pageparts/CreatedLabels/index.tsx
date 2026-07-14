import { useContextSelector } from "use-context-selector";
import { AppContext } from "../../AppContextWrapper";
import Label from "./LabelListElem";
import { jsPDF } from "jspdf";
import { useCallback } from "react";
import {
  getConstrainedLogoSize,
  getLogoDimensions,
  loadImageAspectRatio,
  showUserError,
} from "../../helper";
import { BAMBU_LABELS } from "./bambulabels";

function fitTextToWidth(doc: jsPDF, text: string, maxWidth: number) {
  if (maxWidth <= 0) return "";
  if (doc.getTextWidth(text) <= maxWidth) return text;

  const ellipsis = "...";
  if (doc.getTextWidth(ellipsis) > maxWidth) return "";

  let low = 0;
  let high = text.length;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const candidate = `${text.slice(0, middle).trimEnd()}${ellipsis}`;

    if (doc.getTextWidth(candidate) <= maxWidth) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  return `${text.slice(0, low).trimEnd()}${ellipsis}`;
}

export default function CreatedLabels() {
  const {
    labels,
    setAppState,
    labelConfig: {
      width: labelWidth,
      height: labelHeight,
      cornerRadius: labelCornerRadius,
      logoSize: labelLogoSize,
      brandFontSize,
      filamentFontSize,
    },
  } = useContextSelector(AppContext, (state) => ({
    labels: state.appState.labels,
    setAppState: state.setAppState,
    labelConfig: state.appState.labelConfig,
  }));

  const exportPDF = useCallback(async () => {
    if (labels.length === 0) {
      showUserError("Please create some labels first");
      return;
    }

    const doc = new jsPDF({
      unit: "mm",
      format: "a4",
    });

    const borderWidth = 0.3;
    const spacing = 3;
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;

    const cols = Math.floor(
      (pageWidth - margin * 2 + spacing) / (labelWidth + spacing),
    );

    const rows = Math.floor(
      (pageHeight - margin * 2 + spacing) / (labelHeight + spacing),
    );

    const logoSources = [
      ...new Set(
        labels.flatMap((label) =>
          label.brand.logo ? [label.brand.logo] : [],
        ),
      ),
    ];
    const logoAspectRatios = new Map(
      await Promise.all(
        logoSources.map(async (source) => [
          source,
          await loadImageAspectRatio(source),
        ] as const),
      ),
    );

    const scale = Math.min(labelWidth, labelHeight) / 12;

    let currentLabel = 0;
    let pageCount = 0;

    while (currentLabel < labels.length) {
      if (pageCount > 0) doc.addPage();
      pageCount++;

      for (let row = 0; row < rows && currentLabel < labels.length; row++) {
        for (let col = 0; col < cols && currentLabel < labels.length; col++) {
          const x = margin + col * (labelWidth + spacing);
          const y = margin + row * (labelHeight + spacing);

          const label = labels[currentLabel];
          if (!label) {
            currentLabel++;
            continue;
          }

          // ---- Border ----
          doc.setDrawColor(0);
          doc.setLineWidth(borderWidth);
          doc.roundedRect(
            x - borderWidth / 2,
            y - borderWidth / 2,
            labelWidth + borderWidth,
            labelHeight + borderWidth,
            labelCornerRadius,
            labelCornerRadius,
            "S",
          );

          const labelPadding = 0.5; // matches CSS: padding: 0.5mm on .labelContainer
          const textX = x + 1;
          const aspect = label.brand.logo
            ? (logoAspectRatios.get(label.brand.logo) ?? 1)
            : 1;
          const logoBox = label.brand.logo
            ? getLogoDimensions(
                getConstrainedLogoSize(
                  labelWidth,
                  labelHeight,
                  labelLogoSize,
                  brandFontSize,
                  filamentFontSize,
                  aspect,
                ),
                aspect,
              )
            : undefined;
          const logoContainerX = logoBox
            ? x + labelWidth - logoBox.width - labelPadding
            : x + labelWidth - 1;
          const textLogoGap = logoBox ? 0.5 : 0;
          const textMaxWidth = Math.max(
            0,
            logoContainerX - textX - textLogoGap,
          );

          // ---- Text ----
          doc.setFontSize(brandFontSize);
          doc.setFont("helvetica", "bold");

          const brandTextHeight = brandFontSize * 0.3528;
          doc.text(
            fitTextToWidth(doc, label.brand.name, textMaxWidth),
            textX,
            y + 1 + brandTextHeight,
          );

          doc.setFontSize(filamentFontSize);
          doc.setFont("helvetica", "normal");

          const filamentTextHeight = filamentFontSize * 0.3528;
          const bottomMargin = 1;

          doc.text(
            fitTextToWidth(doc, label.type, textMaxWidth),
            textX,
            y + labelHeight - bottomMargin - filamentTextHeight - 0.5,
          );

          doc.text(
            fitTextToWidth(doc, label.name, textMaxWidth),
            textX,
            y + labelHeight - bottomMargin,
          );

          // ---- Logo area (RIGHT COLUMN like CSS grid) ----
          if (label.brand.logo && logoBox) {
            const logoContainerY = y + labelPadding;

            const hasBackground =
              label.brand.backgroundColor &&
              label.brand.backgroundColor.toLowerCase() !== "white";

            const padding = brandFontSize > 0 ? 0.7 * scale : 0;
            const offset = 0.3 * scale;

            const innerWidth = Math.max(
              0,
              logoBox.width - offset - (hasBackground ? padding * 2 : 0),
            );
            const innerHeight = Math.max(
              0,
              logoBox.height - offset - (hasBackground ? padding * 2 : 0),
            );

            if (innerWidth > 0 && innerHeight > 0) {
              let drawW = innerWidth;
              let drawH = drawW / aspect;
              if (drawH > innerHeight) {
                drawH = innerHeight;
                drawW = drawH * aspect;
              }

              // Same offset applied in both cases — CSS uses it unconditionally
              const imgX =
                logoContainerX +
                logoBox.width -
                offset -
                drawW -
                (hasBackground ? padding : 0);
              const imgY =
                logoContainerY + offset + (hasBackground ? padding : 0);

              if (hasBackground) {
                doc.setFillColor(label.brand.backgroundColor);
                doc.roundedRect(
                  imgX - padding,
                  imgY - padding,
                  drawW + padding * 2,
                  drawH + padding * 2,
                  padding,
                  padding,
                  "F",
                );
              }

              doc.addImage(label.brand.logo, "PNG", imgX, imgY, drawW, drawH);
            }
          }

          currentLabel++;
        }
      }
    }

    doc.save("filament-labels.pdf");
  }, [
    brandFontSize,
    filamentFontSize,
    labelCornerRadius,
    labelHeight,
    labelLogoSize,
    labelWidth,
    labels,
  ]);

  return (
    <section className="card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Created labels</h5>
        <div style={{ gap: "10px" }} className="d-flex">
          <button
            className="btn btn-danger"
            onClick={() => {
              if (
                !window.confirm("Are you sure you want to delete all labels?")
              )
                return;
              setAppState((prev) => ({
                ...prev,
                labels: [],
              }));
            }}
          >
            Delete all labels
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setAppState((prev) => ({
                ...prev,
                labels: [...prev.labels, ...BAMBU_LABELS],
              }));
            }}
          >
            Add Bambulab labels
          </button>
          <button className="btn btn-success" onClick={exportPDF}>
            Export to PDF
          </button>
        </div>
      </div>
      <div className="card-body">
        <p className="small text-muted">
          Your generated labels ready for printing
        </p>
        <div id="createdLabels" className="row">
          {labels.map((label) => (
            <Label
              key={`${label.brand.name}-${label.type}-${label.name}`}
              label={label}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
