import "./IssueCartridgeForm.css";
import { useEffect, useState, useRef, useCallback } from "react";

import { apiRequest } from "../../../api/apiClient";
import { useAuth } from "../../../context/AuthContext";

function IssueCartridgeForm({ closeForm }) {
    const { accessToken } = useAuth();

    const [employee, setEmployee] = useState("");
    const [employeeId, setEmployeeId] = useState("");
    const [selectedUserId, setSelectedUserId] = useState("");
    const [department, setDepartment] = useState("");

    const [location, setLocation] = useState("");
    const [engineer, setEngineer] = useState("");
    const [printerId, setPrinterId] = useState("");
    const [cartridgeId, setCartridgeId] = useState("");

    const [locations, setLocations] = useState([]);
    const [engineers, setEngineers] = useState([]);
    const [printers, setPrinters] = useState([]);
    const [cartridges, setCartridges] = useState([]);

    const [loadingLocations, setLoadingLocations] = useState(true);
    const [loadingEngineers, setLoadingEngineers] = useState(true);
    const [loadingPrinters, setLoadingPrinters] = useState(true);
    const [loadingCartridges, setLoadingCartridges] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [quantity, setQuantity] = useState(1);
    const [issueDate, setIssueDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [remarks, setRemarks] = useState("");
    const [error, setError] = useState("");

    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [searching, setSearching] = useState(false);
    const searchTimeoutRef = useRef(null);
    const searchInputRef = useRef(null);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    useEffect(() => {
        async function loadLocations() {
            try {
                setLoadingLocations(true);
                setError("");

                const response = await apiRequest(
                    "/locations/active",
                    {},
                    accessToken
                );

                setLocations(response?.data || []);
            } catch (err) {
                setError(err.message || "Failed to load locations.");
            } finally {
                setLoadingLocations(false);
            }
        }

        if (accessToken) {
            loadLocations();
        }
    }, [accessToken]);

    useEffect(() => {
        async function loadEngineers() {
            try {
                setLoadingEngineers(true);
                setError("");

                const response = await apiRequest(
                    "/engineers",
                    {},
                    accessToken
                );

                setEngineers(response?.data || []);
            } catch (err) {
                setError(err.message || "Failed to load engineers.");
            } finally {
                setLoadingEngineers(false);
            }
        }

        if (accessToken) {
            loadEngineers();
        }
    }, [accessToken]);

    useEffect(() => {
        async function loadPrinters() {
            try {
                setLoadingPrinters(true);
                setError("");

                const response = await apiRequest(
                    "/printers",
                    {},
                    accessToken
                );

                setPrinters(response?.data || []);
            } catch (err) {
                setError(err.message || "Failed to load printers.");
            } finally {
                setLoadingPrinters(false);
            }
        }

        if (accessToken) {
            loadPrinters();
        }
    }, [accessToken]);

    useEffect(() => {
        async function loadCartridges() {
            if (!printerId) {
                setCartridges([]);
                setCartridgeId("");
                return;
            }

            try {
                setLoadingCartridges(true);
                setError("");
                setCartridgeId("");

                const response = await apiRequest(
                    `/cartridges?printer_id=${printerId}`,
                    {},
                    accessToken
                );

                setCartridges(response?.data || []);
            } catch (err) {
                setCartridges([]);
                setError(
                    err.message || "Failed to load cartridges."
                );
            } finally {
                setLoadingCartridges(false);
            }
        }

        if (accessToken) {
            loadCartridges();
        }
    }, [printerId, accessToken]);

    const fetchUsers = useCallback(async (query) => {
        if (!query.trim() || !accessToken) {
            setSearchResults([]);
            return;
        }

        setSearching(true);

        try {
            const response = await apiRequest(
                `/employees?search=${encodeURIComponent(query)}&is_active=true&page_size=20`,
                {},
                accessToken
            );

            setSearchResults(
                response?.data?.data ||
                response?.data ||
                []
            );
        } catch (err) {
            setSearchResults([]);
            setError(
                err.message || "Failed to search employees."
            );
        } finally {
            setSearching(false);
        }
    }, [accessToken]);

    const handleEmployeeSearch = (event) => {
        const value = event.target.value;

        setEmployee(value);
        setSelectedUserId("");
        setEmployeeId("");
        setDepartment("");

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (!value.trim()) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        searchTimeoutRef.current = setTimeout(() => {
            fetchUsers(value);
            setShowSearchResults(true);
        }, 300);
    };

    const handleEmployeeSelect = async (selectedEmployee) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        setEmployee(selectedEmployee.name);
        setSelectedUserId(selectedEmployee.id);
        setEmployeeId(selectedEmployee.employee_id || "");
        setDepartment(selectedEmployee.department || "");
        setShowSearchResults(false);
        setSearchResults([]);

        try {
            const response = await apiRequest(
                `/printer-assignments/for-user/${selectedEmployee.id}`,
                {},
                accessToken
            );

            const autoFill = response?.data;

            if (autoFill) {
                setPrinterId(String(autoFill.printer_id));
                setLocation(String(autoFill.location_id));
            }
        } catch (err) {
            setError(
                err.message ||
                "Failed to load the employee's printer assignment."
            );
        }
    };

    const handleEmployeeBlur = () => {
        setShowSearchResults(false);
    };

    const handleEmployeeFocus = () => {
        if (
            employee.trim() &&
            searchResults.length > 0
        ) {
            setShowSearchResults(true);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!selectedUserId) {
            setError("Please select an employee.");
            return;
        }

        if (!location) {
            setError("Please select a location.");
            return;
        }

        if (!engineer) {
            setError("Please select an engineer.");
            return;
        }

        if (!printerId) {
            setError("Please select a printer.");
            return;
        }

        if (!cartridgeId) {
            setError("Please select a cartridge.");
            return;
        }

        if (quantity < 1) {
            setError("Quantity must be at least 1.");
            return;
        }

        try {
            setSubmitting(true);
            setError("");

            await apiRequest(
                "/cartridge-requests/",
                {
                    method: "POST",
                    body: {
                        employee_id: Number(selectedUserId),
                        location_id: Number(location),
                        engineer_id: Number(engineer),
                        printer_id: Number(printerId),
                        cartridge_id: Number(cartridgeId),
                        quantity: Number(quantity),
                        remarks: remarks || null,
                    },
                },
                accessToken
            );

            alert("Cartridge request submitted successfully.");

            closeForm();
        } catch (err) {
            setError(
                err.message ||
                "Failed to submit cartridge request."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="modal"
            onClick={closeForm}
        >
            <div
                className="modal-content"
                onClick={(event) =>
                    event.stopPropagation()
                }
            >
                <h2>Issue Cartridge</h2>

                {error && (
                    <div className="form-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <label>
                        Employee Name
                    </label>

                    <div
                        className="search-wrapper"
                        ref={searchInputRef}
                    >
                        <input
                            type="text"
                            value={employee}
                            onChange={handleEmployeeSearch}
                            onFocus={handleEmployeeFocus}
                            onBlur={handleEmployeeBlur}
                            placeholder={
                                searching
                                    ? "Searching employees..."
                                    : "Search Employee (name, ID, department)"
                            }
                            required
                            autoComplete="off"
                        />

                        {showSearchResults &&
                            searchResults.length > 0 && (
                                <ul className="search-results">
                                    {searchResults.map(
                                        (selectedEmployee) => (
                                            <li
                                                key={selectedEmployee.id}
                                                onMouseDown={(event) => {
                                                    event.preventDefault();
                                                    handleEmployeeSelect(
                                                        selectedEmployee
                                                    );
                                                }}
                                                className="search-result-item"
                                            >
                                                <span className="user-name">
                                                    {selectedEmployee.name}
                                                </span>

                                                <span className="user-meta">
                                                    {selectedEmployee.employee_id}

                                                    {selectedEmployee.department &&
                                                        ` · ${selectedEmployee.department}`}
                                                </span>
                                            </li>
                                        )
                                    )}
                                </ul>
                            )}

                        {showSearchResults &&
                            !searching &&
                            employee.trim() &&
                            searchResults.length === 0 && (
                                <div className="search-no-results">
                                    No employees found
                                </div>
                            )}
                    </div>

                    <label>
                        Employee ID
                    </label>

                    <input
                        type="text"
                        value={employeeId}
                        onChange={(event) =>
                            setEmployeeId(event.target.value)
                        }
                    />

                    <label>
                        Department
                    </label>

                    <input
                        type="text"
                        value={department}
                        onChange={(event) =>
                            setDepartment(event.target.value)
                        }
                    />

                    <label>
                        Location/User
                    </label>

                    <select
                        value={location}
                        onChange={(event) =>
                            setLocation(event.target.value)
                        }
                        required
                        disabled={loadingLocations}
                    >
                        <option value="">
                            {loadingLocations
                                ? "Loading locations..."
                                : "Select Location"}
                        </option>

                        {locations.map((item) => (
                            <option
                                key={item.id}
                                value={item.id}
                            >
                                {item.name}
                            </option>
                        ))}
                    </select>

                    <label>
                        Engineer
                    </label>

                    <select
                        value={engineer}
                        onChange={(event) =>
                            setEngineer(event.target.value)
                        }
                        required
                        disabled={loadingEngineers}
                    >
                        <option value="">
                            {loadingEngineers
                                ? "Loading engineers..."
                                : "Select Engineer"}
                        </option>

                        {engineers.map((item) => (
                            <option
                                key={item.id}
                                value={item.id}
                            >
                                {item.name}
                            </option>
                        ))}
                    </select>

                    <label>
                        Printer
                    </label>

                    <select
                        value={printerId}
                        onChange={(event) =>
                            setPrinterId(event.target.value)
                        }
                        required
                        disabled={loadingPrinters}
                    >
                        <option value="">
                            {loadingPrinters
                                ? "Loading printers..."
                                : "Select Printer"}
                        </option>

                        {printers.map((printer) => (
                            <option
                                key={printer.id}
                                value={printer.id}
                            >
                                {printer.model}

                                {printer.serial_number
                                    ? ` - ${printer.serial_number}`
                                    : ""}
                            </option>
                        ))}
                    </select>

                    <label>
                        Cartridge Model
                    </label>

                    <select
                        value={cartridgeId}
                        onChange={(event) =>
                            setCartridgeId(event.target.value)
                        }
                        required
                        disabled={
                            !printerId ||
                            loadingCartridges
                        }
                    >
                        <option value="">
                            {!printerId
                                ? "Select Printer First"
                                : loadingCartridges
                                    ? "Loading cartridges..."
                                    : "Select Cartridge"}
                        </option>

                        {cartridges.map((cartridge) => (
                            <option
                                key={cartridge.id}
                                value={cartridge.id}
                            >
                                {cartridge.model}


                            </option>
                        ))}
                    </select>

                    <label>
                        Quantity
                    </label>

                    <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(event) =>
                            setQuantity(
                                Number(event.target.value)
                            )
                        }
                        required
                    />

                    <label>
                        Issue Date
                    </label>

                    <input
                        type="date"
                        value={issueDate}
                        onChange={(event) =>
                            setIssueDate(event.target.value)
                        }
                        required
                    />

                    <label>
                        Remarks
                    </label>

                    <textarea
                        rows="3"
                        value={remarks}
                        onChange={(event) =>
                            setRemarks(event.target.value)
                        }
                        placeholder="Remarks..."
                    />

                    <div className="buttons">
                        <button
                            type="submit"
                            disabled={submitting}
                        >
                            {submitting
                                ? "Submitting..."
                                : "Submit Request"}
                        </button>

                        <button
                            type="button"
                            onClick={closeForm}
                            disabled={submitting}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default IssueCartridgeForm;