import { useCallback, useEffect, useState } from "react";
import { FiSearch, FiX, FiFilter } from "react-icons/fi";

import Sidebar from "../../components/Sidebar/sidebar";
import Navbar from "../../components/Navbar/navbar";

import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../api/apiClient";
import { downloadFile } from "../../api/downloadFile";
import ExportMenu from "../../components/ExportMenu";

import "./stockMovements.css";


function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatQuantity(movementType, quantity) {
    const type = String(movementType || "").toUpperCase();
    if (type === "ISSUE") return `-${quantity}`;
    if (type === "RECEIPT") return `+${quantity}`;
    if (type === "ADJUSTMENT") {
        return quantity >= 0 ? `+${quantity}` : String(quantity);
    }
    return `+${quantity}`;
}

function getErrorMessage(error) {
    if (!error) return "Something went wrong.";
    if (typeof error.message === "string") return error.message;
    return "Something went wrong.";
}

function StockMovements() {
    const { accessToken } = useAuth();

    const [movements, setMovements] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);

    const [search, setSearch] = useState("");
    const [movementType, setMovementType] = useState("");
    const [cartridgeId, setCartridgeId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [summary, setSummary] = useState({
        issued: 0,
        received: 0,
        adjusted: 0,
        net_movement: 0,
        issued_this_week: 0,
        received_this_month: 0,
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [exportLoading, setExportLoading] = useState(false);

    const [cartridges, setCartridges] = useState([]);

    const loadSummary = useCallback(async () => {
        if (!accessToken) return;

        try {
            const response = await apiRequest(
                "/stock-movements/summary",
                { method: "GET" },
                accessToken
            );

            setSummary(
                response.data || {
                    issued: 0,
                    received: 0,
                    adjusted: 0,
                    net_movement: 0,
                    issued_this_week: 0,
                    received_this_month: 0,
                }
            );
        } catch (error) {
            console.error("Failed to load stock movement summary:", error);
        }
    }, [accessToken]);

    const loadCartridges = useCallback(async () => {
        if (!accessToken) return;

        try {
            const response = await apiRequest(
                "/cartridges?is_active=true",
                { method: "GET" },
                accessToken
            );
            setCartridges(response.data || []);
        } catch (error) {
            console.error("Failed to load cartridges:", error);
        }
    }, [accessToken]);

    const loadMovements = useCallback(async () => {
        if (!accessToken) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError("");

            const params = new URLSearchParams();
            params.set("page", String(page));
            params.set("page_size", String(pageSize));

            if (movementType) {
                params.set("movement_type", movementType);
            }

            if (cartridgeId) {
                params.set("cartridge_id", String(cartridgeId));
            }

            if (startDate) {
                params.set("start_date", startDate);
            }

            if (endDate) {
                params.set("end_date", endDate);
            }

            if (search) {
                params.set("search", search);
            }

            const response = await apiRequest(
                `/stock-movements?${params.toString()}`,
                { method: "GET" },
                accessToken
            );

            setMovements(response.data || []);
            setTotal(response.meta?.total || 0);
        } catch (error) {
            console.error("Failed to load stock movements:", error);
            setError(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [accessToken, page, pageSize, movementType, cartridgeId, startDate, endDate, search]);

    const handleExport = useCallback(async (exportFormat) => {
        if (!accessToken) return;

        try {
            setExportLoading(true);

            const params = new URLSearchParams();
            params.set("format", exportFormat);
            if (movementType) params.set("movement_type", movementType);
            if (cartridgeId) params.set("cartridge_id", String(cartridgeId));
            if (startDate) params.set("start_date", startDate);
            if (endDate) params.set("end_date", endDate);
            if (search) params.set("search", search);

            await downloadFile(
                `/stock-movements/export?${params.toString()}`,
                accessToken
            );
        } catch (error) {
            console.error("Failed to export stock movements:", error);
            setError(getErrorMessage(error));
        } finally {
            setExportLoading(false);
        }
    }, [accessToken, movementType, cartridgeId, startDate, endDate, search]);

    const handleFilterChange = (setter) => (event) => {
        setter(event.target.value);
        setPage(1);
    };

    const handleSearchChange = (event) => {
        setSearch(event.target.value);
        setPage(1);
    };

    const clearFilters = () => {
        setSearch("");
        setMovementType("");
        setCartridgeId("");
        setStartDate("");
        setEndDate("");
        setPage(1);
    };

    const hasActiveFilters = search || movementType || cartridgeId || startDate || endDate;

    useEffect(() => {
        loadSummary();
        loadCartridges();
    }, [loadSummary, loadCartridges]);

    useEffect(() => {
        loadMovements();
    }, [loadMovements]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <div className="dashboard-container">
            <Sidebar />

            <div className="main-content">
                <Navbar />

                <main className="movements-page">
                    <header className="movements-header">
                        <div>
                            <h1>Stock Movements</h1>
                        </div>

                        <ExportMenu
                            className="movements-export-btn"
                            onExport={handleExport}
                            disabled={total === 0 || exportLoading}
                        />
                    </header>

                    {error && <div className="form-error">{error}</div>}

                    <div className="movements-summary">
                        <div className="movements-summary-card">
                            <span className="movements-summary-label">
                                Total Issued
                            </span>
                            <span className="movements-summary-value issued">
                                {summary.issued.toLocaleString()}
                            </span>
                        </div>

                        <div className="movements-summary-card">
                            <span className="movements-summary-label">
                                Total Received
                            </span>
                            <span className="movements-summary-value received">
                                {summary.received.toLocaleString()}
                            </span>
                        </div>

                        <div className="movements-summary-card">
                            <span className="movements-summary-label">
                                Total Adjusted
                            </span>
                            <span className="movements-summary-value adjusted">
                                {summary.adjusted.toLocaleString()}
                            </span>
                        </div>

                        <div className="movements-summary-card">
                            <span className="movements-summary-label">
                                Net Movement
                            </span>
                            <span className={`movements-summary-value ${summary.net_movement >= 0 ? "positive" : "negative"}`}>
                                {summary.net_movement >= 0 ? "+" : ""}{summary.net_movement.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <div className="movements-toolbar">
                        <div className="movements-search">
                            <FiSearch />
                            <input
                                type="text"
                                value={search}
                                onChange={handleSearchChange}
                                placeholder="Search: cartridge, printer, employee, location, reference..."
                            />
                        </div>

                        <select
                            value={movementType}
                            onChange={handleFilterChange(setMovementType)}
                        >
                            <option value="">All Movements</option>
                            <option value="RECEIPT">Receipt</option>
                            <option value="ISSUE">Issue</option>
                            <option value="ADJUSTMENT">Adjustment</option>
                            <option value="RETURN">Return</option>
                        </select>

                        <select
                            value={cartridgeId}
                            onChange={handleFilterChange(setCartridgeId)}
                        >
                            <option value="">All Cartridges</option>
                            {cartridges.map((cartridge) => (
                                <option key={cartridge.id} value={cartridge.id}>
                                    {cartridge.model} ({cartridge.color})
                                </option>
                            ))}
                        </select>

                        <input
                            type="date"
                            value={startDate}
                            onChange={handleFilterChange(setStartDate)}
                            placeholder="From"
                        />

                        <input
                            type="date"
                            value={endDate}
                            onChange={handleFilterChange(setEndDate)}
                            placeholder="To"
                        />

                        {hasActiveFilters && (
                            <button
                                type="button"
                                className="movements-clear-btn"
                                onClick={clearFilters}
                            >
                                <FiX /> Clear Filters
                            </button>
                        )}
                    </div>

                    <div className="movements-title">
                        <span>
                            {total} movement{total !== 1 ? "s" : ""} found
                        </span>
                    </div>

                    <section className="movements-table-card">
                        <div className="movements-table-wrap">
                            <table className="movements-table">
                                <thead>
                                    <tr>
                                        <th className="center-column">ID</th>
                                        <th>Date/Time</th>
                                        <th>Movement</th>
                                        <th>Cartridge</th>
                                        <th>Printer</th>
                                        <th>Employee</th>
                                        <th>Location</th>
                                        <th className="center-column">Quantity</th>
                                        <th>Performed By</th>
                                        <th>Reference</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={11} className="no-results">
                                                Loading...
                                            </td>
                                        </tr>
                                    ) : movements.length > 0 ? (
                                        movements.map((movement) => (
                                            <tr key={movement.id}>
                                                <td className="center-column">{movement.id}</td>
                                                <td>{formatDateTime(movement.created_at)}</td>
                                                <td className="center-column">
                                                    <span className={`movements-status ${movement.movement_type.toLowerCase()}`}>
                                                        {movement.movement_type}
                                                    </span>
                                                </td>
                                                <td>{movement.cartridge_model} ({movement.cartridge_color})</td>
                                                <td>{movement.printer_model}</td>
                                                <td>
                                                    {movement.employee_name
                                                        ? `${movement.employee_name} (${movement.employee_id})`
                                                        : "-"}
                                                </td>
                                                <td>{movement.location_name || "-"}</td>
                                                <td className="center-column">
                                                    {formatQuantity(movement.movement_type, movement.quantity)}
                                                </td>
                                                <td>{movement.performed_by_name}</td>
                                                <td className="center-column">
                                                    {movement.reference_id ? `#${movement.reference_id}` : "-"}
                                                </td>
                                                <td>{movement.remarks || "-"}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={11} className="no-results">
                                                No stock movements found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="movements-pagination">
                            <button
                                type="button"
                                onClick={() => setPage((current) => Math.max(1, current - 1))}
                                disabled={page <= 1 || loading}
                            >
                                Previous
                            </button>

                            <span>
                                Page {page} of {totalPages}
                            </span>

                            <button
                                type="button"
                                onClick={() =>
                                    setPage((current) => Math.min(totalPages, current + 1))
                                }
                                disabled={page >= totalPages || loading}
                            >
                                Next
                            </button>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}

export default StockMovements;
