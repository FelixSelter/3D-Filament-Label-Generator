import type { Brand } from "../../types";
import { useContextSelector } from "use-context-selector";
import { AppContext } from "../../AppContextWrapper";

import styles from "./BrandListItem.module.css";

export default function BrandListItem({ brand }: { brand: Brand }) {
  const { setAppState } = useContextSelector(AppContext, ({ setAppState }) => ({
    setAppState,
  }));

  return (
    <div className={styles.brandListItem}>
      {brand.logo ? (
        <img src={brand.logo} className={styles.brandLogoSmall} />
      ) : (
        <div style={{ width: "30px", height: "30px", background: "#eee" }} />
      )}
      <span className="flex-grow-1">{brand.name}</span>
      <button
        className="btn btn-sm btn-danger"
        onClick={() =>
          setAppState((prev) => {
            return {
              ...prev,
              brands: prev.brands.filter((b) => b !== brand),
            };
          })
        }
      >
        Delete
      </button>
    </div>
  );
}
