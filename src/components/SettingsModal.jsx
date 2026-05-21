import { useId, useState } from "react";
import { AlertCircle, CheckCircle2, Link2, Loader2, X } from "lucide-react";
import Modal from "./Modal";

export default function SettingsModal({ currentUrl, onSave, onDisconnect, onClose }) {
  const titleId = useId();
  const urlId = useId();
  const statusId = useId();
  const [url, setUrl] = useState(currentUrl || "");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const testConnection = async () => {
    if (!url.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${url.trim()}?action=ping`);
      const data = await res.json();
      if (data.ok) {
        setTestResult({
          type: "success",
          message: `Kết nối OK • ${new Date(data.time).toLocaleTimeString("vi-VN")}`,
        });
      } else {
        setTestResult({ type: "error", message: data.error || "Lỗi không xác định" });
      }
    } catch (e) {
      setTestResult({ type: "error", message: `Không kết nối được: ${e.message}` });
    }
    setTesting(false);
  };

  const handleConnect = async () => {
    if (!url.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${url.trim()}?action=getAll`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.products)) {
        onSave(url.trim(), data);
      } else {
        setTestResult({
          type: "error",
          message: data.error || "API không trả về dữ liệu hợp lệ",
        });
      }
    } catch (e) {
      setTestResult({ type: "error", message: `Lỗi: ${e.message}` });
    }
    setTesting(false);
  };

  return (
    <Modal titleId={titleId} onClose={onClose} className="bg-[#FAF7F2] max-w-xl w-full my-8 shadow-2xl border-t-2 border-stone-900">
      <div className="px-6 py-4 border-b border-stone-300 flex justify-between items-center bg-white">
        <div className="flex items-center gap-2">
          <Link2 aria-hidden="true" className="w-4 h-4 text-stone-700" />
          <h2 id={titleId} className="font-serif text-xl text-stone-900">
            Kết nối Google Sheet
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng cửa sổ cài đặt"
          className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -mr-3 text-stone-600 hover:text-stone-900 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
        >
          <X aria-hidden="true" className="w-4 h-4" />
        </button>
      </div>

      <div className="p-6 space-y-4 bg-white">
        <div>
          <label
            htmlFor={urlId}
            className="block text-[11px] tracking-widest uppercase text-stone-700 mb-1.5 font-medium"
          >
            Apps Script Web App URL
          </label>
          <input
            id={urlId}
            type="url"
            inputMode="url"
            autoComplete="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setTestResult(null);
            }}
            placeholder="https://script.google.com/macros/s/.../exec"
            aria-describedby={`${urlId}-hint ${statusId}`}
            className="w-full px-3 py-2.5 border border-stone-300 focus:outline-none focus-visible:border-amber-800 focus-visible:ring-2 focus-visible:ring-amber-800/30 text-xs font-mono"
          />
          <p id={`${urlId}-hint`} className="text-xs text-stone-600 mt-1.5 italic">
            URL từ Deploy Apps Script (xem hướng dẫn ở dưới)
          </p>
        </div>

        <div id={statusId} role="status" aria-live="polite" className="min-h-[1px]">
          {testResult && (
            <div
              className={`p-3 text-xs flex items-start gap-2 border ${
                testResult.type === "success"
                  ? "bg-amber-50 border-amber-700/40 text-stone-900"
                  : "bg-stone-50 border-stone-400 text-stone-900"
              }`}
            >
              {testResult.type === "success" ? (
                <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-800" />
              ) : (
                <AlertCircle aria-hidden="true" className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-800" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-2">
          <button
            type="button"
            onClick={testConnection}
            disabled={!url.trim() || testing}
            className="text-[11px] tracking-wider uppercase text-stone-700 hover:text-stone-900 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
          >
            Test kết nối
          </button>
          <div className="flex gap-2">
            {currentUrl && (
              <button
                type="button"
                onClick={onDisconnect}
                className="px-4 py-2.5 min-h-[44px] text-[11px] tracking-wider uppercase text-stone-700 hover:text-red-800 border border-stone-300 hover:border-red-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
              >
                Ngắt
              </button>
            )}
            <button
              type="button"
              onClick={handleConnect}
              disabled={!url.trim() || testing}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-stone-900 text-amber-50 text-[11px] tracking-widest uppercase hover:bg-amber-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-800 focus-visible:ring-offset-2"
            >
              {testing && <Loader2 aria-hidden="true" className="w-3 h-3 animate-spin" />}
              Kết nối
            </button>
          </div>
        </div>

        <div className="mt-4 p-4 bg-amber-50 border border-amber-700/30">
          <p className="text-[11px] tracking-widest uppercase text-stone-900 mb-2 font-medium">
            Hướng dẫn nhanh
          </p>
          <ol className="text-xs text-stone-800 space-y-1.5 leading-relaxed list-decimal list-inside">
            <li>
              Mở Google Sheet → Menu <strong>Extensions → Apps Script</strong>
            </li>
            <li>
              Dán nội dung file <span className="font-mono bg-white px-1 py-0.5 border border-stone-200">Code.gs</span>{" "}
              vào editor
            </li>
            <li>
              Bấm <strong>Deploy → New deployment</strong>
            </li>
            <li>
              Type: <strong>Web app</strong> • Execute as: <strong>Me</strong> • Access:{" "}
              <strong>Anyone</strong>
            </li>
            <li>Copy URL → paste vào ô trên</li>
          </ol>
        </div>
      </div>
    </Modal>
  );
}
