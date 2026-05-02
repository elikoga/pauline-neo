"""user accounts and calendar persistence

Revision ID: f1a2b3c4d5e6
Revises: 674b920b5a4d
Create Date: 2026-04-29 16:40:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f1a2b3c4d5e6"
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
        sa.Column(
            "calendar_state",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'{}'"),
        ),
        sa.Column("pending_token_hash", sa.String(length=64), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(
        op.f("ix_user_account_email"), "user_account", ["email"], unique=False
    )
    op.create_index(
        op.f("ix_user_account_pending_token_hash"),
        "user_account",
        ["pending_token_hash"],
        unique=True,
    )
    op.alter_column("user_account", "calendar_state", server_default=None)

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

    op.create_table(
        "timetable",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_account_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("semester_name", sa.String(length=128), nullable=False),
        sa.Column("appointments", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("order", sa.Integer(), nullable=True),
        sa.Column("deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_account_id"], ["user_account.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_timetable_user_account_id"),
        "timetable",
        ["user_account_id"],
        unique=False,
    )

    op.create_table(
        "active_timetable",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_account_id", sa.Integer(), nullable=False),
        sa.Column("semester_name", sa.String(length=128), nullable=False),
        sa.Column("timetable_id", sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(["user_account_id"], ["user_account.id"]),
        sa.ForeignKeyConstraint(["timetable_id"], ["timetable.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_account_id", "semester_name"),
    )
    op.create_index(
        op.f("ix_active_timetable_user_account_id"),
        "active_timetable",
        ["user_account_id"],
        unique=False,
    )


def downgrade():
    op.drop_index(op.f("ix_active_timetable_user_account_id"), table_name="active_timetable")
    op.drop_table("active_timetable")
    op.drop_index(op.f("ix_timetable_user_account_id"), table_name="timetable")
    op.drop_table("timetable")
    op.drop_index(op.f("ix_user_account_session_token_hash"), table_name="user_account_session")
    op.drop_index(op.f("ix_user_account_session_account_id"), table_name="user_account_session")
    op.drop_table("user_account_session")
    op.drop_index(op.f("ix_user_account_pending_token_hash"), table_name="user_account")
    op.drop_index(op.f("ix_user_account_email"), table_name="user_account")
    op.drop_table("user_account")
