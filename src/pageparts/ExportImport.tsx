import { useContextSelector } from "use-context-selector";
import { AppContext, defaultContext } from "../AppContextWrapper";
import { z } from "zod";
import { showUserError } from "../helper";
import { useCallback, useRef, useState } from "react";
import type { AppStateType } from "../types";

// eslint-disable-next-line react-refresh/only-export-components
export const SafeSchemaV1 = z.object({
  brands: z.array(
    z.object({
      name: z.string(),
      logo: z.string().or(z.null()),
    }),
  ),
  filamentTypes: z.array(z.string()),
});
type V1Data = z.infer<typeof SafeSchemaV1>;

function migrateV1ToV2(v1Data: V1Data): V2Data {
  return {
    brands: v1Data.brands.map((b) => ({
      ...b,
      backgroundColor: "white",
    })),
    filamentTypes: v1Data.filamentTypes,
  };
}

const SafeSchemaV2 = z.object({
  brands: z
    .array(
      z.object({
        name: z.string(),
        logo: z.string().or(z.null()),
        backgroundColor: z.string(),
      }),
    )
    .optional(),
  labels: z
    .array(
      z.object({
        brand: z.object({
          name: z.string(),
          logo: z.string().or(z.null()),
          backgroundColor: z.string(),
        }),
        type: z.string(),
        name: z.string(),
      }),
    )
    .optional(),
  labelConfig: z
    .object({
      width: z.number(),
      height: z.number(),
      cornerRadius: z.number(),
      logoSize: z.number(),
      brandFontSize: z.number(),
      filamentFontSize: z.number(),
    })
    .optional(),
  filamentTypes: z.array(z.string()).optional(),
});
type V2Data = z.infer<typeof SafeSchemaV2>;

function migrateV2ToCurrent(v2Data: V2Data): AppStateType {
  return {
    brands: [],
    labels: [],
    labelConfig: defaultContext.labelConfig,
    filamentTypes: [],
    ...v2Data,
  };
}

// eslint-disable-next-line react-refresh/only-export-components
export function migrate(data: unknown): null | AppStateType {
  const v2Parse = SafeSchemaV2.safeParse(data);
  if (v2Parse.success) return migrateV2ToCurrent(v2Parse.data);

  const v1Parse = SafeSchemaV1.safeParse(data);
  if (v1Parse.success) return migrate(migrateV1ToV2(v1Parse.data));

  return null;
}

export default function ExportImport() {
  const { setAppState, appState } = useContextSelector(
    AppContext,
    ({ setAppState, appState }) => ({
      setAppState,
      appState,
    }),
  );

  const fileSelect = useRef<HTMLInputElement | null>(null);

  const [selectedBrands, setSelectedBrands] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState(true);
  const [selectedLabels, setSelectedLabels] = useState(false);
  const [selectedLabelSettings, setSelectedLabelSettings] = useState(true);

  const exportData = useCallback(() => {
    const data: V2Data = {
      brands: selectedBrands ? appState.brands : undefined,
      filamentTypes: selectedTypes ? appState.filamentTypes : undefined,
      labels: selectedLabels ? appState.labels : undefined,
      labelConfig: selectedLabelSettings ? appState.labelConfig : undefined,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "filament-labels-data.json";
    a.click();
  }, [
    appState,
    selectedBrands,
    selectedTypes,
    selectedLabels,
    selectedLabelSettings,
  ]);

  const importData = useCallback(
    (file: File) => {
      if (!file) return;
      if (
        !confirm(
          "Importing data will overwrite all of your current data. Do you want to continue?",
        )
      )
        return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text !== "string") throw new Error("File read error");

          const json = JSON.parse(text);
          const migrated = migrate(json);
          if (!migrated) {
            showUserError("Unsupported file format");
            return;
          }

          setAppState(migrated);
        } catch (err) {
          console.error("Import error:", err);
          showUserError("Failed to import data: " + (err as Error).message);
        }
      };
      reader.readAsText(file);
    },
    [setAppState],
  );

  return (
    <section className="card mb-4">
      <div className="card-header">
        <h5 className="mb-0">Import / Export</h5>
      </div>

      <div className="card-body">
        <p className="small text-muted mb-3">
          Select which data should be included when importing or exporting.
        </p>

        <div className="row g-3">
          <div className="col-12">
            <div>
              <div className="row">
                <div className="col-md-6">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={selectedBrands}
                      onChange={(e) => setSelectedBrands(e.target.checked)}
                      id="exportBrands"
                    />
                    <label className="form-check-label" htmlFor="exportBrands">
                      Brands
                    </label>
                  </div>

                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={selectedTypes}
                      onChange={(e) => setSelectedTypes(e.target.checked)}
                      id="exportTypes"
                    />
                    <label className="form-check-label" htmlFor="exportTypes">
                      Filament types
                    </label>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={selectedLabels}
                      onChange={(e) => setSelectedLabels(e.target.checked)}
                      id="exportLabels"
                    />
                    <label className="form-check-label" htmlFor="exportLabels">
                      Labels
                    </label>
                  </div>

                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={selectedLabelSettings}
                      onChange={(e) =>
                        setSelectedLabelSettings(e.target.checked)
                      }
                      id="exportLabelSettings"
                    />
                    <label
                      className="form-check-label"
                      htmlFor="exportLabelSettings"
                    >
                      Label Settings
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12">
            <div className="d-flex flex-wrap gap-2 justify-content-end">
              <button className="btn btn-primary" onClick={exportData}>
                Export
              </button>

              <button
                className="btn btn-primary"
                onClick={() => fileSelect.current?.click()}
              >
                Import
              </button>
            </div>

            <input
              type="file"
              ref={fileSelect}
              accept=".json"
              className="d-none"
              onChange={(e) => {
                if (!e.target.files || e.target.files.length === 0) return;
                const file = e.target.files[0];
                // Reset files otherwise the same file cannot be loaded twice in a row because the onChange event is not triggered
                e.target.value = null!;
                importData(file);
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
