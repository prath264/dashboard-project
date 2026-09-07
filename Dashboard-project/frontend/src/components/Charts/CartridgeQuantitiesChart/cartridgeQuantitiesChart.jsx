import { useEffect, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { apiRequest } from "../../../api/apiClient";
import { useAuth } from "../../../context/AuthContext";

import "./cartridgeQuantitiesChart.css";


function ConsumptionTooltip({ active, payload, label }) {
    if (!active || !payload?.length) {
        return null;
    }

    const issued = payload.find(
        (item) => item.dataKey === "issued"
    );

    const remaining = payload.find(
        (item) => item.dataKey === "remaining"
    );

    const total =
        Number(issued?.value || 0) +
        Number(remaining?.value || 0);

    return (
        <div className="consumption-tooltip">

            <strong className="tooltip-title">
                {label}
            </strong>

            <div className="tooltip-row issued">
                <span className="tooltip-dot" />
                <span>Issued</span>
                <strong>
                    {Number(issued?.value || 0).toLocaleString()}
                </strong>
            </div>

            <div className="tooltip-row remaining">
                <span className="tooltip-dot" />
                <span>Remaining</span>
                <strong>
                    {Number(remaining?.value || 0).toLocaleString()}
                </strong>
            </div>

            <div className="tooltip-total">
                <span>Total Added</span>
                <strong>
                    {total.toLocaleString()}
                </strong>
            </div>

        </div>
    );
}


function CartridgeQuantitiesChart() {

    const { accessToken } = useAuth();

    const [data, setData] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");


    const loadConsumption = async () => {

        if (!accessToken) {
            setLoading(false);
            return;
        }

        try {

            setLoading(true);
            setError("");

            const response = await apiRequest(
                "/dashboard/cartridge-consumption",
                {},
                accessToken
            );

            setData(
                Array.isArray(response?.data)
                    ? response.data
                    : []
            );

        } catch (err) {

            console.error(
                "Failed to load cartridge consumption:",
                err
            );

            setError(
                err.message ||
                "Failed to load cartridge consumption."
            );

            setData([]);

        } finally {

            setLoading(false);

        }
    };


    useEffect(() => {

        loadConsumption();

    }, [accessToken]);


    const totalAdded = data.reduce(
        (sum, item) =>
            sum + Number(item.total_added || 0),
        0
    );

    const totalIssued = data.reduce(
        (sum, item) =>
            sum + Number(item.issued || 0),
        0
    );

    const totalRemaining = data.reduce(
        (sum, item) =>
            sum + Number(item.remaining || 0),
        0
    );


    return (

        <section className="cartridge-consumption-card">

            <div className="cartridge-consumption-header">

                <div>

                    <h3>
                        Cartridge Consumption
                    </h3>

                    <p>
                        Issued and remaining quantity by cartridge model
                    </p>

                </div>


                <div className="consumption-total">

                    <span>
                        Total Added
                    </span>

                    <strong>
                        {loading
                            ? "..."
                            : totalAdded.toLocaleString()
                        }
                    </strong>

                </div>

            </div>


            <div className="consumption-legend">

                <div className="legend-item">

                    <span className="legend-dot issued-dot" />

                    <span>
                        Issued
                    </span>

                    <strong>
                        {loading
                            ? "..."
                            : totalIssued.toLocaleString()
                        }
                    </strong>

                </div>


                <div className="legend-item">

                    <span className="legend-dot remaining-dot" />

                    <span>
                        Remaining
                    </span>

                    <strong>
                        {loading
                            ? "..."
                            : totalRemaining.toLocaleString()
                        }
                    </strong>

                </div>

            </div>


            <div className="cartridge-consumption-chart">

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
                    data.length === 0 && (

                        <div className="chart-message">
                            No cartridge consumption data available.
                        </div>

                    )
                }


                {!loading &&
                    !error &&
                    data.length > 0 && (

                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >

                            <BarChart
                                data={data}
                                margin={{
                                    top: 20,
                                    right: 20,
                                    left: 0,
                                    bottom: 10
                                }}
                                barCategoryGap="30%"
                            >

                                <CartesianGrid
                                    vertical={false}
                                    stroke="#e5e7eb"
                                    strokeDasharray="3 3"
                                />


                                <XAxis
                                    dataKey="cartridge_model"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{
                                        fill: "#6b7280",
                                        fontSize: 12
                                    }}
                                    interval={0}
                                    dy={10}
                                />


                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{
                                        fill: "#6b7280",
                                        fontSize: 12
                                    }}
                                    width={45}
                                    allowDecimals={false}
                                />


                                <Tooltip
                                    content={
                                        <ConsumptionTooltip />
                                    }
                                    cursor={{
                                        fill: "rgba(37, 99, 235, 0.05)"
                                    }}
                                />


                                <Bar
                                    dataKey="issued"
                                    name="Issued"
                                    stackId="consumption"
                                    fill="#f59e0b"
                                    radius={[
                                        0,
                                        0,
                                        0,
                                        0
                                    ]}
                                >

                                    {data.map(
                                        (item) => (
                                            <Cell
                                                key={`issued-${item.cartridge_id}`}
                                            />
                                        )
                                    )}

                                </Bar>


                                <Bar
                                    dataKey="remaining"
                                    name="Remaining"
                                    stackId="consumption"
                                    fill="#10b981"
                                    radius={[
                                        6,
                                        6,
                                        0,
                                        0
                                    ]}
                                >

                                    <LabelList
                                        dataKey="total_added"
                                        position="top"
                                        formatter={(value) =>
                                            Number(value).toLocaleString()
                                        }
                                        fill="#374151"
                                        fontSize={12}
                                        fontWeight={600}
                                    />

                                </Bar>

                            </BarChart>

                        </ResponsiveContainer>

                    )
                }

            </div>

        </section>

    );
}


export default CartridgeQuantitiesChart;