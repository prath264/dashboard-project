import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

import {
    getCurrentUser,
    loginUser,
    logoutUser,
    refreshLogin,
} from "../api/authApi";

const AuthContext = createContext(null);

const ACCESS_TOKEN_KEY = "cartridge_access_token";
const REFRESH_TOKEN_KEY = "cartridge_refresh_token";
const USER_KEY = "cartridge_user";

function AuthProvider({ children }) {

    const [accessToken, setAccessToken] = useState(
        () =>
            localStorage.getItem(
                ACCESS_TOKEN_KEY
            )
    );

    const [refreshToken, setRefreshToken] = useState(
        () =>
            localStorage.getItem(
                REFRESH_TOKEN_KEY
            )
    );

    const [user, setUser] = useState(() => {

        const storedUser =
            localStorage.getItem(USER_KEY);

        if (!storedUser) {
            return null;
        }

        try {
            return JSON.parse(storedUser);
        } catch {
            localStorage.removeItem(USER_KEY);
            return null;
        }
    });

    const [loading, setLoading] = useState(true);

    const saveAuthentication = useCallback(
        (authData) => {

            const newAccessToken =
                authData?.tokens?.access_token;

            const newRefreshToken =
                authData?.tokens?.refresh_token;

            const newUser =
                authData?.user;

            if (!newAccessToken || !newRefreshToken || !newUser) {
                throw new Error(
                    "Invalid authentication response."
                );
            }

            setAccessToken(newAccessToken);
            setRefreshToken(newRefreshToken);
            setUser(newUser);

            localStorage.setItem(
                ACCESS_TOKEN_KEY,
                newAccessToken
            );

            localStorage.setItem(
                REFRESH_TOKEN_KEY,
                newRefreshToken
            );

            localStorage.setItem(
                USER_KEY,
                JSON.stringify(newUser)
            );
        },
        []
    );

    const clearAuthentication = useCallback(() => {

        setAccessToken(null);
        setRefreshToken(null);
        setUser(null);

        localStorage.removeItem(
            ACCESS_TOKEN_KEY
        );

        localStorage.removeItem(
            REFRESH_TOKEN_KEY
        );

        localStorage.removeItem(
            USER_KEY
        );

    }, []);

    const login = useCallback(
        async (email, password) => {

            const authData =
                await loginUser(
                    email,
                    password
                );

            saveAuthentication(
                authData
            );

            return authData.user;
        },
        [saveAuthentication]
    );

    const logout = useCallback(
        async () => {

            const storedRefreshToken =
                refreshToken;

            try {

                if (storedRefreshToken) {
                    await logoutUser(
                        storedRefreshToken
                    );
                }

            } catch {
                // Even if the backend logout fails,
                // clear the local authentication state.
            } finally {

                clearAuthentication();
            }
        },
        [
            refreshToken,
            clearAuthentication,
        ]
    );

    const refreshSession = useCallback(
        async () => {

            if (!refreshToken) {
                clearAuthentication();
                return false;
            }

            try {

                const authData =
                    await refreshLogin(
                        refreshToken
                    );

                const newTokens =
                    authData?.tokens;

                if (!newTokens?.access_token) {
                    throw new Error(
                        "Invalid refresh response."
                    );
                }

                setAccessToken(
                    newTokens.access_token
                );

                setRefreshToken(
                    newTokens.refresh_token
                );

                localStorage.setItem(
                    ACCESS_TOKEN_KEY,
                    newTokens.access_token
                );

                localStorage.setItem(
                    REFRESH_TOKEN_KEY,
                    newTokens.refresh_token
                );

                if (authData.user) {

                    setUser(authData.user);

                    localStorage.setItem(
                        USER_KEY,
                        JSON.stringify(
                            authData.user
                        )
                    );
                }

                return true;

            } catch {

                clearAuthentication();

                return false;
            }
        },
        [
            refreshToken,
            clearAuthentication,
        ]
    );

    useEffect(() => {

        let cancelled = false;

        async function initializeAuthentication() {

            if (!accessToken) {

                if (!cancelled) {
                    setLoading(false);
                }

                return;
            }

            try {

                const currentUser =
                    await getCurrentUser(
                        accessToken
                    );

                if (cancelled) {
                    return;
                }

                setUser(currentUser);

                localStorage.setItem(
                    USER_KEY,
                    JSON.stringify(
                        currentUser
                    )
                );

            } catch (error) {

                if (cancelled) {
                    return;
                }

                if (
                    error.status === 401 &&
                    refreshToken
                ) {

                    await refreshSession();

                } else {

                    clearAuthentication();
                }

            } finally {

                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        initializeAuthentication();

        return () => {
            cancelled = true;
        };

    }, [
        accessToken,
        refreshToken,
        refreshSession,
        clearAuthentication,
    ]);

    const value = {
        user,
        accessToken,
        refreshToken,
        loading,
        isAuthenticated: Boolean(
            accessToken && user
        ),
        login,
        logout,
        refreshSession,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {

    const context =
        useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth must be used inside AuthProvider."
        );
    }

    return context;
}

export default AuthProvider;