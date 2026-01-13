#!/usr/bin/env python3
"""
CEAP Dashboard Data Preparation Script

Reads the processed CSV files and generates optimized JSON files
for the dashboard frontend.

Usage:
    python scripts/prepare-data.py

Output files (in public/data/):
    - aggregations.json: Summary metrics, monthly/category breakdowns
    - deputies.json: Per-deputy data with risk scores
    - fraud-flags.json: Red flag details
    - mismatches.json: CNPJ activity mismatches
    - manifest.json: Data provenance and reproducibility metadata
"""

import json
import hashlib
import os
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd
import numpy as np

# Add analysis lib to path for schema imports
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "analysis"))

# Import schemas directly to avoid __init__.py importing metrics before pandas is ready
try:
    from lib.schemas import (
        validate_expenses_df,
        validate_deputy_output,
        validate_aggregations_output,
        ValidationResult,
        DeputyOutput,
        AggregationsOutput,
    )
    SCHEMAS_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Could not import validation schemas: {e}")
    SCHEMAS_AVAILABLE = False
    # Define stubs for graceful degradation
    def validate_expenses_df(*args, **kwargs):
        return None
    def validate_deputy_output(*args, **kwargs):
        return True, []
    def validate_aggregations_output(*args, **kwargs):
        return True, []

# Paths (SCRIPT_DIR and PROJECT_ROOT defined above for imports)
DATA_DIR = PROJECT_ROOT / "data" / "processed"
OUTPUT_DIR = SCRIPT_DIR.parent / "public" / "data"

# Ensure output directory exists
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def load_data():
    """Load all required CSV files."""
    print("Loading data files...")

    data = {}

    # Main expenses data
    expenses_path = DATA_DIR / "despesas_combined_2023_2025.csv"
    if expenses_path.exists():
        data["expenses"] = pd.read_csv(expenses_path, low_memory=False)
        print(f"  - Loaded {len(data['expenses']):,} expense records")

        # Filter out party leadership rows (entries without CPF are not individual deputies)
        if "cpf" in data["expenses"].columns:
            before_count = len(data["expenses"])
            # Keep only rows with valid CPF (non-null and non-empty)
            data["expenses"] = data["expenses"][
                data["expenses"]["cpf"].notna() &
                (data["expenses"]["cpf"].astype(str).str.strip() != "")
            ]
            filtered_count = before_count - len(data["expenses"])
            print(f"  - Filtered out {filtered_count:,} party leadership records (no CPF)")
            print(f"  - Remaining: {len(data['expenses']):,} deputy expense records")
    else:
        print(f"  ! Warning: {expenses_path} not found")
        data["expenses"] = pd.DataFrame()

    # HHI analysis
    hhi_path = DATA_DIR / "hhi_analysis.csv"
    if hhi_path.exists():
        data["hhi"] = pd.read_csv(hhi_path)
        print(f"  - Loaded {len(data['hhi']):,} HHI records")
    else:
        print(f"  ! Warning: {hhi_path} not found")
        data["hhi"] = pd.DataFrame()

    # Fraud analysis
    fraud_path = DATA_DIR / "fraud_analysis_full_matrix.csv"
    if fraud_path.exists():
        data["fraud"] = pd.read_csv(fraud_path)
        print(f"  - Loaded {len(data['fraud']):,} fraud analysis records")
    else:
        print(f"  ! Warning: {fraud_path} not found")
        data["fraud"] = pd.DataFrame()

    # CNPJ mismatches
    mismatch_path = DATA_DIR / "mismatch_analysis.csv"
    if mismatch_path.exists():
        data["mismatches"] = pd.read_csv(mismatch_path)
        print(f"  - Loaded {len(data['mismatches']):,} mismatch records")
    else:
        print(f"  ! Warning: {mismatch_path} not found")
        data["mismatches"] = pd.DataFrame()

    # Deputy enrichment data (attendance, education, profession)
    enrichment_path = DATA_DIR / "deputy_enrichment.csv"
    if enrichment_path.exists():
        data["enrichment"] = pd.read_csv(enrichment_path)
        print(f"  - Loaded {len(data['enrichment']):,} deputy enrichment records")
    else:
        print(f"  ! Warning: {enrichment_path} not found (run process_enrichment.py)")
        data["enrichment"] = pd.DataFrame()

    return data


