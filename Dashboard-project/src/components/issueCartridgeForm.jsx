import "./IssueCartridgeForm.css";
import { useState, useEffect } from "react";

function IssueCartridgeForm({ closeForm }) {

    const employees = {
        "Sandesh Kadam": {
            id: "EMP001",
            department: "IT"
        },
        "Kushal Nehete": {
            id: "EMP002",
            department: "IT"
        },
        "Prathamesh Gholap": {
            id: "EMP003",
            department: "IT"
        }
    };

    const [employee, setEmployee] = useState("");
    const [employeeId, setEmployeeId] = useState("");
    const [department, setDepartment] = useState("");

    
    useEffect(() => {
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    const handleEmployee = (e) => {
        const name = e.target.value;
        setEmployee(name);

        if (employees[name]) {
            setEmployeeId(employees[name].id);
            setDepartment(employees[name].department);
        } else {
            setEmployeeId("");
            setDepartment("");
        }
    };

    return (

        <div
            className="modal"
            onClick={closeForm}
        >

            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
            >

                <h2>Issue Cartridge</h2>

                <form>

                    <label>Employee Name</label>

                    <input
                        list="employees"
                        value={employee}
                        onChange={handleEmployee}
                        placeholder="Search Employee"
                    />

                    <datalist id="employees">
                        <option value="Sandesh Kadam" />
                        <option value="Kushal Nehete" />
                        <option value="Prathamesh Gholap" />
                    </datalist>

                    <label>Employee ID</label>

                    <input
                        type="text"
                        value={employeeId}
                        readOnly
                    />

                    <label>Department</label>

                    <input
                        type="text"
                        value={department}
                        readOnly
                    />

                    <label>Location</label>

                    <select>
                        <option>Select Location</option>
                        <option>Transit 1st Floor</option>
                        <option>Transit Ground Floor</option>
                        <option>GC 1st Floor</option>
                    </select>

                    <label>Engineer</label>

                    <select>
                        <option>Select Engineer</option>
                        <option>Sandesh Kadam</option>
                        <option>Kushal Nehete</option>
                    </select>

                    <label>Printer</label>

                    <select>
                        <option>Select Printer</option>
                        <option>Printer 1</option>
                        <option>Printer 2</option>
                        <option>Printer 3</option>
                    </select>

                    <label>Cartridge Model</label>

                    <select>
                        <option>Select Model</option>
                        <option>Model 1</option>
                        <option>Model 2</option>
                        <option>Model 3</option>
                    </select>

                    <label>Quantity</label>

                    <input
                        type="number"
                        defaultValue={1}
                        min={1}
                    />

                    <label>Issue Date</label>

                    <input
                        type="date"
                        value={new Date().toISOString().split("T")[0]}
                        readOnly
                    />

                    <label>Remarks</label>

                    <textarea
                        rows="3"
                        placeholder="Remarks..."
                    ></textarea>

                    <div className="buttons">

                        <button type="submit">
                            Issue Cartridge
                        </button>

                        <button
                            type="button"
                            onClick={closeForm}
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