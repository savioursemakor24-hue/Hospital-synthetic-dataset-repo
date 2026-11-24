import os
import re
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

MD_PATH = r"C:\Users\USER\.gemini\antigravity\scratch\hospital-classification\COMPREHENSIVE_TECHNICAL_REPORT.md"
DOCX_PATH = r"C:\Users\USER\.gemini\antigravity\scratch\hospital-classification\COMPREHENSIVE_TECHNICAL_REPORT.docx"
ARTIFACT_DOCX_PATH = r"C:\Users\USER\.gemini\antigravity\brain\6db593d1-ffa2-420d-9140-ac525ec90023\COMPREHENSIVE_TECHNICAL_REPORT.docx"

doc = docx.Document()

# Page Margins (1 inch all around)
for section in doc.sections:
    section.top_margin = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)

# Color Palette
COLOR_PRIMARY = RGBColor(27, 54, 93)     # Deep Navy
COLOR_SECONDARY = RGBColor(2, 132, 199)  # Tech Blue
COLOR_TEXT = RGBColor(30, 41, 59)        # Slate Dark
COLOR_MUTED = RGBColor(100, 116, 139)    # Muted Gray

# Set Normal Style
style_normal = doc.styles['Normal']
style_normal.font.name = 'Calibri'
style_normal.font.size = Pt(11)
style_normal.font.color.rgb = COLOR_TEXT
style_normal.paragraph_format.line_spacing = 1.15
style_normal.paragraph_format.space_after = Pt(6)

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def add_styled_heading(text, level):
    h = doc.add_heading(level=level)
    h.paragraph_format.keep_with_next = True
    run = h.add_run(text)
    run.font.name = 'Calibri'
    run.bold = True
    if level == 1:
        run.font.size = Pt(17)
        run.font.color.rgb = COLOR_PRIMARY
        h.paragraph_format.space_before = Pt(16)
        h.paragraph_format.space_after = Pt(6)
    elif level == 2:
        run.font.size = Pt(13.5)
        run.font.color.rgb = COLOR_SECONDARY
        h.paragraph_format.space_before = Pt(12)
        h.paragraph_format.space_after = Pt(4)
    elif level == 3:
        run.font.size = Pt(11.5)
        run.font.color.rgb = COLOR_PRIMARY
        h.paragraph_format.space_before = Pt(8)
        h.paragraph_format.space_after = Pt(3)
    return h

def add_formatted_paragraph(text, style='Normal', space_after=6, italic=False, bold=False):
    p = doc.add_paragraph(style=style)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    
    # Simple inline markdown parsing (**bold**, *italic*, `code`, math)
    tokens = re.split(r'(\*\*.*?\*\*|\*.*?\*|`.*?`|\$\$.*?\$\$|\$.*?\$)', text)
    for token in tokens:
        if not token:
            continue
        if token.startswith('**') and token.endswith('**'):
            r = p.add_run(token[2:-2])
            r.bold = True
        elif token.startswith('*') and token.endswith('*'):
            r = p.add_run(token[1:-1])
            r.italic = True
        elif token.startswith('`') and token.endswith('`'):
            r = p.add_run(token[1:-1])
            r.font.name = 'Consolas'
            r.font.size = Pt(10)
            r.font.color.rgb = RGBColor(14, 116, 144)
        elif token.startswith('$$') and token.endswith('$$'):
            r = p.add_run(token[2:-2])
            r.font.name = 'Cambria Math'
            r.italic = True
        elif token.startswith('$') and token.endswith('$'):
            r = p.add_run(token[1:-1])
            r.font.name = 'Cambria Math'
            r.italic = True
        else:
            r = p.add_run(token)
            if bold:
                r.bold = True
            if italic:
                r.italic = True
    return p

# Read Markdown Source
with open(MD_PATH, 'r', encoding='utf-8') as f:
    raw_lines = f.readlines()

# Title Section
title_p = doc.add_paragraph()
title_p.paragraph_format.space_before = Pt(0)
title_p.paragraph_format.space_after = Pt(4)
run_title = title_p.add_run("CardioPulse.AI: Engineering & Clinical Evaluation of a Serverless Heart Disease Classification System")
run_title.font.name = 'Calibri'
run_title.font.size = Pt(22)
run_title.bold = True
run_title.font.color.rgb = COLOR_PRIMARY

# Subtitle / Metadata
meta_p = doc.add_paragraph()
meta_p.paragraph_format.space_after = Pt(14)
meta_runs = [
    ("Technical Whitepaper & Clinical Validation Report  |  ", False, COLOR_MUTED),
    ("Live Application: ", True, COLOR_PRIMARY),
    ("https://hospital-synthetic-dataset-repo.vercel.app/\n", False, COLOR_SECONDARY),
    ("Source Repository: ", True, COLOR_PRIMARY),
    ("https://github.com/savioursemakor24-hue/Hospital-synthetic-dataset-repo  |  ", False, COLOR_SECONDARY),
    ("Date: November 2026", False, COLOR_MUTED)
]
for text, bold, color in meta_runs:
    r = meta_p.add_run(text)
    r.bold = bold
    r.font.size = Pt(10)
    r.font.color.rgb = color

