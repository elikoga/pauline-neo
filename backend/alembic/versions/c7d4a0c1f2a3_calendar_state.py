"""calendar state

Revision ID: c7d4a0c1f2a3
Revises: 8b6bde8f8d8d
Create Date: 2026-04-29 17:30:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c7d4a0c1f2a3"
down_revision = "8b6bde8f8d8d"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "user_account",
        sa.Column(
            "calendar_state",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'{\"appointments\": []}'"),
        ),
    )
    op.alter_column("user_account", "calendar_state", server_default=None)


def downgrade():
    op.drop_column("user_account", "calendar_state")
