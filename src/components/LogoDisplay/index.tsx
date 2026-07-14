import { forwardRef, useEffect, useState, type HTMLAttributes } from "react";
import type { Brand } from "../../types";
import styles from "./index.module.css";
import { useContextSelector } from "use-context-selector";
import { AppContext } from "../../AppContextWrapper";
import classNames from "classnames";
import {
  getConstrainedLogoSize,
  getLogoDimensions,
  loadImageAspectRatio,
} from "../../helper";

type Props = HTMLAttributes<HTMLDivElement> & {
  brand: Brand | undefined;
  filamentType: string | undefined;
  filamentName: string | undefined;
};

const LogoDisplay = forwardRef<HTMLDivElement, Props>(
  ({ brand, filamentType, filamentName, ...rest }, ref) => {
    const { labelConfig } = useContextSelector(
      AppContext,
      ({ appState: { labelConfig } }) => ({
        labelConfig,
      }),
    );
    const [logoAspectRatio, setLogoAspectRatio] = useState(1);

    useEffect(() => {
      let active = true;
      const aspectRatio = brand?.logo
        ? loadImageAspectRatio(brand.logo)
        : Promise.resolve(1);

      aspectRatio.then((value) => {
        if (active) setLogoAspectRatio(value);
      });

      return () => {
        active = false;
      };
    }, [brand?.logo]);

    const constrainedLogoSize = getConstrainedLogoSize(
      labelConfig.width,
      labelConfig.height,
      labelConfig.logoSize,
      labelConfig.brandFontSize,
      labelConfig.filamentFontSize,
      logoAspectRatio,
    );
    const logoDimensions = getLogoDimensions(
      constrainedLogoSize,
      logoAspectRatio,
    );

    return (
      <div
        className={styles.labelContainer}
        ref={ref}
        {...rest}
        style={
          {
            ...rest.style,
            "--label-width": `${labelConfig.width}mm`,
            "--label-height": `${labelConfig.height}mm`,
            "--label-border-radius": `${labelConfig.cornerRadius}mm`,
            "--label-logo-width": `${logoDimensions.width}mm`,
            "--label-logo-height": `${logoDimensions.height}mm`,
            "--logo-brand-font-size": `${labelConfig.brandFontSize}pt`,
            "--logo-filament-font-size": `${labelConfig.filamentFontSize}pt`,
            "--label-bg-color": brand?.backgroundColor ?? "white",
          } as React.CSSProperties
        }
      >
        <div className={styles.labelText}>
          <div className={styles.labelBrand}>{brand?.name ?? "Brand Name"}</div>
          <div className={styles.labelSpacer}></div>
          <div className={styles.labelFilamenttype}>
            {filamentType ?? "Type"}
          </div>
          <div className={styles.labelFilamentname}>
            {filamentName ?? "Filament Name"}
          </div>
        </div>
        <div className={styles.logoContainer}>
          {brand?.logo !== undefined ? (
            <img
              className={classNames(
                styles.labelLogo,
                brand?.backgroundColor !== "white" && styles.background,
              )}
              src={brand.logo!}
              alt="logo"
            ></img>
          ) : (
            <></>
          )}
        </div>
      </div>
    );
  },
);

export default LogoDisplay;
