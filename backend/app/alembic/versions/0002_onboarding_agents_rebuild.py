"""Onboarding and agentic eligibility rebuild fields

Revision ID: 0002_onboarding_agents_rebuild
Revises: 0001_initial_schema
Create Date: 2026-04-06 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0002_onboarding_agents_rebuild"
down_revision: Union[str, None] = "0001_initial_schema"
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


def upgrade() -> None:
    # users
    _add_column_if_missing("users", "onboarding_incomplete", sa.Column("onboarding_incomplete", sa.Integer(), nullable=True, server_default="1"))

    # documents
    _add_column_if_missing("documents", "is_verified", sa.Column("is_verified", sa.Integer(), nullable=True, server_default="0"))
    _add_column_if_missing("documents", "verified_at", sa.Column("verified_at", sa.String(), nullable=True))

    # profiles
    profile_columns = [
        ("address_line", sa.Column("address_line", sa.String(), nullable=True)),
        ("aadhaar_verified", sa.Column("aadhaar_verified", sa.Integer(), nullable=True, server_default="0")),
        ("pan_number", sa.Column("pan_number", sa.String(), nullable=True)),
        ("voter_id_number", sa.Column("voter_id_number", sa.String(), nullable=True)),
        ("passport_number", sa.Column("passport_number", sa.String(), nullable=True)),
        ("bpl_status", sa.Column("bpl_status", sa.Integer(), nullable=True, server_default="0")),
        ("ration_card_number", sa.Column("ration_card_number", sa.String(), nullable=True)),
        ("ration_card_category", sa.Column("ration_card_category", sa.String(), nullable=True)),
        ("family_size", sa.Column("family_size", sa.Integer(), nullable=True)),
        ("is_household_head", sa.Column("is_household_head", sa.Integer(), nullable=True, server_default="0")),
        ("has_bank_account", sa.Column("has_bank_account", sa.Integer(), nullable=True, server_default="0")),
        ("bank_name", sa.Column("bank_name", sa.String(), nullable=True)),
        ("account_number_masked", sa.Column("account_number_masked", sa.String(), nullable=True)),
        ("ifsc", sa.Column("ifsc", sa.String(), nullable=True)),
        ("land_area_acres", sa.Column("land_area_acres", sa.Float(), nullable=True)),
        ("land_survey_number", sa.Column("land_survey_number", sa.String(), nullable=True)),
        ("land_type", sa.Column("land_type", sa.String(), nullable=True)),
        ("kcc_holder", sa.Column("kcc_holder", sa.Integer(), nullable=True, server_default="0")),
        ("kcc_number", sa.Column("kcc_number", sa.String(), nullable=True)),
        ("kcc_credit_limit", sa.Column("kcc_credit_limit", sa.Float(), nullable=True)),
        ("crop_insurance", sa.Column("crop_insurance", sa.Integer(), nullable=True, server_default="0")),
        ("crop_insurance_policy_number", sa.Column("crop_insurance_policy_number", sa.String(), nullable=True)),
        ("crop_insurance_sum_insured", sa.Column("crop_insurance_sum_insured", sa.Float(), nullable=True)),
        ("insured_crops", sa.Column("insured_crops", sa.String(), nullable=True)),
        ("pm_kisan_registered", sa.Column("pm_kisan_registered", sa.Integer(), nullable=True, server_default="0")),
        ("pm_kisan_farmer_id", sa.Column("pm_kisan_farmer_id", sa.String(), nullable=True)),
        ("soil_type", sa.Column("soil_type", sa.String(), nullable=True)),
        ("disability_percentage", sa.Column("disability_percentage", sa.Integer(), nullable=True)),
        ("disability_issuing_authority", sa.Column("disability_issuing_authority", sa.String(), nullable=True)),
        ("caste_category", sa.Column("caste_category", sa.String(), nullable=True)),
        ("sub_caste", sa.Column("sub_caste", sa.String(), nullable=True)),
        ("caste_certificate_number", sa.Column("caste_certificate_number", sa.String(), nullable=True)),
        ("caste_issuing_authority", sa.Column("caste_issuing_authority", sa.String(), nullable=True)),
        ("minority_status", sa.Column("minority_status", sa.Integer(), nullable=True, server_default="0")),
        ("education_percentage", sa.Column("education_percentage", sa.Float(), nullable=True)),
        ("education_board", sa.Column("education_board", sa.String(), nullable=True)),
        ("education_year", sa.Column("education_year", sa.Integer(), nullable=True)),
        ("degree_name", sa.Column("degree_name", sa.String(), nullable=True)),
        ("institution_name", sa.Column("institution_name", sa.String(), nullable=True)),
        ("mobile_number", sa.Column("mobile_number", sa.String(), nullable=True)),
        ("is_woman_headed_household", sa.Column("is_woman_headed_household", sa.Integer(), nullable=True, server_default="0")),
        ("onboarding_complete", sa.Column("onboarding_complete", sa.Integer(), nullable=True, server_default="0")),
        ("onboarding_step", sa.Column("onboarding_step", sa.Integer(), nullable=True, server_default="1")),
    ]

    for column_name, column in profile_columns:
        _add_column_if_missing("profiles", column_name, column)

    # Backfill aliases for existing rows where possible.
    op.execute(
        sa.text(
            """
            UPDATE profiles
            SET bpl_status = COALESCE(bpl_status, is_bpl),
                caste_category = COALESCE(caste_category, social_category),
                land_area_acres = COALESCE(land_area_acres, land_holding_acres),
                disability_percentage = COALESCE(disability_percentage, disability_pct),
                has_bank_account = COALESCE(has_bank_account, bank_account_linked),
                is_woman_headed_household = COALESCE(is_woman_headed_household, is_woman_headed),
                onboarding_complete = COALESCE(onboarding_complete, 0),
                onboarding_step = COALESCE(onboarding_step, 1)
            """
        )
    )


def downgrade() -> None:
    _drop_column_if_exists("users", "onboarding_incomplete")
    _drop_column_if_exists("documents", "is_verified")
    _drop_column_if_exists("documents", "verified_at")

    profile_columns = [
        "address_line",
        "aadhaar_verified",
        "pan_number",
        "voter_id_number",
        "passport_number",
        "bpl_status",
        "ration_card_number",
        "ration_card_category",
        "family_size",
        "is_household_head",
        "has_bank_account",
        "bank_name",
        "account_number_masked",
        "ifsc",
        "land_area_acres",
        "land_survey_number",
        "land_type",
        "kcc_holder",
        "kcc_number",
        "kcc_credit_limit",
        "crop_insurance",
        "crop_insurance_policy_number",
        "crop_insurance_sum_insured",
        "insured_crops",
        "pm_kisan_registered",
        "pm_kisan_farmer_id",
        "soil_type",
        "disability_percentage",
        "disability_issuing_authority",
        "caste_category",
        "sub_caste",
        "caste_certificate_number",
        "caste_issuing_authority",
        "minority_status",
        "education_percentage",
        "education_board",
        "education_year",
        "degree_name",
        "institution_name",
        "mobile_number",
        "is_woman_headed_household",
        "onboarding_complete",
        "onboarding_step",
    ]

    for column_name in profile_columns:
        _drop_column_if_exists("profiles", column_name)
