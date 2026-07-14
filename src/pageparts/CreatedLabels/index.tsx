import { useContextSelector } from "use-context-selector";
import { AppContext } from "../../AppContextWrapper";
import Label from "./LabelListElem";
import { useCallback, useState } from "react";
import { showUserError } from "../../helper";
import { BAMBU_LABELS } from "./bambulabels";
import {
  exportCreatedLabels,
  PNG_DPI,
  type ExportFormat,
  type ExportLayout,
} from "./exportLabels";

export default function CreatedLabels() {
  const {
    labels,
    setAppState,
    labelConfig,
  } = useContextSelector(AppContext, (state) => ({
    labels: state.appState.labels,
    setAppState: state.setAppState,
    labelConfig: state.appState.labelConfig,
  }));
  const [exportLayout, setExportLayout] =
    useState<ExportLayout>("sheet");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (labels.length === 0) {
      showUserError("Please create some labels first");
      return;
    }

    setIsExporting(true);
    try {
      await exportCreatedLabels(
        labels,
        labelConfig,
        exportLayout,
        exportFormat,
      );
    } catch (error) {
      console.error("Error exporting labels", error);
      showUserError(
        error instanceof Error ? error.message : "Could not export labels",
      );
    } finally {
      setIsExporting(false);
    }
  }, [exportFormat, exportLayout, labelConfig, labels]);

  const exportDescription =
    exportLayout === "individual"
      ? `Creates one exact-size ${exportFormat.toUpperCase()} per label${labels.length > 1 ? " and packages them in a ZIP file" : ""}.`
      : exportFormat === "pdf"
        ? "Creates the existing printable A4 PDF with multiple labels per page."
        : "Creates transparent 300-DPI A4 PNG sheets. Multiple pages are packaged in a ZIP file.";

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
        </div>
      </div>
      <div className="card-body">
        <div className="border rounded p-3 mb-3">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label" htmlFor="exportLayout">
                Export layout
              </label>
              <select
                className="form-select"
                id="exportLayout"
                value={exportLayout}
                onChange={(event) =>
                  setExportLayout(event.target.value as ExportLayout)
                }
              >
                <option value="sheet">Printable sheet</option>
                <option value="individual">Individual labels</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="exportFormat">
                File format
              </label>
              <select
                className="form-select"
                id="exportFormat"
                value={exportFormat}
                onChange={(event) =>
                  setExportFormat(event.target.value as ExportFormat)
                }
              >
                <option value="pdf">PDF</option>
                <option value="png">PNG</option>
              </select>
            </div>
            <div className="col-md-5">
              <button
                className="btn btn-success w-100"
                disabled={isExporting}
                onClick={handleExport}
              >
                {isExporting
                  ? "Preparing export..."
                  : `Export ${exportLayout === "individual" ? "labels" : "sheet"} as ${exportFormat.toUpperCase()}`}
              </button>
            </div>
          </div>
          <div className="form-text mt-2">{exportDescription}</div>
          {exportFormat === "png" && (
            <div className="form-text">
              PNG backgrounds are transparent and include {PNG_DPI}-DPI sizing
              metadata for accurate physical dimensions.
            </div>
          )}
        </div>
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
