import { useContextSelector } from "use-context-selector";
import { AppContext } from "../../AppContextWrapper";
import type { FilamentType } from "../../types";

import styles from "./TypeListItem.module.css";

export default function TypeListItem({ type }: { type: FilamentType }) {
  const { setAppState } = useContextSelector(AppContext, ({ setAppState }) => ({
    setAppState,
  }));

  return (
    <div className={styles.typeListItem}>
      <span className="flex-grow-1">{type}</span>
      <button
        className="btn btn-sm btn-danger"
        onClick={() =>
          setAppState((prev) => {
            return {
              ...prev,
              filamentTypes: prev.filamentTypes.filter((t) => t !== type),
            };
          })
        }
      >
        Delete
      </button>
    </div>
  );
}
