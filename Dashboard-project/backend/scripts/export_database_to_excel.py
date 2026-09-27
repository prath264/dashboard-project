"""Export every public PostgreSQL table to a formatted Excel workbook.

Uses only the project's existing database dependencies and Python's standard
library, so it does not require Excel or an additional package installation.
"""

import asyncio
import os
import re
import sys
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile

from sqlalchemy import text

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))
# Some deployment environments use DEBUG=release.  The application settings
# expect a boolean, so force a safe value only for this standalone exporter.
os.environ["DEBUG"] = "false"

from app.db.session import engine  # noqa: E402

OUTPUT_PATH = PROJECT_DIR / "database_tables_export.xlsx"
OUTPUT_DIR = PROJECT_DIR / "database_exports"
REDACTED_COLUMNS = {"password_hash", "hashed_password"}
EXCLUDED_TABLES = {"alembic_version"}


def excel_column(number: int) -> str:
    result = ""
    while number:
        number, remainder = divmod(number - 1, 26)
        result = chr(65 + remainder) + result
    return result


def safe_sheet_name(name: str, used: set[str]) -> str:
    base = re.sub(r"[\\/*?:\[\]]", "_", name)[:31] or "Sheet"
    candidate, suffix = base, 2
    while candidate.lower() in used:
        tail = f"_{suffix}"
        candidate = base[: 31 - len(tail)] + tail
        suffix += 1
    used.add(candidate.lower())
    return candidate


def cell_xml(value, row: int, column: int) -> str:
    ref = f"{excel_column(column)}{row}"
    if value is None:
        return f'<c r="{ref}"/>'
    if isinstance(value, bool):
        return f'<c r="{ref}" t="b"><v>{int(value)}</v></c>'
    if isinstance(value, (int, float, Decimal)) and not isinstance(value, bool):
        return f'<c r="{ref}"><v>{value}</v></c>'
    if isinstance(value, (datetime, date)):
        value = value.isoformat(sep=" ") if isinstance(value, datetime) else value.isoformat()
    return f'<c r="{ref}" t="inlineStr"><is><t>{escape(str(value))}</t></is></c>'


def worksheet_xml(headers, rows, table_id: int, table_name: str) -> str:
    all_rows = [headers, *rows]
    body = []
    for row_number, values in enumerate(all_rows, start=1):
        body.append("<row r=\"%s\">%s</row>" % (
            row_number,
            "".join(cell_xml(value, row_number, column) for column, value in enumerate(values, start=1)),
        ))
    end_cell = f"{excel_column(len(headers))}{max(1, len(all_rows))}"
    widths = "".join(
        f'<col min="{i}" max="{i}" width="{min(max(len(header) + 4, 14), 30)}" customWidth="1"/>'
        for i, header in enumerate(headers, start=1)
    )
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <cols>{widths}</cols>
  <sheetData>{''.join(body)}</sheetData>
  <autoFilter ref="A1:{end_cell}"/>
  <tableParts count="1"><tablePart r:id="rId1"/></tableParts>
</worksheet>'''


def table_xml(headers, table_id: int, table_name: str, row_count: int) -> str:
    end_cell = f"{excel_column(len(headers))}{max(1, row_count + 1)}"
    columns = "".join(
        f'<tableColumn id="{i}" name="{escape(header)}"/>'
        for i, header in enumerate(headers, start=1)
    )
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="{table_id}" name="{table_name}" displayName="{table_name}" ref="A1:{end_cell}" totalsRowShown="0">
  <autoFilter ref="A1:{end_cell}"/>
  <tableColumns count="{len(headers)}">{columns}</tableColumns>
  <tableStyleInfo name="TableStyleMedium2" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/>
</table>'''


async def fetch_tables():
    async with engine.connect() as connection:
        tables = (await connection.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """))).scalars().all()
        exported = []
        for table in tables:
            if table in EXCLUDED_TABLES:
                continue
            columns = (await connection.execute(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = :table
                ORDER BY ordinal_position
            """), {"table": table})).mappings().all()
            names = [column["column_name"] for column in columns]
            quoted_table = '"' + table.replace('"', '""') + '"'
            result = await connection.execute(text(f"SELECT * FROM {quoted_table}"))
            rows = []
            for record in result.mappings():
                rows.append([
                    "[REDACTED]" if name.lower() in REDACTED_COLUMNS and record[name] is not None else record[name]
                    for name in names
                ])
            exported.append((table, names, rows, columns))
    return exported


def write_sheets_workbook(output_path: Path, sheets: list[tuple[str, list, list]]) -> None:
    used_names = set()
    sheet_names = [safe_sheet_name(name, used_names) for name, _, _ in sheets]
    table_names = [f"Table_{i}" for i in range(1, len(sheets) + 1)]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output_path, "w", ZIP_DEFLATED) as workbook:
        content_types = ['<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>', '<Default Extension="xml" ContentType="application/xml"/>', '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>', '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>']
        for index in range(1, len(sheets) + 1):
            content_types += [f'<Override PartName="/xl/worksheets/sheet{index}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>', f'<Override PartName="/xl/tables/table{index}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>']
        workbook.writestr("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' + ''.join(content_types) + '</Types>')
        workbook.writestr("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
        sheet_nodes = ''.join(f'<sheet name="{escape(name)}" sheetId="{i}" r:id="rId{i}"/>' for i, name in enumerate(sheet_names, 1))
        workbook.writestr("xl/workbook.xml", f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>{sheet_nodes}</sheets></workbook>')
        rels = ''.join(f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1, len(sheets) + 1))
        rels += f'<Relationship Id="rId{len(sheets) + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        workbook.writestr("xl/_rels/workbook.xml.rels", f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{rels}</Relationships>')
        workbook.writestr("xl/styles.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf xfId="0"/></cellXfs></styleSheet>')
        for index, (_, headers, rows) in enumerate(sheets, 1):
            workbook.writestr(f"xl/worksheets/sheet{index}.xml", worksheet_xml(headers, rows, index, table_names[index - 1]))
            workbook.writestr(f"xl/worksheets/_rels/sheet{index}.xml.rels", f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table{index}.xml"/></Relationships>')
            workbook.writestr(f"xl/tables/table{index}.xml", table_xml(headers, index, table_names[index - 1], len(rows)))


def write_combined_workbook(exported) -> None:
    sheets = [("Schema", ["Table", "Column", "Data type", "Nullable", "Default"], [
        [table, col["column_name"], col["data_type"], col["is_nullable"], col["column_default"]]
        for table, _, _, columns in exported for col in columns
    ])]
    sheets.extend((table, headers, rows) for table, headers, rows, _ in exported)
    write_sheets_workbook(OUTPUT_PATH, sheets)


def write_separate_workbooks(exported) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for table, headers, rows, _ in exported:
        file_path = OUTPUT_DIR / f"{table}.xlsx"
        write_sheets_workbook(file_path, [(table, headers, rows)])


async def main():
    exported = await fetch_tables()
    write_combined_workbook(exported)
    write_separate_workbooks(exported)
    print(f"Combined workbook: {OUTPUT_PATH}")
    print(f"Separate files: {OUTPUT_DIR}")
    for name, _, rows, _ in exported:
        print(f"- {name}.xlsx: {len(rows)} rows")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
