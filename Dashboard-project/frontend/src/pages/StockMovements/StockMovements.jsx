import { useCallback, useEffect, useState } from "react";
import { FiSearch, FiDownload } from "react-icons/fi";

import Sidebar from "../../components/Sidebar/sidebar";
import Navbar from "../../components/Navbar/navbar";

import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../api/apiClient";

import "./stockMovements.css";


const columns = [
    { key: "id", label: "ID" },
    { key: "created_at", label: "Date" },
    { key: "cartridge_model", label: "Cartridge" },
    { key: "movement_type", label: "Movement", status: true },
    { key: "quantity", label: "Quantity" },
    { key: "performed_by_name", label: "Performed By" },
    { key: "remarks", label: "Remarks" },
];

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

function formatQuantity(movementType, quantity) {
    const type = String(movementType || "").toUpperCase();
    if (type === "ISSUE") return `-${quantity}`;
    return `+${quantity}`;
}

function getErrorMessage(error) {
    if (!error) return "Something went wrong.";
    if (typeof error.message === "string") return error.message;
    return "Something went wrong.";
}

function downloadCsv(movements) {
    const headers = [
        "ID",
        "Date",
        "Cartridge",
        "Movement",
        "Quantity",
        "Performed By",
        "Remarks",
    ];

    const rows = movements.map((movement) => [
        movement.id,
        formatDate(movement.created_at),
        movement.cartridge_model,
        movement.movement_type,
        formatQuantity(movement.movement_type, movement.quantity),
        movement.performed_by_name,
        movement.remarks || "",
    ]);

    const escapeCell = (value) => {
        const str = String(value ?? "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const csvContent = [headers, ...rows]
        .map((row) => row.map(escapeCell).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stock-movements-${new Date()
        .toISOString()
        .split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function StockMovements() {
    const { accessToken } = useAuth();

    const [movements, setMovements] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);

    const [search, setSearch] = useState("");
    const [movementType, setMovementType] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [summary, setSummary] = useState({
        issued_this_week: 0,
        received_this_month: 0,
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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
                    issued_this_week: 0,
                    received_this_month: 0,
                }
            );
        } catch (error) {
            console.error("Failed to load stock movement summary:", error);
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

            if (startDate) {
                params.set("start_date", startDate);
            }

            if (endDate) {
                params.set("end_date", endDate);
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
    }, [accessToken, page, pageSize, movementType, startDate, endDate]);

    useEffect(() => {
        loadSummary();
    }, [loadSummary]);

    useEffect(() => {
        loadMovements();
    }, [loadMovements]);

    const searchedMovements = (() => {
        const searchValue = search.toLowerCase().trim();

        if (!searchValue) {
            return movements;
        }

        return movements.filter((movement) =>
            Object.values(movement).some((value) =>
                String(value ?? "").toLowerCase().includes(searchValue)
            )
        );
    })();

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const handleFilterChange = (setter) => (event) => {
        setter(event.target.value);
        setPage(1);
    };

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

                        <button
                            type="button"
                            className="movements-export-btn"
                            onClick={() => downloadCsv(searchedMovements)}
                            disabled={searchedMovements.length === 0}
                        >
                            <FiDownload />
                            Export CSV
                        </button>
                    </header>

                    {error && <div className="form-error">{error}</div>}

                    <div className="movements-summary">
                        <div className="movements-summary-card">
                            <span className="movements-summary-label">
                                Issued This Week
                            </span>
                            <span className="movements-summary-value">
                                {summary.issued_this_week}
                            </span>
                        </div>

                        <div className="movements-summary-card">
                            <span className="movements-summary-label">
                                Received This Month
                            </span>
                            <span className="movements-summary-value">
                                {summary.received_this_month}
                            </span>
                        </div>
                    </div>

                    <div className="movements-toolbar">
                        <div className="movements-search">
                            <FiSearch />
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search stock movements..."
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

                        <input
                            type="date"
                            value={startDate}
                            onChange={handleFilterChange(setStartDate)}
                        />

                        <input
                            type="date"
                            value={endDate}
                            onChange={handleFilterChange(setEndDate)}
                        />
                    </div>

                    <div className="movements-title">
                        <span>
                            {total} movement{total !== 1 ? "s" : ""}
                        </span>
                    </div>

                    <section className="movements-table-card">
                        <div className="movements-table-wrap">
                            <table className="movements-table">
                                <thead>
                                    <tr>
                                        {columns.map((column) => (
                                            <th
                                                key={column.key}
                                                className={
                                                    column.key === "id" ||
                                                    column.key === "created_at" ||
                                                    column.key === "movement_type" ||
                                                    column.key === "quantity"
                                                        ? "center-column"
                                                        : ""
                                                }
                                            >
                                                {column.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={columns.length} className="no-results">
                                                Loading...
                                            </td>
                                        </tr>
                                    ) : searchedMovements.length > 0 ? (
                                        searchedMovements.map((movement) => (
                                            <tr key={movement.id}>
                                                {columns.map((column) => {
                                                    const isCentered =
                                                        column.key === "id" ||
                                                        column.key === "created_at" ||
                                                        column.key === "movement_type" ||
                                                        column.key === "quantity";

                                                    if (column.key === "movement_type") {
                                                        const type = String(
                                                            movement.movement_type || ""
                                                        ).toLowerCase();

                                                        return (
                                                            <td
                                                                key={column.key}
                                                                className={isCentered ? "center-column" : ""}
                                                            >
                                                                <span className={`movements-status ${type}`}>
                                                                    {movement.movement_type}
                                                                </span>
                                                            </td>
                                                        );
                                                    }

                                                    if (column.key === "created_at") {
                                                        return (
                                                            <td
                                                                key={column.key}
                                                                className={isCentered ? "center-column" : ""}
                                                            >
                                                                {formatDate(movement.created_at)}
                                                            </td>
                                                        );
                                                    }

                                                    if (column.key === "quantity") {
                                                        return (
                                                            <td
                                                                key={column.key}
                                                                className={isCentered ? "center-column" : ""}
                                                            >
                                                                {formatQuantity(
                                                                    movement.movement_type,
                                                                    movement.quantity
                                                                )}
                                                            </td>
                                                        );
                                                    }

                                                    return (
                                                        <td
                                                            key={column.key}
                                                            className={isCentered ? "center-column" : ""}
                                                        >
                                                            {movement[column.key] ?? "-"}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={columns.length} className="no-results">
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
                                disabled={page <= 1}
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
                                disabled={page >= totalPages}
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