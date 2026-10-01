import {
    apiRequest,
    refreshAccessToken,
} from "./apiClient";

export async function loginUser(email, password) {
    const response = await apiRequest(
        "/auth/login",
        {
            method: "POST",
            body: {
                email,
                password,
            },
        }
    );

    return response.data;
}

export async function refreshLogin(refreshToken) {
    const response = await refreshAccessToken(
        refreshToken
    );

    return response.data;
}

export async function logoutUser(refreshToken) {
    return apiRequest("/auth/logout", {
        method: "POST",
        body: {
            refresh_token: refreshToken,
        },
    });
}

export async function getCurrentUser(accessToken) {
    const response = await apiRequest(
        "/users/me",
        {
            method: "GET",
        },
        accessToken
    );

    return response.data;
}