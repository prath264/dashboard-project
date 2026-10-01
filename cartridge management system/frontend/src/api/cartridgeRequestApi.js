import apiClient from "./apiClient";

export const createCartridgeRequest = async (data) => {
    const response = await apiClient.post(
        "/cartridge-requests/",
        data
    );

    return response.data;
};

export const getCartridgeRequests = async () => {
    const response = await apiClient.get(
        "/cartridge-requests/"
    );

    return response.data;
};

export const getCartridgeRequest = async (requestId) => {
    const response = await apiClient.get(
        `/cartridge-requests/${requestId}`
    );

    return response.data;
};

export const approveCartridgeRequest = async (requestId) => {
    const response = await apiClient.post(
        `/cartridge-requests/${requestId}/approve`
    );

    return response.data;
};

export const rejectCartridgeRequest = async (
    requestId,
    rejectionReason
) => {
    const response = await apiClient.post(
        `/cartridge-requests/${requestId}/reject`,
        {
            rejection_reason: rejectionReason,
        }
    );

    return response.data;
};

export const installCartridgeRequest = async (requestId) => {
    const response = await apiClient.post(
        "/cartridge-issues/",
        {
            request_id: requestId,
        }
    );

    return response.data;
};