import { useEffect, useMemo, useState } from "react";
import {
    FiPackage,
    FiPrinter,
    FiSearch,
    FiPlus,
    FiEdit2,
    FiX
} from "react-icons/fi";

import Sidebar from "../../components/Sidebar/sidebar";
import Navbar from "../../components/Navbar/navbar";

import AddPrinterForm from "../../components/Forms/AddPrinterForm/addPrinterForm";
import AddCartridgeForm from "../../components/Forms/AddCartridgeForm/addCartridgeForm";

import { apiRequest } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";

import "./stockInventory.css";


function getStockStatus(item) {
    if (item.available <= 0) {
        return "Out of Stock";
    }

    if (item.available <= item.reorder) {
        return "Low Stock";
    }

    return "Normal";
}


function StockInventory() {

    const { accessToken } = useAuth();

    const [cartridges, setCartridges] = useState([]);
    const [printers, setPrinters] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [printerFilter, setPrinterFilter] = useState("");
    const [stockFilter, setStockFilter] = useState("");

    const [
        showPrinterForm,
        setShowPrinterForm
    ] = useState(false);

    const [
        showCartridgeForm,
        setShowCartridgeForm
    ] = useState(false);

    const [adjustTarget, setAdjustTarget] = useState(null);
    const [newQuantity, setNewQuantity] = useState("");
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    const [adjustError, setAdjustError] = useState("");

    const [
        togglingPrinterId,
        setTogglingPrinterId
    ] = useState(null);


    const loadInventory = async () => {

        setLoading(true);
        setError("");

        try {

            const [
                cartridgeResponse,
                printerResponse
            ] = await Promise.all([

                apiRequest(
                    "/inventory",
                    {},
                    accessToken
                ),

                apiRequest(
                    "/inventory/printers",
                    {},
                    accessToken
                )

            ]);

            setCartridges(
                cartridgeResponse.data || []
            );

            setPrinters(
                printerResponse.data || []
            );

        } catch (err) {

            console.error(
                "Failed to load inventory:",
                err
            );

            setError(
                err.message ||
                "Failed to load inventory."
            );

        } finally {

            setLoading(false);

        }
    };


    const openAdjust = (item) => {

        setAdjustTarget(item);
        setNewQuantity(
            String(item.available)
        );
        setReason("");
        setAdjustError("");

    };


    const closeAdjust = () => {

        if (saving) {
            return;
        }

        setAdjustTarget(null);
        setNewQuantity("");
        setReason("");
        setAdjustError("");

    };


    const submitAdjust = async (event) => {

        event.preventDefault();

        if (!adjustTarget) {
            return;
        }

        const parsedQuantity =
            Number(newQuantity);

        if (
            !Number.isFinite(parsedQuantity) ||
            parsedQuantity < 0
        ) {

            setAdjustError(
                "Enter a valid quantity (0 or more)."
            );

            return;
        }

        if (!Number.isInteger(parsedQuantity)) {

            setAdjustError(
                "Quantity must be a whole number."
            );

            return;
        }

        if (
            parsedQuantity ===
            adjustTarget.available
        ) {

            setAdjustError(
                "New quantity is the same as current quantity."
            );

            return;
        }

        if (!reason.trim()) {

            setAdjustError(
                "Please provide a reason for this adjustment."
            );

            return;
        }

        try {

            setSaving(true);
            setAdjustError("");

            await apiRequest(
                `/inventory/${adjustTarget.cartridge_id}/adjust`,
                {
                    method: "POST",
                    body: {
                        new_quantity:
                            parsedQuantity,
                        reason:
                            reason.trim(),
                    },
                },
                accessToken
            );

            setAdjustTarget(null);
            setNewQuantity("");
            setReason("");
            setAdjustError("");

            await loadInventory();

        } catch (error) {

            console.error(
                "Failed to adjust inventory:",
                error
            );

            setAdjustError(
                error.message ||
                "Failed to adjust inventory."
            );

        } finally {

            setSaving(false);

        }
    };


    const togglePrinterStatus = async (
        printer
    ) => {

        if (togglingPrinterId !== null) {
            return;
        }

        const newStatus =
            printer.status !== "Active";

        try {

            setTogglingPrinterId(
                printer.id
            );

            setError("");

            await apiRequest(
                `/printers/${printer.id}`,
                {
                    method: "PATCH",
                    body: {
                        is_active:
                            newStatus,
                    },
                },
                accessToken
            );

            await loadInventory();

        } catch (error) {

            console.error(
                "Failed to update printer status:",
                error
            );

            setError(
                error.message ||
                "Failed to update printer status."
            );

        } finally {

            setTogglingPrinterId(null);

        }
    };


    useEffect(() => {

        if (accessToken) {
            loadInventory();
        }

    }, [accessToken]);


    const filteredCartridges =
        useMemo(() => {

            return cartridges.filter(
                (item) => {

                    const searchText =
                        `${item.printer} ${item.cartridge}`
                            .toLowerCase();

                    const matchesSearch =
                        searchText.includes(
                            search.toLowerCase()
                        );

                    const matchesPrinter =
                        !printerFilter ||
                        item.printer ===
                            printerFilter;

                    const matchesStatus =
                        !stockFilter ||
                        getStockStatus(item) ===
                            stockFilter;

                    return (
                        matchesSearch &&
                        matchesPrinter &&
                        matchesStatus
                    );

                }
            );

        }, [
            cartridges,
            search,
            printerFilter,
            stockFilter
        ]);


    const filteredPrinters =
        useMemo(() => {

            return printers.filter(
                (printer) => {

                    const matchesSearch =
                        Object.values(printer)
                            .join(" ")
                            .toLowerCase()
                            .includes(
                                search.toLowerCase()
                            );

                    const matchesPrinter =
                        !printerFilter ||
                        printer.model ===
                            printerFilter;

                    return (
                        matchesSearch &&
                        matchesPrinter
                    );

                }
            );

        }, [
            printers,
            search,
            printerFilter
        ]);


    const printerOptions =
        useMemo(() => {

            return [
                ...new Set(
                    cartridges.map(
                        (item) =>
                            item.printer
                    )
                )
            ];

        }, [cartridges]);


    return (

        <div className="dashboard-container">

            <Sidebar />

            <div className="main-content">

                <Navbar />

                <main className="stock-inventory">

                    <header className="stock-header">

                        <div>

                            <h1>
                                Stock Inventory
                            </h1>

                            <p>
                                Manage printers and cartridge stock
                            </p>

                        </div>

                        <div className="stock-actions">

                            <button
                                className="stock-btn"
                                onClick={() =>
                                    setShowPrinterForm(
                                        true
                                    )
                                }
                            >
                                <FiPlus />
                                Add Printer
                            </button>

                            <button
                                className="stock-btn"
                                onClick={() =>
                                    setShowCartridgeForm(
                                        true
                                    )
                                }
                            >
                                <FiPlus />
                                Add Cartridge
                            </button>

                        </div>

                    </header>


                    <div className="inventory-toolbar">

                        <div className="search-box">

                            <FiSearch />

                            <input
                                type="text"
                                placeholder="Search printer or cartridge..."
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target.value
                                    )
                                }
                            />

                        </div>


                        <select
                            value={printerFilter}
                            onChange={(event) =>
                                setPrinterFilter(
                                    event.target.value
                                )
                            }
                        >

                            <option value="">
                                All Printers
                            </option>

                            {printerOptions.map(
                                (printer) => (

                                    <option
                                        key={printer}
                                        value={printer}
                                    >
                                        {printer}
                                    </option>

                                )
                            )}

                        </select>


                        <select
                            value={stockFilter}
                            onChange={(event) =>
                                setStockFilter(
                                    event.target.value
                                )
                            }
                        >

                            <option value="">
                                All Stock Status
                            </option>

                            <option value="Normal">
                                Normal
                            </option>

                            <option value="Low Stock">
                                Low Stock
                            </option>

                            <option value="Out of Stock">
                                Out of Stock
                            </option>

                        </select>

                    </div>


                    {error && (

                        <div
                            style={{
                                padding: "12px 14px",
                                marginBottom: "16px",
                                borderRadius: "8px",
                                background:
                                    "#fef2f2",
                                color: "#b91c1c",
                                border:
                                    "1px solid #fecaca"
                            }}
                        >
                            {error}
                        </div>

                    )}


                    <section className="inventory-section">

                        <div className="inventory-title">

                            <div>

                                <FiPackage />

                                <h2>
                                    Cartridge Inventory
                                </h2>

                            </div>

                            <span>
                                {loading
                                    ? "Loading..."
                                    : `${filteredCartridges.length} items`}
                            </span>

                        </div>


                        <div className="inventory-table-card">

                            <div className="table-container">

                                <table>

                                    <thead>

                                        <tr>

                                            <th>
                                                Cartridge
                                            </th>

                                            <th>
                                                Color
                                            </th>

                                            <th>
                                                Printer
                                            </th>

                                            <th>
                                                Total
                                            </th>

                                            <th>
                                                Available
                                            </th>

                                            <th>
                                                Issued
                                            </th>

                                            <th>
                                                Status
                                            </th>

                                            <th>
                                                Actions
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {loading ? (

                                            <tr>

                                                <td
                                                    colSpan="8"
                                                    style={{
                                                        textAlign:
                                                            "center",
                                                        padding:
                                                            "30px"
                                                    }}
                                                >
                                                    Loading inventory...
                                                </td>

                                            </tr>

                                        ) : filteredCartridges.length === 0 ? (

                                            <tr>

                                                <td
                                                    colSpan="8"
                                                    style={{
                                                        textAlign:
                                                            "center",
                                                        padding:
                                                            "30px"
                                                    }}
                                                >
                                                    No cartridge inventory found.
                                                </td>

                                            </tr>

                                        ) : (

                                            filteredCartridges.map(
                                                (item) => {

                                                    const stockStatus =
                                                        getStockStatus(
                                                            item
                                                        );

                                                    return (

                                                        <tr
                                                            key={
                                                                item.cartridge_id
                                                            }
                                                        >

                                                            <td>
                                                                {item.cartridge}
                                                            </td>

                                                            <td>

                                                                <span className="color-badge">
                                                                    {item.color}
                                                                </span>

                                                            </td>

                                                            <td className="printer-name">
                                                                {item.printer}
                                                            </td>

                                                            <td>
                                                                {item.total}
                                                            </td>

                                                            <td className="available">
                                                                {item.available}
                                                            </td>

                                                            <td>
                                                                {item.issued}
                                                            </td>

                                                            <td>

                                                                <span
                                                                    className={`status ${stockStatus
                                                                        .toLowerCase()
                                                                        .replaceAll(
                                                                            " ",
                                                                            "-"
                                                                        )}`}
                                                                >
                                                                    {stockStatus}
                                                                </span>

                                                            </td>

                                                            <td>

                                                                <button
                                                                    type="button"
                                                                    className="stock-btn"
                                                                    style={{
                                                                        padding:
                                                                            "6px 12px",
                                                                        fontSize:
                                                                            "13px"
                                                                    }}
                                                                    onClick={() =>
                                                                        openAdjust(
                                                                            item
                                                                        )
                                                                    }
                                                                >
                                                                    <FiEdit2 />
                                                                    Adjust
                                                                </button>

                                                            </td>

                                                        </tr>

                                                    );

                                                }
                                            )

                                        )}

                                    </tbody>

                                </table>

                            </div>

                        </div>

                    </section>


                    <section className="inventory-section">

                        <div className="inventory-title">

                            <div>

                                <FiPrinter />

                                <h2>
                                    Printer Inventory
                                </h2>

                            </div>

                            <span>
                                {loading
                                    ? "Loading..."
                                    : `${filteredPrinters.length} printers`}
                            </span>

                        </div>


                        <div className="inventory-table-card">

                            <div className="table-container">

                                <table className="printer-inventory-table">

                                    <thead>

                                        <tr>

                                            <th>
                                                Printer ID
                                            </th>

                                            <th>
                                                Printer Model
                                            </th>

                                            <th>
                                                Serial Number
                                            </th>

                                            <th>
                                                Location
                                            </th>

                                            <th>
                                                Cartridge
                                            </th>

                                            <th>
                                                Status
                                            </th>

                                            <th>
                                                Actions
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {loading ? (

                                            <tr>

                                                <td
                                                    colSpan="7"
                                                    style={{
                                                        textAlign:
                                                            "center",
                                                        padding:
                                                            "30px"
                                                    }}
                                                >
                                                    Loading printers...
                                                </td>

                                            </tr>

                                        ) : filteredPrinters.length === 0 ? (

                                            <tr>

                                                <td
                                                    colSpan="7"
                                                    style={{
                                                        textAlign:
                                                            "center",
                                                        padding:
                                                            "30px"
                                                    }}
                                                >
                                                    No printers found.
                                                </td>

                                            </tr>

                                        ) : (

                                            filteredPrinters.map(
                                                (printer) => (

                                                    <tr
                                                        key={
                                                            printer.id
                                                        }
                                                    >

                                                        <td>
                                                            PRN-
                                                            {String(
                                                                printer.id
                                                            ).padStart(
                                                                3,
                                                                "0"
                                                            )}
                                                        </td>

                                                        <td className="printer-name">
                                                            {
                                                                printer.model
                                                            }
                                                        </td>

                                                        <td>
                                                            {
                                                                printer.serial ||
                                                                "-"
                                                            }
                                                        </td>

                                                        <td>
                                                            {
                                                                printer.location
                                                            }
                                                        </td>

                                                        <td>
                                                            {
                                                                printer.cartridge ||
                                                                "-"
                                                            }
                                                        </td>

                                                        <td>

                                                            <span
                                                                className={`printer-status ${String(
                                                                    printer.status ||
                                                                        ""
                                                                ).toLowerCase()}`}
                                                            >
                                                                {
                                                                    printer.status
                                                                }
                                                            </span>

                                                        </td>

                                                        <td>

                                                            <button
                                                                type="button"
                                                                className={`printer-toggle-btn ${
                                                                    printer.status ===
                                                                    "Active"
                                                                        ? "deactivate"
                                                                        : "activate"
                                                                }`}
                                                                onClick={() =>
                                                                    togglePrinterStatus(
                                                                        printer
                                                                    )
                                                                }
                                                                disabled={
                                                                    togglingPrinterId ===
                                                                    printer.id
                                                                }
                                                            >
                                                                {
                                                                    togglingPrinterId ===
                                                                    printer.id
                                                                        ? "Updating..."
                                                                        : printer.status ===
                                                                          "Active"
                                                                        ? "Deactivate"
                                                                        : "Activate"
                                                                }
                                                            </button>

                                                        </td>

                                                    </tr>

                                                )
                                            )

                                        )}

                                    </tbody>

                                </table>

                            </div>

                        </div>

                    </section>

                </main>

            </div>


            {showPrinterForm && (

                <AddPrinterForm
                    closeForm={() =>
                        setShowPrinterForm(
                            false
                        )
                    }
                    onSuccess={
                        loadInventory
                    }
                />

            )}


            {showCartridgeForm && (

                <AddCartridgeForm
                    closeForm={() =>
                        setShowCartridgeForm(
                            false
                        )
                    }
                    onSuccess={
                        loadInventory
                    }
                />

            )}


            {adjustTarget && (

                <div
                    className="inventory-modal-overlay"
                    onClick={closeAdjust}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 1000,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "24px",
                        background:
                            "rgba(15, 23, 42, 0.45)",
                    }}
                >

                    <div
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                        style={{
                            width: "100%",
                            maxWidth: "480px",
                            background: "#ffffff",
                            borderRadius: "12px",
                            padding: "24px",
                        }}
                    >

                        <div
                            style={{
                                display: "flex",
                                justifyContent:
                                    "space-between",
                                marginBottom: "16px"
                            }}
                        >

                            <div>

                                <h2
                                    style={{
                                        margin: 0
                                    }}
                                >
                                    Adjust Stock
                                </h2>

                                <p
                                    style={{
                                        margin:
                                            "4px 0 0",
                                        color:
                                            "#6b7280"
                                    }}
                                >
                                    {
                                        adjustTarget.cartridge
                                    }
                                </p>

                            </div>

                            <button
                                type="button"
                                onClick={
                                    closeAdjust
                                }
                                style={{
                                    border:
                                        "none",
                                    background:
                                        "transparent",
                                    cursor:
                                        "pointer"
                                }}
                            >
                                <FiX />
                            </button>

                        </div>


                        <form
                            onSubmit={
                                submitAdjust
                            }
                        >

                            {adjustError && (

                                <div
                                    style={{
                                        padding:
                                            "10px",
                                        marginBottom:
                                            "12px",
                                        background:
                                            "#fef2f2",
                                        color:
                                            "#b91c1c",
                                        borderRadius:
                                            "6px"
                                    }}
                                >
                                    {
                                        adjustError
                                    }
                                </div>

                            )}


                            <div
                                style={{
                                    marginBottom:
                                        "14px"
                                }}
                            >

                                <label
                                    style={{
                                        display:
                                            "block",
                                        marginBottom:
                                            "6px",
                                        fontSize:
                                            "13px",
                                        fontWeight:
                                            600
                                    }}
                                >
                                    Current Quantity
                                </label>

                                <input
                                    type="text"
                                    value={
                                        adjustTarget.available
                                    }
                                    readOnly
                                    style={{
                                        width:
                                            "100%",
                                        padding:
                                            "10px",
                                        border:
                                            "1px solid #d1d5db",
                                        borderRadius:
                                            "6px",
                                        background:
                                            "#f9fafb"
                                    }}
                                />

                            </div>


                            <div
                                style={{
                                    marginBottom:
                                        "14px"
                                }}
                            >

                                <label
                                    style={{
                                        display:
                                            "block",
                                        marginBottom:
                                            "6px",
                                        fontSize:
                                            "13px",
                                        fontWeight:
                                            600
                                    }}
                                >
                                    New Quantity
                                </label>

                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={
                                        newQuantity
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setNewQuantity(
                                            event.target
                                                .value
                                        )
                                    }
                                    required
                                    style={{
                                        width:
                                            "100%",
                                        padding:
                                            "10px",
                                        border:
                                            "1px solid #d1d5db",
                                        borderRadius:
                                            "6px"
                                    }}
                                />

                            </div>


                            <div
                                style={{
                                    marginBottom:
                                        "16px"
                                }}
                            >

                                <label
                                    style={{
                                        display:
                                            "block",
                                        marginBottom:
                                            "6px",
                                        fontSize:
                                            "13px",
                                        fontWeight:
                                            600
                                    }}
                                >
                                    Reason
                                </label>

                                <textarea
                                    value={
                                        reason
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setReason(
                                            event.target
                                                .value
                                        )
                                    }
                                    required
                                    style={{
                                        width:
                                            "100%",
                                        padding:
                                            "10px",
                                        border:
                                            "1px solid #d1d5db",
                                        borderRadius:
                                            "6px",
                                        minHeight:
                                            "80px"
                                    }}
                                />

                            </div>


                            <div
                                style={{
                                    display:
                                        "flex",
                                    justifyContent:
                                        "flex-end",
                                    gap:
                                        "10px"
                                }}
                            >

                                <button
                                    type="button"
                                    onClick={
                                        closeAdjust
                                    }
                                    disabled={
                                        saving
                                    }
                                    style={{
                                        padding:
                                            "10px 18px",
                                        border:
                                            "1px solid #d1d5db",
                                        borderRadius:
                                            "6px",
                                        background:
                                            "#fff",
                                        cursor:
                                            "pointer"
                                    }}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        saving
                                    }
                                    style={{
                                        padding:
                                            "10px 18px",
                                        border:
                                            "none",
                                        borderRadius:
                                            "6px",
                                        background:
                                            "#2563eb",
                                        color:
                                            "#fff",
                                        cursor:
                                            "pointer"
                                    }}
                                >
                                    {saving
                                        ? "Saving..."
                                        : "Save Adjustment"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </div>
    );
}

export default StockInventory;