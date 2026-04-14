"""Add rich scheme detail columns for detail-page experience.

Revision ID: 0003_scheme_detail_enrichment
Revises: 0002_onboarding_agents_rebuild
Create Date: 2026-04-13 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "0003_scheme_detail_enrichment"
down_revision: Union[str, None] = "0002_onboarding_agents_rebuild"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col["name"] for col in inspector.get_columns(table_name)]
    return column_name in columns


def _add_column_if_missing(table_name: str, column_name: str, column: sa.Column) -> None:
    if not _has_column(table_name, column_name):
        op.add_column(table_name, column)


def _drop_column_if_exists(table_name: str, column_name: str) -> None:
    if _has_column(table_name, column_name):
        op.drop_column(table_name, column_name)


def _json_type() -> sa.types.TypeEngine:
    return sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), "postgresql")


def upgrade() -> None:
    _add_column_if_missing("schemes", "full_description", sa.Column("full_description", sa.Text(), nullable=True))
    _add_column_if_missing("schemes", "benefits_description", sa.Column("benefits_description", sa.Text(), nullable=True))
    _add_column_if_missing("schemes", "target_beneficiaries", sa.Column("target_beneficiaries", sa.Text(), nullable=True))
    _add_column_if_missing("schemes", "required_documents", sa.Column("required_documents", _json_type(), nullable=True))
    _add_column_if_missing("schemes", "application_steps", sa.Column("application_steps", _json_type(), nullable=True))
    _add_column_if_missing("schemes", "helpline_number", sa.Column("helpline_number", sa.String(length=30), nullable=True))
    _add_column_if_missing("schemes", "helpline_hours", sa.Column("helpline_hours", sa.String(length=100), nullable=True))
    _add_column_if_missing("schemes", "alternate_helpline", sa.Column("alternate_helpline", sa.String(length=30), nullable=True))
    _add_column_if_missing("schemes", "state_portal_url", sa.Column("state_portal_url", sa.String(length=500), nullable=True))
    _add_column_if_missing("schemes", "csc_applicable", sa.Column("csc_applicable", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    _add_column_if_missing("schemes", "bank_applicable", sa.Column("bank_applicable", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    _add_column_if_missing("schemes", "gram_panchayat_applicable", sa.Column("gram_panchayat_applicable", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    _add_column_if_missing("schemes", "processing_time", sa.Column("processing_time", sa.String(length=100), nullable=True))
    _add_column_if_missing("schemes", "validity_period", sa.Column("validity_period", sa.String(length=100), nullable=True))
    _add_column_if_missing("schemes", "scheme_tags", sa.Column("scheme_tags", _json_type(), nullable=True))
    _add_column_if_missing("schemes", "faq", sa.Column("faq", _json_type(), nullable=True))
    _add_column_if_missing("schemes", "last_date", sa.Column("last_date", sa.String(length=100), nullable=True))
    _add_column_if_missing("schemes", "language_notes", sa.Column("language_notes", sa.Text(), nullable=True))
    _add_column_if_missing("schemes", "myscheme_fallback", sa.Column("myscheme_fallback", sa.Boolean(), nullable=False, server_default=sa.text("false")))


def downgrade() -> None:
    # Drop only columns that are guaranteed to be introduced by this revision.
    # We intentionally skip `required_documents`, `application_steps`, and
    # `target_beneficiaries` because some environments already had them pre-0003.
    _drop_column_if_exists("schemes", "myscheme_fallback")
    _drop_column_if_exists("schemes", "language_notes")
    _drop_column_if_exists("schemes", "last_date")
    _drop_column_if_exists("schemes", "faq")
    _drop_column_if_exists("schemes", "scheme_tags")
    _drop_column_if_exists("schemes", "validity_period")
    _drop_column_if_exists("schemes", "processing_time")
    _drop_column_if_exists("schemes", "gram_panchayat_applicable")
    _drop_column_if_exists("schemes", "bank_applicable")
    _drop_column_if_exists("schemes", "csc_applicable")
    _drop_column_if_exists("schemes", "state_portal_url")
    _drop_column_if_exists("schemes", "alternate_helpline")
    _drop_column_if_exists("schemes", "helpline_hours")
    _drop_column_if_exists("schemes", "helpline_number")
    _drop_column_if_exists("schemes", "benefits_description")
    _drop_column_if_exists("schemes", "full_description")