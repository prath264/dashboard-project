import { useState } from "react";
import { FiCheckCircle, FiPackage } from "react-icons/fi";

import Sidebar from "../../components/Sidebar/sidebar";
import Navbar from "../../components/Navbar/navbar";

import "./cartridgeIssues.css";

const initialIssues = [
    {
        id: "ISS-00542",
        requestId: "REQ-1024",
        employee: "Prathamesh",
        location: "Transit 1st Floor",
        printer: "HP M404",
        cartridge: "HP 88A",
        quantity: 1,
        engineer: "Rajesh",
        issueDate: "19 Aug 2026"
    }
];

const defaultForm = {
    requestId: "REQ-1024",
    employee: "Prathamesh",
    location: "Transit 1st Floor",
    printer: "HP M404",
    cartridge: "HP 88A",
    quantity: 1,
    engineer: "Rajesh",
    issueDate: "2026-08-19",
    remarks: "Cartridge replaced"
};

function formatIssueDate(dateValue) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(new Date(`${dateValue}T00:00:00`));
}

function CartridgeIssues() {
    const [issues, setIssues] = useState(initialIssues);
    const [form, setForm] = useState(defaultForm);
    const [availableStock, setAvailableStock] = useState(18);
    const [message, setMessage] = useState("");

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((currentForm) => ({ ...currentForm, [name]: value }));
    };

    const handleConfirmIssue = (event) => {
        event.preventDefault();
        const quantity = Number(form.quantity);

        if (quantity <= 0) {
            setMessage("Quantity must be at least 1.");
            return;
        }

        if (quantity > availableStock) {
            setMessage(`Only ${availableStock} cartridges are currently available.`);
            return;
        }

        const nextIssue = {
            ...form,
            id: `ISS-${String(issues.length + 543).padStart(5, "0")}`,
            quantity,
            issueDate: formatIssueDate(form.issueDate)
        };

        setIssues((currentIssues) => [nextIssue, ...currentIssues]);
        setAvailableStock((currentStock) => currentStock - quantity);
        setMessage(`Issue ${nextIssue.id} confirmed. Inventory has been updated.`);
    };

    return (
        <div className="dashboard-container">
            <Sidebar />

            <div className="main-content">
                <Navbar />

                <main className="cartridge-issues-page">
                    <div className="issues-header">
                        <div>
                            <h1>Cartridge Issues</h1>
                            <p>Record cartridges that have been issued or installed.</p>
                        </div>
                    </div>

                    <div className="issues-layout">
                        <section className="issues-card">
                            <div className="issues-card-header">
                                <h2>Issued Cartridges</h2>
                                <span>{issues.length} recorded</span>
                            </div>

                            <div className="issues-table-container">
                                <table className="issues-table">
                                    <thead>
                                        <tr>
                                            <th>Issue ID</th>
                                            <th>Request ID</th>
                                            <th>Employee</th>
                                            <th>Location</th>
                                            <th>Printer</th>
                                            <th>Cartridge</th>
                                            <th>Quantity</th>
                                            <th>Engineer</th>
                                            <th>Issue Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {issues.map((issue) => (
                                            <tr key={issue.id}>
                                                <td className="issue-id">{issue.id}</td>
                                                <td>{issue.requestId}</td>
                                                <td>{issue.employee}</td>
                                                <td>{issue.location}</td>
                                                <td>{issue.printer}</td>
                                                <td>{issue.cartridge}</td>
                                                <td>{issue.quantity}</td>
                                                <td>{issue.engineer}</td>
                                                <td>{issue.issueDate}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <aside className="issue-form-card">
                            <div className="issue-form-heading">
                                <div>
                                    <FiPackage />
                                    <h2>Issue Form</h2>
                                </div>
                                <span>{availableStock} HP 88A available</span>
                            </div>

                            <form onSubmit={handleConfirmIssue}>
                                <label>
                                    Request ID
                                    <input name="requestId" value={form.requestId} onChange={handleChange} required />
                                </label>
                                <label>
                                    Employee
                                    <input name="employee" value={form.employee} onChange={handleChange} required />
                                </label>
                                <label>
                                    Location
                                    <input name="location" value={form.location} onChange={handleChange} required />
                                </label>
                                <label>
                                    Printer
                                    <input name="printer" value={form.printer} onChange={handleChange} required />
                                </label>
                                <label>
                                    Cartridge
                                    <input name="cartridge" value={form.cartridge} onChange={handleChange} required />
                                </label>
                                <div className="issue-form-row">
                                    <label>
                                        Quantity
                                        <input name="quantity" type="number" min="1" value={form.quantity} onChange={handleChange} required />
                                    </label>
                                    <label>
                                        Engineer
                                        <input name="engineer" value={form.engineer} onChange={handleChange} required />
                                    </label>
                                </div>
                                <label>
                                    Issue Date
                                    <input name="issueDate" type="date" value={form.issueDate} onChange={handleChange} required />
                                </label>
                                <label>
                                    Remarks
                                    <textarea name="remarks" value={form.remarks} onChange={handleChange} />
                                </label>

                                {message && <p className="issue-message">{message}</p>}

                                <button className="confirm-issue-btn" type="submit">
                                    <FiCheckCircle /> Confirm Issue
                                </button>
                            </form>
                        </aside>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default CartridgeIssues;
