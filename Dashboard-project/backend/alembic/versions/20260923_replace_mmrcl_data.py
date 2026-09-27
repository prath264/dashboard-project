"""Replace MMRCL cartridge-management data from the historical issue log.

Revision ID: 20260923_replace_mmrcl_data
Revises: 20260918_switch_employee_fks

DATA-ONLY migration:
- Preserves users and refresh_tokens.
- Replaces locations, employees, engineers, printers, cartridges, inventory,
  cartridge_requests, cartridge_issues, stock_movements, and printer_assignments.
- Does not create or alter database tables.
- Does not populate printer_assignments.
- Does not require printer serial-number mapping.
- Printers are created from the historical issue log using model + location.
- Canon MF645C is normalized to the requested printer model name:
  "Canon MF 645CX".
- Cartridge/drum descriptions are kept intact in cartridges.model.
- The database cartridges.color field is populated with "N/A"; colour is NOT
  split out of the imported model name.
- Engineers: the three confirmed names (Hussain shaikh, Santosh Sonkawade,
  Piyush Pandey) plus "Darryl Pereira" (appears once in the log, issue #22)
  and an "Unknown Engineer" placeholder for the two rows with no engineer name
  (issues #7 and #15). engineer_id is NOT NULL on requests and issues, so NULL
  is not possible. Historical spelling variants are normalized to the names.
- Two source typos are corrected by issue id (see PRINTER_MODEL_CORRECTIONS):
  #2 (Canon 3922 -> Canon 3822) and #10 (printer model "NPG-67" -> Canon 3822).
- Inventory starts at 0 because the source contains historical issues, not a
  reliable current-stock balance.
- Historical issue rows are represented by one installed cartridge request and
  one cartridge issue row each.
"""

from __future__ import annotations

from datetime import datetime
from typing import Sequence, Union
import re

import sqlalchemy as sa
from alembic import op


