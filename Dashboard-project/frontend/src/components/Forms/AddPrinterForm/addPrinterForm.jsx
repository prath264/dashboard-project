import { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";

import {
    apiRequest
} from "../../../api/apiClient";

import {
    useAuth
} from "../../../context/AuthContext";

import "./addPrinterForm.css";


function AddPrinterForm({
    closeForm,
    onSuccess,
}) {

    const { accessToken } = useAuth();

    const [locations, setLocations] = useState([]);

    const [formData, setFormData] = useState({
        model: "",
        serial_number: "",
        location_id: "",
        is_active: true,
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {

        async function loadLocations() {

            try {

                const response =
                    await apiRequest(
                        "/locations",
                        {},
                        accessToken
                    );

                setLocations(
                    response.data || []
                );

            } catch (err) {

                setError(
                    err.message ||
                    "Failed to load locations."
                );

            } finally {

                setLoading(false);

            }
        }

        if (accessToken) {
            loadLocations();
        }

    }, [accessToken]);


    useEffect(() => {

        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = "";
        };

    }, []);


    const handleChange = (event) => {

        const {
            name,
            value
        } = event.target;

        setFormData(
            (previous) => ({
                ...previous,
                [name]: value,
            })
        );

    };


    const handleSubmit = async (event) => {

        event.preventDefault();

        setSaving(true);
        setError("");

        try {

            await apiRequest(
                "/printers",
                {
                    method: "POST",
                    body: {
                        model:
                            formData.model.trim(),

                        serial_number:
                            formData.serial_number.trim() ||
                            null,

                        location_id:
                            Number(
                                formData.location_id
                            ),

                        is_active:
                            formData.is_active,
                    },
                },
                accessToken
            );

            alert(
                "Printer added successfully."
            );

            if (onSuccess) {
                await onSuccess();
            }

            closeForm();

        } catch (err) {

            setError(
                err.message ||
                "Failed to add printer."
            );

        } finally {

            setSaving(false);

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

                <h2>
                    Add Printer
                </h2>

                <form
                    onSubmit={handleSubmit}
                >

                    <label>
                        Printer Model
                    </label>

                    <input
                        type="text"
                        name="model"
                        value={formData.model}
                        onChange={handleChange}
                        placeholder="Enter printer model"
                        required
                    />


                    <label>
                        Serial Number
                    </label>

                    <input
                        type="text"
                        name="serial_number"
                        value={
                            formData.serial_number
                        }
                        onChange={handleChange}
                        placeholder="Enter serial number"
                    />


                    <label>
                        Location/User
                    </label>

                    <select
                        name="location_id"
                        value={
                            formData.location_id
                        }
                        onChange={handleChange}
                        required
                        disabled={loading}
                    >

                        <option value="">
                            {loading
                                ? "Loading locations..."
                                : "Select Location"}
                        </option>

                        {locations.map(
                            (location) => (

                                <option
                                    key={location.id}
                                    value={location.id}
                                >
                                    {location.name}
                                </option>

                            )
                        )}

                    </select>


                    <label>
                        Status
                    </label>

                    <select
                        name="is_active"
                        value={
                            String(
                                formData.is_active
                            )
                        }
                        onChange={(event) =>
                            setFormData(
                                (previous) => ({
                                    ...previous,
                                    is_active:
                                        event.target.value ===
                                        "true",
                                })
                            )
                        }
                    >

                        <option value="true">
                            Active
                        </option>

                        <option value="false">
                            Inactive
                        </option>

                    </select>


                    {error && (

                        <div className="form-error">
                            {error}
                        </div>

                    )}


                    <div className="buttons">

                        <button
                            type="submit"
                            disabled={saving}
                        >
                            {saving
                                ? "Saving..."
                                : "Add Printer"}
                        </button>

                        <button
                            type="button"
                            onClick={closeForm}
                            disabled={saving}
                        >
                            Cancel
                        </button>

                    </div>

                </form>

            </div>

        </div>
    );
}

export default AddPrinterForm;