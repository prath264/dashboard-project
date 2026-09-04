import "./monthlyIssueChart.css";

import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";

const issueData = [
    { month: "Jan", issued: 132 },
    { month: "Feb", issued: 148 },
    { month: "Mar", issued: 121 },
    { month: "Apr", issued: 159 },
    { month: "May", issued: 171 },
    { month: "Jun", issued: 145 },
    { month: "Jul", issued: 186 }
];

function IssueTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;

    return (
        <div className="issue-tooltip">
            <span>{label}</span>
            <strong>{payload[0].value} cartridges</strong>
        </div>
    );
}

function MonthlyIssueChart() {
    return (
        <section className="chart-card monthly-issue-card">
            <div className="chart-header monthly-issue-header">
                <div>
                    <h3>Monthly Cartridge Issue</h3>
                    <p>Cartridges issued over the last 7 months</p>
                </div>
                <span className="issue-total">1,062 issued</span>
            </div>

            <div className="monthly-issue-chart">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={issueData}
                        margin={{ top: 18, right: 12, left: -18, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="issueGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.26} />
                                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.01} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 3" />
                        <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#6b7280", fontSize: 13 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#6b7280", fontSize: 13 }}
                            width={42}
                        />
                        <Tooltip content={<IssueTooltip />} cursor={{ stroke: "#93c5fd", strokeWidth: 2 }} />
                        <Area
                            type="monotone"
                            dataKey="issued"
                            name="Issued"
                            stroke="#2563eb"
                            strokeWidth={3}
                            fill="url(#issueGradient)"
                            activeDot={{ r: 6, fill: "#ffffff", stroke: "#2563eb", strokeWidth: 3 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}

export default MonthlyIssueChart;
