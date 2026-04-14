"""Compatibility revision for previously stamped environments.

Revision ID: 0004_profile_document_indexes
Revises: 0003_scheme_detail_enrichment
Create Date: 2026-04-13 00:30:00
"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "0004_profile_document_indexes"
down_revision: Union[str, None] = "0003_scheme_detail_enrichment"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Historical compatibility revision intentionally left as no-op.
    # Some deployed databases are already stamped with this revision id.
    pass


def downgrade() -> None:
    pass
