import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import StockInventory from "./pages/StockInventory/stockInventory";
import PendingApprovals from "./pages/PendingApprovals/PendingApprovals";
import CartridgeRequests from "./pages/CartridgeRequests/CartridgeRequests";
import InstallationHistory from "./pages/InstallationHistory/InstallationHistory";
import Locations from "./pages/Locations/Locations";
import Engineers from "./pages/Engineers/Engineers";
import Users from "./pages/Users/Users";
import StockMovements from "./pages/StockMovements/StockMovements";

import Login from "./pages/Login/Login";

import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";

import AuthProvider from "./context/AuthContext";

import "./App.css";


function App() {

    return (
        <BrowserRouter>

            <AuthProvider>

                <Routes>

                    {/* Public route */}

                    <Route
                        path="/login"
                        element={<Login />}
                    />


                    {/* Dashboard */}

                    <Route
                        path="/"
                        element={
                            <ProtectedRoute
                                allowedRoles={[
                                    "fms_it",
                                    "it_admin",
                                    "master_admin",
                                ]}
                            >
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />


                    {/* Stock Inventory */}

                    <Route
                        path="/stock-inventory"
                        element={
                            <ProtectedRoute
                                allowedRoles={[
                                    "it_admin",
                                    "master_admin",
                                ]}
                            >
                                <StockInventory />
                            </ProtectedRoute>
                        }
                    />


                    {/* Pending Approvals */}

                    <Route
                        path="/pending-approvals"
                        element={
                            <ProtectedRoute
                                allowedRoles={[
                                    "it_admin",
                                    "master_admin",
                                ]}
                            >
                                <PendingApprovals />
                            </ProtectedRoute>
                        }
                    />


                    {/* Cartridge Issues */}


                    {/* Cartridge Requests */}

                    <Route
                        path="/cartridge-requests"
                        element={
                            <ProtectedRoute
                                allowedRoles={[
                                    "fms_it",
                                    "it_admin",
                                    "master_admin",
                                ]}
                            >
                                <CartridgeRequests />
                            </ProtectedRoute>
                        }
                    />


                    {/* Installation History */}

                    <Route
                        path="/installation-history"
                        element={
                            <ProtectedRoute
                                allowedRoles={[
                                    "it_admin",
                                    "master_admin",
                                ]}
                            >
                                <InstallationHistory />
                            </ProtectedRoute>
                        }
                    />


                    {/* Locations */}

                    <Route
                        path="/locations"
                        element={
                            <ProtectedRoute
                                allowedRoles={[
                                    "it_admin",
                                    "master_admin",
                                ]}
                            >
                                <Locations />
                            </ProtectedRoute>
                        }
                    />


                    {/* Engineers */}

                    <Route
                        path="/engineers"
                        element={
                            <ProtectedRoute
                                allowedRoles={[
                                    "it_admin",
                                    "master_admin",
                                ]}
                            >
                                <Engineers />
                            </ProtectedRoute>
                        }
                    />


                    {/* Users */}

                    <Route
                        path="/users"
                        element={
                            <ProtectedRoute
                                allowedRoles={[
                                    "master_admin",
                                ]}
                            >
                                <Users />
                            </ProtectedRoute>
                        }
                    />


                    {/* Stock Movements */}

                    <Route
                        path="/stock-movements"
                        element={
                            <ProtectedRoute
                                allowedRoles={[
                                    "it_admin",
                                    "master_admin",
                                ]}
                            >
                                <StockMovements />
                            </ProtectedRoute>
                        }
                    />


                    {/* Unknown route */}

                    <Route
                        path="*"
                        element={
                            <Navigate
                                to="/"
                                replace
                            />
                        }
                    />

                </Routes>

            </AuthProvider>

        </BrowserRouter>
    );
}

export default App;