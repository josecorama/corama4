import pytest
from PIL import Image, ImageDraw
from PyPDF2 import PdfReader

import pdf_class
from pdf_class import create_pdf


TEMPLATES = ("default", "modern", "corporate", "banded", "rail", "product")


def _write_image(path, size, colors):
    image = Image.new("RGB", size, colors[0])
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, size[1] // 2, size[0], size[1]), fill=colors[1])
    draw.ellipse((size[0] // 3, size[1] // 4, size[0] * 2 // 3, size[1] * 3 // 4),
                 fill=colors[2])
    image.save(path)


@pytest.fixture
def datasets(tmp_path):
    logo = tmp_path / "logo.png"
    hero = tmp_path / "hero.png"
    badge = tmp_path / "iso.png"
    _write_image(logo, (480, 180), ("#163f62", "#68b9ba", "#ffffff"))
    _write_image(hero, (1200, 500), ("#476d8f", "#b9d9d5", "#f0c36a"))
    _write_image(badge, (120, 120), ("#f2f2f2", "#163f62", "#68b9ba"))

    full = {
        "company_name": "Northstar Infrastructure Group",
        "logo_color": [(24, 74, 108), (82, 175, 174)],
        "logo_path": str(logo),
        "image_path": str(hero),
        "uei_code": "K8M4N2P6Q7R1",
        "cage_code": "7A2B9",
        "contact_name": "Jordan Lee",
        "contact_title": "Director of Capture",
        "contact_phone": "(319) 555-0182",
        "contact_email": "jordan.lee@example.com",
        "contact_address": "4450 Veterans Highway South",
        "city": "Cedar Rapids",
        "state": "IA",
        "zip": "52404",
        "contact_website": "www.northstar.example",
        "company_description": (
            "Northstar Infrastructure Group delivers resilient facilities, systems "
            "integration, and lifecycle support for public and private clients."
        ),
        "differentiators": [
            "Certified project teams with disciplined delivery controls",
            "Transparent reporting and responsive stakeholder coordination",
            "Safety-first execution across complex operating environments",
        ],
        "naics_codes": ["236220", "237110", "238210", "541512"],
        "core_competencies": [
            "Program and construction management",
            "Enterprise systems integration",
            "Facilities modernization and maintenance",
            "Data center and network infrastructure",
        ],
        "certifications": ["ISO 9001:2015", "WOSB", "Small Business"],
        "private_performance": [
            "State facilities modernization program - prime contractor, 2022-present.",
            "Regional network integration effort - delivery partner, 2021-2023.",
            "Federal maintenance support task order - subcontractor, 2020-2022.",
        ],
    }
    long = dict(full)
    long.update({
        "company_description": " ".join(
            ["Northstar provides integrated capabilities and measurable outcomes."] * 180
        ),
        "differentiators": ["Differentiator item %02d with supporting detail." % i for i in range(35)],
        "core_competencies": ["Core competency %02d and delivery specialty." % i for i in range(35)],
        "private_performance": ["Past performance entry %02d with customer and scope details." % i for i in range(35)],
        "naics_codes": ["%06d" % (236000 + i) for i in range(40)],
        "certifications": ["Certification %02d" % i for i in range(20)],
    })
    minimal = {
        "company_name": "Minimal Example",
        "logo_color": [(24, 74, 108), (82, 175, 174)],
        "logo_path": str(tmp_path / "missing-logo.png"),
        "image_path": str(tmp_path / "missing-hero.png"),
    }
    return full, long, minimal, badge


def test_all_capability_templates_are_single_page(datasets, tmp_path, monkeypatch):
    full, long, minimal, badge = datasets
    monkeypatch.setitem(pdf_class.CERT_BADGES, "ISO 9001", str(badge))

    for dataset_name, data in (("full", full), ("long", long), ("minimal", minimal)):
        for template in TEMPLATES:
            output = tmp_path / ("%s-%s.pdf" % (dataset_name, template))
            create_pdf(data, str(output), template=template)
            assert output.exists()
            assert output.stat().st_size > 0
            assert len(PdfReader(str(output)).pages) == 1
