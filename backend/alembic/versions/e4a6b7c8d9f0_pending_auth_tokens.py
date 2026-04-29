"""pending auth tokens

Revision ID: e4a6b7c8d9f0
Revises: c7d4a0c1f2a3
Create Date: 2026-04-29 18:40:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e4a6b7c8d9f0"
down_revision = "c7d4a0c1f2a3"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "user_account",
        sa.Column("pending_token_hash", sa.String(length=64), nullable=True),
    )
    op.create_index(
        op.f("ix_user_account_pending_token_hash"),
        "user_account",
        ["pending_token_hash"],
        unique=True,
    )


def downgrade():
    op.drop_index(op.f("ix_user_account_pending_token_hash"), table_name="user_account")
    op.drop_column("user_account", "pending_token_hash")
