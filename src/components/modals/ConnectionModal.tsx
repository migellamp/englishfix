import { useState, type FormEvent } from "react";
import { verifyProviderConnection } from "../../lib/llmClient";
import { readSession } from "../../lib/storage";
import type { ConnectionSession } from "../../types";
import { Icon } from "../ui/Icon";

type ConnectionModalProps = {
  onClose: () => void;
  onConnected: (session: ConnectionSession) => void;
};

export function ConnectionModal({ onClose, onConnected }: ConnectionModalProps) {
  const existingSession = readSession();
  const [baseUrl, setBaseUrl] = useState(existingSession?.baseUrl ?? "https://api.openai.com/v1");
  const [apiKey, setApiKey] = useState(existingSession?.apiKey ?? "");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  const verifyByok = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedUrl = baseUrl.trim().replace(/\/+$/, "");

    if (!normalizedUrl || !apiKey.trim()) {
      setError("Enter a base URL and API key before checking the connection.");
      return;
    }
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      setError("The base URL must start with http:// or https://.");
      return;
    }

    setIsBusy(true);
    setError("");
    try {
      const verification = await verifyProviderConnection({
        baseUrl: normalizedUrl,
        apiKey: apiKey.trim(),
        modelId: existingSession?.modelId,
      });
      onConnected({
        provider: "byok",
        baseUrl: normalizedUrl,
        apiKey: apiKey.trim(),
        modelId: verification.modelId,
        availableModels: verification.availableModels,
        connectedAt: Date.now(),
      });
    } catch (connectionError) {
      setError(connectionError instanceof Error ? connectionError.message : "Unable to verify the LLM connection.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal connection-modal" role="dialog" aria-modal="true" aria-labelledby="connection-title">
        <div className="modal-topline">
          <span className="modal-kicker">Your setup</span>
          <button className="close-button" type="button" onClick={onClose} aria-label="Close"><span aria-hidden="true">×</span></button>
        </div>
        <h2 id="connection-title">Bring your <em>model.</em></h2>
        <p className="modal-copy">Enter your provider details first. You can choose a model beside the chat input after the connection is checked.</p>

        <form className="connection-panel byok-panel" onSubmit={(event) => void verifyByok(event)}>
          <h3>Use your own key</h3>
          <p>EnglishFix sends requests directly from this browser to the provider you choose. Your key is never sent to or stored by an EnglishFix server.</p>
          <div className="field-group">
            <label htmlFor="base-url">Base URL</label>
            <input id="base-url" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.openai.com/v1" autoComplete="url" />
            <span>Include the provider&apos;s API version, such as <code>/v1</code>.</span>
          </div>
          <div className="field-group">
            <label htmlFor="api-key">API key</label>
            <input id="api-key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="sk-..." autoComplete="off" />
            <span>Saved only in this browser&apos;s local storage. Review the open-source code before using a public deployment.</span>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-accent full-button" type="submit" disabled={isBusy}>
            {isBusy ? <><span className="spinner" /> Checking connection...</> : <>Check connection <Icon>→</Icon></>}
          </button>
          <p className="verify-note">EnglishFix checks <code>GET /models</code> directly, then makes the model picker available beside the chat input. Your provider must allow browser requests (CORS).</p>
        </form>
        <p className="modal-footnote"><Icon>⌁</Icon><span>Disconnect removes the saved key from this browser. Never use a personal key on an untrusted device.</span></p>
      </div>
    </div>
  );
}
