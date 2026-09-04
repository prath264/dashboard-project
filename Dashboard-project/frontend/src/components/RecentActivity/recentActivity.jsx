import "./recentActivity.css";
import { useEffect, useState } from "react";

import { apiRequest } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";

const columns = [
    { key: "id", label: "Issue ID" },
    { key: "employee_name", label: "Employee" },
    { key: "location_name", label: "Location" },
    { key: "engineer_name", label: "Engineer" },
    { key: "printer_model", label: "Printer" },
    { key: "cartridge_model", label: "Cartridge" },
    { key: "quantity", label: "Quantity" },
    { key: "issue_date", label: "Issue Date" },
    { key: "remarks", label: "Remarks" },
];

function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function RecentActivity() {
    const { accessToken } = useAuth();

    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadActivity() {
            try {
                setLoading(true);

                const response = await apiRequest(
                    "/dashboard/recent-activity",
                    {},
                    accessToken
                );

                setActivity(response?.data || []);
            } catch (error) {
                console.error(
                    "Failed to load recent activity:",
                    error
                );

                setActivity([]);
            } finally {
                setLoading(false);
            }
        }

        if (accessToken) {
            loadActivity();
        }
    }, [accessToken]);

    return (
        <section className="recent-activity">
            <h3>Recent Cartridge Issues</h3>

            <div className="recent-activity-table-wrap">
                <table className="recent-activity-table">
                    <thead>
                        <tr>
                            {columns.map((column) => (
                                <th key={column.key}>
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="no-results"
                                >
                                    Loading...
                                </td>
                            </tr>
                        ) : activity.length > 0 ? (
                            activity.map((item, index) => (
                                <tr
                                    key={
                                        item.id ??
                                        item.issue_id ??
                                        index
                                    }
                                >
                                    {columns.map((column) => (
                                        <td key={column.key}>
                                            {column.key === "issue_date"
                                                ? formatDate(
                                                      item[column.key]
                                                  )
                                                : item[column.key] ?? ""}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="no-results"
                                >
                                    No recent activity.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

export default RecentActivity;