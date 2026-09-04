import { useEffect, useState } from "react";
import { FiPackage } from "react-icons/fi";

import { apiRequest } from "../../../api/apiClient";
import { useAuth } from "../../../context/AuthContext";

import "./cartridgeQuantities.css";


function CartridgeQuantities() {
    const { accessToken } = useAuth();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    useEffect(() => {

        async function loadQuantities() {

            try {

                const response = await apiRequest(
                    "/dashboard/cartridge-quantities",
                    {},
                    accessToken
                );

                setItems(
                    response.data || []
                );

            } catch (err) {

                setError(
                    err.message ||
                    "Failed to load cartridge quantities."
                );

            } finally {

                setLoading(false);

            }
        }

        if (accessToken) {
            loadQuantities();
        }

    }, [accessToken]);


    return (
        <section className="cartridge-quantities-card">

            <div className="cartridge-quantities-header">

                <div className="cartridge-quantities-title">

                    <FiPackage />

                    <h2>
                        Cartridge Quantities
                    </h2>

                </div>

            </div>


            <div className="cartridge-quantities-list">

                {loading && (
                    <div className="cartridge-quantities-message">
                        Loading...
                    </div>
                )}


                {!loading && error && (
                    <div className="cartridge-quantities-message error">
                        {error}
                    </div>
                )}


                {!loading &&
                    !error &&
                    items.length === 0 && (

                        <div className="cartridge-quantities-message">
                            No cartridge data available.
                        </div>

                    )}


                {!loading &&
                    !error &&
                    items.map((item) => (

                        <div
                            className="cartridge-quantity-row"
                            key={item.cartridge_id}
                        >

                            <div className="cartridge-quantity-name">

                                <span>
                                    {item.cartridge_model}
                                </span>

                            </div>


                            <span className="cartridge-quantity-value">
                                {item.quantity}
                            </span>

                        </div>

                    ))}

            </div>

        </section>
    );
}


export default CartridgeQuantities;