# Process Body Content
in_abstract = False
abstract_lines = []
in_table = False
table_lines = []
in_code = False
code_lines = []

def process_table(lines):
    clean_rows = []
    for line in lines:
        if re.match(r'^\s*\|?\s*:?-+:?\s*\|', line):
            continue  # Separator row
        parts = [c.strip() for c in line.strip().strip('|').split('|')]
        clean_rows.append(parts)
    
    if not clean_rows:
        return

    num_cols = max(len(r) for r in clean_rows)
    table = doc.add_table(rows=len(clean_rows), cols=num_cols)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True

    for row_idx, row_data in enumerate(clean_rows):
        is_header = (row_idx == 0)
        row = table.rows[row_idx]
        trPr = row._tr.get_or_add_trPr()
        trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
        if is_header:
            trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))

        for col_idx in range(num_cols):
            cell = row.cells[col_idx]
            val = row_data[col_idx] if col_idx < len(row_data) else ""
            set_cell_margins(cell, top=120, bottom=120, left=160, right=160)
            
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.05

            clean_val = re.sub(r'\*\*(.*?)\*\*', r'\1', val)
            r = p.add_run(clean_val)
            r.font.name = 'Calibri'

            if is_header:
                set_cell_background(cell, "1B365D")  # Deep Navy
                r.bold = True
                r.font.size = Pt(10)
                r.font.color.rgb = RGBColor(255, 255, 255)
            else:
                if row_idx % 2 == 1:
                    set_cell_background(cell, "F8FAFC")  # Light Slate
                else:
                    set_cell_background(cell, "FFFFFF")
                r.font.size = Pt(9.5)
                r.font.color.rgb = COLOR_TEXT

    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_after = Pt(8)

i = 0
while i < len(raw_lines):
    line = raw_lines[i].rstrip('\r\n')
    
    # Code block detection (e.g. mermaid, bash, python)
    if line.startswith('```'):
        if in_code:
            in_code = False
            # Render code box
            code_text = "\n".join(code_lines)
            cp = doc.add_paragraph()
            cp.paragraph_format.space_before = Pt(4)
            cp.paragraph_format.space_after = Pt(8)
            cr = cp.add_run(code_text)
            cr.font.name = 'Consolas'
            cr.font.size = Pt(9)
            cr.font.color.rgb = RGBColor(30, 41, 59)
            code_lines = []
        else:
            in_code = True
            code_lines = []
        i += 1
        continue

    if in_code:
        code_lines.append(line)
        i += 1
        continue

    # Table detection
    if '|' in line and not line.startswith('#'):
        if not in_table:
            in_table = True
            table_lines = [line]
        else:
            table_lines.append(line)
        i += 1
        continue
    else:
        if in_table:
            process_table(table_lines)
            in_table = False
            table_lines = []

    # Headings
    if line.startswith('# '):
        i += 1
        continue
    elif line.startswith('## '):
        heading_text = line[3:].strip()
        add_styled_heading(heading_text, level=1)
        i += 1
        continue
    elif line.startswith('### '):
        heading_text = line[4:].strip()
        add_styled_heading(heading_text, level=2)
        i += 1
        continue
    elif line.startswith('#### '):
        heading_text = line[5:].strip()
        add_styled_heading(heading_text, level=3)
        i += 1
        continue

    # Divider line
    if line.strip() in ['---', '***']:
        i += 1
        continue

    # Empty line
    if not line.strip():
        i += 1
        continue

    # Bullet / List item
    if line.strip().startswith('- ') or line.strip().startswith('* '):
        item_text = line.strip()[2:]
        p = add_formatted_paragraph(item_text, style='List Bullet', space_after=3)
        i += 1
        continue

    # Numbered item (e.g. 1. 2.)
    num_match = re.match(r'^\s*(\d+)\.\s+(.*)$', line)
    if num_match:
        item_text = num_match.group(2)
        p = add_formatted_paragraph(f"{num_match.group(1)}. {item_text}", space_after=3)
        i += 1
        continue

    # Standard Paragraph
    add_formatted_paragraph(line)
    i += 1

if in_table:
    process_table(table_lines)

# Save Document
doc.save(DOCX_PATH)
doc.save(ARTIFACT_DOCX_PATH)
print("SUCCESS: Generated DOCX at:", DOCX_PATH)
print("File size:", os.path.getsize(DOCX_PATH), "bytes")
