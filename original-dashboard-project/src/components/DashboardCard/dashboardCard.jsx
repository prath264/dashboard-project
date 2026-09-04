import "./dashboardCard.css";

function DashboardCard({
    title,
    value,
    subtitle,
    footer,
    icon,
    color
}) {
    return (
        <div className={`dashboard-card ${color}`}>

            <div className="card-top">

                <div>

                    <h4>{title}</h4>

                    <h2>{value}</h2>

                    <p>{subtitle}</p>

                </div>

                <div className="card-icon">
                    {icon}
                </div>

            </div>

            <div className="card-footer">
                {footer}
            </div>

        </div>
    );
}

export default DashboardCard;