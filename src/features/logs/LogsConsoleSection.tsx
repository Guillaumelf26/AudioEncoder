import { useAppStore } from "@/shared/store/appStore";

export function LogsConsoleSection() {
  const logs = useAppStore((s) => s.logs);
  const clearLogs = useAppStore((s) => s.clearLogs);

  return (
    <section className="card">
      <div className="row">
        <h2>Logs / Console</h2>
        <button className="btn-secondary" onClick={clearLogs} type="button">
          Vider
        </button>
      </div>

      {!logs.length ? (
        <p className="muted">Aucun log.</p>
      ) : (
        <div className="log-list">
          {logs.map((log) => (
            <article key={log.id} className={`log-entry ${log.level}`}>
              <header>
                <strong>{log.stepId}</strong>
                <span>{new Date(log.at).toLocaleString()}</span>
              </header>
              <p>{log.message}</p>
              {log.response ? (
                <details>
                  <summary>Sortie commande</summary>
                  <pre>{`${log.response.command} ${log.response.args.join(" ")}`}</pre>
                  <pre>{log.response.stdout || "(stdout vide)"}</pre>
                  <pre>{log.response.stderr || "(stderr vide)"}</pre>
                </details>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
