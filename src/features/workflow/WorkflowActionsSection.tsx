import { useState } from "react";
import { useAppStore } from "@/shared/store/appStore";

const steps: Array<{ id: "importAnalysis" | "renaming" | "processing" | "export"; label: string }> = [
  { id: "importAnalysis", label: "Import / Analyse" },
  { id: "renaming", label: "Renommage" },
  { id: "processing", label: "Traitements" },
  { id: "export", label: "Export" }
];

export function WorkflowActionsSection() {
  const selectedStep = useAppStore((s) => s.selectedStep);
  const setSelectedStep = useAppStore((s) => s.setSelectedStep);
  const setIsRunning = useAppStore((s) => s.setIsRunning);
  const addLog = useAppStore((s) => s.addLog);
  const [runningAll, setRunningAll] = useState(false);

  function runSelectedStep() {
    setIsRunning(true);
    addLog({
      id: crypto.randomUUID(),
      stepId: selectedStep,
      at: new Date().toISOString(),
      level: "info",
      message: `Exécution déclenchée pour étape: ${selectedStep}`
    });
    setIsRunning(false);
  }

  function runWholeWorkflow() {
    setRunningAll(true);
    setIsRunning(true);
    for (const step of steps) {
      setSelectedStep(step.id);
      addLog({
        id: crypto.randomUUID(),
        stepId: step.id,
        at: new Date().toISOString(),
        level: "info",
        message: `Pipeline global: étape ${step.label} démarrée`
      });
    }
    setIsRunning(false);
    setRunningAll(false);
  }

  return (
    <section className="card">
      <h2>Contrôle du workflow</h2>
      <div className="row">
        <select className="input" value={selectedStep} onChange={(e) => setSelectedStep(e.target.value as typeof selectedStep)}>
          {steps.map((step) => (
            <option key={step.id} value={step.id}>
              {step.label}
            </option>
          ))}
        </select>
        <button className="btn" onClick={runSelectedStep} type="button">
          Exécuter l’étape sélectionnée
        </button>
        <button className="btn" disabled={runningAll} onClick={runWholeWorkflow} type="button">
          Exécuter toute la chaîne
        </button>
      </div>
    </section>
  );
}