def validate_expenses(df: pd.DataFrame) -> tuple:
    """
    Validate expense data schema and integrity using Pydantic schemas.

    Returns:
        tuple: (is_valid, errors, warnings)
    """
    errors = []
    warnings = []

    if df.empty:
        warnings.append("Expense dataframe is empty")
        return True, errors, warnings

    # Stage 1: Basic column checks (fast, catches structural issues)
    print("  Stage 1: Checking required columns...")

    deputy_col = 'txNomeParlamentar' if 'txNomeParlamentar' in df.columns else 'nomeParlamentar'
    if deputy_col not in df.columns:
        errors.append("Missing deputy name column (txNomeParlamentar or nomeParlamentar)")

    value_col = 'vlrLiquido' if 'vlrLiquido' in df.columns else 'vlrDocumento'
    if value_col not in df.columns:
        errors.append("Missing value column (vlrLiquido or vlrDocumento)")

    for col in ['numAno', 'numMes']:
        if col not in df.columns:
            errors.append(f"Missing required column: {col}")

    # If basic structure fails, return early
    if errors:
        return False, errors, warnings

    # Stage 2: Pydantic schema validation (sampled for performance)
    if SCHEMAS_AVAILABLE:
        print("  Stage 2: Validating data with Pydantic schemas (sampling 1000 rows)...")

        try:
            validation_result = validate_expenses_df(
                df,
                sample_size=1000,  # Validate sample for performance
                raise_on_error=False
            )

            if validation_result and not validation_result.is_valid:
                # Report first few errors
                for err in validation_result.errors[:5]:
                    warnings.append(f"Schema validation issue at row {err['row_index']}: {err['error'][:100]}")

                if validation_result.error_count > 5:
                    warnings.append(f"...and {validation_result.error_count - 5} more validation issues")

                # Don't fail on schema issues, just warn (data may have acceptable variations)
                warnings.append(
                    f"Schema validation: {validation_result.valid_rows}/{validation_result.total_rows} rows valid"
                )
            elif validation_result:
                print(f"    - All {validation_result.total_rows} sampled rows passed schema validation")

        except Exception as e:
            warnings.append(f"Schema validation error: {str(e)[:100]}")
    else:
        print("  Stage 2: Skipped (Pydantic schemas not available)")

    # Stage 3: Data quality checks
    print("  Stage 3: Running data quality checks...")

    # Check for negative values
    if value_col in df.columns:
        neg_count = (df[value_col] < 0).sum()
        if neg_count > 0:
            warnings.append(f"Found {neg_count:,} negative values in {value_col}")

    # Check for null values in critical columns
    for col in [deputy_col, value_col]:
        if col in df.columns:
            null_count = df[col].isna().sum()
            if null_count > 0:
                null_pct = (null_count / len(df)) * 100
                warnings.append(f"Found {null_count:,} null values in {col} ({null_pct:.1f}%)")

    # Check year range
    if 'numAno' in df.columns:
        min_year = df['numAno'].min()
        max_year = df['numAno'].max()
        if min_year < 2000 or max_year > 2030:
            warnings.append(f"Unusual year range: {min_year}-{max_year}")

    # Check month values
    if 'numMes' in df.columns:
        invalid_months = df[(df['numMes'] < 1) | (df['numMes'] > 12)]
        if len(invalid_months) > 0:
            errors.append(f"Found {len(invalid_months):,} records with invalid month values")

    # Check CNPJ format (if present)
    cnpj_col = 'txtCNPJCPF' if 'txtCNPJCPF' in df.columns else None
    if cnpj_col:
        empty_cnpj = df[cnpj_col].isna() | (df[cnpj_col].astype(str).str.strip() == '')
        empty_count = empty_cnpj.sum()
        if empty_count > 0:
            empty_pct = (empty_count / len(df)) * 100
            warnings.append(f"Found {empty_count:,} records with empty CNPJ ({empty_pct:.1f}%)")

    is_valid = len(errors) == 0
    return is_valid, errors, warnings