revision: str = "20260923_replace_mmrcl_data"
down_revision: Union[str, None] = "20260918_switch_employee_fks"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Historical source: 67 replacement rows.
ISSUE_ROWS = [(1,
  '4-15-26 16:47:02',
  '4-15-26 16:48:31',
  'Canon 3822',
  'NPG 67 Toner Black',
  1,
  'Shweta Kalebag',
  'Transit Office 1st Floor',
  'Piyush Pandey'),
 (2,
  '4-16-26 9:38:20',
  '4-16-26 9:40:18',
  'Canon 3922',
  'NPG 67 Toner Cyan',
  1,
  'Supriya More',
  'Transit Office Grd Floor',
  'Santosh Sonkawade'),
 (3,
  '4-16-26 10:55:25',
  '4-16-26 10:57:17',
  'Canon 3822',
  'NPG 67 Toner Black',
  1,
  'Ujwal Jadhav',
  'Transit Office Grd Floor',
  'Santosh sonkawade'),
 (4,
  '4-16-26 10:55:25',
  '4-16-26 10:57:17',
  'Canon 3822',
  'NPG 67 Toner Yellow',
  1,
  'Ujwal Jadhav',
  'Transit Office Grd Floor',
  'Santosh sonkawade'),
 (5,
  '4-20-26 10:17:35',
  '4-20-26 10:22:29',
  'Canon 3822',
  'NPG 67 Toner Magenta',
  1,
  'Datta Kshirsagar',
  'Transit Office 1st Floor',
  'Santosh'),
 (6,
  '4-21-26 16:29:06',
  '4-21-26 16:48:12',
  'Canon 3922',
  'NPG 88 Toner Black',
  1,
  'Rohit Tilak',
  'MMRCL GC 1st Floor',
  'Hussain'),
 (7,
  '4-21-26 16:29:06',
  '4-21-26 16:48:12',
  'Canon 3922',
  'NPG 88 Toner Magenta',
  1,
  'Rohit Tilak',
  'MMRCL GC 1st Floor',
  ''),
 (8,
  '4-21-26 16:48:28',
  '4-21-26 16:49:46',
  'SHARP MX-2630N',
  'Sharp Toner Magenta',
  1,
  'Ganesh Suryvanshi',
  'MMRCL GC 1st Floor',
  'santosh'),
 (9,
  '5-11-26 18:16:46',
  '5-11-26 18:18:18',
  'Canon 3922',
  'NPG 88 Toner Yellow',
  1,
  'Bhumkesh Bagde',
  'MMRCL GC 1st Floor',
  'santosh sonkawade'),
 (10,
  '5-12-26 10:08:42',
  '5-12-26 10:10:56',
  'NPG-67',
  'NPG 67 Drum Unit',
  1,
  'Balkrishna hate',
  'Transit Office Grd Floor',
  'Hussain shaikh'),
 (11,
  '5-12-26 12:13:02',
  '5-12-26 12:15:21',
  'Canon 3822',
  'NPG 67 Toner Black',
  1,
  'Santosh sonkawade',
  'Transit Office Grd Floor',
  'Santosh Sonkawade'),
 (12,
  '5-12-26 15:08:58',
  '5-12-26 15:11:59',
  'Canon 3822',
  'NPG 67 Drum Unit',
  1,
  'Amritha Nambiar',
  'Transit Office Grd Floor',
  'Santosh Sonkawade'),
 (13,
  '5-14-26 15:21:01',
  '5-14-26 15:24:26',
  'SHARP MX-2630N',
  'Sharp Toner Yellow',
  1,
  'Makesh Kumar',
  'MMRCL GC 1st Floor',
  'Shaikh mohd hussain'),
 (14,
  '5-15-26 14:53:29',
  '5-15-26 14:55:52',
  'Canon 3822',
  'NPG 67 Drum Unit',
  1,
  'Abhiraj Dabare',
  'Transit Office 1st Floor',
  'Hussain Shaikh'),
 (15,
  '5-15-26 14:53:29',
  '5-15-26 14:55:52',
  'Canon 3822',
  'NPG 67 Drum Unit',
  1,
  'Abhiraj Dabare',
  'Transit Office 1st Floor',
  ''),
 (16,
  '5-15-26 15:00:45',
  '5-15-26 15:02:01',
  'Canon 3822',
  'NPG 67 Drum Unit',
  1,
  'Preeta Nair',
  'Transit Office Grd Floor',
  'Piyush Pandey'),
 (17,
  '5-15-26 15:50:57',
  '5-15-26 15:55:43',
  'Canon 3922',
  'NPG 88 Toner Yellow',
  1,
  'prakash kamble',
  'Hallmark Plaza 2nd Floor',
  'Shaikh mohd hussain'),
 (18,
  '5-20-26 19:22:26',
  '5-20-26 19:23:32',
  'Canon 3922',
  'NPG 88 Toner Cyan',
  1,
  'Aditya pande',
  'MMRCL GC 1st Floor',
  'Santosh Sonkawade'),
 (19,
  '6-1-26 16:09:16',
  '6-1-26 16:18:08',
  'HP Officejet Pro 8600Plus -All-in-One',
  'HP 951XL Cyan',
  1,
  'Vishwas Ajnalkar',
  'Hallmark Plaza 2nd Floor',
  'Santosh Sonkawade'),
 (20,
  '6-2-26 14:24:26',
  '6-2-26 14:26:33',
  'Canon 3822',
  'NPG 67 Toner Black',
  1,
  'Jyoti Nair',
  'Transit Office 1st Floor',
  'Piyush Pandey'),
 (21,
  '6-3-26 17:03:26',
  '6-3-26 17:05:04',
  'Canon 3822',
  'NPG 67 Toner Cyan',
  1,
  'IT Department',
  'Transit Office 1st Floor',
  'Piyush Pandey'),
 (22,
  '6-4-26 18:01:48',
  '6-4-26 18:05:23',
  'Canon 3822',
  'NPG 67 Toner Magenta',
  1,
  'IT Department',
  'Transit Office 1st Floor',
  'Darryl Pereira'),
 (23,
  '6-5-26 17:05:54',
  '6-5-26 17:08:16',
  'Canon 3822',
  'NPG 67 Toner Yellow',
  1,
  'datta kshirsagar',
  'Transit Office 1st Floor',
  'Santosh'),
 (24,
  '6-10-26 14:20:37',
  '6-10-26 14:22:43',
  'Canon MF645C',
  'Canon 054 Black',
  1,
  'Milind Anchekar',
  'Transit Office 1st Floor',
  'Santosh Sonkawade'),
 (25,
  '6-10-26 14:20:37',
  '6-10-26 14:22:43',
  'Canon MF645C',
  'Canon 054 Yellow',
  1,
  'Milind Anchekar',
  'Transit Office 1st Floor',
  'Santosh Sonkawade'),
 (26,
  '6-10-26 14:20:37',
  '6-10-26 14:22:43',
  'Canon MF645C',
  'Canon 054 Magenta',
  1,
  'Milind Anchekar',
  'Transit Office 1st Floor',
  'Santosh Sonkawade'),
 (27,
  '6-10-26 14:20:37',
  '6-10-26 14:22:43',
  'Canon MF645C',
  'Canon 054 Cyan',
  1,
  'Milind Anchekar',
  'Transit Office 1st Floor',
  'Santosh Sonkawade'),
 (28,
  '6-11-26 10:23:51',
  '6-11-26 10:25:15',
  'Canon 3822',
  'NPG 67 Drum Unit',
  1,
  'IT Department',
  'Transit Office 1st Floor',
  'Piyush Pandey'),
 (29,
  '6-15-26 12:49:47',
  '6-15-26 12:51:38',
  'Canon 3822',
  'NPG 67 Toner Black',
  1,
  'Bhagwan More',
  'Transit Office Grd Floor',
  'Santosh Sonkawade'),
 (30,
  '6-17-26 10:32:53',
  '6-17-26 10:34:31',
  'Canon 3822',
  'NPG 67 Drum Unit',
  1,
  'Sanjay Andani',
  'Transit Office Grd Floor',
  'Piyush Pandey'),
 (31,
  '6-17-26 10:32:53',
  '6-17-26 10:34:31',
  'Canon 3822',
  'NPG 67 Drum Unit',
  1,
  'Sanjay Andani',
  'Transit Office Grd Floor',
  'Piyush Pandey'),
 (32,
  '6-17-26 14:38:34',
  '6-17-26 14:42:11',
  'Canon 3922',
  'NPG 88 Toner Cyan',
  1,
  'keutika Hirendra Patil',
  'Hallmark Plaza 2nd Floor',
  'Shaikh mohd hussain'),
 (33,
  '6-17-26 14:38:34',
  '6-17-26 14:42:11',
  'Canon 3922',
  'NPG 88 Toner Yellow',
  1,
  'keutika Hirendra Patil',
  'Hallmark Plaza 2nd Floor',
  'Shaikh mohd hussain'),
 (34,
  '6-23-26 19:40:47',
  '6-23-26 19:42:23',
  'Canon 3822',
  'NPG 67 Toner Magenta',
  1,
  'Datta',
  'Transit Office Grd Floor',
  'Santosh'),
 (35,
  '6-30-26 11:54:42',
  '6-30-26 12:16:31',
  'Canon 3822',
  'NPG 67 Toner Cyan',
  1,
  'DATTA KSHIRSAGAR',
  'Transit Office Grd Floor',
  'Santosh'),
 (36,
  '6-30-26 11:54:42',
  '6-30-26 12:16:31',
  'Canon 3822',
  'NPG 67 Toner Yellow',
  1,
  'DATTA KSHIRSAGAR',
  'Transit Office Grd Floor',
  'Santosh'),
 (37,
  '6-30-26 14:31:40',
  '6-30-26 14:34:54',
  'Canon 3822',
  'NPG 67 Toner Cyan',
  1,
  'DATTA KSHIRSAGAR',
  'Transit Office Grd Floor',
  'Santosh'),
 (38,
  '6-30-26 14:31:40',
  '6-30-26 14:34:54',
  'Canon 3822',
  'NPG 67 Toner Yellow',
  1,
  'DATTA KSHIRSAGAR',
  'Transit Office Grd Floor',
  'Santosh'),
 (39,
  '7-6-26 16:35:22',
  '7-6-26 16:37:11',
  'Canon 3922',
  'NPG 88 Toner Black',
  1,
  'Sandeep Bapat',
  'MMRCL GC 1st Floor',
  'Santosh sonkawade'),
 (40,
  '7-7-26 11:20:28',
  '7-7-26 11:23:44',
  'Canon 3822',
  'NPG 67 Drum Unit',
  1,
  'Preeta Nair',
  'Transit Office Grd Floor',
  'Piyush Pandey'),
 (41,
  '7-17-26 9:31:12',
  '7-17-26 9:34:20',
  'Canon 3922',
  'NPG 88 Toner Black',
  1,
  'Vipul agrawal',
  'Hallmark Plaza 2nd Floor',
  'Shaikh mohd hussain'),
 (42,
  '7-17-26 11:52:06',
  '7-17-26 11:54:51',
  'Canon 3822',
  'NPG 67 Toner Cyan',
  1,
  'Datta Kshirsagar',
  'Transit Office 1st Floor',
  'Piyush Pandey'),
 (43,
  '7-17-26 11:52:06',
  '7-17-26 11:54:51',
  'Canon 3822',
  'NPG 67 Toner Black',
  1,
  'Datta Kshirsagar',
  'Transit Office 1st Floor',
  'Piyush Pandey'),
 (44,
  '7-17-26 16:12:48',
  '7-17-26 16:14:07',
  'Canon 3922',
  'NPG 88 Drum Unit',
  1,
  'Afreen shaikh',
  'MMRCL GC 1st Floor',
  'Santosh sonkawade'),
 (45,
  '7-20-26 10:42:01',
  '7-20-26 10:45:39',
  'Canon 3822',
  'NPG 67 Toner Black',
  1,
  'Avinash Mandavkar',
  'Transit Office Grd Floor',
  'Santosh Sonkawade'),
 (46,
  '7-20-26 13:10:55',
  '7-20-26 13:13:16',
  'Canon 3010',
  'Canon Cartridge 925',
  1,
  'Paras Kamble',
  'Transit Office 1st Floor',
  'Piyush Pandey'),
 (47,
  '7-21-26 14:17:52',
  '7-21-26 14:19:54',
  'Canon 3822',
  'NPG 67 Toner Cyan',
  1,
  'Datta Kshirsagar',
  'Transit Office 1st Floor',
  'Santosh Sonkawade'),
 (48,
  '7-23-26 11:16:07',
  '7-23-26 11:18:10',
  'Canon 3822',
  'NPG 67 Toner Magenta',
  1,
  'Datta',
  'Transit Office Grd Floor',
  'Shaikh mo Hussain'),
 (49,
  '7-23-26 11:16:07',
  '7-23-26 11:18:10',
  'Canon 3822',
  'NPG 67 Toner Cyan',
  1,
  'Datta',
  'Transit Office Grd Floor',
  'Shaikh mo Hussain'),
 (50,
  '7-27-26 10:47:19',
  '7-27-26 10:48:20',
  'Canon 3822',
  'NPG 67 Toner Black',
  1,
  'DattanSudam Kshirsagar',
  'Transit Office 1st Floor',
  'Santosh'),
 (51,
  '7-27-26 14:06:38',
  '7-27-26 14:09:12',
  'Canon 3822',
  'NPG 67 Toner Magenta',
  1,
  'Abhiraj Dabare',
  'Transit Office 1st Floor',
  'Santosh Sonkawade'),
 (52,
  '7-27-26 17:50:54',
  '7-27-26 17:59:39',
  'HP LaserJet Pro MFP M128fN',
  'HP 88X Black Cartridge',
  1,
  'Preeta Nair',
  'Transit Office Grd Floor',
  'Santosh Sonkawade'),
 (53,
  '7-30-26 10:19:06',
  '7-30-26 10:20:56',
  'Canon 3822',
  'NPG 67 Toner Yellow',
  1,
  'Jyoti Nair',
  'Transit Office 1st Floor',
  'Piyush Pandey'),
 (54,
  '7-30-26 10:32:00',
  '7-30-26 10:38:17',
  'Canon 3010',
  'Canon Cartridge 925',
  1,
  'Pranjal Chavan',
  'Transit Office 1st Floor',
  'Piyush Pandey'),
 (55,
  '7-30-26 17:31:42',
  '7-30-26 17:33:03',
  'Canon 3822',
  'NPG 67 Toner Black',
  1,
  'Preeta Nair',
  'Transit Office Grd Floor',
  'Md Hussain'),
 (56,
  '8-20-26 12:21:36',
  '8-20-26 12:23:54',
  'Canon 3822',
  'NPG 67 Toner Cyan',
  1,
  'Abhiraj Dabare',
  'Transit Office 1st Floor',
  'Shaikh mohd hussain'),
 (57,
  '8-24-26 11:54:57',
  '8-24-26 11:56:35',
  'Canon 3922',
  'NPG 88 Toner Black',
  1,
  'Rashmi Kadam',
  'MMRCL GC 1st Floor',
  'Santosh Sonkawade'),
 (58,
  '8-25-26 17:11:03',
  '8-25-26 17:16:00',
  'Canon 3922',
  'NPG 88 Toner Cyan',
  1,
  'Madhuri Jawale',
  'MMRCL GC 1st Floor',
  'santosh Sonkawade'),
 (59,
  '8-25-26 17:11:03',
  '8-25-26 17:16:00',
  'Canon 3922',
  'NPG 88 Toner Yellow',
  1,
  'Madhuri Jawale',
  'MMRCL GC 1st Floor',
  'santosh Sonkawade'),
 (60,
  '9-1-26 16:43:03',
  '9-1-26 16:44:34',
  'Canon 3822',
  'NPG 67 Toner Black',
  1,
  'Mitali More',
  'Transit Office 1st Floor',
  'Piyush Pandey'),
 (61,
  '9-3-26 15:52:03',
  '9-3-26 15:54:05',
  'Canon 3822',
  'NPG 67 Toner Magenta',
  1,
  'Datta Kshirsagar',
  'Transit Office 1st Floor',
  'Piyush Pandey'),
 (62,
  '9-3-26 15:54:21',
  '9-3-26 15:57:07',
  'Canon MF645C',
  'Canon 054 Black',
  1,
  'Vivek Bharambe',
  'Transit Office 1st Floor',
  'Piyush Pandey'),
 (63,
  '9-3-26 15:54:21',
  '9-3-26 15:57:07',
  'Canon MF645C',
  'Canon 054 Cyan',
  1,
  'Vivek Bharambe',
  'Transit Office 1st Floor',
  'Piyush Pandey'),
 (64,
  '9-3-26 15:54:21',
  '9-3-26 15:57:07',
  'Canon MF645C',
  'Canon 054 Magenta',
  1,
  'Vivek Bharambe',
  'Transit Office 1st Floor',
  'Piyush Pandey'),
 (65,
  '9-3-26 15:54:21',
  '9-3-26 15:57:07',
  'Canon MF645C',
  'Canon 054 Yellow',
  1,
  'Vivek Bharambe',
  'Transit Office 1st Floor',
  'Piyush Pandey'),
 (66,
  '9-4-26 15:08:55',
  '9-4-26 15:09:49',
  'HP Officejet Pro 8610 E-All in One',
  'HP 950XL Black',
  1,
  'Neeraj Kankal',
  'Transit Office 1st Floor',
  'Santosh Sonkawade'),
 (67,
  '9-4-26 15:08:55',
  '9-4-26 15:09:49',
  'HP Officejet Pro 8610 E-All in One',
  'HP 951XL Magenta',
  1,
  'Neeraj Kankal',
  'Transit Office 1st Floor',
  'Santosh Sonkawade')]


