"""google_workspace_integration

Revision ID: 58c204fc5453
Revises: 48c204fc5452
Create Date: 2026-07-08 17:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '58c204fc5453'
down_revision: Union[str, Sequence[str], None] = '48c204fc5452'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Add columns to meetings table
    op.add_column('meetings', sa.Column('provider', sa.String(length=50), nullable=True))
    op.add_column('meetings', sa.Column('provider_meeting_id', sa.String(length=255), nullable=True))
    op.add_column('meetings', sa.Column('provider_event_id', sa.String(length=255), nullable=True))
    op.add_column('meetings', sa.Column('calendar_id', sa.String(length=255), nullable=True))
    op.add_column('meetings', sa.Column('organizer_email', sa.String(length=255), nullable=True))
    op.add_column('meetings', sa.Column('sync_status', sa.String(length=50), nullable=True))
    op.add_column('meetings', sa.Column('last_synced_at', sa.DateTime(), nullable=True))
    op.add_column('meetings', sa.Column('join_status', sa.String(length=50), server_default='Scheduled', nullable=True))
    op.add_column('meetings', sa.Column('token_reference', sa.String(length=255), nullable=True))
    op.add_column('meetings', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('meetings', sa.Column('attendees', sa.JSON(), nullable=True))

    # 2. Add columns to connected_accounts table
    op.add_column('connected_accounts', sa.Column('scope', sa.String(length=500), nullable=True))
    op.add_column('connected_accounts', sa.Column('connected_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True))
    op.add_column('connected_accounts', sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # 1. Drop columns from connected_accounts table
    op.drop_column('connected_accounts', 'updated_at')
    op.drop_column('connected_accounts', 'connected_at')
    op.drop_column('connected_accounts', 'scope')

    # 2. Drop columns from meetings table
    op.drop_column('meetings', 'attendees')
    op.drop_column('meetings', 'description')
    op.drop_column('meetings', 'token_reference')
    op.drop_column('meetings', 'join_status')
    op.drop_column('meetings', 'last_synced_at')
    op.drop_column('meetings', 'sync_status')
    op.drop_column('meetings', 'organizer_email')
    op.drop_column('meetings', 'calendar_id')
    op.drop_column('meetings', 'provider_event_id')
    op.drop_column('meetings', 'provider_meeting_id')
    op.drop_column('meetings', 'provider')
