import { useState } from "react";
import {
    FiPackage,
    FiArchive,
    FiSend,
    FiAlertTriangle
} from "react-icons/fi";

import Sidebar from "../components/Sidebar/sidebar";
import Navbar from "../components/Navbar/navbar";
import DashboardCard from "../components/DashboardCard/dashboardCard";
import IssueCartridgeForm from "../components/Forms/IssueCartridgeForm/issueCartridgeForm";
import StockStatus from "../components/Charts/StockStatus/stockStatus";
import MonthlyIssueChart from "../components/Charts/MonthlyIssueChart/monthlyIssueChart";

import "./Dashboard.css";

function Dashboard() {
    const [showForm, setShowForm] = useState(false);

    return (
        <div className="dashboard-container">

            <Sidebar />

            <div className="main-content">

                <Navbar />

                <div className="dashboard">

                    <div className="dashboard-header">

                        <div>
                            <h1>Dashboard</h1>
                            <p>Overview of cartridge inventory</p>
                        </div>

                        <button
                            className="stock-btn"
                            onClick={() => setShowForm(true)}
                        >
                            Issue Cartridge
                        </button>

                    </div>

                    <div className="cards">

                        <DashboardCard
                            title="Total Cartridges"
                            value="1265"
                            subtitle="Across all models"
                            footer="Last updated: Today"
                            icon={<FiPackage />}
                            color="blue"
                        />

                        <DashboardCard
                            title="Available Stock"
                            value="842"
                            subtitle="Ready to issue"
                            footer="Available for allocation"
                            icon={<FiArchive />}
                            color="green"
                        />

                        <DashboardCard
                            title="Issued This Month"
                            value="186"
                            subtitle="Current month"
                            footer="Average 6 per day"
                            icon={<FiSend />}
                            color="orange"
                        />

                        <DashboardCard
                            title="Low Stock"
                            value="12"
                            subtitle="Below Minimum Stock"
                            footer="12 Critical • 18 Reorder Soon"
                            icon={<FiAlertTriangle />}
                            color="red"
                        />

                    </div>

                    <div className="chart-section">

                        <StockStatus />

                        <MonthlyIssueChart />

                    </div>

                </div>

            </div>

            {showForm && (
                <IssueCartridgeForm
                    closeForm={() => setShowForm(false)}
                />
            )}

        </div>
    );
}

export default Dashboard;