def generate_aggregations(expenses_df):
    """Generate aggregations.json with summary metrics."""
    print("\nGenerating aggregations.json...")

    if expenses_df.empty:
        # Return mock data if no expenses
        return {
            "meta": {
                "totalTransactions": 630552,
                "totalSpending": 681700000,
                "totalDeputies": 847,
                "totalSuppliers": 40000,
                "period": {"start": "2023-01", "end": "2025-12"},
                "lastUpdated": datetime.now().isoformat()
            },
            "byMonth": [],
            "byCategory": [],
            "byParty": [],
            "byState": []
        }

    # Clean and prepare data
    df = expenses_df.copy()

    # Parse dates and handle value columns
    if "numAno" in df.columns and "numMes" in df.columns:
        df["month"] = df["numAno"].astype(str) + "-" + df["numMes"].astype(str).str.zfill(2)

    # Get value column
    value_col = "vlrLiquido" if "vlrLiquido" in df.columns else "vlrDocumento"
    if value_col not in df.columns:
        value_col = df.select_dtypes(include=[np.number]).columns[0]

    # Calculate meta
    total_spending = df[value_col].sum()
    total_transactions = len(df)

    # Unique deputies
    deputy_col = "txNomeParlamentar" if "txNomeParlamentar" in df.columns else "nomeParlamentar"
    if deputy_col in df.columns:
        total_deputies = df[deputy_col].nunique()
    else:
        total_deputies = 847

    # Unique suppliers - count distinct CNPJ/CPF
    cnpj_col = "txtCNPJCPF" if "txtCNPJCPF" in df.columns else None
    if cnpj_col and cnpj_col in df.columns:
        # Filter out empty/null values and count unique
        valid_cnpjs = df[cnpj_col].dropna()
        valid_cnpjs = valid_cnpjs[valid_cnpjs.astype(str).str.strip() != ""]
        total_suppliers = valid_cnpjs.nunique()
        print(f"  - Found {total_suppliers:,} unique suppliers (CNPJ/CPF)")
    else:
        # Fallback to txtFornecedor if no CNPJ column
        supplier_col = "txtFornecedor" if "txtFornecedor" in df.columns else "fornecedor"
        if supplier_col in df.columns:
            total_suppliers = df[supplier_col].nunique()
        else:
            total_suppliers = 40000

    # Period
    if "numAno" in df.columns:
        start_year = df["numAno"].min()
        end_year = df["numAno"].max()
        period = {"start": f"{start_year}-01", "end": f"{end_year}-12"}
    else:
        period = {"start": "2023-01", "end": "2025-12"}

    # By month
    by_month = []
    if "month" in df.columns:
        monthly = df.groupby("month").agg({
            value_col: "sum",
            deputy_col if deputy_col in df.columns else df.columns[0]: "count"
        }).reset_index()
        monthly.columns = ["month", "value", "transactionCount"]
        by_month = monthly.sort_values("month").to_dict("records")

    # By category
    by_category = []
    category_col = "txtDescricao" if "txtDescricao" in df.columns else None
    if category_col and category_col in df.columns:
        cat_agg = df.groupby(category_col).agg({
            value_col: "sum",
            df.columns[0]: "count"
        }).reset_index()
        cat_agg.columns = ["category", "value", "transactionCount"]
        cat_agg["pct"] = (cat_agg["value"] / cat_agg["value"].sum() * 100).round(2)
        cat_agg = cat_agg.sort_values("value", ascending=False)
        by_category = cat_agg.to_dict("records")

    # By party
    by_party = []
    party_col = "sgPartido" if "sgPartido" in df.columns else None
    if party_col and party_col in df.columns and deputy_col in df.columns:
        party_agg = df.groupby(party_col).agg({
            value_col: "sum",
            deputy_col: "nunique"
        }).reset_index()
        party_agg.columns = ["party", "value", "deputyCount"]
        party_agg["avgPerDeputy"] = (party_agg["value"] / party_agg["deputyCount"]).round(2)
        party_agg = party_agg.sort_values("value", ascending=False)
        by_party = party_agg.to_dict("records")

    # By state
    by_state = []
    state_col = "sgUF" if "sgUF" in df.columns else None
    if state_col and state_col in df.columns and deputy_col in df.columns:
        state_agg = df.groupby(state_col).agg({
            value_col: "sum",
            deputy_col: "nunique"
        }).reset_index()
        state_agg.columns = ["uf", "value", "deputyCount"]
        state_agg["avgPerDeputy"] = (state_agg["value"] / state_agg["deputyCount"]).round(2)
        state_agg = state_agg.sort_values("value", ascending=False)
        by_state = state_agg.to_dict("records")

    aggregations = {
        "meta": {
            "totalTransactions": int(total_transactions),
            "totalSpending": float(total_spending),
            "totalDeputies": int(total_deputies),
            "totalSuppliers": int(total_suppliers),
            "period": period,
            "lastUpdated": datetime.now().isoformat()
        },
        "byMonth": by_month,
        "byCategory": by_category,
        "byParty": by_party,
        "byState": by_state
    }

    print(f"  - Total spending: R$ {total_spending:,.2f}")
    print(f"  - {total_transactions:,} transactions")
    print(f"  - {total_deputies} deputies, {total_suppliers} suppliers")

    return aggregations


def is_round_value(value):
    """Check if a value is a round number (ends in .00, or is divisible by 100)."""
    if pd.isna(value):
        return False
    # Check if it's a whole number or ends in .00
    return value % 1 == 0 and value % 100 == 0


def get_first_digit(value):
    """Extract the first digit from a positive number."""
    if pd.isna(value) or value <= 0:
        return None
    # Convert to string and get first non-zero digit
    s = str(abs(value)).lstrip('0').replace('.', '').replace('-', '')
    if len(s) == 0:
        return None
    return int(s[0])


def calculate_benford_analysis(values):
    """
    Calculate Benford's Law analysis for a series of values.
    Returns digit distribution, chi-squared, p-value, and significance.
    """
    # Benford's expected distribution
    BENFORD_EXPECTED = {
        1: 30.1, 2: 17.6, 3: 12.5, 4: 9.7,
        5: 7.9, 6: 6.7, 7: 5.8, 8: 5.1, 9: 4.6
    }

    # Get first digits
    first_digits = values.apply(get_first_digit).dropna()

    if len(first_digits) < 50:  # Need enough data for meaningful analysis
        return {
            "chi2": 0,
            "pValue": 1.0,
            "significant": False,
            "digitDistribution": [{"digit": d, "observed": 0, "expected": BENFORD_EXPECTED[d]} for d in range(1, 10)]
        }

    # Count occurrences
    digit_counts = first_digits.value_counts().reindex(range(1, 10), fill_value=0)
    total = digit_counts.sum()

    # Calculate observed percentages and chi-squared
    chi2 = 0
    digit_distribution = []

    for digit in range(1, 10):
        observed_count = digit_counts.get(digit, 0)
        observed_pct = (observed_count / total * 100) if total > 0 else 0
        expected_pct = BENFORD_EXPECTED[digit]
        expected_count = total * expected_pct / 100

        # Chi-squared contribution
        if expected_count > 0:
            chi2 += ((observed_count - expected_count) ** 2) / expected_count

        digit_distribution.append({
            "digit": digit,
            "observed": round(observed_pct, 2),
            "expected": expected_pct
        })

    # Determine significance (df=8)
    # Critical values: p<0.05 = 15.51, p<0.01 = 20.09
    if chi2 > 20.09:
        p_value = 0.01
        significant = True
    elif chi2 > 15.51:
        p_value = 0.05
        significant = True
    else:
        p_value = 0.10
        significant = False

    return {
        "chi2": round(chi2, 2),
        "pValue": p_value,
        "significant": significant,
        "digitDistribution": digit_distribution
    }


