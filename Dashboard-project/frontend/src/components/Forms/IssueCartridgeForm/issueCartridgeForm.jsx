import "./IssueCartridgeForm.css";
import { useEffect, useState } from "react";

import { apiRequest } from "../../../api/apiClient";
import { useAuth } from "../../../context/AuthContext";

function IssueCartridgeForm({ closeForm }) {
    const { accessToken } = useAuth();

    const [employee, setEmployee] = useState("");
    const [employeeId, setEmployeeId] = useState("");
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

    useEffect(() => {
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = "";
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
                setError(
                    err.message || "Failed to load locations."
                );
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
                setError(
                    err.message || "Failed to load engineers."
                );
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
                setError(
                    err.message || "Failed to load printers."
                );
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
                    err.message ||
                    "Failed to load cartridges."
                );
            } finally {
                setLoadingCartridges(false);
            }
        }

        if (accessToken) {
            loadCartridges();
        }
    }, [printerId, accessToken]);

    const handleEmployee = (event) => {
        const name = event.target.value;

        setEmployee(name);

        const employeeData = {
            "Sandesh Kadam": {
                id: 1,
                department: "IT",
            },
            "Kushal Nehete": {
                id: 2,
                department: "IT",
            },
            "Prathamesh Gholap": {
                id: 3,
                department: "IT",
            },
        };

        const selected = employeeData[name];

        if (selected) {
            setEmployeeId(selected.id);
            setDepartment(selected.department);
        } else {
            setEmployeeId("");
            setDepartment("");
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!employeeId) {
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
                        // IMPORTANT:
                        // This was missing from your previous payload.
                        requester_id: Number(employeeId),

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

            alert(
                "Cartridge request submitted successfully."
            );

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

                    <input
                        list="employees"
                        value={employee}
                        onChange={handleEmployee}
                        placeholder="Search Employee"
                        required
                    />

                    <datalist id="employees">
                        <option value="Sandesh Kadam" />
                        <option value="Kushal Nehete" />
                        <option value="Prathamesh Gholap" />
                    </datalist>

                    <label>
                        Employee ID
                    </label>

                    <input
                        type="text"
                        value={employeeId}
                        readOnly
                    />

                    <label>
                        Department
                    </label>

                    <input
                        type="text"
                        value={department}
                        readOnly
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
                                {cartridge.color
                                    ? ` - ${cartridge.color}`
                                    : ""}
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