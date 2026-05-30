import { SketchPicker } from "react-color";
import { useState } from "react";
import { showUserError } from "../../helper";
import { AppContext } from "../../AppContextWrapper";
import { useContextSelector } from "use-context-selector";
import BrandListItem from "./BrandListItem";
import TypeListItem from "./TypeListItem";

import styles from "./index.module.css";

export default function Management() {
  const { setAppState, brands, filamentTypes } = useContextSelector(
    AppContext,
    ({ setAppState, appState: { brands, filamentTypes } }) => ({
      setAppState,
      brands,
      filamentTypes,
    }),
  );

  const [brandName, setBrandName] = useState<string | undefined>(undefined);
  const [logo, setLogo] = useState<File | undefined>(undefined);
  const [typeName, setTypeName] = useState<string | undefined>(undefined);
  const [bgColor, setBgColor] = useState<string>("white");

  return (
    <section className="card mb-4">
      <div className="card-header">
        <h5 className="mb-0">Brand & Filament Type Management</h5>
      </div>
      <div className="card-body">
        <div className="row">
          <div className="col-md-6 mb-3">
            <h6>Brands</h6>
            <p className="small text-muted">
              Add brands with logos for your filament labels
            </p>
            <div className="mb-2">
              <input
                type="text"
                className="form-control mb-2"
                placeholder="Brand name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value.trim())}
              />
              <div>
                <div className="input-group">
                  <span className={styles.logoText}>Logo:</span>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={(e) => setLogo(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    data-bs-toggle="modal"
                    data-bs-target="#colorModal"
                  >
                    Change logo bg color
                  </button>
                </div>

                <div className="modal" tabIndex={-1} id="colorModal">
                  <div className="modal-dialog">
                    <div className="modal-content">
                      <div className="modal-header">
                        <h5 className="modal-title">
                          Pick a background color for the logo
                        </h5>
                        <button
                          type="button"
                          className="btn-close"
                          data-bs-dismiss="modal"
                          aria-label="Close"
                        ></button>
                      </div>
                      <div className="modal-body d-flex justify-content-center">
                        <SketchPicker
                          color={bgColor}
                          onChangeComplete={(color) => setBgColor(color.hex)}
                          presetColors={["white", "#242524"]}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button
              className="btn btn-primary mb-3"
              onClick={() => {
                if (!brandName) {
                  showUserError("Please provide a brand name");
                  return;
                }
                if (brands.some((b) => b.name === brandName)) {
                  showUserError(
                    "A brand with this name already exists. Please choose a different name.",
                  );
                  return;
                }

                if (logo !== undefined) {
                  const reader = new FileReader();
                  reader.onload = function (e) {
                    if (!e.target || typeof e.target.result !== "string") {
                      showUserError("Error reading logo file");
                      return;
                    }
                    const result = e.target.result;

                    setAppState((prev) => {
                      return {
                        ...prev,
                        brands: [
                          ...prev.brands,
                          {
                            name: brandName,
                            logo: result,
                            backgroundColor: bgColor,
                          },
                        ],
                      };
                    });
                    setBrandName(undefined);
                    setLogo(undefined);
                  };

                  reader.readAsDataURL(logo);
                } else {
                  setAppState((prev) => {
                    return {
                      ...prev,
                      brands: [
                        ...prev.brands,
                        {
                          name: brandName,
                          logo: null,
                          backgroundColor: "white",
                        },
                      ],
                    };
                  });
                }
              }}
            >
              Add Brand
            </button>
            <div>
              {brands.map((brand) => (
                <BrandListItem key={brand.name} brand={brand} />
              ))}
            </div>
          </div>
          <div className="col-md-6 mb-3">
            <h6>Filament Types</h6>
            <p className="small text-muted">
              Manage available filament material types
            </p>
            <div className="mb-2">
              <input
                type="text"
                className="form-control mb-2"
                placeholder="Type name"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value.trim())}
              />
            </div>
            <button
              className="btn btn-primary mb-3"
              onClick={() => {
                if (!typeName) {
                  showUserError("Please provide a type name");
                  return;
                }
                if (filamentTypes.includes(typeName)) {
                  showUserError(
                    "This filament type already exists. Please choose a different name.",
                  );
                  return;
                }
                setAppState((prev) => {
                  return {
                    ...prev,
                    filamentTypes: [...prev.filamentTypes, typeName],
                  };
                });
                setTypeName(undefined);
              }}
            >
              Add Type
            </button>
            <div>
              {filamentTypes.map((type) => (
                <TypeListItem key={type} type={type} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