def generate_deputies(expenses_df, hhi_df, fraud_df, enrichment_df=None):
    """Generate deputies.json with per-deputy data including enrichment (attendance, education)."""
    print("\nGenerating deputies.json...")

    deputies = []

    if expenses_df.empty:
        print("  ! No expense data, generating mock deputies")
        # Generate mock data
        for i in range(10):
            deputies.append({
                "id": i + 1,
                "name": f"Deputado {i + 1}",
                "party": "PARTIDO",
                "uf": "SP",
                "totalSpending": 1000000 - (i * 50000),
                "transactionCount": 500 - (i * 30),
                "avgTicket": 2000,
                "supplierCount": 50,
                "hhi": {"value": 1500, "level": "MEDIO"},
                "benford": {"chi2": 10.5, "pValue": 0.05, "significant": False},
                "roundValuePct": 5.0,
                "riskScore": 0.3,
                "riskLevel": "MEDIO",
                "topSuppliers": [],
                "redFlags": [],
                "zScoreParty": 0.0,
                "zScoreState": 0.0
            })
        return deputies

    # Get columns
    deputy_col = "txNomeParlamentar" if "txNomeParlamentar" in expenses_df.columns else "nomeParlamentar"
    value_col = "vlrLiquido" if "vlrLiquido" in expenses_df.columns else "vlrDocumento"
    supplier_col = "txtFornecedor" if "txtFornecedor" in expenses_df.columns else "fornecedor"
    party_col = "sgPartido" if "sgPartido" in expenses_df.columns else None
    state_col = "sgUF" if "sgUF" in expenses_df.columns else None
    category_col = "txtDescricao" if "txtDescricao" in expenses_df.columns else None

    # Create month column for monthly breakdown
    if "numAno" in expenses_df.columns and "numMes" in expenses_df.columns:
        expenses_df = expenses_df.copy()
        expenses_df["month"] = expenses_df["numAno"].astype(str) + "-" + expenses_df["numMes"].astype(str).str.zfill(2)

    # CNPJ column for unique supplier tracking
    cnpj_col = "txtCNPJCPF" if "txtCNPJCPF" in expenses_df.columns else None

    # Group by deputy
    for idx, (name, group) in enumerate(expenses_df.groupby(deputy_col)):
        total_spending = group[value_col].sum()
        transaction_count = len(group)
        avg_ticket = total_spending / transaction_count if transaction_count > 0 else 0
        supplier_count = group[supplier_col].nunique() if supplier_col in group.columns else 0

        # Get unique supplier CNPJs for this deputy (for filtering calculations)
        supplier_cnpjs = []
        if cnpj_col and cnpj_col in group.columns:
            valid_cnpjs = group[cnpj_col].dropna()
            valid_cnpjs = valid_cnpjs[valid_cnpjs.astype(str).str.strip() != ""]
            supplier_cnpjs = valid_cnpjs.unique().tolist()

        # Calculate round value percentage
        round_values = group[value_col].apply(is_round_value)
        round_value_pct = (round_values.sum() / transaction_count * 100) if transaction_count > 0 else 0

        # Get party and state (take mode)
        party = group[party_col].mode().iloc[0] if party_col and party_col in group.columns and len(group[party_col].mode()) > 0 else "N/A"
        uf = group[state_col].mode().iloc[0] if state_col and state_col in group.columns and len(group[state_col].mode()) > 0 else "N/A"

        # Get HHI data if available
        hhi_value = 1500
        hhi_level = "MEDIO"
        if not hhi_df.empty and "Deputado" in hhi_df.columns:
            hhi_row = hhi_df[hhi_df["Deputado"] == name]
            if len(hhi_row) > 0:
                hhi_value = float(hhi_row.iloc[0].get("HHI", 1500))
                hhi_level = str(hhi_row.iloc[0].get("Nivel_Concentracao", "MEDIO")).upper()

        # Determine risk level
        if hhi_value > 3000:
            risk_level = "CRITICO"
            risk_score = 0.9
        elif hhi_value > 2500:
            risk_level = "ALTO"
            risk_score = 0.7
        elif hhi_value > 1500:
            risk_level = "MEDIO"
            risk_score = 0.4
        else:
            risk_level = "BAIXO"
            risk_score = 0.2

        # Get top suppliers with their CNPJs
        top_suppliers = []
        if supplier_col in group.columns:
            supplier_totals = group.groupby(supplier_col)[value_col].sum().sort_values(ascending=False).head(5)
            for supp_name, supp_value in supplier_totals.items():
                # Look up the CNPJ for this supplier (take the most common one if multiple exist)
                supplier_cnpj = ""
                if cnpj_col and cnpj_col in group.columns:
                    supplier_rows = group[group[supplier_col] == supp_name]
                    cnpj_values = supplier_rows[cnpj_col].dropna()
                    cnpj_values = cnpj_values[cnpj_values.astype(str).str.strip() != ""]
                    if len(cnpj_values) > 0:
                        # Take the most common CNPJ for this supplier
                        supplier_cnpj = str(cnpj_values.mode().iloc[0]) if len(cnpj_values.mode()) > 0 else ""

                top_suppliers.append({
                    "name": str(supp_name),
                    "cnpj": supplier_cnpj,
                    "value": float(supp_value),
                    "pct": float(supp_value / total_spending * 100) if total_spending > 0 else 0
                })

        # Calculate Benford analysis from actual transaction values
        benford_result = calculate_benford_analysis(group[value_col])

        # Calculate category breakdown for this deputy
        category_breakdown = []
        category_col = "txtDescricao" if "txtDescricao" in group.columns else None
        if category_col and category_col in group.columns:
            cat_agg = group.groupby(category_col)[value_col].sum().sort_values(ascending=False)
            for cat_name, cat_value in cat_agg.items():
                category_breakdown.append({
                    "category": str(cat_name),
                    "value": float(cat_value),
                    "pct": float(cat_value / total_spending * 100) if total_spending > 0 else 0,
                    "transactionCount": int(len(group[group[category_col] == cat_name]))
                })

        # Calculate monthly breakdown for this deputy
        monthly_breakdown = []
        if "month" in group.columns:
            month_agg = group.groupby("month").agg({
                value_col: "sum",
                group.columns[0]: "count"
            }).reset_index()
            month_agg.columns = ["month", "value", "transactionCount"]
            month_agg = month_agg.sort_values("month")
            for _, row in month_agg.iterrows():
                monthly_breakdown.append({
                    "month": str(row["month"]),
                    "value": float(row["value"]),
                    "transactionCount": int(row["transactionCount"])
                })

        # Get red flags
        red_flags = []
        if hhi_value > 2500:
            red_flags.append(f"Concentracao alta de fornecedores (HHI={hhi_value:.0f})")
        if len(top_suppliers) > 0 and top_suppliers[0]["pct"] > 50:
            red_flags.append(f"Top fornecedor representa {top_suppliers[0]['pct']:.1f}% dos gastos")
        if round_value_pct > 20:
            red_flags.append(f"{round_value_pct:.1f}% valores redondos (suspeito)")
            risk_score = min(risk_score + 0.1, 1.0)
        if benford_result["significant"]:
            red_flags.append(f"Desvio significativo da Lei de Benford (chi2={benford_result['chi2']:.1f})")
            risk_score = min(risk_score + 0.15, 1.0)

        # Get enrichment data (attendance, education, profession)
        enrichment = {}
        if enrichment_df is not None and not enrichment_df.empty:
            # Try to match by name (enrichment has 'nome' column)
            enrich_row = enrichment_df[enrichment_df["nome"].str.lower() == str(name).lower()]
            if len(enrich_row) > 0:
                row = enrich_row.iloc[0]
                enrichment = {
                    "education": str(row.get("escolaridade", "")) if pd.notna(row.get("escolaridade")) else None,
                    "profession": str(row.get("profissao", "")) if pd.notna(row.get("profissao")) else None,
                    "birthYear": int(row.get("birthYear")) if pd.notna(row.get("birthYear")) else None,
                    "age": int(row.get("age")) if pd.notna(row.get("age")) else None,
                    "mandateCount": int(row.get("mandateCount", 1)) if pd.notna(row.get("mandateCount")) else 1,
                    "attendance": {
                        "totalEvents": int(row.get("totalEvents", 0)) if pd.notna(row.get("totalEvents")) else 0,
                        "uniqueEvents": int(row.get("uniqueEvents", 0)) if pd.notna(row.get("uniqueEvents")) else 0,
                        "rate": float(row.get("avgAttendanceRate", 0)) if pd.notna(row.get("avgAttendanceRate")) else 0,
                        "events2023": int(row.get("attendance2023", 0)) if pd.notna(row.get("attendance2023")) else 0,
                        "events2024": int(row.get("attendance2024", 0)) if pd.notna(row.get("attendance2024")) else 0,
                        "events2025": int(row.get("attendance2025", 0)) if pd.notna(row.get("attendance2025")) else 0,
                    } if row.get("totalEvents", 0) > 0 else None
                }

        deputy = {
            "id": idx + 1,
            "name": str(name),
            "party": str(party),
            "uf": str(uf),
            "totalSpending": float(total_spending),
            "transactionCount": int(transaction_count),
            "avgTicket": float(avg_ticket),
            "supplierCount": int(supplier_count),
            "supplierCnpjs": supplier_cnpjs,  # List of unique supplier CNPJs for this deputy
            "hhi": {
                "value": float(hhi_value),
                "level": hhi_level
            },
            "benford": benford_result,
            "roundValuePct": float(round_value_pct),
            "riskScore": float(risk_score),
            "riskLevel": risk_level,
            "topSuppliers": top_suppliers,
            "redFlags": red_flags,
            "byCategory": category_breakdown,
            "byMonth": monthly_breakdown,
            # Enrichment data (attendance, education, etc)
            "education": enrichment.get("education"),
            "profession": enrichment.get("profession"),
            "birthYear": enrichment.get("birthYear"),
            "age": enrichment.get("age"),
            "mandateCount": enrichment.get("mandateCount", 1),
            "attendance": enrichment.get("attendance"),
        }
        deputies.append(deputy)

    # Filter out inactive deputies (ministers who left, resigned, started late in legislature)
    # Thresholds: minimum R$ 50,000 spending AND minimum 20 transactions
    MIN_SPENDING = 50000
    MIN_TRANSACTIONS = 20

    before_filter = len(deputies)
    deputies = [d for d in deputies if d["totalSpending"] >= MIN_SPENDING and d["transactionCount"] >= MIN_TRANSACTIONS]
    filtered_count = before_filter - len(deputies)
    print(f"  - Filtered out {filtered_count:,} inactive deputies (spending < R$ {MIN_SPENDING:,} or txns < {MIN_TRANSACTIONS})")
    print(f"  - Remaining active deputies: {len(deputies):,}")

    # Calculate party and state statistics for z-scores
    print("  - Calculating z-scores...")

    # Group spending by party
    party_spending = {}
    for d in deputies:
        party = d["party"]
        if party not in party_spending:
            party_spending[party] = []
        party_spending[party].append(d["totalSpending"])

    # Calculate party stats (mean, std)
    party_stats = {}
    for party, values in party_spending.items():
        if len(values) >= 2:
            mean = np.mean(values)
            std = np.std(values)
            party_stats[party] = {"mean": mean, "std": std if std > 0 else 1}
        else:
            party_stats[party] = {"mean": values[0] if values else 0, "std": 1}

    # Group spending by state
    state_spending = {}
    for d in deputies:
        uf = d["uf"]
        if uf not in state_spending:
            state_spending[uf] = []
        state_spending[uf].append(d["totalSpending"])

    # Calculate state stats (mean, std)
    state_stats = {}
    for uf, values in state_spending.items():
        if len(values) >= 2:
            mean = np.mean(values)
            std = np.std(values)
            state_stats[uf] = {"mean": mean, "std": std if std > 0 else 1}
        else:
            state_stats[uf] = {"mean": values[0] if values else 0, "std": 1}

    # Second pass: calculate z-scores and update risk scores
    for d in deputies:
        party = d["party"]
        uf = d["uf"]
        spending = d["totalSpending"]

        # Calculate z-scores
        if party in party_stats:
            z_party = (spending - party_stats[party]["mean"]) / party_stats[party]["std"]
        else:
            z_party = 0.0

        if uf in state_stats:
            z_state = (spending - state_stats[uf]["mean"]) / state_stats[uf]["std"]
        else:
            z_state = 0.0

        d["zScoreParty"] = round(z_party, 2)
        d["zScoreState"] = round(z_state, 2)

        # Recalculate risk score with new signals
        risk_score = d["riskScore"]  # Start with current score (HHI + benford + round)

        # Add top supplier >50% penalty (+0.10)
        if d["topSuppliers"] and d["topSuppliers"][0]["pct"] > 50:
            risk_score += 0.10

        # Add z-score penalties (+0.08 each if >2σ above average)
        # Only penalize for spending MORE than average (positive z-score)
        if z_party > 2.0:
            risk_score += 0.08
            d["redFlags"].append(f"Gasto {z_party:.1f}σ acima da media do partido")

        if z_state > 2.0:
            risk_score += 0.08
            d["redFlags"].append(f"Gasto {z_state:.1f}σ acima da media do estado")

        # Cap at 1.0
        d["riskScore"] = min(round(risk_score, 2), 1.0)

        # Update risk level based on new score
        if d["riskScore"] >= 0.75:
            d["riskLevel"] = "CRITICO"
        elif d["riskScore"] >= 0.55:
            d["riskLevel"] = "ALTO"
        elif d["riskScore"] >= 0.35:
            d["riskLevel"] = "MEDIO"
        else:
            d["riskLevel"] = "BAIXO"

    # Sort by total spending descending
    deputies.sort(key=lambda x: x["totalSpending"], reverse=True)

    print(f"  - Generated {len(deputies)} deputy records")
    print(f"  - Critical: {sum(1 for d in deputies if d['riskLevel'] == 'CRITICO')}")
    print(f"  - High: {sum(1 for d in deputies if d['riskLevel'] == 'ALTO')}")
    print(f"  - Z-score outliers (party): {sum(1 for d in deputies if abs(d['zScoreParty']) > 2.0)}")
    print(f"  - Z-score outliers (state): {sum(1 for d in deputies if abs(d['zScoreState']) > 2.0)}")

    return deputies


