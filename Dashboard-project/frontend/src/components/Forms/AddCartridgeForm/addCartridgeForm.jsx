import { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";

import {
    apiRequest
} from "../../../api/apiClient";

import {
    useAuth
} from "../../../context/AuthContext";

import "./addCartridgeForm.css";


function AddCartridgeForm({
    closeForm,
    onSuccess,
}) {

    const { accessToken } = useAuth();

    const [printers, setPrinters] = useState([]);

    const [formData, setFormData] = useState({
        printer_id: "",
        model: "",
        color: "",
        quantity: 1,
        reorder_level: 10,
        remarks: "",
    });

    const [
        loadingPrinters,
        setLoadingPrinters
    ] = useState(true);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");


    useEffect(() => {

        document.body.style.overflow =
            "hidden";

        return () => {
            document.body.style.overflow =
                "";
        };

    }, []);


    useEffect(() => {

        async function loadPrinters() {

            try {

                const response =
                    await apiRequest(
                        "/printers",
                        {},
                        accessToken
                    );

                setPrinters(
                    response.data || []
                );

            } catch (err) {

                setError(
                    err.message ||
                    "Failed to load printers."
                );

            } finally {

                setLoadingPrinters(false);

            }
        }

        if (accessToken) {
            loadPrinters();
        }

    }, [accessToken]);


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
                "/cartridges",
                {
                    method: "POST",
                    body: {
                        printer_id:
                            Number(
                                formData.printer_id
                            ),

                        model:
                            formData.model.trim(),

                        color:
                            formData.color.trim(),

                        quantity:
                            Number(
                                formData.quantity
                            ),

                        reorder_level:
                            Number(
                                formData.reorder_level
                            ),

                        remarks:
                            formData.remarks.trim()
                            || null,
                    },
                },
                accessToken
            );

            alert(
                "Cartridge stock added successfully."
            );

            if (onSuccess) {
                await onSuccess();
            }

            closeForm();

        } catch (err) {

            setError(
                err.message ||
                "Failed to add cartridge."
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
                    Add Cartridge
                </h2>

                <form
                    onSubmit={handleSubmit}
                >

                    <label>
                        Printer
                    </label>

                    <select
                        name="printer_id"
                        value={
                            formData.printer_id
                        }
                        onChange={handleChange}
                        required
                        disabled={
                            loadingPrinters ||
                            saving
                        }
                    >

                        <option value="">
                            {loadingPrinters
                                ? "Loading printers..."
                                : "Select Printer"}
                        </option>

                        {printers.map(
                            (printer) => (

                                <option
                                    key={printer.id}
                                    value={printer.id}
                                >
                                    {printer.model}
                                    {printer.serial_number
                                        ? ` - ${printer.serial_number}`
                                        : ""}
                                </option>

                            )
                        )}

                    </select>


                    <label>
                        Cartridge Model
                    </label>

                    <input
                        type="text"
                        name="model"
                        value={
                            formData.model
                        }
                        onChange={handleChange}
                        placeholder="Enter cartridge model"
                        required
                        disabled={saving}
                    />


                    <label>
                        Color
                    </label>

                    <select
                        name="color"
                        value={
                            formData.color
                        }
                        onChange={handleChange}
                        required
                        disabled={saving}
                    >

                        <option value="">
                            Select Color
                        </option>

                        <option value="Black">
                            Black
                        </option>

                        <option value="Cyan">
                            Cyan
                        </option>

                        <option value="Magenta">
                            Magenta
                        </option>

                        <option value="Yellow">
                            Yellow
                        </option>

                    </select>


                    <label>
                        Quantity
                    </label>

                    <input
                        type="number"
                        name="quantity"
                        value={
                            formData.quantity
                        }
                        onChange={handleChange}
                        min="1"
                        required
                        disabled={saving}
                    />


                    <label>
                        Reorder Level
                    </label>

                    <input
                        type="number"
                        name="reorder_level"
                        value={
                            formData.reorder_level
                        }
                        onChange={handleChange}
                        min="0"
                        required
                        disabled={saving}
                    />


                    <label>
                        Remarks
                    </label>

                    <textarea
                        name="remarks"
                        rows="3"
                        value={
                            formData.remarks
                        }
                        onChange={handleChange}
                        placeholder="Remarks..."
                        disabled={saving}
                    />


                    {error && (

                        <div className="form-error">
                            {error}
                        </div>

                    )}


                    <div className="buttons">

                        <button
                            type="submit"
                            disabled={
                                saving ||
                                loadingPrinters
                            }
                        >
                            {saving
                                ? "Saving..."
                                : "Add Cartridge"}
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

export default AddCartridgeForm;