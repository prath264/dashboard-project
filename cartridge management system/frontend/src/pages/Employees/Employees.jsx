import { useCallback, useEffect, useMemo, useState } from "react";
import { FiPlus, FiSearch, FiX } from "react-icons/fi";

import Sidebar from "../../components/Sidebar/sidebar";
import Navbar from "../../components/Navbar/navbar";

import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../api/apiClient";

import "./employees.css";


const columns = [
    { key: "employee_id", label: "Employee ID" },
    { key: "name", label: "Name" },
    { key: "department", label: "Department" },
    { key: "is_active", label: "Status", status: true },
];


const emptyForm = {
    employee_id: "",
    name: "",
    department: "",
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


function Employees() {
    const { accessToken, user } = useAuth();

    const [employees, setEmployees] = useState([]);
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const canManageEmployees =
        user?.role === "it_admin" || user?.role === "master_admin";

    const loadEmployees = useCallback(async () => {
        if (!accessToken) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await apiRequest(
                "/employees",
                { method: "GET" },
                accessToken
            );

            setEmployees(response.data || []);
        } catch (error) {
            console.error("Failed to load employees:", error);
            setError(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    const filteredEmployees = useMemo(() => {
        const searchValue = search.toLowerCase().trim();

        if (!searchValue) {
            return employees;
        }

        return employees.filter((employee) =>
            Object.values(employee).some((value) =>
                String(value).toLowerCase().includes(searchValue)
            )
        );
    }, [employees, search]);

    const addEmployee = async (event) => {
        event.preventDefault();

        if (!canManageEmployees) {
            setError("You do not have permission to add employees.");
            return;
        }

        const employeeId = form.employee_id.trim();
        const name = form.name.trim();
        const department = form.department.trim();

        if (!employeeId) {
            setError("Employee ID is required.");
            return;
        }

        if (!name) {
            setError("Name is required.");
            return;
        }

        if (!department) {
            setError("Department is required.");
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
                "/employees",
                {
                    method: "POST",
                    body: {
                        employee_id: employeeId,
                        name,
                        department,
                        is_active: form.is_active,
                    },
                },
                accessToken
            );

            setForm(emptyForm);
            setShowForm(false);

            await loadEmployees();
        } catch (error) {
            console.error("Failed to create employee:", error);
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

                <main className="employees-page">
                    <header className="employees-header">
                        <div>
                            <h1>Employees</h1>
                        </div>

                        {canManageEmployees && (
                            <button
                                className="employees-add-btn"
                                type="button"
                                onClick={() => {
                                    setError("");
                                    setForm(emptyForm);
                                    setShowForm(true);
                                }}
                            >
                                <FiPlus />
                                Add Employee
                            </button>
                        )}
                    </header>

                    {error && (
                        <div className="employees-error">
                            <span>{error}</span>
                            <button type="button" onClick={() => setError("")}>
                                <FiX />
                            </button>
                        </div>
                    )}

                    <div className="employees-toolbar">
                        <div className="employees-search">
                            <FiSearch />
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search employees..."
                            />
                        </div>
                    </div>

                    <div className="employees-title">
                        <span>
                            {filteredEmployees.length} employee
                            {filteredEmployees.length !== 1 ? "s" : ""}
                        </span>
                    </div>

                    {showForm && canManageEmployees && (
                        <section className="employees-form-card">
                            <div className="employees-form-header">
                                <h2>Add Employee</h2>
                            </div>

                            <form onSubmit={addEmployee}>
                                <div className="employees-form-grid">
                                    <label className="employees-form-field">
                                        <span>Employee ID</span>
                                        <input
                                            name="employee_id"
                                            type="text"
                                            value={form.employee_id}
                                            onChange={(event) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    employee_id: event.target.value,
                                                }))
                                            }
                                            placeholder="Enter employee ID"
                                            required
                                        />
                                    </label>

                                    <label className="employees-form-field">
                                        <span>Name</span>
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
                                            placeholder="Enter employee name"
                                            required
                                        />
                                    </label>

                                    <label className="employees-form-field">
                                        <span>Department</span>
                                        <input
                                            name="department"
                                            type="text"
                                            value={form.department}
                                            onChange={(event) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    department: event.target.value,
                                                }))
                                            }
                                            placeholder="Enter department"
                                            required
                                        />
                                    </label>

                                    <label className="employees-form-field">
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

                                <div className="employees-form-actions">
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

                    <section className="employees-table-card">
                        <div className="employees-table-wrap">
                            <table className="employees-table">
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
                                                Loading employees...
                                            </td>
                                        </tr>
                                    ) : filteredEmployees.length > 0 ? (
                                        filteredEmployees.map((employee) => (
                                            <tr key={employee.employee_id || employee.id}>
                                                <td>{employee.employee_id || employee.id}</td>
                                                <td>{employee.name}</td>
                                                <td>{employee.department}</td>
                                                <td>
                                                    <span
                                                        className={`employees-status ${
                                                            employee.is_active
                                                                ? "active"
                                                                : "inactive"
                                                        }`}
                                                    >
                                                        {employee.is_active ? "Active" : "Inactive"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={columns.length} className="no-results">
                                                No employees found.
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

export default Employees;