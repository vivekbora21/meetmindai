"""create_calendar_events

Revision ID: 37c204fc5451
Revises: 26c204fc5450
Create Date: 2026-07-08 13:31:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '37c204fc5451'
down_revision: Union[str, Sequence[str], None] = '26c204fc5450'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('calendar_events',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('provider', sa.String(length=50), nullable=False),
    sa.Column('provider_event_id', sa.String(length=255), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('start_time', sa.DateTime(), nullable=False),
    sa.Column('end_time', sa.DateTime(), nullable=False),
    sa.Column('timezone', sa.String(length=100), nullable=True),
    sa.Column('organizer_email', sa.String(length=255), nullable=True),
    sa.Column('join_url', sa.Text(), nullable=True),
    sa.Column('meeting_provider', sa.String(length=100), nullable=True),
    sa.Column('is_online_meeting', sa.Boolean(), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=True),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_calendar_events_provider_event_id', 'calendar_events', ['provider_event_id'], unique=False)
    op.create_index('idx_user_provider_event', 'calendar_events', ['user_id', 'provider', 'provider_event_id'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_user_provider_event', table_name='calendar_events')
    op.drop_index('idx_calendar_events_provider_event_id', table_name='calendar_events')
    op.drop_table('calendar_events')
