export function Notice({ text, kind = "info", action }: { text: string; kind?: "info" | "error"; action?: { label: string; onClick: () => void } }) {
  return (
    <div className={`notice ${kind === "error" ? "error" : ""}`} role={kind === "error" ? "alert" : "status"}>
      <span className="icon" aria-hidden="true">
        {kind === "error" ? "!" : "i"}
      </span>
      <div>
        <div>{text}</div>
        {action && (
          <button className="btn secondary" style={{ marginTop: 10 }} onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
