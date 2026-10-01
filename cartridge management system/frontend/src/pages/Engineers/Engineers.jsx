
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiPlus, FiSearch, FiX } from "react-icons/fi";

import Sidebar from "../../components/Sidebar/sidebar";
import Navbar from "../../components/Navbar/navbar";

import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../api/apiClient";

import "./engineers.css";


const columns = [
    {
        key: "id",
        label: "ID",
    },
    {
        key: "employee_id",
        label: "Employee ID",
    },
    {
        key: "name",
        label: "Engineer Name",
    },
    {
        key: "is_active",
        label: "Status",
        status: true,
    },
];


const emptyForm = {
    employee_id: "",
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

                    return (
                        item?.msg ||
                        JSON.stringify(item)
                    );
                })
                .join(", ");
        }


        if (typeof detail === "object") {

            return (
                detail.message ||
                detail.msg ||
                JSON.stringify(detail)
            );
        }
    }


    return "Something went wrong.";
}


function Engineers() {

    const {
        accessToken,
        user,
    } = useAuth();


    const [engineers, setEngineers] =
        useState([]);


    const [search, setSearch] =
        useState("");


    const [showForm, setShowForm] =
        useState(false);


    const [form, setForm] =
        useState(emptyForm);


    const [loading, setLoading] =
        useState(true);


    const [saving, setSaving] =
        useState(false);


    const [error, setError] =
        useState("");


    /*
     * Role permissions
     *
     * FMS IT
     *     View only
     *
     * IT Admin
     *     View + Add
     *
     * Master Admin
     *     View + Add
     */

    const canManageEngineers =
        user?.role === "it_admin" ||
        user?.role === "master_admin";


    /*
     * Load engineers
     */

    const loadEngineers =
        useCallback(async () => {

            if (!accessToken) {

                setLoading(false);

                return;
            }


            try {

                setLoading(true);

                setError("");


                const response =
                    await apiRequest(
                        "/engineers",
                        {
                            method: "GET",
                        },
                        accessToken
                    );


                setEngineers(
                    response.data || []
                );

            } catch (error) {

                console.error(
                    "Failed to load engineers:",
                    error
                );


                setError(
                    getErrorMessage(error)
                );

            } finally {

                setLoading(false);
            }

        }, [accessToken]);


    /*
     * Load engineers when page opens
     */

    useEffect(() => {

        loadEngineers();

    }, [loadEngineers]);


    /*
     * Search
     */

    const filteredEngineers =
        useMemo(() => {

            const searchValue =
                search
                    .toLowerCase()
                    .trim();


            if (!searchValue) {
                return engineers;
            }


            return engineers.filter(
                (engineer) =>
                    Object.values(
                        engineer
                    ).some((value) =>
                        String(value)
                            .toLowerCase()
                            .includes(
                                searchValue
                            )
                    )
            );

        }, [engineers, search]);


    /*
     * Add engineer
     */

    const addEngineer =
        async (event) => {

            event.preventDefault();


            if (!canManageEngineers) {

                setError(
                    "You do not have permission to add engineers."
                );

                return;
            }


            const employeeId =
                form.employee_id.trim();

            const name =
                form.name.trim();


            if (!employeeId || !name) {

                setError(
                    "Employee ID and engineer name are required."
                );

                return;
            }


            if (!accessToken) {

                setError(
                    "You are not authenticated. Please login again."
                );

                return;
            }


            try {

                setSaving(true);

                setError("");


                await apiRequest(
                    "/engineers",
                    {
                        method: "POST",

                        body: {
                            employee_id:
                                employeeId,

                            name,

                            is_active:
                                form.is_active,
                        },
                    },
                    accessToken
                );


                /*
                 * Reset form
                 */

                setForm(
                    emptyForm
                );


                setShowForm(
                    false
                );


                /*
                 * Reload from database
                 */

                await loadEngineers();

            } catch (error) {

                console.error(
                    "Failed to create engineer:",
                    error
                );


                setError(
                    getErrorMessage(error)
                );

            } finally {

                setSaving(false);
            }
        };


    return (
        <div className="dashboard-container">

            <Sidebar />


            <div className="main-content">

                <Navbar />


                <main className="engineers-page">

                    {/* Header */}

                    <header className="engineers-header">

                        <div>

                            <h1>
                                Engineers
                            </h1>

                        </div>


                        {canManageEngineers && (
                            <button
                                className="engineers-add-btn"
                                type="button"
                                onClick={() => {

                                    setError("");

                                    setForm(
                                        emptyForm
                                    );

                                    setShowForm(
                                        true
                                    );
                                }}
                            >

                                <FiPlus />

                                Add Engineer

                            </button>
                        )}

                    </header>


                    {/* Error */}

                    {error && (

                        <div className="engineers-error">

                            <span>
                                {error}
                            </span>


                            <button
                                type="button"
                                onClick={() =>
                                    setError("")
                                }
                            >

                                <FiX />

                            </button>

                        </div>

                    )}


                    {/* Search */}

                    <div className="engineers-toolbar">

                        <div className="engineers-search">

                            <FiSearch />


                            <input
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target.value
                                    )
                                }
                                placeholder="Search engineers..."
                            />

                        </div>

                    </div>


                    {/* Count */}

                    <div className="engineers-title">

                        <span>

                            {filteredEngineers.length}

                            {" "}

                            engineer

                            {filteredEngineers.length !== 1
                                ? "s"
                                : ""}

                        </span>

                    </div>


                    {/* Add Engineer Form */}

                    {showForm &&
                        canManageEngineers && (

                        <section className="engineers-form-card">

                            <div className="engineers-form-header">

                                <h2>
                                    Add Engineer
                                </h2>

                            </div>


                            <form
                                onSubmit={
                                    addEngineer
                                }
                            >

                                <div className="engineers-form-grid">

                                    {/* Employee ID */}

                                    <label className="engineers-form-field">

                                        <span>
                                            Employee ID
                                        </span>


                                        <input
                                            name="employee_id"
                                            type="text"
                                            value={
                                                form.employee_id
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setForm(
                                                    (
                                                        current
                                                    ) => ({
                                                        ...current,

                                                        employee_id:
                                                            event
                                                                .target
                                                                .value,
                                                    })
                                                )
                                            }
                                            placeholder="Enter employee ID"
                                            required
                                        />

                                    </label>


                                    {/* Engineer Name */}

                                    <label className="engineers-form-field">

                                        <span>
                                            Engineer Name
                                        </span>


                                        <input
                                            name="name"
                                            type="text"
                                            value={
                                                form.name
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setForm(
                                                    (
                                                        current
                                                    ) => ({
                                                        ...current,

                                                        name:
                                                            event
                                                                .target
                                                                .value,
                                                    })
                                                )
                                            }
                                            placeholder="Enter engineer name"
                                            required
                                        />

                                    </label>


                                    {/* Status */}

                                    <label className="engineers-form-field">

                                        <span>
                                            Status
                                        </span>


                                        <select
                                            name="is_active"
                                            value={
                                                form.is_active
                                                    ? "active"
                                                    : "inactive"
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setForm(
                                                    (
                                                        current
                                                    ) => ({
                                                        ...current,

                                                        is_active:
                                                            event
                                                                .target
                                                                .value ===
                                                            "active",
                                                    })
                                                )
                                            }
                                        >

                                            <option value="active">
                                                Active
                                            </option>


                                            <option value="inactive">
                                                Inactive
                                            </option>

                                        </select>

                                    </label>

                                </div>


                                {/* Form buttons */}

                                <div className="engineers-form-actions">

                                    <button
                                        type="button"
                                        onClick={() => {

                                            setShowForm(
                                                false
                                            );

                                            setForm(
                                                emptyForm
                                            );

                                            setError("");
                                        }}
                                        disabled={
                                            saving
                                        }
                                    >
                                        Cancel
                                    </button>


                                    <button
                                        type="submit"
                                        disabled={
                                            saving
                                        }
                                    >

                                        {saving
                                            ? "Saving..."
                                            : "Save"}

                                    </button>

                                </div>

                            </form>

                        </section>
                    )}


                    {/* Engineers table */}

                    <section className="engineers-table-card">

                        <div className="engineers-table-wrap">

                            <table className="engineers-table">

                                <thead>

                                    <tr>

                                        {columns.map(
                                            (column) => (

                                            <th
                                                key={
                                                    column.key
                                                }
                                            >

                                                {
                                                    column.label
                                                }

                                            </th>

                                        ))}

                                    </tr>

                                </thead>


                                <tbody>

                                    {/* Loading */}

                                    {loading ? (

                                        <tr>

                                            <td
                                                colSpan={
                                                    columns.length
                                                }
                                                className="no-results"
                                            >

                                                Loading engineers...

                                            </td>

                                        </tr>

                                    ) : filteredEngineers.length >
                                      0 ? (

                                        filteredEngineers.map(
                                            (
                                                engineer
                                            ) => (

                                            <tr
                                                key={
                                                    engineer.id
                                                }
                                            >

                                                {/* ID */}

                                                <td>

                                                    {
                                                        engineer.id
                                                    }

                                                </td>


                                                {/* Employee ID */}

                                                <td>

                                                    {
                                                        engineer.employee_id
                                                    }

                                                </td>


                                                {/* Name */}

                                                <td>

                                                    {
                                                        engineer.name
                                                    }

                                                </td>


                                                {/* Status */}

                                                <td>

                                                    <span
                                                        className={`engineers-status ${
                                                            engineer.is_active
                                                                ? "active"
                                                                : "inactive"
                                                        }`}
                                                    >

                                                        {engineer.is_active
                                                            ? "Active"
                                                            : "Inactive"}

                                                    </span>

                                                </td>

                                            </tr>

                                        ))
                                    ) : (

                                        <tr>

                                            <td
                                                colSpan={
                                                    columns.length
                                                }
                                                className="no-results"
                                            >

                                                No engineers found.

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


export default Engineers;
