import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import DashboardCard from "../components/DashboardCard";
import IssueCartridgeForm from "../components/IssueCartridgeForm";
import StockStatus from "../components/Charts/StockStatus";
import MonthlyIssueChart from "../components/Charts/MonthlyIssueChart";

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
              subtitle="All Types"
            />

            <DashboardCard
              title="In Stock"
              value="842"
              subtitle="Available"
            />

            <DashboardCard
              title="Low Stock"
              value="67"
              subtitle="Need Refill"
            />

            <DashboardCard
              title="Out Of Stock"
              value="12"
              subtitle="Urgent"
            />
          </div>
          <div className="chart-section">

            <StockStatus />

            <MonthlyIssueChart />

          </div>
          {showForm && (
            <IssueCartridgeForm
              closeForm={() => setShowForm(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;