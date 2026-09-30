from datetime import date, datetime, timezone
from types import SimpleNamespace

import pytest

from app.models.cartridge_issue import CartridgeIssue
from app.models.cartridge_request import CartridgeRequestStatus
from app.models.stock_movement import StockMovement, StockMovementType
from app.routers.cartridge_requests import create_request
from app.schemas.cartridge_request import CartridgeRequestCreate
from app.services import cartridge_request as cartridge_request_service
from app.services.cartridge_issue import create_cartridge_issue
from app.services.cartridge_request import (
    approve_cartridge_request,
    reject_cartridge_request,
    serialize_request,
)


class ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one(self):
        return self.value

    def scalar_one_or_none(self):
        return self.value


class FakeAsyncSession:
    def __init__(self, execute_results=None):
        self.execute_results = list(execute_results or [])
        self.added = []
        self.committed = False
        self.next_id = 100

    async def execute(self, _query):
        if self.execute_results:
            return ScalarResult(self.execute_results.pop(0))
        return ScalarResult(self.added[-1])

    def add(self, instance):
        self.added.append(instance)

    async def flush(self):
        for instance in self.added:
            if isinstance(instance, (CartridgeIssue, StockMovement)) and instance.id is None:
                instance.id = self.next_id
                self.next_id += 1

    async def refresh(self, _instance):
        return None

    async def commit(self):
        self.committed = True


def request_create_payload(**overrides):
    values = {
        "employee_id": 21,
        "location_id": 3,
        "engineer_id": 4,
        "printer_id": 5,
        "cartridge_id": 6,
        "quantity": 2,
        "remarks": "Routine replacement",
    }
    values.update(overrides)
    return CartridgeRequestCreate(**values)


def test_request_response_includes_employee_id_and_name():
    request = SimpleNamespace(
        id=12,
        requester_id=17,
        employee_id=21,
        employee=SimpleNamespace(name="Alex Employee"),
        requester=SimpleNamespace(username="IT User"),
        location_id=3,
        location=SimpleNamespace(name="Depot"),
        engineer_id=4,
        engineer=SimpleNamespace(name="Engineer"),
        printer_id=5,
        printer=SimpleNamespace(model="Printer"),
        cartridge_id=6,
        cartridge=SimpleNamespace(model="Cartridge"),
        quantity=2,
        status=CartridgeRequestStatus.PENDING,
        requested_date=datetime.now(timezone.utc),
        cartridge_issue=None,
        remarks=None,
        rejection_reason=None,
    )

    response = serialize_request(request)

    assert response.requester_id == 17
    assert response.employee_id == 21
    assert response.employee_name == "Alex Employee"


@pytest.mark.asyncio
async def test_create_request_uses_authenticated_user_and_selected_employee(monkeypatch):
    monkeypatch.setattr(
        cartridge_request_service,
        "serialize_request",
        lambda request: request,
    )
    db = FakeAsyncSession()
    authenticated_user = SimpleNamespace(id=17)
    payload = request_create_payload(requester_id=999)

    request = await create_request(payload, db, authenticated_user)

    assert request.data.requester_id == authenticated_user.id
    assert request.data.employee_id == payload.employee_id
    assert request.data.quantity == payload.quantity
    assert db.committed


@pytest.mark.asyncio
async def test_approve_pending_request(monkeypatch):
    monkeypatch.setattr(
        cartridge_request_service,
        "serialize_request",
        lambda request: request,
    )
    request = SimpleNamespace(
        status=CartridgeRequestStatus.PENDING,
        rejection_reason="old reason",
        approved_by=None,
        approved_at=None,
    )
    db = FakeAsyncSession([request])

    result = await approve_cartridge_request(db, 12, approved_by=8)

    assert result.status == CartridgeRequestStatus.APPROVED
    assert result.approved_by == 8
    assert result.approved_at is not None
    assert result.rejection_reason is None


@pytest.mark.asyncio
async def test_reject_pending_request(monkeypatch):
    monkeypatch.setattr(
        cartridge_request_service,
        "serialize_request",
        lambda request: request,
    )
    request = SimpleNamespace(
        status=CartridgeRequestStatus.PENDING,
        rejection_reason=None,
    )
    db = FakeAsyncSession([request])

    result = await reject_cartridge_request(db, 12, "Not approved")

    assert result.status == CartridgeRequestStatus.REJECTED
    assert result.rejection_reason == "Not approved"


@pytest.mark.asyncio
async def test_installation_decrements_inventory_and_records_issue_movement():
    request = SimpleNamespace(
        id=12,
        status=CartridgeRequestStatus.APPROVED,
        cartridge_id=6,
        printer_id=5,
        employee_id=21,
        location_id=3,
        engineer_id=4,
        quantity=2,
        remarks="Routine replacement",
    )
    cartridge = SimpleNamespace(
        id=6,
        is_active=True,
        printer_id=5,
    )
    inventory = SimpleNamespace(cartridge_id=6, quantity=9)
    db = FakeAsyncSession([request, cartridge, inventory])
    payload = SimpleNamespace(request_id=12)

    issue = await create_cartridge_issue(db, payload, performed_by=17)

    assert inventory.quantity == 7
    assert request.status == CartridgeRequestStatus.INSTALLED
    assert issue.employee_id == request.employee_id
    assert issue.quantity == request.quantity
    assert issue.issue_date == date.today()

    movements = [item for item in db.added if isinstance(item, StockMovement)]
    assert len(movements) == 1
    assert movements[0].movement_type == StockMovementType.ISSUE
    assert movements[0].quantity == 2
    assert movements[0].performed_by == 17
    assert movements[0].reference_id == issue.id
    assert db.committed
