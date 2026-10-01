
import { useEffect, useState } from "react";
import { FiCheck, FiX } from "react-icons/fi";

import Sidebar from "../../components/Sidebar/sidebar";
import Navbar from "../../components/Navbar/navbar";
import { apiRequest } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";

import "./pendingApprovals.css";

function PendingApprovals() {
    const { accessToken } = useAuth();

    const [requests, setRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);

    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showRejectForm, setShowRejectForm] = useState(false);

    const [rejectionReason, setRejectionReason] = useState("");

    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadRequests() {
            try {
                setLoading(true);
                setError("");

                const response = await apiRequest(
                    "/cartridge-requests?status=PENDING",
                    {},
                    accessToken
                );

                setRequests(response?.data || []);
            } catch (err) {
                setError(
                    err.message ||
                    "Failed to load pending requests."
                );
            } finally {
                setLoading(false);
            }
        }

        if (accessToken) {
            loadRequests();
        }
    }, [accessToken]);

    const openRequestModal = (request) => {
        setSelectedRequest(request);
        setShowRequestModal(true);
        setShowRejectForm(false);
        setRejectionReason("");
    };

    const closeRequestModal = () => {
        if (processing) {
            return;
        }

        setShowRequestModal(false);
        setSelectedRequest(null);
        setShowRejectForm(false);
        setRejectionReason("");
    };

    const handleApprove = async () => {
    if (!selectedRequest || processing) {
        return;
    }

    try {
        setProcessing(true);
        setError("");

        await apiRequest(
            `/cartridge-requests/${selectedRequest.id}/approve`,
            {
                method: "POST",
            },
            accessToken
        );

        setRequests((currentRequests) =>
            currentRequests.filter(
                (request) =>
                    request.id !== selectedRequest.id
            )
        );

        setShowRequestModal(false);
        setSelectedRequest(null);
    } catch (err) {
        setError(
            err.message ||
            "Failed to approve request."
        );
    } finally {
        setProcessing(false);
    }
};

    const handleReject = async () => {
        if (
            !selectedRequest ||
            !rejectionReason.trim() ||
            processing
        ) {
            return;
        }

        try {
            setProcessing(true);
            setError("");

            const response = await apiRequest(
                `/cartridge-requests/${selectedRequest.id}/reject`,
                {
                    method: "POST",
                    body: {
                        rejection_reason:
                            rejectionReason.trim(),
                    },
                },
                accessToken
            );

            const updatedRequest = response?.data;

            setRequests((currentRequests) =>
                currentRequests.filter(
                    (request) =>
                        request.id !== selectedRequest.id
                )
            );

            setSelectedRequest(
                updatedRequest || {
                    ...selectedRequest,
                    status: "Rejected",
                    rejection_reason:
                        rejectionReason.trim(),
                }
            );

            setShowRejectForm(false);
            setRejectionReason("");
        } catch (err) {
            setError(
                err.message ||
                "Failed to reject request."
            );
        } finally {
            setProcessing(false);
        }
    };

    const formatDate = (value) => {
        if (!value) {
            return "-";
        }

        return new Date(value).toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
            }
        );
    };

    const getStatusLabel = (status) => {
        if (!status) {
            return "-";
        }

        if (String(status).toLowerCase() === "pending") {
            return "Approval Pending";
        }

        return String(status)
            .replaceAll("_", " ")
            .toLowerCase()
            .replace(/\b\w/g, (character) =>
                character.toUpperCase()
            );
    };

    return (
        <div className="dashboard-container">
            <Sidebar />

            <div className="main-content">
                <Navbar />

                <main className="pending-approvals">

                    <div className="approvals-header">
                        <div>
                            <h1>Pending Approvals</h1>
                        </div>
                    </div>

                    {error && (
                        <div className="form-error">
                            {error}
                        </div>
                    )}

                    <div className="approvals-layout">

                        <div className="requests-section">

                            <div className="requests-section-header">
                                <span>
                                    {loading
                                        ? "Loading..."
                                        : `${requests.length} request${
                                              requests.length !== 1
                                                  ? "s"
                                                  : ""
                                          }`}
                                </span>
                            </div>

                            <section className="requests-card">

                                <div className="requests-table-container">

                                    <table className="requests-table">

                                        <thead>
                                            <tr>
                                                <th>Request ID</th>
                                                <th>Requester</th>
                                                <th>Location</th>
                                                <th>Printer</th>
                                                <th>Cartridge</th>
                                                <th className="center-column">
                                                    Quantity
                                                </th>
                                                <th className="center-column">
                                                    Requested Date
                                                </th>
                                                <th className="center-column">
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>

                                            {loading ? (
                                                <tr>
                                                    <td
                                                        colSpan="8"
                                                        className="center-column"
                                                    >
                                                        Loading requests...
                                                    </td>
                                                </tr>
                                            ) : requests.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan="8"
                                                        className="center-column"
                                                    >
                                                        No pending requests.
                                                    </td>
                                                </tr>
                                            ) : (
                                                requests.map(
                                                    (request) => (
                                                        <tr
                                                            key={request.id}
                                                        >

                                                            <td>
                                                                <button
                                                                    type="button"
                                                                    className="request-id-btn"
                                                                    onClick={() =>
                                                                        openRequestModal(
                                                                            request
                                                                        )
                                                                    }
                                                                >
                                                                    REQ-
                                                                    {String(
                                                                        request.id
                                                                    ).padStart(
                                                                        4,
                                                                        "0"
                                                                    )}
                                                                </button>
                                                            </td>

                                                            <td>
                                                                {request.requester_name ||
                                                                    request.requester?.username ||
                                                                    request.requester_id}
                                                            </td>

                                                            <td>
                                                                {request.location_name ||
                                                                    request.location?.name ||
                                                                    request.location_id}
                                                            </td>

                                                            <td>
                                                                {request.printer_model ||
                                                                    request.printer?.model ||
                                                                    request.printer_id}
                                                            </td>

                                                            <td>
                                                                {request.cartridge_model ||
                                                                    request.cartridge?.model ||
                                                                    request.cartridge_id}
                                                            </td>

                                                            <td className="center-column">
                                                                {
                                                                    request.quantity
                                                                }
                                                            </td>

                                                            <td className="center-column">
                                                                {formatDate(
                                                                    request.requested_date
                                                                )}
                                                            </td>

                                                            <td className="center-column">

                                                                <span
                                                                    className={`request-status ${String(
                                                                        request.status ||
                                                                            ""
                                                                    ).toLowerCase()}`}
                                                                >
                                                                    {getStatusLabel(
                                                                        request.status
                                                                    )}
                                                                </span>

                                                            </td>

                                                        </tr>
                                                    )
                                                )
                                            )}

                                        </tbody>

                                    </table>

                                </div>

                            </section>

                        </div>

                    </div>

                </main>

            </div>

            {showRequestModal &&
                selectedRequest && (

                    <div
                        className="request-modal-overlay"
                        onClick={closeRequestModal}
                    >

                        <div
                            className="request-modal"
                            onClick={(event) =>
                                event.stopPropagation()
                            }
                        >

                            <div className="request-modal-header">

                                <div>

                                    <h2>
                                        Request Details
                                    </h2>

                                    <p>
                                        Request ID:{" "}
                                        <strong>
                                            REQ-
                                            {String(
                                                selectedRequest.id
                                            ).padStart(
                                                4,
                                                "0"
                                            )}
                                        </strong>
                                    </p>

                                </div>

                                <button
                                    type="button"
                                    className="request-modal-close"
                                    onClick={closeRequestModal}
                                    aria-label="Close"
                                >
                                    <FiX />
                                </button>

                            </div>

                            <div className="request-form">

                                <div className="form-row">

                                    <div className="form-group">

                                        <label>
                                            Requester
                                        </label>

                                        <input
                                            type="text"
                                            value={
                                                selectedRequest.requester_name ||
                                                selectedRequest.requester?.username ||
                                                selectedRequest.requester_id ||
                                                ""
                                            }
                                            readOnly
                                        />

                                    </div>

                                    <div className="form-group">

                                        <label>
                                            Requester ID
                                        </label>

                                        <input
                                            type="text"
                                            value={
                                                selectedRequest.requester_id ||
                                                ""
                                            }
                                            readOnly
                                        />

                                    </div>

                                </div>

                                <div className="form-row">

                                    <div className="form-group">

                                        <label>
                                            Location
                                        </label>

                                        <input
                                            type="text"
                                            value={
                                                selectedRequest.location_name ||
                                                selectedRequest.location?.name ||
                                                selectedRequest.location_id ||
                                                ""
                                            }
                                            readOnly
                                        />

                                    </div>

                                    <div className="form-group">

                                        <label>
                                            Assigned Engineer
                                        </label>

                                        <input
                                            type="text"
                                            value={
                                                selectedRequest.engineer_name ||
                                                selectedRequest.engineer?.name ||
                                                selectedRequest.engineer_id ||
                                                ""
                                            }
                                            readOnly
                                        />

                                    </div>

                                </div>

                                <div className="form-row">

                                    <div className="form-group">

                                        <label>
                                            Printer
                                        </label>

                                        <input
                                            type="text"
                                            value={
                                                selectedRequest.printer_model ||
                                                selectedRequest.printer?.model ||
                                                selectedRequest.printer_id ||
                                                ""
                                            }
                                            readOnly
                                        />

                                    </div>

                                    <div className="form-group">

                                        <label>
                                            Cartridge
                                        </label>

                                        <input
                                            type="text"
                                            value={
                                                selectedRequest.cartridge_model ||
                                                selectedRequest.cartridge?.model ||
                                                selectedRequest.cartridge_id ||
                                                ""
                                            }
                                            readOnly
                                        />

                                    </div>

                                </div>

                                <div className="form-row">

                                    <div className="form-group">

                                        <label>
                                            Quantity
                                        </label>

                                        <input
                                            type="number"
                                            value={
                                                selectedRequest.quantity
                                            }
                                            readOnly
                                        />

                                    </div>

                                    <div className="form-group">

                                        <label>
                                            Requested Date
                                        </label>

                                        <input
                                            type="text"
                                            value={formatDate(
                                                selectedRequest.requested_date
                                            )}
                                            readOnly
                                        />

                                    </div>

                                </div>

                                <div className="form-group">

                                    <label>
                                        Remarks
                                    </label>

                                    <textarea
                                        value={
                                            selectedRequest.remarks ||
                                            ""
                                        }
                                        readOnly
                                    />

                                </div>

                              

                                {selectedRequest.rejection_reason && (
                                    <div className="form-group">

                                        <label>
                                            Rejection Reason
                                        </label>

                                        <textarea
                                            value={
                                                selectedRequest.rejection_reason
                                            }
                                            readOnly
                                        />

                                    </div>
                                )}

                            </div>

                            {String(
                                selectedRequest.status || ""
                            ).toLowerCase() === "pending" &&
                                !showRejectForm && (

                                    <div className="approval-actions">

                                        <button
                                            className="approve-request-btn"
                                            type="button"
                                            onClick={handleApprove}
                                            disabled={processing}
                                        >
                                            <FiCheck />

                                            {processing
                                                ? "Processing..."
                                                : "Approve"}
                                        </button>

                                        <button
                                            className="reject-request-btn"
                                            type="button"
                                            onClick={() =>
                                                setShowRejectForm(
                                                    true
                                                )
                                            }
                                            disabled={processing}
                                        >
                                            <FiX />

                                            Reject
                                        </button>

                                    </div>
                                )}

                            {showRejectForm && (

                                <div className="reject-form">

                                    <label htmlFor="rejection-reason">
                                        Rejection Reason
                                    </label>

                                    <textarea
                                        id="rejection-reason"
                                        value={rejectionReason}
                                        onChange={(event) =>
                                            setRejectionReason(
                                                event.target.value
                                            )
                                        }
                                        placeholder="Enter the reason for rejecting this request..."
                                        disabled={processing}
                                    />

                                    <div className="reject-form-actions">

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowRejectForm(
                                                    false
                                                );
                                                setRejectionReason(
                                                    ""
                                                );
                                            }}
                                            disabled={processing}
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleReject}
                                            disabled={
                                                processing ||
                                                !rejectionReason.trim()
                                            }
                                        >
                                            {processing
                                                ? "Processing..."
                                                : "Reject Request"}
                                        </button>

                                    </div>

                                </div>
                            )}

                            {String(
                                selectedRequest.status || ""
                            ).toLowerCase() !== "pending" && (

                                <div
                                    className={`request-outcome ${String(
                                        selectedRequest.status || ""
                                    ).toLowerCase()}`}
                                >

                                    <strong>
                                        Request{" "}
                                        {getStatusLabel(
                                            selectedRequest.status
                                        )}
                                    </strong>

                                    <p>
                                        This request has been{" "}
                                        {String(
                                            selectedRequest.status || ""
                                        ).toLowerCase()}
                                        .
                                    </p>

                                </div>
                            )}

                        </div>

                    </div>
                )}

        </div>
    );
}

export default PendingApprovals;

