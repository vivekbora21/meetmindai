"""consolidate_connected_accounts

Revision ID: 48c204fc5452
Revises: 37c204fc5451
Create Date: 2026-07-08 13:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '48c204fc5452'
down_revision: Union[str, Sequence[str], None] = '37c204fc5451'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Rename table user_integrations to connected_accounts
    op.rename_table('user_integrations', 'connected_accounts')

    # 2. Rename column token_expiry to expires_at on connected_accounts
    op.alter_column('connected_accounts', 'token_expiry', new_column_name='expires_at')

    # 3. Add columns display_name, token_type to connected_accounts
    op.add_column('connected_accounts', sa.Column('display_name', sa.String(length=255), nullable=True))
    op.add_column('connected_accounts', sa.Column('token_type', sa.String(length=50), server_default='Bearer', nullable=True))

    # 4. Drop microsoft_accounts table
    op.drop_table('microsoft_accounts')


def downgrade() -> None:
    """Downgrade schema."""
    # 1. Recreate microsoft_accounts table
    op.create_table('microsoft_accounts',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('user_id', sa.String(length=36), nullable=False),
    sa.Column('graph_user_id', sa.String(length=255), nullable=False),
    sa.Column('display_name', sa.String(length=255), nullable=True),
    sa.Column('email', sa.String(length=255), nullable=True),
    sa.Column('access_token', sa.Text(), nullable=False),
    sa.Column('refresh_token', sa.Text(), nullable=True),
    sa.Column('token_type', sa.String(length=50), nullable=True),
    sa.Column('expires_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    
    # 2. Drop columns display_name, token_type from connected_accounts
    op.drop_column('connected_accounts', 'token_type')
    op.drop_column('connected_accounts', 'display_name')

    # 3. Rename expires_at back to token_expiry
    op.alter_column('connected_accounts', 'expires_at', new_column_name='token_expiry')

    # 4. Rename table back to user_integrations
    op.rename_table('connected_accounts', 'user_integrations')
