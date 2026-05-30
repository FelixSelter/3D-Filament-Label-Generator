import { useContextSelector } from "use-context-selector";
import { AppContext } from "../../AppContextWrapper";
import Label from "./LabelListElem";
import { jsPDF } from "jspdf";
import { useCallback } from "react";
import { showUserError } from "../../helper";
import { BAMBU_LABELS } from "./bambulabels";

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

  const exportPDF = useCallback(() => {
    if (labels.length === 0) {
      showUserError("Please create some labels first");
      return;
    }

    const doc = new jsPDF({
      unit: "mm",
      format: "a4",
    });

    // Single border that grows outward
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
            console.error("Label data missing for index", currentLabel);
            currentLabel++;
            continue;
          }

          // ---- Border (expanded outward) ----
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

          // ---- Brand ----
          doc.setFontSize(brandFontSize);
          doc.setFont("sans-serif", "bold");
          const brandTextHeight = brandFontSize * 0.3528;

          doc.text(label.brand.name, x + 1, y + 1 + brandTextHeight);

          // ---- Filament text ----
          doc.setFontSize(filamentFontSize);
          doc.setFont("sans-serif", "normal");

          const filamentTextHeight = filamentFontSize * 0.3528;
          const textBottomMargin = 1;
          const lineSpacing = 0.5;

          doc.text(
            label.type,
            x + 1,
            y +
              labelHeight -
              textBottomMargin -
              filamentTextHeight -
              lineSpacing,
          );

          doc.text(label.name, x + 1, y + labelHeight - textBottomMargin);

          // ---- Logo ----
          if (label.brand.logo) {
            try {
              const img = new Image();
              img.src = label.brand.logo;

              const imgW = img.width;
              const imgH = img.height;

              if (imgW > 0 && imgH > 0) {
                const aspect = imgW / imgH;

                let drawW = labelLogoSize;
                let drawH = labelLogoSize;

                if (aspect > 1) {
                  // wide image
                  drawH = labelLogoSize / aspect;
                } else {
                  // tall image
                  drawW = labelLogoSize * aspect;
                }

                const imgX = x + labelWidth - drawW - 0.5;
                const imgY = y + 0.5 + (labelLogoSize - drawH) / 2;

                doc.addImage(label.brand.logo, "PNG", imgX, imgY, drawW, drawH);
              }
            } catch (err) {
              console.error("Error adding logo:", err);
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
