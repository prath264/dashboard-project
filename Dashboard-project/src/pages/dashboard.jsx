import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import DashboardCard from "../components/DashboardCard";

function Dashboard() {
    return (
        <div className="dashboard-container">

            <Sidebar />

            <div className="main-content">

                <Navbar />

                <div className="dashboard">

                    <div className="dashboard-header">
                        <div>
                            <h1>Dashboard</h1>
                            <p>Overview of cartridge inventory and usage</p>
                        </div>

                        <button className="stock-btn">
                            + Stock Inward
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
                            subtitle="Usable Cartridges"
                        />

                        <DashboardCard
                            title="Low Stock"
                            value="67"
                            subtitle="Reorder Recommended"
                        />

                        <DashboardCard
                            title="Out of Stock"
                            value="12"
                            subtitle="Need Immediate Attention"
                        />

                    </div>

                </div>

            </div>

        </div>
    );
}

export default Dashboard;