def generate_fraud_flags(fraud_df):
    """Generate fraud-flags.json with red flag details."""
    print("\nGenerating fraud-flags.json...")

    if fraud_df.empty:
        return []

    flags = []
    for _, row in fraud_df.iterrows():
        flag = {
            "deputyId": int(row.get("id", 0)),
            "deputyName": str(row.get("Deputado", "")),
            "party": str(row.get("Partido", "")),
            "uf": str(row.get("UF", "")),
            "flags": [],
            "details": {
                "benfordDeviation": bool(row.get("Score_Benford", 0) > 0.5),
                "benfordChi2": float(row.get("Chi2", 0)),
                "roundValuePct": float(row.get("Round_Pct", 0)),
                "supplierConcentration": bool(row.get("HHI", 0) > 2500),
                "hhiValue": float(row.get("HHI", 0)),
                "cnpjMismatches": int(row.get("CNPJ_Mismatches", 0)),
                "weekendPct": float(row.get("Weekend_Pct", 0))
            },
            "riskScore": float(row.get("Risk_Score_Final", 0)),
            "riskLevel": str(row.get("Risk_Category", "MEDIO")).upper()
        }

        # Build flags list
        if flag["details"]["benfordDeviation"]:
            flag["flags"].append("Desvio da Lei de Benford")
        if flag["details"]["supplierConcentration"]:
            flag["flags"].append("Alta concentracao de fornecedores")
        if flag["details"]["roundValuePct"] > 30:
            flag["flags"].append(f"{flag['details']['roundValuePct']:.0f}% valores redondos")
        if flag["details"]["cnpjMismatches"] > 0:
            flag["flags"].append(f"{flag['details']['cnpjMismatches']} CNPJs com atividade incompativel")

        flags.append(flag)

    print(f"  - Generated {len(flags)} fraud flag records")

    return flags


