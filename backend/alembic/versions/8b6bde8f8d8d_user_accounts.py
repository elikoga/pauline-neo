"""user accounts

Revision ID: 8b6bde8f8d8d
Revises: 674b920b5a4d
Create Date: 2026-04-29 16:40:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "8b6bde8f8d8d"
down_revision = "674b920b5a4d"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "user_account",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("display_name", sa.String(length=128), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(
        op.f("ix_user_account_email"), "user_account", ["email"], unique=False
    )
    op.create_table(
        "user_account_session",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(["account_id"], ["user_account.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(
        op.f("ix_user_account_session_account_id"),
        "user_account_session",
        ["account_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_account_session_token_hash"),
        "user_account_session",
        ["token_hash"],
        unique=False,
    )


def downgrade():
    op.drop_index(op.f("ix_user_account_session_token_hash"), table_name="user_account_session")
    op.drop_index(op.f("ix_user_account_session_account_id"), table_name="user_account_session")
    op.drop_table("user_account_session")
    op.drop_index(op.f("ix_user_account_email"), table_name="user_account")
    op.drop_table("user_account")
