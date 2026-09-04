import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiChevronDown } from "react-icons/fi";

import { useAuth } from "../../context/AuthContext";

import "./Sidebar.css";

function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    const { user } = useAuth();

    const role = user?.role;

    const isFmsIT = role === "fms_it";
    const isITAdmin = role === "it_admin";
    const isMasterAdmin = role === "master_admin";

    const masterPages = [
        "/locations",
        "/engineers",
        "/users"
    ];

    const [masterOpen, setMasterOpen] = useState(
        masterPages.includes(location.pathname)
    );

    const handleMasterClick = () => {
        setMasterOpen((current) => !current);
    };

    const handleMasterPageClick = (path) => {
        setMasterOpen(true);
        navigate(path);
    };

    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <aside className="sidebar">

            <h2>MMRCL</h2>

            <ul>

                {/* Dashboard */}

                <li
                    className={isActive("/") ? "active" : ""}
                    onClick={() => navigate("/")}
                >
                    Dashboard
                </li>

                {/* Cartridge Requests */}

                <li
                    className={
                        isActive("/cartridge-requests")
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        navigate("/cartridge-requests")
                    }
                >
                    Requests
                </li>


                {/* IT Admin + Master Admin */}

                {(isITAdmin || isMasterAdmin) && (
                    <>
                        <li
                            className={
                                isActive("/pending-approvals")
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                navigate("/pending-approvals")
                            }
                        >
                            Approvals
                        </li>

                        <li
                            className={
                                isActive("/stock-inventory")
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                navigate("/stock-inventory")
                            }
                        >
                            Inventory
                        </li>


                        <li
                            className={
                                isActive("/stock-movements")
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                navigate("/stock-movements")
                            }
                        >
                            Stock Movements
                        </li>

                        <li
                            className="master-menu"
                            onClick={handleMasterClick}
                        >
                            <span>Master</span>

                            <FiChevronDown
                                className={`master-arrow ${
                                    masterOpen ? "open" : ""
                                }`}
                            />
                        </li>
                    </>
                )}

            </ul>

            {/* Master dropdown */}

            {(isITAdmin || isMasterAdmin) &&
                masterOpen && (
                    <ul className="master-dropdown">

                        <li
                            className={
                                isActive("/locations")
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                handleMasterPageClick(
                                    "/locations"
                                )
                            }
                        >
                            Locations/Users
                        </li>

                        <li
                            className={
                                isActive("/engineers")
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                handleMasterPageClick(
                                    "/engineers"
                                )
                            }
                        >
                            Engineers
                        </li>

                        {/* Only Master Admin */}

                        {isMasterAdmin && (
                            <li
                                className={
                                    isActive("/users")
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    handleMasterPageClick(
                                        "/users"
                                    )
                                }
                            >
                                Users
                            </li>
                        )}

                    </ul>
                )}

        </aside>
    );
}

export default Sidebar;