def generate_mismatches(mismatch_df):
    """Generate mismatches.json with CNPJ activity mismatches."""
    print("\nGenerating mismatches.json...")

    if mismatch_df.empty:
        return []

    mismatches = []
    for _, row in mismatch_df.iterrows():
        mismatch = {
            "cnpj": str(row.get("cnpj", "")),
            "supplierName": str(row.get("fornecedor_ceap", row.get("fornecedor", ""))),
            "razaoSocial": str(row.get("razao_social", "")),
            "expenseCategory": str(row.get("expense_category", row.get("categoria", ""))),
            "cnaePrincipal": str(row.get("cnae_principal", "")),
            "totalValue": float(row.get("total_value", row.get("valor_total", 0))),
            "transactionCount": int(row.get("transaction_count", row.get("num_transacoes", 0))),
            "deputyCount": int(row.get("deputy_count", row.get("num_deputados", 0))),
            "reason": str(row.get("reason", row.get("motivo", ""))),
            "uf": str(row.get("uf", ""))
        }
        mismatches.append(mismatch)

    # Sort by total value descending
    mismatches.sort(key=lambda x: x["totalValue"], reverse=True)

    print(f"  - Generated {len(mismatches)} mismatch records")
    print(f"  - Total value: R$ {sum(m['totalValue'] for m in mismatches):,.2f}")

    return mismatches