# Source-data typos, corrected by historical issue id.
#   #2  : "Canon 3922" with an NPG 67 cartridge (NPG 67 belongs to the 3822;
#         the 3922 uses NPG 88).
#   #10 : the cartridge name "NPG-67" was typed in the printer-model column;
#         it is an NPG 67 drum unit for the Canon 3822 on the Grd Floor.
PRINTER_MODEL_CORRECTIONS = {
    2: "Canon 3822",
    10: "Canon 3822",
}

ISSUE_ROWS = [
    (r[0], r[1], r[2], PRINTER_MODEL_CORRECTIONS.get(r[0], r[3]), *r[4:])
    for r in ISSUE_ROWS
]

UNKNOWN_ENGINEER = "Unknown Engineer"

# Engineer records that are created (see _canonical_engineer).
CONFIRMED_ENGINEERS = (
    "Hussain shaikh",
    "Santosh Sonkawade",
    "Piyush Pandey",
    "Darryl Pereira",
    UNKNOWN_ENGINEER,
)


def _norm(value: str | None) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", value.replace("\u00a0", " ").strip()).casefold()


def _parse_dt(value: str) -> datetime:
    value = re.sub(r"\s+", " ", value.strip())
    return datetime.strptime(value, "%m-%d-%y %H:%M:%S")


