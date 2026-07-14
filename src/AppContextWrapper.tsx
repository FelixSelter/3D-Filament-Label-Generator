import { useEffect, useRef, useState } from "react";
import { AppStateSchema, type AppStateType } from "./types";
import {
  BAMBULAB_LOGO,
  ERYONE_LOGO,
  ESUN_LOGO,
  GEEETECH_LOGO,
  JAYO_LOGO,
  KINGROON_LOGO,
  POLYMAKER_LOGO,
  SUNLU_LOGO,
  TINMORRY_LOGO,
  ZERO_LOGO,
} from "./logos";
import { createContext } from "use-context-selector";
import { migrate, SafeSchemaV1 } from "./pageparts/ExportImport";
import { showUserError } from "./helper";

// eslint-disable-next-line react-refresh/only-export-components
export const defaultContext: AppStateType = {
  brands: [
    {
      name: "GEEETECH",
      logo: GEEETECH_LOGO,
      backgroundColor: "#242524",
    },
    {
      name: "Zero",
      logo: ZERO_LOGO,
      backgroundColor: "white",
    },
    {
      name: "Kingroon",
      logo: KINGROON_LOGO,
      backgroundColor: "white",
    },
    {
      name: "Tinmorry",
      logo: TINMORRY_LOGO,
      backgroundColor: "white",
    },
    {
      name: "Bambulab",
      logo: BAMBULAB_LOGO,
      backgroundColor: "white",
    },
    {
      name: "eSun",
      logo: ESUN_LOGO,
      backgroundColor: "white",
    },
    {
      name: "Eryone",
      logo: ERYONE_LOGO,
      backgroundColor: "white",
    },
    {
      name: "Polymaker",
      logo: POLYMAKER_LOGO,
      backgroundColor: "white",
    },
    {
      name: "Jayo",
      logo: JAYO_LOGO,
      backgroundColor: "white",
    },
    {
      name: "Sunlu",
      logo: SUNLU_LOGO,
      backgroundColor: "#242524",
    },
  ],
  labels: [],
  labelConfig: {
    width: 22,
    height: 12,
    cornerRadius: 2,
    borderStyle: "dashed",
    logoSize: 6,
    brandFontSize: 6,
    filamentFontSize: 5,
  },
  filamentTypes: [
    "PLA",
    "PLA Matte",
    "PLA SILK",
    "PLA Luminous",
    "PETG",
    "ABS",
    "TPU",
    "ASA",
  ],
};

function loadLocalStorageV1(): AppStateType | null {
  const savedBrands = localStorage.getItem("filamentLabels_brands");
  const savedTypes = localStorage.getItem("filamentLabels_types");
  const savedSettings = localStorage.getItem("filamentLabels_settings");
  localStorage.removeItem("filamentLabels_brands");
  localStorage.removeItem("filamentLabels_types");
  localStorage.removeItem("filamentLabels_settings");
  if (!savedBrands || !savedTypes || !savedSettings) return null;

  try {
    const v1 = SafeSchemaV1.parse({
      brands: JSON.parse(savedBrands),
      filamentTypes: JSON.parse(savedTypes),
    });

    const migrated = migrate(v1);
    if (!migrated) {
      showUserError("Error migrating data from localStorage");
      return null;
    }

    const parsed = AppStateSchema.safeParse({
      ...migrated,
      labelConfig: {
        ...migrated.labelConfig,
        ...JSON.parse(savedSettings),
      },
    });
    return parsed.success ? parsed.data : migrated;
  } catch (e) {
    console.error("Error loading brands from localStorage", e);
    return null;
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext<{
  appState: AppStateType;
  setAppState: React.Dispatch<React.SetStateAction<AppStateType>>;
}>({
  appState: defaultContext,
  setAppState: () => {},
});

export default function AppContextWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [appState, setAppState] = useState<AppStateType>(defaultContext);
  const loadedFromLocalStorage = useRef(false);

  useEffect(() => {
    setTimeout(() => {
      loadedFromLocalStorage.current = true;
    }, 1000);

    const localStorageState = localStorage.getItem("appState");
    if (!localStorageState) {
      const migrated = loadLocalStorageV1();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (migrated) setAppState(migrated);
      return;
    }

    try {
      const parsed = JSON.parse(localStorageState);
      const migrated = migrate(parsed);
      if (!migrated) {
        showUserError("Error migrating data from localStorage");
        return;
      }

      setAppState(migrated);
    } catch (e) {
      console.error("Error loading appState from localStorage", e);
    }
  }, []);

  // Save to localStorage on every change
  useEffect(() => {
    if (!loadedFromLocalStorage.current) return;
    console.log("Saving appState to localStorage", appState);
    localStorage.setItem("appState", JSON.stringify(appState));
  }, [appState]);

  return (
    <AppContext.Provider value={{ appState, setAppState }}>
      {children}
    </AppContext.Provider>
  );
}
