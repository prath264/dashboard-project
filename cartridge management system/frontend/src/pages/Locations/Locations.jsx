import { useCallback, useEffect, useMemo, useState } from "react";
import { FiPlus, FiSearch, FiX } from "react-icons/fi";

import Sidebar from "../../components/Sidebar/sidebar";
import Navbar from "../../components/Navbar/navbar";

import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../api/apiClient";

import "./locations.css";


const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Location" },
    { key: "is_active", label: "Status", status: true },
    { key: "printer_count", label: "Printers" },
];


const emptyForm = {
    name: "",
    is_active: true,
};


function getErrorMessage(error) {
    if (!error) {
        return "Something went wrong.";
    }

    if (typeof error.message === "string") {
        return error.message;
    }

    if (error.data?.detail) {
        const detail = error.data.detail;

        if (typeof detail === "string") {
            return detail;
        }

        if (Array.isArray(detail)) {
            return detail
                .map((item) => {
                    if (typeof item === "string") {
                        return item;
                    }
                    return item?.msg || JSON.stringify(item);
                })
                .join(", ");
        }

        if (typeof detail === "object") {
            return detail.message || detail.msg || JSON.stringify(detail);
        }
    }

    return "Something went wrong.";
}


function Locations() {
    const { accessToken, user } = useAuth();

    const [locations, setLocations] = useState([]);
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const canManageLocations =
        user?.role === "it_admin" || user?.role === "master_admin";

    const loadLocations = useCallback(async () => {
        if (!accessToken) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await apiRequest(
                "/locations",
                { method: "GET" },
                accessToken
            );

            setLocations(response.data || []);
        } catch (error) {
            console.error("Failed to load locations:", error);
            setError(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        loadLocations();
    }, [loadLocations]);

    const filteredLocations = useMemo(() => {
        const searchValue = search.toLowerCase().trim();

        if (!searchValue) {
            return locations;
        }

        return locations.filter((location) =>
            Object.values(location).some((value) =>
                String(value).toLowerCase().includes(searchValue)
            )
        );
    }, [locations, search]);

    const addLocation = async (event) => {
        event.preventDefault();

        if (!canManageLocations) {
            setError("You do not have permission to add locations.");
            return;
        }

        const name = form.name.trim();

        if (!name) {
            setError("Location name is required.");
            return;
        }

        if (!accessToken) {
            setError("You are not authenticated. Please login again.");
            return;
        }

        try {
            setSaving(true);
            setError("");

            await apiRequest(
                "/locations",
                {
                    method: "POST",
                    body: {
                        name,
                        is_active: form.is_active,
                    },
                },
                accessToken
            );

            setForm(emptyForm);
            setShowForm(false);

            await loadLocations();
        } catch (error) {
            console.error("Failed to create location:", error);
            setError(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="dashboard-container">
            <Sidebar />

            <div className="main-content">
                <Navbar />

                <main className="locations-page">
                    <header className="locations-header">
                        <div>
                            <h1>Locations</h1>
                        </div>

                        {canManageLocations && (
                            <button
                                className="locations-add-btn"
                                type="button"
                                onClick={() => {
                                    setError("");
                                    setForm(emptyForm);
                                    setShowForm(true);
                                }}
                            >
                                <FiPlus />
                                Add Location/User
                            </button>
                        )}
                    </header>

                    {error && (
                        <div className="locations-error">
                            <span>{error}</span>
                            <button type="button" onClick={() => setError("")}>
                                <FiX />
                            </button>
                        </div>
                    )}

                    <div className="locations-toolbar">
                        <div className="locations-search">
                            <FiSearch />
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search locations..."
                            />
                        </div>
                    </div>

                    <div className="locations-title">
                        <span>
                            {filteredLocations.length} location
                            {filteredLocations.length !== 1 ? "s" : ""}
                        </span>
                    </div>

                    {showForm && canManageLocations && (
                        <section className="locations-form-card">
                            <div className="locations-form-header">
                                <h2>Add Location</h2>
                            </div>

                            <form onSubmit={addLocation}>
                                <div className="locations-form-grid">
                                    <label className="locations-form-field">
                                        <span>Location</span>
                                        <input
                                            name="name"
                                            type="text"
                                            value={form.name}
                                            onChange={(event) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    name: event.target.value,
                                                }))
                                            }
                                            placeholder="Enter location name"
                                            required
                                        />
                                    </label>

                                    <label className="locations-form-field">
                                        <span>Status</span>
                                        <select
                                            name="is_active"
                                            value={form.is_active ? "active" : "inactive"}
                                            onChange={(event) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    is_active: event.target.value === "active",
                                                }))
                                            }
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </label>
                                </div>

                                <div className="locations-form-actions">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowForm(false);
                                            setForm(emptyForm);
                                            setError("");
                                        }}
                                        disabled={saving}
                                    >
                                        Cancel
                                    </button>

                                    <button type="submit" disabled={saving}>
                                        {saving ? "Saving..." : "Save"}
                                    </button>
                                </div>
                            </form>
                        </section>
                    )}

                    <section className="locations-table-card">
                        <div className="locations-table-wrap">
                            <table className="locations-table">
                                <thead>
                                    <tr>
                                        {columns.map((column) => (
                                            <th key={column.key}>{column.label}</th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={columns.length} className="no-results">
                                                Loading locations...
                                            </td>
                                        </tr>
                                    ) : filteredLocations.length > 0 ? (
                                        filteredLocations.map((location) => (
                                            <tr key={location.id}>
                                                <td>{location.id}</td>
                                                <td>{location.name}</td>
                                                <td>
                                                    <span
                                                        className={`locations-status ${
                                                            location.is_active
                                                                ? "active"
                                                                : "inactive"
                                                        }`}
                                                    >
                                                        {location.is_active ? "Active" : "Inactive"}
                                                    </span>
                                                </td>
                                                <td>{location.printer_count ?? 0} printers</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={columns.length} className="no-results">
                                                No locations found.
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

export default Locations;