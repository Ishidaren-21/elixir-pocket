import React, { useState, useRef } from "react";
import { FileUp, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, Check, Edit2, Play, ArrowUpRight, ArrowDownRight, RefreshCcw } from "lucide-react";
import { Transaction } from "../types";
import { useAuth } from "../context/AuthContext";

interface StatementImportViewProps {
  onBatchAddTransactions: (txs: Omit<Transaction, "id" | "userId">[]) => Promise<void>;
  onNavigateToTab: (tab: string) => void;
}

interface ExtractedItem {
  amount: number;
  date: string;
  description: string;
  type: "income" | "expense";
  category: string;
  selected: boolean;
}

export const StatementImportView: React.FC<StatementImportViewProps> = ({
  onBatchAddTransactions,
  onNavigateToTab,
}) => {
  const { preferences } = useAuth();
  const currency = preferences?.currency || "INR";

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  // Extracted transactions list for verification
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [isEditingIdx, setIsEditingIdx] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const processSelectedFile = (selectedFile: File) => {
    setError(null);
    setSuccessCount(null);
    setExtractedItems([]);
    
    const allowedTypes = [
      "application/pdf",
      "text/csv",
      "text/plain",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    // PDF, CSV, Excel, or Text statements
    if (!allowedTypes.includes(selectedFile.type) && !selectedFile.name.endsWith(".csv") && !selectedFile.name.endsWith(".xlsx")) {
      setError("Supported templates: PDF, CSV, Excel, or plain TXT files.");
      return;
    }

    setFile(selectedFile);
  };

  // Convert uploaded file to base64 and feed to backend Gemini API
  const handleExtract = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setLoadingStatus("Formulating binary stream...");

    try {
      const reader = new FileReader();
      
      const fileLoadedPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Strip header block for raw base64 data
          const base64Data = result.split(",")[1] || result;
          resolve(base64Data);
        };
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.readAsDataURL(file);
      });

      const base64Data = await fileLoadedPromise;
      
      setLoadingStatus("Contacting Gemini 3.5 core parser...");
      
      const response = await fetch("/api/ai/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileBase64: base64Data,
          mimeType: file.type || "application/pdf",
          fileName: file.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gemini parser failure");
      }

      setLoadingStatus("Formulating structured transaction records...");
      const data = await response.json();

      if (data.transactions && Array.isArray(data.transactions) && data.transactions.length > 0) {
        const mapped: ExtractedItem[] = data.transactions.map((t: any) => ({
          amount: Math.abs(t.amount || 0),
          date: t.date || new Date().toISOString().split("T")[0],
          description: t.description || "Parsed Transaction",
          type: t.type === "income" ? "income" : "expense",
          category: t.category || "other",
          selected: true,
        }));
        setExtractedItems(mapped);
      } else {
        throw new Error("No readable transactions could be extracted. Please check file format clarity.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to process bank statement.");
    } finally {
      setLoading(false);
      setLoadingStatus("");
    }
  };

  // Verification modifications save
  const handleSaveVerified = async () => {
    const active = extractedItems.filter(item => item.selected);
    if (active.length === 0) {
      setError("Please select at least one transaction to commit.");
      return;
    }

    setLoading(true);
    setLoadingStatus("Saving validated transactions to database...");

    try {
      const rawPayload = active.map(item => ({
        amount: item.amount,
        date: item.date,
        description: item.description,
        type: item.type,
        category: item.category,
      }));

      await onBatchAddTransactions(rawPayload);
      setSuccessCount(active.length);
      setExtractedItems([]);
      setFile(null);
    } catch (err) {
      console.error(err);
      setError("Failed to save transactions. Please retry.");
    } finally {
      setLoading(false);
      setLoadingStatus("");
    }
  };

  const handleEditChange = (index: number, field: keyof ExtractedItem, value: any) => {
    const updated = [...extractedItems];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setExtractedItems(updated);
  };

  const toggleSelectAll = (checked: boolean) => {
    const updated = extractedItems.map(item => ({ ...item, selected: checked }));
    setExtractedItems(updated);
  };

  return (
    <div className="space-y-6" id="import_main_frame">
      <div id="import_title_block">
        <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white font-sans">Statement Import</h1>
        <p className="text-xs text-neutral-500 font-sans mt-0.5">Upload bank or UPI statements to automatically extract and record transactions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="import_layout_grid">
        
        {/* Upload Zone & Instructions */}
        <div className="lg:col-span-1 bg-white dark:bg-[#121214] rounded-xl border border-neutral-100 dark:border-neutral-800 p-6 flex flex-col justify-between h-fit" id="upload_zone_card">
          <div className="space-y-4" id="upload_card_body">
            <div className="space-y-1" id="upload_header">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 font-sans">Upload File</h2>
              <p className="text-xs text-neutral-500 font-sans">
                Supports PDF, CSV, Excel, or text statements from major banks and UPI providers.
              </p>
            </div>

            {/* Drag & Drop Area */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`border border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${dragActive ? 'border-neutral-900 bg-neutral-50/50 dark:border-white dark:bg-neutral-850/20' : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50/30'}`}
              id="drag_drop_zone"
            >
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                className="hidden"
                id="file_input_ref_hidden"
                accept=".pdf,.csv,.txt,.xlsx"
              />
              <div className="p-2.5 bg-neutral-50 dark:bg-neutral-850 rounded-lg text-neutral-400" id="icon_back_frame">
                <FileUp className="h-5 w-5" />
              </div>
              
              <div className="space-y-1" id="file_prompt_block">
                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 font-sans">
                  {file ? file.name : "Drag your statement file here"}
                </p>
                <p className="text-[10px] text-neutral-400 font-mono">
                  {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "PDF, CSV, Excel, or TXT (Max 20MB)"}
                </p>
              </div>

              {!file && (
                <button
                  type="button"
                  className="py-1 px-3 border border-neutral-200 dark:border-neutral-800 rounded-lg text-[10px] font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100/50 cursor-pointer"
                  id="browse_files_trigger_btn"
                >
                  Browse Files
                </button>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-lg text-xs text-red-650 dark:text-red-400 flex gap-2 items-start font-sans" id="upload_field_error">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successCount !== null && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg text-xs text-emerald-650 dark:text-emerald-400 flex flex-col gap-1 font-sans" id="import_success_alert">
                <div className="flex items-center gap-2" id="success_alert_head">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">Ingestion Completed</span>
                </div>
                <p className="text-[11px] text-emerald-650 mt-1 dark:text-emerald-400">
                  Successfully imported **{successCount}** transaction statement logs directly into your ledger.
                </p>
                <button 
                  onClick={() => onNavigateToTab("dashboard")}
                  className="text-xs font-semibold hover:underline text-emerald-700 dark:text-emerald-300 text-left mt-2"
                  id="btn_post_import_nav_dash"
                >
                  Go to Dashboard →
                </button>
              </div>
            )}
          </div>

          {file && !loading && extractedItems.length === 0 && (
            <button
              onClick={handleExtract}
              className="w-full py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 font-medium text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-6 font-sans"
              id="extract_parsing_trigger"
            >
              <Sparkles className="h-4 w-4 text-neutral-400" />
              Analyze Statement
            </button>
          )}

          {loading && (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-4 mt-6 border-t border-neutral-100 dark:border-neutral-850" id="ingestion_loader_block">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-600 dark:text-neutral-450" />
              <div className="space-y-1 block" id="loader_status_desc">
                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 font-sans">Autonomous intelligence processing...</p>
                <p className="text-[10px] text-neutral-400 font-mono tracking-widest uppercase">{loadingStatus}</p>
              </div>
            </div>
          )}
        </div>

        {/* Verification Stage Grid (Active Extracted List) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#121214] rounded-xl border border-neutral-100 dark:border-neutral-800 p-6 flex flex-col justify-between" id="verification_stage_card">
          <div className="space-y-4" id="verification_card_body">
            <div className="flex items-center justify-between" id="verification_header">
              <div className="space-y-0.5" id="verification_title">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 font-sans">Review Extracted Entries</h2>
                <p className="text-xs text-neutral-500 font-sans">
                  {extractedItems.length > 0 ? "Review and adjust your transactions before saving them to your ledger." : "Upload a statement to preview and verify transactions here."}
                </p>
              </div>
              
              {extractedItems.length > 0 && (
                <div className="flex items-center gap-1.5" id="select_all_toggle_wrapper">
                  <input 
                    type="checkbox"
                    defaultChecked
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="rounded-sm border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    id="checkbox_verify_select_all"
                  />
                  <span className="text-[10px] font-mono text-neutral-400">SELECT ALL</span>
                </div>
              )}
            </div>

            <div className="grow overflow-y-auto max-h-[380px] divide-y divide-neutral-100 dark:divide-neutral-850" id="verification_items_list">
              {extractedItems.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-center space-y-3" id="verify_empty_block">
                  <FileText className="h-10 w-10 text-neutral-300 stroke-[1.5]" />
                  <p className="text-xs text-neutral-400 font-sans max-w-xs">No active worksheet in cue. Complete the upload stage on the left to start.</p>
                </div>
              ) : (
                extractedItems.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-start gap-4" id={`verify_item_${idx}`}>
                    <input 
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) => handleEditChange(idx, "selected", e.target.checked)}
                      className="mt-1 rounded-sm border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                      id={`verify_check_${idx}`}
                    />
                    
                    <div className="grow grid grid-cols-1 md:grid-cols-3 gap-3 text-xs" id={`verify_row_${idx}`}>
                      {/* Description input */}
                      <div className="space-y-1 md:col-span-1.5" id={`verify_grp_desc_${idx}`}>
                        <label className="text-[9px] text-neutral-400 font-mono">PAYEE/PAYER DESCRIPTION</label>
                        <input 
                          type="text"
                          value={item.description}
                          onChange={(e) => handleEditChange(idx, "description", e.target.value)}
                          className="w-full px-2 py-1 border border-neutral-200 dark:border-neutral-800 bg-neutral-50/30 dark:bg-[#18181b]/50 text-neutral-900 dark:text-white rounded-md text-xs font-sans"
                        />
                      </div>

                      {/* Amount input */}
                      <div className="space-y-1" id={`verify_grp_amt_${idx}`}>
                        <label className="text-[9px] text-neutral-400 font-mono">VALUE AMOUNT ({currency})</label>
                        <input 
                          type="number"
                          value={item.amount}
                          onChange={(e) => handleEditChange(idx, "amount", Number(e.target.value))}
                          className="w-full px-2 py-1 border border-neutral-200 dark:border-neutral-800 bg-neutral-50/30 dark:bg-[#18181b]/50 text-neutral-900 dark:text-white rounded-md text-xs font-mono"
                        />
                      </div>

                      {/* Type and category */}
                      <div className="space-y-1" id={`verify_grp_cat_${idx}`}>
                        <label className="text-[9px] text-neutral-400 font-mono">CLASSIFICATION / ACTION</label>
                        <div className="flex gap-1.5" id={`verify_subactions_${idx}`}>
                          <select
                            value={item.type}
                            onChange={(e) => handleEditChange(idx, "type", e.target.value)}
                            className="px-1.5 py-1 border border-neutral-200 dark:border-neutral-800 bg-neutral-50/30 dark:bg-[#18181b]/50 text-neutral-900 dark:text-white rounded-md text-[10px] font-sans shrink-0"
                          >
                            <option value="income">Credits</option>
                            <option value="expense">Debits</option>
                          </select>
                          <input 
                            type="text"
                            value={item.category}
                            onChange={(e) => handleEditChange(idx, "category", e.target.value)}
                            className="grow px-2 py-1 border border-neutral-200 dark:border-neutral-800 bg-neutral-50/30 dark:bg-[#18181b]/50 text-neutral-900 dark:text-white rounded-md text-[10px] uppercase font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {extractedItems.length > 0 && !loading && (
            <div className="pt-6 border-t border-neutral-100 dark:border-neutral-850 flex justify-between items-center" id="verify_action_row">
              <button
                onClick={() => setExtractedItems([])}
                className="py-1.5 px-3 border border-neutral-200 dark:border-neutral-805 text-neutral-500 rounded-lg text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800/15 cursor-pointer font-sans"
                id="verify_btn_clear"
              >
                Clear worksheet
              </button>
              <button
                onClick={handleSaveVerified}
                className="py-2 px-6 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer font-sans"
                id="verify_btn_commit"
              >
                <Check className="h-4 w-4" />
                Commit verified ({extractedItems.filter(i => i.selected).length}) ledger records
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