def _canonical_printer_model(value: str) -> str:
    """Normalize only the printer model correction explicitly confirmed."""
    value = re.sub(r"\s+", " ", value.replace("\u00a0", " ").strip())

    if _norm(value) == _norm("Canon MF645C"):
        return "Canon MF 645CX"

    return value


def _canonical_engineer(value: str | None) -> str:
    """Map historical spelling/name variants to the engineer records."""
    n = _norm(value)

    if not n:
        return UNKNOWN_ENGINEER

    if n == _norm("Piyush Pandey"):
        return "Piyush Pandey"

    santosh_variants = {
        _norm("Santosh"),
        _norm("santosh"),
        _norm("Santosh Sonkawade"),
        _norm("Santosh sonkawade"),
        _norm("santosh Sonkawade"),
        _norm("santosh sonkawade"),
    }
    if n in santosh_variants:
        return "Santosh Sonkawade"

    hussain_variants = {
        _norm("Hussain"),
        _norm("Hussain shaikh"),
        _norm("Hussain Shaikh"),
        _norm("Shaikh mohd hussain"),
        _norm("Shaikh mo Hussain"),
        _norm("Md Hussain"),
    }
    if n in hussain_variants:
        return "Hussain shaikh"

    if n == _norm("Darryl Pereira"):
        return "Darryl Pereira"

    # Any other unrecognised name is not silently reassigned to another
    # engineer; fail loudly so it can be reviewed.
    raise RuntimeError(f"Unrecognised engineer name in source data: {value!r}")


