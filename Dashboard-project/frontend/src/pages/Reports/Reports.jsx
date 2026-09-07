import { useCallback, useEffect, useState } from "react";
import {
    FiDownload,
    FiCalendar,
    FiTrendingUp,
    FiPackage,
    FiMapPin,
    FiArrowUp,
    FiArrowDown,
    FiMinus,
    FiAlertCircle,
} from "react-icons/fi";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import * as XLSX from "xlsx";

import Sidebar from "../../components/Sidebar/sidebar";
import Navbar from "../../components/Navbar/navbar";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../api/apiClient";

import "./reports.css";


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

function formatMonth(value) {
    if (!value) return "";
    const date = new Date(value);
    return date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
    });
}

function IssueTooltip({ active, payload, label }) {
    if (!active || !payload?.length) {
        return null;
    }

    const issued = payload.find((p) => p.name === "Issued");
    const received = payload.find((p) => p.name === "Received");

    return (
        <div className="reports-tooltip">
            <span>{formatMonth(label)}</span>
            {issued && (
                <div className="tooltip-row issued">
                    <FiArrowUp size={12} />
                    <strong>Issued: {issued.value}</strong>
                </div>
            )}
            {received && (
                <div className="tooltip-row received">
                    <FiArrowDown size={12} />
                    <strong>Received: {received.value}</strong>
                </div>
            )}
        </div>
    );
}

function downloadExcel(data, filename, headers) {
    const worksheetData = [headers, ...data.map((row) => headers.map((h) => row[h.key]))];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "2563EB" } },
        alignment: { horizontal: "center" },
    };

    const headerRow = 1;
    for (let i = 0; i < headers.length; i++) {
        const cellAddress = XLSX.utils.encode_cell({ r: headerRow - 1, c: i });
        if (!worksheet[cellAddress]) worksheet[cellAddress] = { v: headers[i].label };
        worksheet[cellAddress].s = headerStyle;
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, filename);
}

const SUMMARY_CARDS = [
    {
        key: "issued",
        label: "Total Issued",
        icon: FiArrowUp,
        color: "#f59e0b",
        bgColor: "#fef3c7",
    },
    {
        key: "received",
        label: "Total Received",
        icon: FiArrowDown,
        color: "#10b981",
        bgColor: "#d1fae5",
    },
    {
        key: "net",
        label: "Net Movement",
        icon: FiMinus,
        color: "#6366f1",
        bgColor: "#e0e7ff",
    },
    {
        key: "pending",
        label: "Pending Requests",
        icon: FiAlertCircle,
        color: "#ef4444",
        bgColor: "#fee2e2",
    },
];

const TOP_CARTRIDGES_HEADERS = [
    { key: "cartridge_model", label: "Cartridge Model" },
    { key: "total_issued", label: "Total Issued" },
];

const LOCATION_HEADERS = [
    { key: "location_name", label: "Location" },
    { key: "total_issued", label: "Total Issued" },
];

