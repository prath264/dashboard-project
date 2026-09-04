import { useEffect, useState } from "react";

import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";

import { apiRequest } from "../../../api/apiClient";
import { useAuth } from "../../../context/AuthContext";

import "./monthlyIssueChart.css";


function formatMonth(value) {
    if (!value) return "";

    const date = new Date(value);

    return date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric"
    });
}


function IssueTooltip({ active, payload, label }) {
    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className="issue-tooltip">
            <span>{formatMonth(label)}</span>

            <strong>
                {payload[0].value} cartridges
            </strong>
        </div>
    );
}


function MonthlyIssueChart() {
    const { accessToken } = useAuth();

    const [issueData, setIssueData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    useEffect(() => {

        async function loadMonthlyIssues() {

            try {

                setLoading(true);
                setError("");

                const response = await apiRequest(
                    "/dashboard/monthly-issues",
                    {},
                    accessToken
                );

                setIssueData(
                    response.data || []
                );

            } catch (err) {

                console.error(
                    "Failed to load monthly cartridge issues:",
                    err
                );

                setError(
                    err.message ||
                    "Failed to load monthly cartridge issues."
                );

            } finally {

                setLoading(false);

            }
        }

        if (accessToken) {
            loadMonthlyIssues();
        }

    }, [accessToken]);


    const totalIssued = issueData.reduce(
        (total, item) =>
            total + Number(item.quantity || 0),
        0
    );


    return (
        <section className="chart-card monthly-issue-card">

            <div className="chart-header monthly-issue-header">

                <div>

                    <h3>
                        Monthly Cartridge Issue
                    </h3>

                    <p>
                        Cartridges issued over the last 7 months
                    </p>

                </div>


                <span className="issue-total">

                    {loading
                        ? "..."
                        : `${totalIssued.toLocaleString()} issued`
                    }

                </span>

            </div>


            <div className="monthly-issue-chart">

                {loading && (
                    <div className="chart-message">
                        Loading...
                    </div>
                )}


                {!loading && error && (
                    <div className="chart-message error">
                        {error}
                    </div>
                )}


                {!loading &&
                    !error &&
                    issueData.length === 0 && (

                        <div className="chart-message">
                            No cartridge issue data available.
                        </div>

                    )}


                {!loading &&
                    !error &&
                    issueData.length > 0 && (

                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >

                            <AreaChart
                                data={issueData}
                                margin={{
                                    top: 18,
                                    right: 12,
                                    left: -18,
                                    bottom: 0
                                }}
                            >

                                <defs>

                                    <linearGradient
                                        id="issueGradient"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >

                                        <stop
                                            offset="0%"
                                            stopColor="#2563eb"
                                            stopOpacity={0.26}
                                        />

                                        <stop
                                            offset="100%"
                                            stopColor="#2563eb"
                                            stopOpacity={0.01}
                                        />

                                    </linearGradient>

                                </defs>


                                <CartesianGrid
                                    vertical={false}
                                    stroke="#e5e7eb"
                                    strokeDasharray="3 3"
                                />


                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{
                                        fill: "#6b7280",
                                        fontSize: 13
                                    }}
                                    tickFormatter={formatMonth}
                                    dy={10}
                                />


                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{
                                        fill: "#6b7280",
                                        fontSize: 13
                                    }}
                                    width={42}
                                />


                                <Tooltip
                                    content={
                                        <IssueTooltip />
                                    }
                                    cursor={{
                                        stroke: "#93c5fd",
                                        strokeWidth: 2
                                    }}
                                />


                                <Area
                                    type="monotone"
                                    dataKey="quantity"
                                    name="Issued"
                                    stroke="#2563eb"
                                    strokeWidth={3}
                                    fill="url(#issueGradient)"
                                    activeDot={{
                                        r: 6,
                                        fill: "#ffffff",
                                        stroke: "#2563eb",
                                        strokeWidth: 3
                                    }}
                                />

                            </AreaChart>

                        </ResponsiveContainer>

                    )}

            </div>

        </section>
    );
}


export default MonthlyIssueChart;