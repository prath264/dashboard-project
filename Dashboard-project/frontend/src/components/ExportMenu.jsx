import { useState } from "react";
import { FiDownload } from "react-icons/fi";

export default function ExportMenu({ onExport, disabled = false, className = "" }) {
    const [open, setOpen] = useState(false);
    const [exporting, setExporting] = useState(false);

    const chooseFormat = async (format) => {
        setOpen(false);
        setExporting(true);
        try {
            await onExport(format);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="export-menu">
            <button
                type="button"
                className={className}
                onClick={() => setOpen((value) => !value)}
                disabled={disabled || exporting}
                aria-haspopup="menu"
                aria-expanded={open}
            >
                <FiDownload /> {exporting ? "Exporting..." : "Export"}
            </button>
            {open && !disabled && (
                <div className="export-menu-options" role="menu">
                    <button type="button" role="menuitem" onClick={() => chooseFormat("excel")}>Export Excel</button>
                    <button type="button" role="menuitem" onClick={() => chooseFormat("pdf")}>Export PDF</button>
                </div>
            )}
        </div>
    );
}
