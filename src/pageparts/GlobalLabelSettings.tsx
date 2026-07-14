import { useContextSelector } from "use-context-selector";
import { AppContext } from "../AppContextWrapper";
import NumberInput from "../components/NumberInput";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getMaxLogoSize,
  loadImageAspectRatio,
} from "../helper";
import type { Brand } from "../types";

export default function GlobalLabelSettings({
  selectedBrand,
}: {
  selectedBrand: Brand | undefined;
}) {
  const { setAppState, brands, labelConfig } = useContextSelector(
    AppContext,
    ({ setAppState, appState: { brands, labelConfig } }) => ({
      setAppState,
      brands,
      labelConfig,
    }),
  );
  const [logoAspectRatios, setLogoAspectRatios] = useState(
    new Map<string, number>(),
  );

  useEffect(() => {
    let active = true;
    const logoSources = brands.flatMap((brand) =>
      brand.logo ? [brand.logo] : [],
    );

    Promise.all(
      logoSources.map(async (source) => [
        source,
        await loadImageAspectRatio(source),
      ] as const),
    ).then((aspectRatios) => {
      if (active) setLogoAspectRatios(new Map(aspectRatios));
    });

    return () => {
      active = false;
    };
  }, [brands]);

  const availableAspectRatios = useMemo(
    () =>
      logoAspectRatios.size ? [...logoAspectRatios.values()] : [1],
    [logoAspectRatios],
  );
  const maxLogoSize = Math.max(
    ...availableAspectRatios.map((aspectRatio) =>
      getMaxLogoSize(
        labelConfig.width,
        labelConfig.height,
        labelConfig.brandFontSize,
        labelConfig.filamentFontSize,
        aspectRatio,
      ),
    ),
  );
  const selectedAspectRatio = selectedBrand?.logo
    ? logoAspectRatios.get(selectedBrand.logo)
    : undefined;
  const selectedMaxLogoSize =
    selectedAspectRatio === undefined
      ? undefined
      : getMaxLogoSize(
          labelConfig.width,
          labelConfig.height,
          labelConfig.brandFontSize,
          labelConfig.filamentFontSize,
          selectedAspectRatio,
        );

  const updateLabelConfig = useCallback(
    (key: keyof typeof labelConfig, value: number) => {
      setAppState((prev) => {
        const updatedLabelConfig = {
          ...prev.labelConfig,
          [key]: value,
        };
        const updatedMaxLogoSize = Math.max(
          ...availableAspectRatios.map((aspectRatio) =>
            getMaxLogoSize(
              updatedLabelConfig.width,
              updatedLabelConfig.height,
              updatedLabelConfig.brandFontSize,
              updatedLabelConfig.filamentFontSize,
              aspectRatio,
            ),
          ),
        );

        return {
          ...prev,
          labelConfig: {
            ...updatedLabelConfig,
            logoSize: Math.max(
              0,
              Math.min(
                updatedLabelConfig.logoSize,
                updatedMaxLogoSize,
              ),
            ),
          },
        };
      });
    },
    [availableAspectRatios, setAppState],
  );

  const formattedMaxLogoSize = Number(maxLogoSize.toFixed(2)).toString();
  const formattedSelectedMaxLogoSize =
    selectedMaxLogoSize === undefined
      ? undefined
      : Number(selectedMaxLogoSize.toFixed(2)).toString();
  const logoSizePlaceholder = formattedSelectedMaxLogoSize
    ? `Max ${formattedSelectedMaxLogoSize} mm for ${selectedBrand?.name}`
    : `Up to ${formattedMaxLogoSize} mm`;
  const logoSizeExplanation =
    "The maximum is calculated from the selected logo's proportions, the label dimensions, and the current font sizes.";

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
            <label className="form-label" htmlFor="logoSize">
              Logo Size (mm)
            </label>
            <NumberInput
              key={`logo-size-${maxLogoSize}`}
              id="logoSize"
              className="form-control"
              defaultValue={Math.min(labelConfig.logoSize, maxLogoSize)}
              min={Math.min(2, maxLogoSize)}
              max={maxLogoSize}
              placeholder={logoSizePlaceholder}
              aria-describedby="logoSizeHelp"
              onValueChange={(value) => {
                if (!(typeof value === "number")) return;
                updateLabelConfig("logoSize", value);
              }}
            />
            <div id="logoSizeHelp" className="form-text">
              {selectedBrand?.logo ? (
                formattedSelectedMaxLogoSize ? (
                  <>
                    {selectedBrand.name} maximum: {formattedSelectedMaxLogoSize}{" "}
                    mm
                  </>
                ) : (
                  <>Calculating {selectedBrand.name}&apos;s maximum...</>
                )
              ) : (
                <>
                  Select a brand with a logo to see its computed maximum. This
                  value updates whenever the selected brand changes.
                </>
              )}{" "}
              <abbr
                title={logoSizeExplanation}
                aria-label={logoSizeExplanation}
                style={{ cursor: "help", textDecoration: "none" }}
              >
                ⓘ
              </abbr>
            </div>
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
