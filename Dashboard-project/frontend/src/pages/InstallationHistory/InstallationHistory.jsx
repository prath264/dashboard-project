import { useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";

import Sidebar from "../../components/Sidebar/sidebar";
import Navbar from "../../components/Navbar/navbar";

import "./installationHistory.css";

const columns = [
    { key: "id", label: "ID" },
    { key: "date", label: "Date" },
    { key: "printer", label: "Printer" },
    { key: "cartridge", label: "Cartridge" },
    { key: "employee", label: "Employee" },
    { key: "location", label: "Location" },
    { key: "engineer", label: "Engineer" },
    { key: "quantity", label: "Quantity" }
];

const rows = [
    {
        id: "INS-001",
        date: "19 Aug 2026",
        printer: "HP LaserJet Pro M404",
        cartridge: "HP 88A",
        employee: "Prathamesh",
        location: "Transit 1st Floor",
        engineer: "Rajesh",
        quantity: 1
    },
    {
        id: "INS-002",
        date: "02 Jul 2026",
        printer: "HP LaserJet Pro M404",
        cartridge: "HP 88A",
        employee: "Prathamesh",
        location: "Transit 1st Floor",
        engineer: "Amit",
        quantity: 1
    },
    {
        id: "INS-003",
        date: "15 May 2026",
        printer: "HP LaserJet Pro M404",
        cartridge: "HP 88A",
        employee: "Prathamesh",
        location: "Transit 1st Floor",
        engineer: "Rajesh",
        quantity: 1
    }
];

function InstallationHistory() {
    const [search, setSearch] = useState("");

    const history = useMemo(() => {
        const searchValue = search.toLowerCase().trim();

        if (!searchValue) {
            return rows;
        }

        return rows.filter((row) =>
            Object.values(row).some((value) =>
                String(value).toLowerCase().includes(searchValue)
            )
        );
    }, [search]);

    return (
        <div className="dashboard-container">
            <Sidebar />

            <div className="main-content">
                <Navbar />

                <main className="history-page">
                    <header className="history-header">
                        <div>
                            <h1>Installation History</h1>

                        </div>
                    </header>

                    <div className="history-toolbar">
                        <div className="history-search">
                            <FiSearch />

                            <input
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search installation history..."
                            />
                        </div>
                    </div>

                    <div className="history-title">
                        

                        <span>
                            {history.length} installation
                            {history.length !== 1 ? "s" : ""}
                        </span>
                    </div>

                    <section className="history-table-card">
                        <div className="history-table-wrap">
                            <table className="history-table">
                                <thead>
                                    <tr>
                                        {columns.map((column) => (
                                            <th
                                                key={column.key}
                                                className={
                                                    column.key === "id" ||
                                                    column.key === "date" ||
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
                                    {history.length > 0 ? (
                                        history.map((row) => (
                                            <tr key={row.id}>
                                                {columns.map((column) => (
                                                    <td
                                                        key={column.key}
                                                        className={
                                                            column.key ===
                                                                "id" ||
                                                            column.key ===
                                                                "date" ||
                                                            column.key ===
                                                                "quantity"
                                                                ? "center-column"
                                                                : ""
                                                        }
                                                    >
                                                        {row[column.key]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={columns.length}
                                                className="no-results"
                                            >
                                                No installation history found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}

export default InstallationHistory;