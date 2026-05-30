import { useContextSelector } from "use-context-selector";
import type { Label } from "../../types";
import { AppContext } from "../../AppContextWrapper";

import LogoDisplay from "../../components/LogoDisplay";

export default function LabelListElem({ label }: { label: Label }) {
  const { setAppState, labelConfig } = useContextSelector(
    AppContext,
    ({ setAppState, appState: { labelConfig } }) => ({
      setAppState,
      labelConfig,
    }),
  );

  return (
    <div className="col-md-3 col-sm-6 mb-3">
      <div
        className="card"
        style={{ minWidth: `calc(${labelConfig.width}mm * 2 + 40px)` }}
      >
        <div className="card-body p-2">
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: `calc(${labelConfig.height}mm * 2 + 20px)`,
            }}
          >
            <div style={{ transform: "scale(2)", transformOrigin: "center" }}>
              {" "}
              <LogoDisplay
                brand={label.brand}
                filamentType={label.type}
                filamentName={label.name}
              />
            </div>
          </div>
          <button
            className="btn btn-sm btn-danger w-100 mt-2"
            onClick={() => {
              setAppState((prev) => ({
                ...prev,
                labels: prev.labels.filter((l) => l !== label),
              }));
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
