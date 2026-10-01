"""Update user roles

Revision ID: 002_update_user_roles
Revises: 0cb8e11fac9b
Create Date: 2026-08-21
"""

from typing import Sequence, Union

from alembic import op


revision: str = "002_update_user_roles"
down_revision: Union[str, None] = "0cb8e11fac9b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the new enum type
    op.execute(
        """
        CREATE TYPE user_role_new AS ENUM (
            'fms_it',
            'it_admin',
            'master_admin'
        )
        """
    )

    # Change the users.role column to the new enum.
    #
    # Existing roles are mapped as:
    #
    # admin           -> master_admin
    # store_manager   -> it_admin
    # department_user -> fms_it
    #
    op.execute(
        """
        ALTER TABLE users
        ALTER COLUMN role DROP DEFAULT
        """
    )

    op.execute(
        """
        ALTER TABLE users
        ALTER COLUMN role
        TYPE user_role_new
        USING (
            CASE role::text
                WHEN 'admin' THEN 'master_admin'
                WHEN 'store_manager' THEN 'it_admin'
                WHEN 'department_user' THEN 'fms_it'
            END
        )::user_role_new
        """
    )

    # Remove the old enum
    op.execute(
        """
        DROP TYPE user_role
        """
    )

    # Rename the new enum to the original name
    op.execute(
        """
        ALTER TYPE user_role_new
        RENAME TO user_role
        """
    )


def downgrade() -> None:
    # Create old enum
    op.execute(
        """
        CREATE TYPE user_role_old AS ENUM (
            'admin',
            'store_manager',
            'department_user'
        )
        """
    )

    # Convert new roles back to old roles
    op.execute(
        """
        ALTER TABLE users
        ALTER COLUMN role
        TYPE user_role_old
        USING (
            CASE role::text
                WHEN 'master_admin' THEN 'admin'
                WHEN 'it_admin' THEN 'store_manager'
                WHEN 'fms_it' THEN 'department_user'
            END
        )::user_role_old
        """
    )

    # Remove current enum
    op.execute(
        """
        DROP TYPE user_role
        """
    )

    # Restore original enum name
    op.execute(
        """
        ALTER TYPE user_role_old
        RENAME TO user_role
        """
    )