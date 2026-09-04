import "./stockStatus.css";

import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip
} from "recharts";

const data = [
    {
        name: "HP 88A",
        value: 18
    },
    {
        name: "HP 12A",
        value: 12
    },
    {
        name: "HP 78A",
        value: 9
    }
];

const COLORS = [
    "#ef4444",
    "#f97316",
    "#facc15"
];

function StockStatus() {
    return (
        <div className="chart-card">

            <div className="chart-header">
                <h3>Low Stock Cartridges</h3>
                <p>Cartridges below reorder level</p>
            </div>

            <div className="stock-chart">

                <ResponsiveContainer width="100%" height={270}>

                    <PieChart>

                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="42%"
                            cy="48%"
                            innerRadius={75}
                            outerRadius={110}
                            paddingAngle={4}
                            stroke="#ffffff"
                            strokeWidth={4}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={index}
                                    fill={COLORS[index]}
                                />
                            ))}
                        </Pie>

                        <Tooltip
                            formatter={(value) => [`${value} Units`, "Stock"]}
                        />

                    </PieChart>

                </ResponsiveContainer>

                <div className="stock-legend">

                    {data.map((item, index) => (
                        <div
                            className="legend-item"
                            key={index}
                        >

                            <span
                                className="legend-color"
                                style={{
                                    backgroundColor: COLORS[index]
                                }}
                            ></span>

                            <span className="legend-name">
                                {item.name}
                            </span>

                            <span className="legend-value">
                                {item.value}
                            </span>

                        </div>
                    ))}

                </div>

            </div>

        </div>
    );
}

export default StockStatus;