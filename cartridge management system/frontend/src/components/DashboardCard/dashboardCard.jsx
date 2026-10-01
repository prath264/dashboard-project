
import "./dashboardCard.css";


function DashboardCard({
    title,
    value,
    subtitle,
    footer,
    icon,
    color,
    onClick
}) {

    const handleKeyDown = (event) => {

        if (!onClick) {
            return;
        }

        if (
            event.key === "Enter" ||
            event.key === " "
        ) {

            event.preventDefault();

            onClick();

        }
    };


    return (

        <div
            className={`dashboard-card ${color}`}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            style={
                onClick
                    ? { cursor: "pointer" }
                    : undefined
            }
        >

            <div className="card-top">

                <div>

                    <h4>
                        {title}
                    </h4>

                    <h2>
                        {value}
                    </h2>

                    <p>
                        {subtitle}
                    </p>

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

