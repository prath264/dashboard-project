import { useEffect, useState } from "react";
import {
    Navigate,
    useLocation,
    useNavigate,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

import "./login.css";

function Login() {

    const navigate = useNavigate();
    const location = useLocation();

    const {
        login,
        isAuthenticated,
        loading,
    } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {

        if (isAuthenticated) {

            const destination =
                location.state?.from?.pathname ||
                "/";

            navigate(
                destination,
                {
                    replace: true,
                }
            );
        }

    }, [
        isAuthenticated,
        navigate,
        location,
    ]);

    if (loading) {
        return (
            <div className="login-page">
                <div className="login-loading">
                    Loading...
                </div>
            </div>
        );
    }

    if (isAuthenticated) {
        return null;
    }

    const handleSubmit = async (event) => {

        event.preventDefault();

        setError("");
        setSubmitting(true);

        try {

            await login(
                email.trim(),
                password
            );

            const destination =
                location.state?.from?.pathname ||
                "/";

            navigate(
                destination,
                {
                    replace: true,
                }
            );

        } catch (err) {

            setError(
                err.message ||
                "Invalid email or password."
            );

        } finally {

            setSubmitting(false);
        }
    };

    return (
        <div className="login-page">

            <div className="login-card">

                <div className="login-header">

                    <h1>
                        Cartridge Management
                    </h1>

                    <p>
                        Sign in to continue
                    </p>

                </div>

                <form
                    className="login-form"
                    onSubmit={handleSubmit}
                >

                    <div className="login-form-group">

                        <label htmlFor="email">
                            Email
                        </label>

                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(event) =>
                                setEmail(
                                    event.target.value
                                )
                            }
                            placeholder="Enter your email"
                            autoComplete="email"
                            required
                        />

                    </div>

                    <div className="login-form-group">

                        <label htmlFor="password">
                            Password
                        </label>

                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(event) =>
                                setPassword(
                                    event.target.value
                                )
                            }
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            required
                        />

                    </div>

                    {error && (
                        <div className="login-error">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="login-submit"
                        disabled={submitting}
                    >
                        {submitting
                            ? "Signing in..."
                            : "Sign In"}
                    </button>

                </form>

            </div>

        </div>
    );
}

export default Login;