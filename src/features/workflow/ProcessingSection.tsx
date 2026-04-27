import { useMemo, useRef, useState } from "react";
import { tauriClient } from "@/shared/api/tauriClient";
import { useAppStore } from "@/shared/store/appStore";
import type { ProcessingOperation } from "@/shared/types/domain";

export function ProcessingSection() {
  const project = useAppStore((s) => s.project);
  const templates = useAppStore((s) => s.templates);
  const ffmpegPath = useAppStore((s) => s.ffmpegPath);
  const addLog = useAppStore((s) => s.addLog);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  const [isCancelled, setIsCancelled] = useState(false);
  const cancelRef = useRef(false);
  const [running, setRunning] = useState(false);

  const processingTemplates = templates?.processing ?? [];
  const selectedTemplate =
    processingTemplates.find((template) => template.id === selectedTemplateId) ?? processingTemplates[0];

  const ops = useMemo(() => selectedTemplate?.operations ?? [], [selectedTemplate]);

  async function runPipeline() {
    if (!project || !selectedTemplate) {
      return;
    }
    setRunning(true);
    setIsCancelled(false);
    cancelRef.current = false;

    for (const operation of ops) {
      if (cancelRef.current) {
        addLog({
          id: crypto.randomUUID(),
          stepId: "processing",
          at: new Date().toISOString(),
          level: "warn",
          message: "Pipeline traitement annulé par l’utilisateur"
        });
        break;
      }

      const response = await tauriClient.executeProcessingOperation(
        ffmpegPath,
        project.workDirs.renamed,
        project.workDirs.processed,
        operation
      );
      addLog({
        id: crypto.randomUUID(),
        stepId: "processing",
        at: new Date().toISOString(),
        level: response.success ? "info" : "error",
        message: `${operation.type} => ${response.success ? "OK" : "Erreur"}`,
        response
      });
      if (!response.success) {
        break;
      }
    }

    setRunning(false);
  }

  return (
    <section className="card">
      <h2>Traitements audio</h2>
      <div className="row">
        <select
          className="input"
          value={selectedTemplate?.id ?? ""}
          onChange={(e) => setSelectedTemplateId(e.target.value)}
        >
          {processingTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        <button
          className="btn"
          disabled={!selectedTemplate || running}
          onClick={() => void runPipeline()}
          type="button"
        >
          Exécuter la chaîne traitements
        </button>
        <button
          className="btn-secondary"
          disabled={!running}
          onClick={() => {
            setIsCancelled(true);
            cancelRef.current = true;
          }}
          type="button"
        >
          Annuler après opération courante
        </button>
      </div>
      {isCancelled ? <p className="muted">Annulation demandée.</p> : null}

      <OperationTable operations={ops} />
    </section>
  );
}

function OperationTable({ operations }: { operations: ProcessingOperation[] }) {
  if (!operations.length) {
    return <p className="muted">Aucune opération de traitement.</p>;
  }
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Ordre</th>
          <th>Opération</th>
          <th>Sortie</th>
          <th>Statut MVP</th>
        </tr>
      </thead>
      <tbody>
        {operations.map((op, index) => (
          <tr key={`${op.type}-${index}`}>
            <td>{index + 1}</td>
            <td>{op.type}</td>
            <td>{extractOutput(op)}</td>
            <td>{isFuture(op) ? "Extension future" : "Implémenté MVP"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function extractOutput(operation: ProcessingOperation): string {
  switch (operation.type) {
    case "mergeToStereo":
    case "mergeToMonoBus":
    case "pan":
    case "gain":
    case "reverbSimple":
    case "futureCompression":
    case "futureNormalize":
      return operation.outputFileName;
  }
}

function isFuture(operation: ProcessingOperation): boolean {
  return operation.type === "futureCompression" || operation.type === "futureNormalize";
}