function Reports() {
    const { accessToken } = useAuth();

    const [data, setData] = useState({
        summary: { issued: 0, received: 0, net: 0, pending: 0 },
        top_cartridges: [],
        location_consumption: [],
        monthly_trend: [],
    });

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadReports = useCallback(async () => {
        if (!accessToken) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError("");

            const params = new URLSearchParams();
            if (startDate) params.set("start_date", startDate);
            if (endDate) params.set("end_date", endDate);

            const response = await apiRequest(
                `/reports?${params.toString()}`,
                { method: "GET" },
                accessToken
            );

            setData(response.data || {
                summary: { issued: 0, received: 0, net: 0, pending: 0 },
                top_cartridges: [],
                location_consumption: [],
                monthly_trend: [],
            });
        } catch (err) {
            console.error("Failed to load reports:", err);
            setError(err.message || "Failed to load reports.");
        } finally {
            setLoading(false);
        }
    }, [accessToken, startDate, endDate]);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    useEffect(() => {
    window.scrollTo(0, 0);
    }, []);

    const handleFilterChange = (setter) => (event) => {
        setter(event.target.value);
    };

    const handleExportTopCartridges = () => {
        const exportData = data.top_cartridges.map((item, index) => ({
            ...item,
            rank: index + 1,
        }));
        downloadExcel(
            exportData,
            `top-cartridges-${new Date().toISOString().split("T")[0]}.xlsx`,
            [
                { key: "rank", label: "Rank" },
                { key: "cartridge_model", label: "Cartridge Model" },
                { key: "total_issued", label: "Total Issued" },
            ]
        );
    };

    const handleExportLocations = () => {
        const exportData = data.location_consumption.map((item, index) => ({
            ...item,
            rank: index + 1,
        }));
        downloadExcel(
            exportData,
            `consumption-by-location-${new Date().toISOString().split("T")[0]}.xlsx`,
            [
                { key: "rank", label: "Rank" },
                { key: "location_name", label: "Location" },
                { key: "total_issued", label: "Total Issued" },
            ]
        );
    };

    const totalIssued = data.monthly_trend.reduce((sum, item) => sum + (item.issued || 0), 0);
    const totalReceived = data.monthly_trend.reduce((sum, item) => sum + (item.received || 0), 0);

    return (
        <div className="reports-container">
            <Sidebar />

            <div className="main-content">
                <Navbar />

                <main className="reports-page">
                    <header className="reports-header">
                        <div>
                            <h1>Reports</h1>
                            <p>Consumption analytics and inventory movement overview</p>
                        </div>
                    </header>

                    {error && <div className="form-error">{error}</div>}

                    <div className="reports-filters">
                        <div className="filter-group">
                            <label htmlFor="startDate">
                                <FiCalendar /> From
                            </label>
                            <input
                                type="date"
                                id="startDate"
                                value={startDate}
                                onChange={handleFilterChange(setStartDate)}
                            />
                        </div>

                        <div className="filter-group">
                            <label htmlFor="endDate">
                                <FiCalendar /> To
                            </label>
                            <input
                                type="date"
                                id="endDate"
                                value={endDate}
                                onChange={handleFilterChange(setEndDate)}
                            />
                        </div>

                        <button
                            type="button"
                            className="reports-apply-btn"
                            onClick={loadReports}
                            disabled={loading}
                        >
                            Apply Filters
                        </button>
                    </div>

                    <div className="reports-summary-grid">
                        {SUMMARY_CARDS.map((card) => (
                            <div key={card.key} className="reports-summary-card">
                                <div className="summary-icon" style={{ backgroundColor: card.bgColor }}>
                                    <card.icon size={24} style={{ color: card.color }} />
                                </div>
                                <div className="summary-content">
                                    <span className="summary-label">{card.label}</span>
                                    <span className="summary-value" style={{ color: card.color }}>
                                        {data.summary[card.key]?.toLocaleString() ?? 0}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="reports-charts-grid">
                        <section className="reports-chart-card trend-chart">
                            <div className="chart-header">
                                <div>
                                    <h3>
                                        <FiTrendingUp /> 6-Month Issued vs Received
                                    </h3>
                                    <p>Monthly cartridge movement trend</p>
                                </div>
                                <span className="chart-total">
                                    {loading ? "..." : `${totalIssued.toLocaleString()} issued / ${totalReceived.toLocaleString()} received`}
                                </span>
                            </div>

                            <div className="trend-chart-wrap">
                                {loading && <div className="chart-message">Loading...</div>}
                                {!loading && error && <div className="chart-message error">{error}</div>}
                                {!loading && !error && data.monthly_trend.length === 0 && (
                                    <div className="chart-message">No trend data available.</div>
                                )}
                                {!loading && !error && data.monthly_trend.length > 0 && (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart
                                            data={data.monthly_trend}
                                            margin={{ top: 18, right: 12, left: -18, bottom: 0 }}
                                        >
                                            <defs>
                                                <linearGradient id="issuedGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.26} />
                                                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.01} />
                                                </linearGradient>
                                                <linearGradient id="receivedGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.26} />
                                                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.01} />
                                                </linearGradient>
                                            </defs>

                                            <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="month"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: "#6b7280", fontSize: 13 }}
                                                tickFormatter={formatMonth}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: "#6b7280", fontSize: 13 }}
                                                width={42}
                                            />
                                            <Tooltip
                                                content={<IssueTooltip />}
                                                cursor={{ stroke: "#93c5fd", strokeWidth: 2 }}
                                            />

                                            <Area
                                                type="monotone"
                                                dataKey="issued"
                                                name="Issued"
                                                stroke="#f59e0b"
                                                strokeWidth={3}
                                                fill="url(#issuedGradient)"
                                                activeDot={{
                                                    r: 6,
                                                    fill: "#ffffff",
                                                    stroke: "#f59e0b",
                                                    strokeWidth: 3,
                                                }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="received"
                                                name="Received"
                                                stroke="#10b981"
                                                strokeWidth={3}
                                                fill="url(#receivedGradient)"
                                                activeDot={{
                                                    r: 6,
                                                    fill: "#ffffff",
                                                    stroke: "#10b981",
                                                    strokeWidth: 3,
                                                }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </section>
                    </div>

                    <div className="reports-tables-grid">
                        <section className="reports-table-card">
                            <div className="table-header">
                                <div>
                                    <h3>
                                        <FiPackage /> Top Consumed Cartridges
                                    </h3>
                                    <p>Most issued cartridge models in selected period</p>
                                </div>
                                <button
                                    type="button"
                                    className="table-export-btn"
                                    onClick={handleExportTopCartridges}
                                    disabled={data.top_cartridges.length === 0 || loading}
                                >
                                    <FiDownload /> Export Excel
                                </button>
                            </div>

                            <div className="reports-table-wrap">
                                <table className="reports-table">
                                    <thead>
                                        <tr>
                                            <th>Rank</th>
                                            <th>Cartridge Model</th>
                                            <th className="center-column">Total Issued</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan={3} className="no-results">Loading...</td>
                                            </tr>
                                        ) : data.top_cartridges.length > 0 ? (
                                            data.top_cartridges.map((item, index) => (
                                                <tr key={item.cartridge_id}>
                                                    <td className="center-column">{index + 1}</td>
                                                    <td>{item.cartridge_model}</td>
                                                    <td className="center-column">{item.total_issued.toLocaleString()}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="no-results">No cartridge consumption data.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="reports-table-card">
                            <div className="table-header">
                                <div>
                                    <h3>
                                        <FiMapPin /> Consumption by Location
                                    </h3>
                                    <p>Cartridge issues grouped by location</p>
                                </div>
                                <button
                                    type="button"
                                    className="table-export-btn"
                                    onClick={handleExportLocations}
                                    disabled={data.location_consumption.length === 0 || loading}
                                >
                                    <FiDownload /> Export Excel
                                </button>
                            </div>

                            <div className="reports-table-wrap">
                                <table className="reports-table">
                                    <thead>
                                        <tr>
                                            <th>Rank</th>
                                            <th>Location</th>
                                            <th className="center-column">Total Issued</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan={3} className="no-results">Loading...</td>
                                            </tr>
                                        ) : data.location_consumption.length > 0 ? (
                                            data.location_consumption.map((item, index) => (
                                                <tr key={item.location_id}>
                                                    <td className="center-column">{index + 1}</td>
                                                    <td>{item.location_name}</td>
                                                    <td className="center-column">{item.total_issued.toLocaleString()}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="no-results">No location consumption data.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Reports;