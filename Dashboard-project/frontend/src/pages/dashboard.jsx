
import { useEffect, useState } from "react";

import {
    FiPackage,
    FiArchive,
    FiSend,
    FiAlertTriangle,
    FiX
} from "react-icons/fi";

import Sidebar from "../components/Sidebar/sidebar";
import Navbar from "../components/Navbar/navbar";
import DashboardCard from "../components/DashboardCard/dashboardCard";
import IssueCartridgeForm from "../components/Forms/IssueCartridgeForm/issueCartridgeForm";
import MonthlyIssueChart from "../components/Charts/MonthlyIssueChart/monthlyIssueChart";
import CartridgeQuantities from "../components/Charts/CartridgeQuantities/cartridgeQuantities";
import RecentActivity from "../components/RecentActivity/recentActivity";
import { apiRequest } from "../api/apiClient";
import { useAuth } from "../context/AuthContext";

import "./Dashboard.css";


function Dashboard() {

    const { accessToken } = useAuth();

    const [showForm, setShowForm] = useState(false);

    const [summary, setSummary] = useState({
        cartridge_models: 0,
        available_stock: 0,
        issued_this_month: 0,
        low_stock_alerts: 0
    });

    const [loading, setLoading] = useState(true);

    const [activeModal, setActiveModal] = useState(null);

    const [modalData, setModalData] = useState([]);

    const [modalLoading, setModalLoading] = useState(false);

    const [modalError, setModalError] = useState("");


    const loadDashboardSummary = async () => {

        try {

            setLoading(true);

            const response = await apiRequest(
                "/dashboard/summary",
                {},
                accessToken
            );

            setSummary(
                response?.data || {
                    cartridge_models: 0,
                    available_stock: 0,
                    issued_this_month: 0,
                    low_stock_alerts: 0
                }
            );

        } catch (error) {

            console.error(
                "Failed to load dashboard summary:",
                error
            );

            setSummary({
                cartridge_models: 0,
                available_stock: 0,
                issued_this_month: 0,
                low_stock_alerts: 0
            });

        } finally {

            setLoading(false);

        }
    };


    const openCardModal = async (type) => {

        setActiveModal(type);
        setModalLoading(true);
        setModalError("");
        setModalData([]);

        try {

            if (type === "issued") {

                const response = await apiRequest(
                    "/dashboard/monthly-issues-list",
                    {},
                    accessToken
                );

                setModalData(
                    response?.data || []
                );

            } else {

                const response = await apiRequest(
                    "/dashboard/inventory-details",
                    {},
                    accessToken
                );

                let data =
                    response?.data || [];

                if (type === "lowstock") {

                    data = data.filter(
                        (item) =>
                            item.status !== "Normal"
                    );

                }

                setModalData(data);

            }

        } catch (error) {

            console.error(
                "Failed to load card details:",
                error
            );

            setModalError(
                error.message ||
                "Failed to load details."
            );

        } finally {

            setModalLoading(false);

        }
    };


    const closeCardModal = () => {

        setActiveModal(null);
        setModalData([]);
        setModalError("");

    };


    function formatDate(value) {

        if (!value) {
            return "";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return date.toLocaleDateString(
            "en-GB",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );
    }


    useEffect(() => {

        if (accessToken) {
            loadDashboardSummary();
        }

    }, [accessToken]);


    const handleIssueFormClose = () => {

        setShowForm(false);

        loadDashboardSummary();

    };


    return (

        <div className="dashboard-container">

            <Sidebar />

            <div className="main-content">

                <Navbar />

                <div className="dashboard">

                    <div className="dashboard-header">

                        <div>

                            <h1>
                                MMRCL Cartridge Management
                            </h1>

                            <p>
                                Monitor inventory, requests, and installations
                            </p>

                        </div>

                        <button
                            className="stock-btn"
                            onClick={() =>
                                setShowForm(true)
                            }
                        >
                            Request Cartridge
                        </button>

                    </div>


                    <div className="cards">

                        <DashboardCard
                            title="Cartridge Models"
                            value={
                                loading
                                    ? "..."
                                    : summary.cartridge_models
                            }
                            subtitle="Active models"
                            footer="Currently registered"
                            icon={<FiPackage />}
                            color="blue"
                            onClick={() =>
                                openCardModal("models")
                            }
                        />


                        <DashboardCard
                            title="Available Stock"
                            value={
                                loading
                                    ? "..."
                                    : summary.available_stock
                            }
                            subtitle="Ready to issue"
                            footer="Current available quantity"
                            icon={<FiArchive />}
                            color="green"
                            onClick={() =>
                                openCardModal("stock")
                            }
                        />


                        <DashboardCard
                            title="Issued This Month"
                            value={
                                loading
                                    ? "..."
                                    : summary.issued_this_month
                            }
                            subtitle="Current month"
                            footer="Cartridges issued"
                            icon={<FiSend />}
                            color="orange"
                            onClick={() =>
                                openCardModal("issued")
                            }
                        />


                        <DashboardCard
                            title="Low Stock Alerts"
                            value={
                                loading
                                    ? "..."
                                    : summary.low_stock_alerts
                            }
                            subtitle="At or below reorder level"
                            footer="Requires attention"
                            icon={<FiAlertTriangle />}
                            color="red"
                            onClick={() =>
                                openCardModal("lowstock")
                            }
                        />

                    </div>


                    <div className="chart-section">

                        <CartridgeQuantities />

                        <MonthlyIssueChart />

                    </div>


                    <RecentActivity />

                </div>

            </div>


            {showForm && (

                <IssueCartridgeForm
                    closeForm={
                        handleIssueFormClose
                    }
                />

            )}


            {activeModal && (

                <div
                    className="card-modal-overlay"
                    onClick={closeCardModal}
                >

                    <div
                        className="card-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="card-modal-header">

                            <h2>

                                {activeModal === "models" &&
                                    "Cartridge Models"}

                                {activeModal === "stock" &&
                                    "Available Stock"}

                                {activeModal === "issued" &&
                                    "Issued This Month"}

                                {activeModal === "lowstock" &&
                                    "Low Stock Alerts"}

                            </h2>


                            <button
                                type="button"
                                onClick={closeCardModal}
                                aria-label="Close"
                            >
                                <FiX />
                            </button>

                        </div>


                        <div className="card-modal-body">

                            {modalError && (

                                <div className="form-error">
                                    {modalError}
                                </div>

                            )}


                            {modalLoading ? (

                                <p className="card-modal-empty">
                                    Loading...
                                </p>

                            ) : modalData.length === 0 ? (

                                <p className="card-modal-empty">
                                    No data found.
                                </p>

                            ) : activeModal === "issued" ? (

                                <table className="card-modal-table">

                                    <thead>

                                        <tr>

                                            <th>
                                                Employee
                                            </th>

                                            <th>
                                                Location
                                            </th>

                                            <th>
                                                Engineer
                                            </th>

                                            <th>
                                                Printer
                                            </th>

                                            <th>
                                                Cartridge
                                            </th>

                                            <th>
                                                Qty
                                            </th>

                                            <th>
                                                Date
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {modalData.map(
                                            (row) => (

                                                <tr
                                                    key={row.id}
                                                >

                                                    <td>
                                                        {
                                                            row.employee_name
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            row.location_name
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            row.engineer_name
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            row.printer_model
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            row.cartridge_model
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            row.quantity
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            formatDate(
                                                                row.issue_date
                                                            )
                                                        }
                                                    </td>

                                                </tr>

                                            )
                                        )}

                                    </tbody>

                                </table>

                            ) : (

                                <table className="card-modal-table">

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
                                                Available
                                            </th>

                                            <th>
                                                Reorder Level
                                            </th>

                                            <th>
                                                Status
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {modalData.map(
                                            (row) => (

                                                <tr
                                                    key={
                                                        row.cartridge_id
                                                    }
                                                >

                                                    <td>
                                                        {
                                                            row.cartridge
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            row.color
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            row.printer
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            row.available
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            row.reorder
                                                        }
                                                    </td>

                                                    <td>

                                                        <span
                                                            className={`card-modal-status ${String(
                                                                row.status || ""
                                                            )
                                                                .toLowerCase()
                                                                .replace(
                                                                    /\s+/g,
                                                                    "-"
                                                                )}`}
                                                        >
                                                            {
                                                                row.status
                                                            }
                                                        </span>

                                                    </td>

                                                </tr>

                                            )
                                        )}

                                    </tbody>

                                </table>

                            )}

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}


export default Dashboard;

