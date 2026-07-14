import { useState } from "react";
import CreatedLabels from "./pageparts/CreatedLabels";
import ExportImport from "./pageparts/ExportImport";
import GlobalLabelSettings from "./pageparts/GlobalLabelSettings";
import LabelDesigner from "./pageparts/LabelDesigner";
import Management from "./pageparts/Management";
import type { Brand } from "./types";

function App() {
  const [selectedBrand, setSelectedBrand] = useState<Brand | undefined>();

  return (
    <div className="container py-4">
      <header className="text-center mb-4">
        <h1>3D Filament Label Generator</h1>
        <p className="text-muted">
          Create custom labels for your 3D printing filament spools
        </p>
        <a
          href="https://github.com/FelixSelter/3D-Filament-Label-Generator"
          target="_blank"
          className="btn btn-sm btn-outline-secondary"
        >
          View on GitHub
        </a>
      </header>

      <ExportImport />
      <Management />
      <GlobalLabelSettings selectedBrand={selectedBrand} />
      <LabelDesigner
        brand={selectedBrand}
        onBrandChange={setSelectedBrand}
      />
      <CreatedLabels />
    </div>
  );
}

export default App;
