import { API_BASE_URL } from "./apiClient";

export async function downloadFile(endpoint, accessToken) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
            Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/pdf",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
    });

    if (!response.ok) {
        let message = "Failed to export data.";
        try {
            const data = await response.json();
            message = data?.detail || message;
        } catch {
            // Keep the default message when the server response is not JSON.
        }
        throw new Error(message);
    }

    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || "export";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
