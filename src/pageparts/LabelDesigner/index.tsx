import { useCallback, useEffect, useRef, useState } from "react";
import { useContextSelector } from "use-context-selector";
import { AppContext } from "../../AppContextWrapper";
import type { Brand, FilamentType } from "../../types";
import { showUserError } from "../../helper";

import styles from "./index.module.css";
import LogoDisplay from "../../components/LogoDisplay";

export default function LabelDesigner() {
  const { setAppState, brands, filamentTypes, labelConfig } =
    useContextSelector(
      AppContext,
      ({ setAppState, appState: { brands, filamentTypes, labelConfig } }) => ({
        setAppState,
        brands,
        filamentTypes,
        labelConfig,
      }),
    );

  const [filamentName, setFilamentName] = useState<string | undefined>(
    undefined,
  );

  const [brand, setBrand] = useState<Brand | undefined>(undefined);

  const [filamentType, setFilamentType] = useState<FilamentType | undefined>(
    undefined,
  );

  const previewLabelRef = useRef<HTMLDivElement | null>(null);

  const adjustPreviewScale = useCallback(() => {
    const label = previewLabelRef.current;
    const container = label?.parentElement as HTMLDivElement;
    if (!container || !label) return;

    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    // Convert mm to pixels (approximate: 1mm ≈ 3.78px at 96 DPI)
    const mmToPx = 3.78;
    const labelWidthPx = labelConfig.width * mmToPx;
    const labelHeightPx = labelConfig.height * mmToPx;

    // Calculate max scale that fits in container with padding
    const padding = 40; // pixels of padding
    const scaleX = (containerWidth - padding) / labelWidthPx;
    const scaleY = (containerHeight - padding) / labelHeightPx;

    // Use the smaller scale to ensure it fits both dimensions
    let scale = Math.min(scaleX, scaleY);

    // Clamp scale between reasonable limits
    scale = Math.max(2, Math.min(scale, 8));

    label.style.transform = `scale(${scale})`;
  }, [labelConfig]);

  useEffect(() => {
    window.addEventListener("resize", adjustPreviewScale);
    adjustPreviewScale(); // Initial adjustment

    return () => {
      window.removeEventListener("resize", adjustPreviewScale);
    };
  }, [adjustPreviewScale]);

  return (
    <section className="card mb-4">
      <div className="card-header">
        <h5 className="mb-0">Label Designer</h5>
      </div>
      <div className="card-body">
        <p className="small text-muted">Preview and create individual labels</p>
        <div className={styles.labelPreview}>
          <LogoDisplay
            ref={previewLabelRef}
            brand={brand}
            filamentType={filamentType}
            filamentName={filamentName}
          />
        </div>
        <div className="row align-items-end">
          <div className="col-md-3 mb-2">
            <label className="form-label">Brand</label>
            <select
              className="form-select"
              onChange={(e) => {
                const selectedBrand = brands.find(
                  (b) => b.name === e.target.value,
                );
                console.assert(
                  selectedBrand !== undefined,
                  "Selected brand not found in brands list",
                );
                setBrand(selectedBrand);
              }}
            >
              <option value="">Select brand...</option>
              {brands.map((brand) => (
                <option key={brand.name} value={brand.name}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3 mb-2">
            <label className="form-label">Filament Type</label>
            <select
              className="form-select"
              onChange={(e) => {
                if (e.target.value === "") {
                  setFilamentType(undefined);
                  return;
                }
                console.assert(
                  filamentTypes.includes(e.target.value),
                  "Selected filament type not found in filament types list",
                );
                setFilamentType(e.target.value);
              }}
            >
              <option value="">Select type...</option>
              {filamentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4 mb-2">
            <label className="form-label">Filament Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g., Galaxy Black"
              value={filamentName}
              onChange={(e) => setFilamentName(e.target.value)}
            />
          </div>
          <div className="col-md-2 mb-2">
            <button
              className="btn btn-primary w-100"
              onClick={() => {
                if (
                  !brand ||
                  !filamentType ||
                  !filamentName ||
                  filamentName.trim() === ""
                ) {
                  showUserError(
                    "Please fill in all fields to create a label. The filament name cannot be empty.",
                  );
                  return;
                }
                setAppState((prev) => {
                  console.assert(
                    prev.brands.includes(brand),
                    "Selected brand not found in current app state",
                  );
                  console.assert(
                    prev.filamentTypes.includes(filamentType),
                    "Selected filament type not found in current app state",
                  );
                  return {
                    ...prev,
                    labels: [
                      ...prev.labels,
                      {
                        brand: brand,
                        type: filamentType,
                        name: filamentName,
                      },
                    ],
                  };
                });

                setFilamentName(undefined);
              }}
            >
              Add label
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
