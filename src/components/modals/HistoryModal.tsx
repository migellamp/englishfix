import type { HistoryItem } from "../../types";
import { Icon } from "../ui/Icon";

type HistoryModalProps = {
  history: HistoryItem[];
  onClose: () => void;
  onLoad: (item: HistoryItem) => void;
  onDelete: (id: number) => void;
  onClear: () => void;
};

export function HistoryModal({
  history,
  onClose,
  onLoad,
  onDelete,
  onClear,
}: HistoryModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal history-modal" role="dialog" aria-modal="true" aria-labelledby="history-title">
        <div className="modal-topline">
          <span className="modal-kicker">Saved locally</span>
          <button className="close-button" type="button" onClick={onClose} aria-label="Close"><span aria-hidden="true">×</span></button>
        </div>
        <div className="history-title-row">
          <div>
            <h2 id="history-title">Your little archive.</h2>
            <p className="modal-copy">Drafts you have analyzed are saved in this browser.</p>
          </div>
          <span className="history-count">{history.length} {history.length === 1 ? "item" : "items"}</span>
        </div>

        {history.length === 0 ? (
          <div className="history-empty"><span className="empty-orb">↺</span><strong>No history yet.</strong><p>Your first analyzed draft will appear here.</p></div>
        ) : (
          <>
            <div className="history-list">
              {history.map((item) => (
                <div className="history-item" key={item.id}>
                  <button className="history-open" type="button" onClick={() => onLoad(item)}>
                    <span className="history-preview">{item.input}</span>
                    <span className="history-meta">
                      {new Date(item.result.createdAt).toLocaleString("en-US", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      <span> · </span>
                      {item.result.sentences.length} {item.result.sentences.length === 1 ? "sentence" : "sentences"}
                    </span>
                  </button>
                  <button className="history-delete" type="button" onClick={() => onDelete(item.id)} aria-label="Delete history item"><span aria-hidden="true">×</span></button>
                </div>
              ))}
            </div>
            <button className="button button-danger" type="button" onClick={onClear}><Icon>×</Icon> Clear all history</button>
          </>
        )}
      </div>
    </div>
  );
}
