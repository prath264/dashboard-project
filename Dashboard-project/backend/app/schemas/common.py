from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class Meta(BaseModel):
    page: int | None = None
    page_size: int | None = None
    total: int | None = None


class ApiResponse(BaseModel, Generic[T]):
    data: T
    meta: Meta | None = None


class PaginationParams(BaseModel):
    page: int = 1
    page_size: int = 20

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size
