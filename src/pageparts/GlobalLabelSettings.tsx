import { useContextSelector } from "use-context-selector";
import { AppContext } from "../AppContextWrapper";
import NumberInput from "../components/NumberInput";
import { useCallback } from "react";
import type { BorderStyle } from "../types";

export default function GlobalLabelSettings() {
  const { setAppState, labelConfig } = useContextSelector(
    AppContext,
    ({ setAppState, appState: { labelConfig } }) => ({
      setAppState,
      labelConfig,
    }),
  );

  const updateLabelConfig = useCallback(
    (key: keyof typeof labelConfig, value: number) => {
      setAppState((prev) => ({
        ...prev,
        labelConfig: {
          ...prev.labelConfig,
          [key]: value,
        },
      }));
    },
    [setAppState],
  );

  return (
    <section className="card mb-4">
      <div className="card-header">
        <h5 className="mb-0">Global Label Settings</h5>
      </div>
      <div className="card-body">
        <p className="small text-muted">These settings apply to all labels</p>
        <div className="row">
          <div className="col-md-3 mb-2">
            <label className="form-label">Width (mm)</label>
            <NumberInput
              className="form-control"
              defaultValue={labelConfig.width}
              min={10}
              onValueChange={(value) => {
                if (!(typeof value === "number")) return;
                updateLabelConfig("width", value);
              }}
            />
          </div>
          <div className="col-md-3 mb-2">
            <label className="form-label">Height (mm)</label>
            <NumberInput
              className="form-control"
              defaultValue={labelConfig.height}
              min={10}
              onValueChange={(value) => {
                if (!(typeof value === "number")) return;
                updateLabelConfig("height", value);
              }}
            />
          </div>
          <div className="col-md-3 mb-2">
            <label className="form-label">Corner Radius (mm)</label>
            <NumberInput
              className="form-control"
              defaultValue={labelConfig.cornerRadius}
              min={0}
              onValueChange={(value) => {
                if (!(typeof value === "number")) return;
                updateLabelConfig("cornerRadius", value);
              }}
            />
          </div>
          <div className="col-md-3 mb-2">
            <label className="form-label" htmlFor="labelBorderStyle">
              Border Style
            </label>
            <select
              id="labelBorderStyle"
              className="form-select"
              value={labelConfig.borderStyle}
              onChange={(event) => {
                const borderStyle = event.target.value as BorderStyle;
                setAppState((prev) => ({
                  ...prev,
                  labelConfig: {
                    ...prev.labelConfig,
                    borderStyle,
                  },
                }));
              }}
            >
              <option value="none">None</option>
              <option value="dashed">Dashed</option>
              <option value="solid">Solid</option>
            </select>
          </div>
          <div className="col-md-3 mb-2">
            <label className="form-label">Logo Size (mm)</label>
            <NumberInput
              className="form-control"
              defaultValue={labelConfig.logoSize}
              min={2}
              onValueChange={(value) => {
                if (!(typeof value === "number")) return;
                updateLabelConfig("logoSize", value);
              }}
            />
          </div>
          <div className="col-md-3 mb-2">
            <label className="form-label">Brand Font Size (pt)</label>
            <NumberInput
              className="form-control"
              defaultValue={labelConfig.brandFontSize}
              min={4}
              onValueChange={(value) => {
                if (!(typeof value === "number")) return;
                updateLabelConfig("brandFontSize", value);
              }}
            />
          </div>
          <div className="col-md-3 mb-2">
            <label className="form-label">Filament Font Size (pt)</label>
            <NumberInput
              className="form-control"
              defaultValue={labelConfig.filamentFontSize}
              min={4}
              onValueChange={(value) => {
                if (!(typeof value === "number")) return;
                updateLabelConfig("filamentFontSize", value);
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