def _find_import_user(connection) -> int:
    """Use an existing active login account for required request audit fields."""
    row = connection.execute(
        sa.text(
            """
            SELECT id
            FROM users
            WHERE is_active = TRUE
            ORDER BY id
            LIMIT 1
            """
        )
    ).first()

    if not row:
        raise RuntimeError(
            "No active users row exists. Historical cartridge_requests require "
            "requester_id/approved_by to reference an existing users.id."
        )

    return int(row[0])


def upgrade() -> None:
    bind = op.get_bind()

    # Validate all source data before deleting existing cartridge-management
    # data. The migration preserves users/refresh_tokens.
    if len(ISSUE_ROWS) != 67:
        raise RuntimeError(
            f"Expected 67 historical issue rows, found {len(ISSUE_ROWS)}."
        )

    # Build the complete replacement dataset in memory first.
    source_locations = []
    source_location_keys = set()

    printers = []
    printer_keys = set()

    employees = []
    employee_keys = set()

    for row in ISSUE_ROWS:
        issue_id, start_time, completion_time, raw_model, raw_cart, qty, employee_name, location_name, engineer_name = row

        location_name = re.sub(r"\s+", " ", location_name.strip())
        location_key = _norm(location_name)
        if location_key not in source_location_keys:
            source_location_keys.add(location_key)
            source_locations.append(location_name)

        employee_name = re.sub(r"\s+", " ", employee_name.strip())
        employee_key = _norm(employee_name)
        if employee_key and employee_key not in employee_keys:
            employee_keys.add(employee_key)
            employees.append(employee_name)

        printer_model = _canonical_printer_model(raw_model)
        printer_key = (_norm(printer_model), location_key)
        if printer_key not in printer_keys:
            printer_keys.add(printer_key)
            printers.append((printer_model, location_name))

    # Engineers are fixed to the three names confirmed by the user.
    engineer_names_in_source = set()
    for row in ISSUE_ROWS:
        canonical = _canonical_engineer(row[8])
        if canonical:
            engineer_names_in_source.add(canonical)

    # ------------------------------------------------------------------
    # 1. Clear replacement data.
    # ------------------------------------------------------------------
    # users and refresh_tokens are intentionally preserved.
    #
    # Delete children before parents because the existing schema uses
    # RESTRICT foreign keys.
    bind.execute(sa.text("DELETE FROM stock_movements"))
    bind.execute(sa.text("DELETE FROM inventory"))
    bind.execute(sa.text("DELETE FROM cartridge_issues"))
    bind.execute(sa.text("DELETE FROM cartridge_requests"))
    bind.execute(sa.text("DELETE FROM printer_assignments"))
    bind.execute(sa.text("DELETE FROM cartridges"))
    bind.execute(sa.text("DELETE FROM printers"))
    bind.execute(sa.text("DELETE FROM employees"))
    bind.execute(sa.text("DELETE FROM engineers"))
    bind.execute(sa.text("DELETE FROM locations"))

    # ------------------------------------------------------------------
    # 2. Locations.
    # ------------------------------------------------------------------
    location_id: dict[str, int] = {}

    for location_name in source_locations:
        new_id = bind.execute(
            sa.text(
                """
                INSERT INTO locations (name, is_active)
                VALUES (:name, TRUE)
                RETURNING id
                """
            ),
            {"name": location_name},
        ).scalar_one()

        location_id[_norm(location_name)] = int(new_id)

    # ------------------------------------------------------------------
    # 3. Employees from the historical issue log.
    # ------------------------------------------------------------------
    employee_id: dict[str, int] = {}

    for index, employee_name in enumerate(employees, start=1):
        new_id = bind.execute(
            sa.text(
                """
                INSERT INTO employees
                    (employee_id, name, department, is_active)
                VALUES
                    (:employee_id, :name, NULL, TRUE)
                RETURNING id
                """
            ),
            {
                "employee_id": f"EMP-IMP-{index:03d}",
                "name": employee_name,
            },
        ).scalar_one()

        employee_id[_norm(employee_name)] = int(new_id)

    # ------------------------------------------------------------------
    # 4. Engineers.
    # ------------------------------------------------------------------
    engineer_id: dict[str, int] = {}

    for index, engineer_name in enumerate(CONFIRMED_ENGINEERS, start=1):
        new_id = bind.execute(
            sa.text(
                """
                INSERT INTO engineers
                    (employee_id, name, is_active)
                VALUES
                    (:employee_id, :name, TRUE)
                RETURNING id
                """
            ),
            {
                "employee_id": f"ENG-IMP-{index:03d}",
                "name": engineer_name,
            },
        ).scalar_one()

        engineer_id[_norm(engineer_name)] = int(new_id)

    # ------------------------------------------------------------------
    # 5. Printers.
    # ------------------------------------------------------------------
    # No serial number is required. A printer is uniquely represented here by
    # model + location, exactly as requested for the historical data.
    printer_id_by_key: dict[tuple[str, str], int] = {}

    for printer_model, location_name in printers:
        new_id = bind.execute(
            sa.text(
                """
                INSERT INTO printers
                    (model, serial_number, department, location_id, is_active)
                VALUES
                    (:model, NULL, NULL, :location_id, TRUE)
                RETURNING id
                """
            ),
            {
                "model": printer_model,
                "location_id": location_id[_norm(location_name)],
            },
        ).scalar_one()

        printer_id_by_key[
            (_norm(printer_model), _norm(location_name))
        ] = int(new_id)

    # ------------------------------------------------------------------
    # 6. Cartridges.
    # ------------------------------------------------------------------
    # IMPORTANT:
    #   The complete source description stays in cartridges.model.
    #   Example: "NPG 67 Toner Black", "NPG 67 Drum Unit",
    #   "Canon 054 Cyan".
    #
    # The existing DB schema contains a color column, so it is populated with
    # "N/A" for every imported historical cartridge. No colour is split out.
    cartridge_id_by_key: dict[tuple[int, str], int] = {}

    for row in ISSUE_ROWS:
        issue_id, start_time, completion_time, raw_model, raw_cart, qty, employee_name, location_name, engineer_name = row

        printer_model = _canonical_printer_model(raw_model)
        printer_key = (_norm(printer_model), _norm(location_name))
        printer_id = printer_id_by_key[printer_key]

        cartridge_model = re.sub(
            r"\s+",
            " ",
            raw_cart.replace("\u00a0", " ").strip(),
        )
        cartridge_key = (printer_id, _norm(cartridge_model))

        if cartridge_key in cartridge_id_by_key:
            continue

        new_id = bind.execute(
            sa.text(
                """
                INSERT INTO cartridges
                    (model, color, printer_id, reorder_level, is_active)
                VALUES
                    (:model, 'N/A', :printer_id, 10, TRUE)
                RETURNING id
                """
            ),
            {
                "model": cartridge_model,
                "printer_id": printer_id,
            },
        ).scalar_one()

        cartridge_id_by_key[cartridge_key] = int(new_id)

    # ------------------------------------------------------------------
    # 7. Inventory.
    # ------------------------------------------------------------------
    # Historical issue data does not tell us the current quantity on hand.
    # Start every imported cartridge at zero rather than inventing stock.
    for cartridge_id in cartridge_id_by_key.values():
        bind.execute(
            sa.text(
                """
                INSERT INTO inventory (cartridge_id, quantity)
                VALUES (:cartridge_id, 0)
                """
            ),
            {"cartridge_id": cartridge_id},
        )

    # ------------------------------------------------------------------
    # 8. Historical requests + issues.
    # ------------------------------------------------------------------
    import_user_id = _find_import_user(bind)

    for row in ISSUE_ROWS:
        (
            issue_id,
            start_time,
            completion_time,
            raw_model,
            raw_cart,
            qty,
            employee_name,
            location_name,
            engineer_name,
        ) = row

        printer_model = _canonical_printer_model(raw_model)
        printer_key = (_norm(printer_model), _norm(location_name))
        printer_id = printer_id_by_key[printer_key]

        cartridge_model = re.sub(
            r"\s+",
            " ",
            raw_cart.replace("\u00a0", " ").strip(),
        )
        cartridge_key = (printer_id, _norm(cartridge_model))
        cartridge_id = cartridge_id_by_key[cartridge_key]

        employee_fk = employee_id[_norm(employee_name)]
        canonical_engineer = _canonical_engineer(engineer_name)
        engineer_fk = (
            engineer_id[_norm(canonical_engineer)]
            if canonical_engineer
            else None
        )

        start_dt = _parse_dt(start_time)
        completion_dt = _parse_dt(completion_time)

        request_id = bind.execute(
            sa.text(
                """
                INSERT INTO cartridge_requests
                    (
                        requester_id,
                        location_id,
                        engineer_id,
                        printer_id,
                        cartridge_id,
                        quantity,
                        status,
                        requested_date,
                        remarks,
                        rejection_reason,
                        approved_by,
                        approved_at
                    )
                VALUES
                    (
                        :requester_id,
                        :location_id,
                        :engineer_id,
                        :printer_id,
                        :cartridge_id,
                        :quantity,
                        'INSTALLED',
                        :requested_date,
                        :remarks,
                        NULL,
                        :approved_by,
                        :approved_at
                    )
                RETURNING id
                """
            ),
            {
                "requester_id": import_user_id,
                "location_id": location_id[_norm(location_name)],
                "engineer_id": engineer_fk,
                "printer_id": printer_id,
                "cartridge_id": cartridge_id,
                "quantity": int(qty),
                "requested_date": start_dt,
                "remarks": f"Imported historical issue ID {issue_id}",
                "approved_by": import_user_id,
                "approved_at": completion_dt,
            },
        ).scalar_one()

        bind.execute(
            sa.text(
                """
                INSERT INTO cartridge_issues
                    (
                        request_id,
                        employee_id,
                        location_id,
                        engineer_id,
                        printer_id,
                        cartridge_id,
                        quantity,
                        issue_date,
                        remarks
                    )
                VALUES
                    (
                        :request_id,
                        :employee_id,
                        :location_id,
                        :engineer_id,
                        :printer_id,
                        :cartridge_id,
                        :quantity,
                        :issue_date,
                        :remarks
                    )
                """
            ),
            {
                "request_id": int(request_id),
                "employee_id": employee_fk,
                "location_id": location_id[_norm(location_name)],
                "engineer_id": engineer_fk,
                "printer_id": printer_id,
                "cartridge_id": cartridge_id,
                "quantity": int(qty),
                "issue_date": start_dt.date(),
                "remarks": (
                    f"Imported historical issue ID {issue_id}; "
                    f"completed {completion_dt.isoformat(sep=' ')}"
                ),
            },
        )


def downgrade() -> None:
    # This migration intentionally replaces source data. Restoring the previous
    # contents is not possible without a database backup/snapshot.
    raise RuntimeError(
        "20260923_replace_mmrcl_data is irreversible. Restore the database "
        "from a backup/snapshot to recover the previous data."
    )