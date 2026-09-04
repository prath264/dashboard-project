import { useEffect, useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";

import Sidebar from "../../components/Sidebar/sidebar";
import Navbar from "../../components/Navbar/navbar";
import IssueCartridgeForm from "../../components/Forms/IssueCartridgeForm/issueCartridgeForm";
import { apiRequest } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";

import "./cartridgeRequests.css";


const columns = [
    { key: "id", label: "Request ID" },
    { key: "requester_name", label: "Requester" },
    { key: "location_name", label: "Location" },
    { key: "printer_model", label: "Printer" },
    { key: "cartridge_model", label: "Cartridge" },
    { key: "quantity", label: "Quantity" },
    { key: "requested_date", label: "Requested Date" },
    { key: "status", label: "Status", status: true },
    { key: "installed_date", label: "Installation Date" },
];


function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}


function getStatusLabel(status) {
    const value = String(status || "");

    if (value.toLowerCase() === "pending") {
        return "Approval Pending";
    }

    return value;
}


function CartridgeRequests() {
    const { accessToken } = useAuth();

    const [search, setSearch] = useState("");
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [installingId, setInstallingId] = useState(null);
    const [showForm, setShowForm] = useState(false);


    const loadRequests = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await apiRequest(
                "/cartridge-requests",
                {},
                accessToken
            );

            setRequests(response?.data || []);
        } catch (err) {
            setError(
                err.message || "Failed to load cartridge requests."
            );

            setRequests([]);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        if (accessToken) {
            loadRequests();
        }
    }, [accessToken]);


    const handleInstall = async (request) => {
        if (installingId !== null) {
            return;
        }

        try {
            setInstallingId(request.id);
            setError("");

            await apiRequest(
                "/cartridge-issues/",
                {
                    method: "POST",
                    body: {
                        request_id: request.id,
                    },
                },
                accessToken
            );

            await loadRequests();
        } catch (err) {
            setError(
                err.message || "Failed to install cartridge."
            );
        } finally {
            setInstallingId(null);
        }
    };


    const items = useMemo(() => {
        const searchValue = search.toLowerCase().trim();

        if (!searchValue) {
            return requests;
        }

        return requests.filter((request) =>
            Object.values(request).some((value) =>
                String(value ?? "")
                    .toLowerCase()
                    .includes(searchValue)
            )
        );
    }, [search, requests]);


    return (
        <div className="dashboard-container">
            <Sidebar />

            <div className="main-content">
                <Navbar />

                <main className="requests-page">
                    <header className="requests-header">
                        <div>
                            <h1>Cartridge Requests</h1>
                        </div>

                        <button
                            type="button"
                            className="stock-btn"
                            onClick={() => setShowForm(true)}
                        >
                            Request Cartridge
                        </button>
                    </header>


                    <div className="requests-toolbar">
                        <div className="requests-search">
                            <FiSearch />

                            <input
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search cartridge requests..."
                            />
                        </div>
                    </div>


                    <div className="requests-title">
                        <span>
                            {items.length} request
                            {items.length !== 1 ? "s" : ""}
                        </span>
                    </div>


                    {error && (
                        <div className="form-error">
                            {error}
                        </div>
                    )}


                    <section className="requests-table-card">
                        <div className="requests-table-wrap">
                            <table className="requests-table">
                                <thead>
                                    <tr>
                                        {columns.map((column) => (
                                            <th key={column.key}>
                                                {column.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>


                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td
                                                colSpan={columns.length}
                                                className="no-results"
                                            >
                                                Loading...
                                            </td>
                                        </tr>
                                    ) : items.length > 0 ? (
                                        items.map((request) => (
                                            <tr key={request.id}>
                                                {columns.map((column) => {
                                                    if (column.status) {
                                                        const status = String(
                                                            request.status || ""
                                                        ).toLowerCase();


                                                        if (
                                                            status === "approved"
                                                        ) {
                                                            return (
                                                                <td
                                                                    key={
                                                                        column.key
                                                                    }
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        className="install-btn"
                                                                        onClick={() =>
                                                                            handleInstall(
                                                                                request
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            installingId ===
                                                                            request.id
                                                                        }
                                                                    >
                                                                        {installingId ===
                                                                        request.id
                                                                            ? "Installing..."
                                                                            : "Installation Pending"}
                                                                    </button>
                                                                </td>
                                                            );
                                                        }


                                                        return (
                                                            <td
                                                                key={
                                                                    column.key
                                                                }
                                                            >
                                                                <span
                                                                    className={`requests-status ${status.replace(
                                                                        /\s+/g,
                                                                        "-"
                                                                    )}`}
                                                                >
                                                                    {getStatusLabel(
                                                                        request[
                                                                            column.key
                                                                        ]
                                                                    )}
                                                                </span>
                                                            </td>
                                                        );
                                                    }


                                                    return (
                                                        <td
                                                            key={column.key}
                                                        >
                                                            {column.key ===
                                                                "requested_date" ||
                                                            column.key ===
                                                                "installed_date"
                                                                ? formatDate(
                                                                      request[
                                                                          column.key
                                                                      ]
                                                                  )
                                                                : request[
                                                                      column.key
                                                                  ]}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={columns.length}
                                                className="no-results"
                                            >
                                                No cartridge requests found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </main>


                {showForm && (
                    <IssueCartridgeForm
                        closeForm={() => {
                            setShowForm(false);
                            loadRequests();
                        }}
                    />
                )}
            </div>
        </div>
    );
}


export default CartridgeRequests;