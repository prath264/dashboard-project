import { useCallback, useEffect, useMemo, useState } from "react";
import { FiPlus, FiSearch, FiX } from "react-icons/fi";

import Navbar from "../../components/Navbar/navbar";
import Sidebar from "../../components/Sidebar/sidebar";
import { apiRequest } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";

import "./printerAssignments.css";


const emptyForm = {
    user_id: "",
    printer_id: "",
};


function getErrorMessage(error) {
    if (typeof error?.message === "string") {
        return error.message;
    }
    return "Something went wrong.";
}


function PrinterAssignments() {
    const { accessToken, user } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [users, setUsers] = useState([]);
    const [printers, setPrinters] = useState([]);
    const [search, setSearch] = useState("");
    const [form, setForm] = useState(emptyForm);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const canManage =
        user?.role === "it_admin" || user?.role === "master_admin";

    const loadData = useCallback(async () => {
        if (!accessToken) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError("");
            const [assignmentResponse, employeeResponse, printerResponse] =
                await Promise.all([
                    apiRequest("/printer-assignments", {}, accessToken),
                    apiRequest(
                        "/employees?is_active=true&page_size=100",
                        {},
                        accessToken
                    ),
                    apiRequest("/printers", {}, accessToken),
                ]);
            setAssignments(assignmentResponse?.data || []);
            setUsers(employeeResponse?.data || []);
            setPrinters(printerResponse?.data || []);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredAssignments = useMemo(() => {
        const value = search.trim().toLowerCase();
        if (!value) {
            return assignments;
        }
        return assignments.filter((assignment) =>
            [
                assignment.user_name,
                assignment.printer_model,
                assignment.location_name,
            ].some((item) => String(item).toLowerCase().includes(value))
        );
    }, [assignments, search]);

    const saveAssignment = async (event) => {
        event.preventDefault();
        if (!form.user_id || !form.printer_id) {
            setError("Select both a user and a printer.");
            return;
        }
        try {
            setSaving(true);
            setError("");
            await apiRequest(
                "/printer-assignments",
                {
                    method: "POST",
                    body: {
                        user_id: Number(form.user_id),
                        printer_id: Number(form.printer_id),
                    },
                },
                accessToken
            );
            setForm(emptyForm);
            setShowForm(false);
            await loadData();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const removeAssignment = async (assignmentId) => {
        try {
            setError("");
            await apiRequest(
                `/printer-assignments/${assignmentId}/unassign`,
                { method: "POST" },
                accessToken
            );
            await loadData();
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    return (
        <div className="dashboard-container">
            <Sidebar />
            <div className="main-content">
                <Navbar />
                <main className="printer-assignments-page">
                    <header className="printer-assignments-header">
                        <h1>Printer Assignment</h1>
                        {canManage && (
                            <button
                                className="printer-assignments-add-btn"
                                type="button"
                                onClick={() => {
                                    setForm(emptyForm);
                                    setShowForm(true);
                                    setError("");
                                }}
                            >
                                <FiPlus />
                                Add Assignment
                            </button>
                        )}
                    </header>

                    {error && (
                        <div className="printer-assignments-error">
                            <span>{error}</span>
                            <button type="button" onClick={() => setError("")}>
                                <FiX />
                            </button>
                        </div>
                    )}

                    {showForm && canManage && (
                        <section className="printer-assignments-form-card">
                            <h2>Assign Printer</h2>
                            <form onSubmit={saveAssignment}>
                                <div className="printer-assignments-form-grid">
                                    <label>
                                        User
                                        <select
                                            value={form.user_id}
                                            onChange={(event) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    user_id: event.target.value,
                                                }))
                                            }
                                            required
                                        >
                                            <option value="">Select user</option>
                                            {users.map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name} ({item.employee_id})
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label>
                                        Printer
                                        <select
                                            value={form.printer_id}
                                            onChange={(event) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    printer_id: event.target.value,
                                                }))
                                            }
                                            required
                                        >
                                            <option value="">Select printer</option>
                                            {printers.map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.model}
                                                    {item.serial_number
                                                        ? ` - ${item.serial_number}`
                                                        : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                                <div className="printer-assignments-form-actions">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
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

                    <div className="printer-assignments-toolbar">
                        <FiSearch />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search assignments..."
                        />
                    </div>

                    <section className="printer-assignments-table-card">
                        <table>
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Printer</th>
                                    <th>Location</th>
                                    <th>Assigned At</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5">Loading assignments...</td>
                                    </tr>
                                ) : filteredAssignments.length === 0 ? (
                                    <tr>
                                        <td colSpan="5">No active assignments found.</td>
                                    </tr>
                                ) : (
                                    filteredAssignments.map((assignment) => (
                                        <tr key={assignment.id}>
                                            <td>{assignment.user_name}</td>
                                            <td>{assignment.printer_model}</td>
                                            <td>{assignment.location_name}</td>
                                            <td>
                                                {new Date(
                                                    assignment.assigned_at
                                                ).toLocaleString()}
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeAssignment(assignment.id)
                                                    }
                                                >
                                                    Unassign
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </section>
                </main>
            </div>
        </div>
    );
}

export default PrinterAssignments;
