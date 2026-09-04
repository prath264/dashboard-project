import { useCallback, useEffect, useMemo, useState } from "react";
import { FiPlus, FiSearch, FiX } from "react-icons/fi";

import Sidebar from "../../components/Sidebar/sidebar";
import Navbar from "../../components/Navbar/navbar";

import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../api/apiClient";

import "./users.css";


const columns = [
    { key: "employee_id", label: "Employee ID" },
    { key: "username", label: "Username" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
    { key: "department", label: "Department" },
    { key: "is_active", label: "Status", status: true },
];

const roleOptions = [
    { value: "fms_it", label: "FMS IT" },
    { value: "it_admin", label: "IT Admin" },
    { value: "master_admin", label: "Master Admin" },
];

const emptyForm = {
    employee_id: "",
    username: "",
    email: "",
    password: "",
    role: "fms_it",
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

function formatRole(role) {
    if (!role) return "";
    return role
        .replaceAll("_", " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function Users() {
    const { accessToken, user } = useAuth();

    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const canManageUsers = user?.role === "master_admin";

    const loadUsers = useCallback(async () => {
        if (!accessToken) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await apiRequest(
                "/users",
                { method: "GET" },
                accessToken
            );

            setUsers(response.data || []);
        } catch (error) {
            console.error("Failed to load users:", error);
            setError(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const filteredUsers = useMemo(() => {
        const searchValue = search.toLowerCase().trim();

        if (!searchValue) {
            return users;
        }

        return users.filter((item) =>
            Object.values(item).some((value) =>
                String(value ?? "").toLowerCase().includes(searchValue)
            )
        );
    }, [users, search]);

    const addUser = async (event) => {
        event.preventDefault();

        if (!canManageUsers) {
            setError("You do not have permission to add users.");
            return;
        }

        const employeeId = form.employee_id.trim();
        const username = form.username.trim();
        const email = form.email.trim();
        const password = form.password;

        if (!employeeId || !username || !email || !password) {
            setError("Employee ID, username, email, and password are required.");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
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
                "/users",
                {
                    method: "POST",
                    body: {
                        employee_id: employeeId,
                        username,
                        email,
                        password,
                        role: form.role,
                        department: form.department.trim() || null,
                        is_active: form.is_active,
                    },
                },
                accessToken
            );

            setForm(emptyForm);
            setShowForm(false);

            await loadUsers();
        } catch (error) {
            console.error("Failed to create user:", error);
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

                <main className="users-page">
                    <header className="users-header">
                        <div>
                            <h1>Users</h1>
                        </div>

                        {canManageUsers && (
                            <button
                                className="users-add-btn"
                                type="button"
                                onClick={() => {
                                    setError("");
                                    setForm(emptyForm);
                                    setShowForm(true);
                                }}
                            >
                                <FiPlus />
                                Add User
                            </button>
                        )}
                    </header>

                    {error && (
                        <div className="users-error">
                            <span>{error}</span>
                            <button type="button" onClick={() => setError("")}>
                                <FiX />
                            </button>
                        </div>
                    )}

                    <div className="users-toolbar">
                        <div className="users-search">
                            <FiSearch />
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search users..."
                            />
                        </div>
                    </div>

                    <div className="users-title">
                        <span>
                            {filteredUsers.length} user
                            {filteredUsers.length !== 1 ? "s" : ""}
                        </span>
                    </div>

                    {showForm && canManageUsers && (
                        <section className="users-form-card">
                            <div className="users-form-header">
                                <h2>Add User</h2>
                            </div>

                            <form onSubmit={addUser}>
                                <div className="users-form-grid">
                                    <label className="users-form-field">
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
                                            required
                                        />
                                    </label>

                                    <label className="users-form-field">
                                        <span>Username</span>
                                        <input
                                            name="username"
                                            type="text"
                                            value={form.username}
                                            onChange={(event) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    username: event.target.value,
                                                }))
                                            }
                                            required
                                        />
                                    </label>

                                    <label className="users-form-field">
                                        <span>Email</span>
                                        <input
                                            name="email"
                                            type="email"
                                            value={form.email}
                                            onChange={(event) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    email: event.target.value,
                                                }))
                                            }
                                            required
                                        />
                                    </label>

                                    <label className="users-form-field">
                                        <span>Password</span>
                                        <input
                                            name="password"
                                            type="password"
                                            value={form.password}
                                            onChange={(event) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    password: event.target.value,
                                                }))
                                            }
                                            placeholder="Min 8 characters"
                                            required
                                        />
                                    </label>

                                    <label className="users-form-field">
                                        <span>Role</span>
                                        <select
                                            name="role"
                                            value={form.role}
                                            onChange={(event) =>
                                                setForm((current) => ({
                                                    ...current,
                                                    role: event.target.value,
                                                }))
                                            }
                                        >
                                            {roleOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="users-form-field">
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
                                        />
                                    </label>

                                    <label className="users-form-field">
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

                                <div className="users-form-actions">
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

                    <section className="users-table-card">
                        <div className="users-table-wrap">
                            <table className="users-table">
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
                                                Loading users...
                                            </td>
                                        </tr>
                                    ) : filteredUsers.length > 0 ? (
                                        filteredUsers.map((item) => (
                                            <tr key={item.id}>
                                                <td>{item.employee_id}</td>
                                                <td>{item.username}</td>
                                                <td>{item.email}</td>
                                                <td>{formatRole(item.role)}</td>
                                                <td>{item.department || "-"}</td>
                                                <td>
                                                    <span
                                                        className={`users-status ${
                                                            item.is_active ? "active" : "inactive"
                                                        }`}
                                                    >
                                                        {item.is_active ? "Active" : "Inactive"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={columns.length} className="no-results">
                                                No users found.
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

export default Users;