def validate_output(data, output_type: str) -> tuple[bool, list]:
    """
    Validate output data before saving.

    Args:
        data: The data to validate
        output_type: One of 'deputies', 'aggregations', 'fraud_flags', 'mismatches'

    Returns:
        tuple: (is_valid, list of error messages)
    """
    errors = []

    # Skip Pydantic validation if schemas not available
    if not SCHEMAS_AVAILABLE:
        # Basic type checks only
        if output_type in ("deputies", "fraud_flags", "mismatches"):
            if not isinstance(data, list):
                errors.append(f"{output_type} must be a list")
            else:
                print(f"  - {output_type}: {len(data)} records (schema validation skipped)")
        elif output_type == "aggregations":
            if not isinstance(data, dict):
                errors.append("aggregations must be a dict")
            else:
                print(f"  - aggregations validated (schema validation skipped)")
        return len(errors) == 0, errors

    try:
        if output_type == "deputies":
            # Validate sample of deputies
            sample_size = min(10, len(data))
            for i, deputy in enumerate(data[:sample_size]):
                is_valid, deputy_errors = validate_deputy_output(deputy)
                if not is_valid:
                    errors.append(f"Deputy {i} ({deputy.get('name', 'unknown')}): {deputy_errors[0][:100]}")

            if errors:
                print(f"  ! Output validation: {len(errors)} issues in first {sample_size} deputies")
            else:
                print(f"  - Output validation: {sample_size} deputies validated successfully")

        elif output_type == "aggregations":
            is_valid, agg_errors = validate_aggregations_output(data)
            if not is_valid:
                errors.extend(agg_errors)
                print(f"  ! Aggregations validation failed: {agg_errors[0][:100]}")
            else:
                print(f"  - Aggregations validated successfully")

        # For other types, do basic checks
        elif output_type == "fraud_flags":
            if not isinstance(data, list):
                errors.append("fraud_flags must be a list")
            else:
                print(f"  - Fraud flags: {len(data)} records")

        elif output_type == "mismatches":
            if not isinstance(data, list):
                errors.append("mismatches must be a list")
            else:
                print(f"  - Mismatches: {len(data)} records")

    except Exception as e:
        # Don't fail on validation errors, just warn
        print(f"  ! Validation error for {output_type}: {str(e)[:100]}")

    return len(errors) == 0, errors


def save_json(data, filename, validate=True):
    """Save data to JSON file with optional validation."""
    # Determine output type from filename
    output_type = filename.replace(".json", "").replace("-", "_")

    # Validate before saving
    if validate:
        is_valid, errors = validate_output(data, output_type)
        if not is_valid:
            print(f"  ! Warning: {len(errors)} validation issues (saving anyway)")
            for err in errors[:3]:
                print(f"      - {err}")

    output_path = OUTPUT_DIR / filename
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  -> Saved {output_path}")


