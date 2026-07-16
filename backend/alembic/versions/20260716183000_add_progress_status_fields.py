"""add progress status fields

Revision ID: 20260716183000
Revises: 58c204fc5453
Create Date: 2026-07-16 18:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260716183000"
down_revision = "58c204fc5453"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "meetings",
        sa.Column("transcript_status", sa.String(length=50), server_default="PENDING", nullable=True),
    )
    op.add_column(
        "meetings",
        sa.Column("executive_summary_status", sa.String(length=50), server_default="PENDING", nullable=True),
    )
    op.add_column(
        "meetings",
        sa.Column("action_items_status", sa.String(length=50), server_default="PENDING", nullable=True),
    )
    op.add_column(
        "meetings",
        sa.Column("decisions_status", sa.String(length=50), server_default="PENDING", nullable=True),
    )
    op.add_column(
        "meetings",
        sa.Column("risks_status", sa.String(length=50), server_default="PENDING", nullable=True),
    )
    op.add_column(
        "meetings",
        sa.Column("technical_status", sa.String(length=50), server_default="PENDING", nullable=True),
    )
    op.add_column(
        "meetings",
        sa.Column("key_themes_status", sa.String(length=50), server_default="PENDING", nullable=True),
    )


def downgrade() -> None:
    op.drop_column("meetings", "key_themes_status")
    op.drop_column("meetings", "technical_status")
    op.drop_column("meetings", "risks_status")
    op.drop_column("meetings", "decisions_status")
    op.drop_column("meetings", "action_items_status")
    op.drop_column("meetings", "executive_summary_status")
    op.drop_column("meetings", "transcript_status")
