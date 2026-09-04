const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

function getErrorMessage(responseData) {
    const detail = responseData?.detail;

    if (typeof detail === "string") {
        return detail;
    }

    if (Array.isArray(detail)) {
        return detail
            .map((item) => {
                if (typeof item === "string") {
                    return item;
                }

                if (item?.msg) {
                    return item.msg;
                }

                return JSON.stringify(item);
            })
            .join(", ");
    }

    if (detail && typeof detail === "object") {
        return detail.message ||
            detail.msg ||
            JSON.stringify(detail);
    }

    if (typeof responseData?.message === "string") {
        return responseData.message;
    }

    return "Something went wrong.";
}

export async function apiRequest(
    endpoint,
    options = {},
    accessToken = null
) {
    const {
        method = "GET",
        body,
        headers = {},
    } = options;

    const requestHeaders = {
        Accept: "application/json",
        ...headers,
    };

    if (body !== undefined) {
        requestHeaders["Content-Type"] = "application/json";
    }

    if (accessToken) {
        requestHeaders.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            method,
            headers: requestHeaders,
            body:
                body !== undefined
                    ? JSON.stringify(body)
                    : undefined,
        }
    );

    let responseData = null;

    try {
        responseData = await response.json();
    } catch {
        responseData = null;
    }

    if (!response.ok) {
        const error = new Error(
            getErrorMessage(responseData)
        );

        error.status = response.status;
        error.data = responseData;

        throw error;
    }

    return responseData;
}

export async function refreshAccessToken(refreshToken) {
    return apiRequest(
        "/auth/refresh",
        {
            method: "POST",
            body: {
                refresh_token: refreshToken,
            },
        }
    );
}

export { API_BASE_URL };