def generate_manifest(expenses_df, aggregations, deputies, fraud_flags, mismatches):
    """Generate manifest.json for data reproducibility and auditing."""
    print("\nGenerating manifest.json...")

    # Calculate hash of source data
    source_file = DATA_DIR / "despesas_combined_2023_2025.csv"
    source_hash = ""
    source_size = 0
    source_modified = None

    if source_file.exists():
        # Calculate SHA256 hash of source file
        sha256_hash = hashlib.sha256()
        with open(source_file, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256_hash.update(chunk)
        source_hash = sha256_hash.hexdigest()
        source_size = source_file.stat().st_size
        source_modified = datetime.fromtimestamp(source_file.stat().st_mtime).isoformat()
        print(f"  - Source file hash: {source_hash[:16]}...")

    # Get data characteristics
    if not expenses_df.empty:
        # Get date range from data
        if "numAno" in expenses_df.columns:
            min_year = int(expenses_df["numAno"].min())
            max_year = int(expenses_df["numAno"].max())
            if "numMes" in expenses_df.columns:
                min_month = int(expenses_df[expenses_df["numAno"] == min_year]["numMes"].min())
                max_month = int(expenses_df[expenses_df["numAno"] == max_year]["numMes"].max())
                period_start = f"{min_year}-{min_month:02d}"
                period_end = f"{max_year}-{max_month:02d}"
            else:
                period_start = f"{min_year}-01"
                period_end = f"{max_year}-12"
        else:
            period_start = "unknown"
            period_end = "unknown"

        record_count = len(expenses_df)

        # Value column for total
        value_col = "vlrLiquido" if "vlrLiquido" in expenses_df.columns else "vlrDocumento"
        total_value = float(expenses_df[value_col].sum()) if value_col in expenses_df.columns else 0
    else:
        period_start = "unknown"
        period_end = "unknown"
        record_count = 0
        total_value = 0

    manifest = {
        "version": "1.0.0",
        "generated_at": datetime.now().isoformat(),
        "generator": "prepare-data.py",

        "source_data": {
            "file": "despesas_combined_2023_2025.csv",
            "sha256": source_hash,
            "size_bytes": source_size,
            "last_modified": source_modified,
            "api_source": "https://dadosabertos.camara.leg.br/api/v2",
            "period": {
                "start": period_start,
                "end": period_end
            },
            "record_count": record_count,
            "total_value_brl": total_value
        },

        "output_files": {
            "aggregations.json": {
                "record_count": 1,
                "description": "Summary metrics and breakdowns by month/category/party/state"
            },
            "deputies.json": {
                "record_count": len(deputies),
                "description": "Per-deputy data with risk scores and breakdowns"
            },
            "fraud-flags.json": {
                "record_count": len(fraud_flags),
                "description": "Red flag details for deputies with anomalies"
            },
            "mismatches.json": {
                "record_count": len(mismatches),
                "description": "CNPJ activity code mismatches"
            }
        },

        "methodology": {
            "benford_threshold": {
                "chi2_critical_001": 20.09,
                "chi2_critical_005": 15.51,
                "degrees_of_freedom": 8,
                "description": "Chi-squared test for first digit distribution"
            },
            "hhi_thresholds": {
                "low": 1500,
                "moderate": 2500,
                "high": 3000,
                "very_high": 5000,
                "description": "Herfindahl-Hirschman Index for supplier concentration"
            },
            "risk_score": {
                "base_weights": {
                    "hhi_critical": 0.9,
                    "hhi_high": 0.7,
                    "hhi_moderate": 0.4,
                    "hhi_low": 0.2
                },
                "additive_penalties": {
                    "benford_significant": 0.15,
                    "round_values_above_20pct": 0.10,
                    "top_supplier_above_50pct": 0.10,
                    "zscore_party_above_2std": 0.08,
                    "zscore_state_above_2std": 0.08
                },
                "max_score": 1.0,
                "risk_level_thresholds": {
                    "critico": 0.75,
                    "alto": 0.55,
                    "medio": 0.35,
                    "baixo": 0.0
                }
            }
        },

        "reproducibility_notes": [
            "All random operations use fixed seeds where applicable",
            "Chi-squared p-values use critical value lookup (discrete: 0.01, 0.05, 0.10)",
            "Source data hash can be used to verify identical input data",
            "Benford analysis requires minimum 50 transactions per deputy for reliability"
        ]
    }

    print(f"  - Period: {period_start} to {period_end}")
    print(f"  - Records: {record_count:,}")
    print(f"  - Total value: R$ {total_value:,.2f}")

    return manifest


def main():
    """Main entry point."""
    print("=" * 60)
    print("CEAP Dashboard Data Preparation")
    print("=" * 60)

    # Load data
    data = load_data()

    # Validate expense data
    print("\nValidating expense data...")
    is_valid, errors, warnings = validate_expenses(data["expenses"])

    if errors:
        print("  ERRORS (will prevent processing):")
        for error in errors:
            print(f"    - {error}")

    if warnings:
        print("  WARNINGS (data quality issues):")
        for warning in warnings:
            print(f"    - {warning}")

    if not is_valid:
        print("\n" + "=" * 60)
        print("VALIDATION FAILED - Cannot proceed with invalid data")
        print("=" * 60)
        return

    if not errors and not warnings:
        print("  - All validations passed")

    # Generate JSON files
    aggregations = generate_aggregations(data["expenses"])
    save_json(aggregations, "aggregations.json")

    deputies = generate_deputies(data["expenses"], data["hhi"], data["fraud"], data.get("enrichment"))
    save_json(deputies, "deputies.json")

    fraud_flags = generate_fraud_flags(data["fraud"])
    save_json(fraud_flags, "fraud-flags.json")

    mismatches = generate_mismatches(data["mismatches"])
    save_json(mismatches, "mismatches.json")

    # Generate manifest for reproducibility
    manifest = generate_manifest(
        data["expenses"],
        aggregations,
        deputies,
        fraud_flags,
        mismatches
    )
    save_json(manifest, "manifest.json")

    print("\n" + "=" * 60)
    print("Data preparation complete!")
    print(f"Output directory: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()
