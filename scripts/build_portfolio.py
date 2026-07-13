#!/usr/bin/env python3
"""Build Olympus' static portfolio manifest and optimized Drive thumbnails."""

from __future__ import annotations

import argparse
import json
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from PIL import Image, ImageOps


SOURCE_META = {
    "root": ("film", "Interviews & Corporate Film"),
    "birthday": ("events", "Celebrations & Events"),
    "certificate": ("editorial", "Credentials"),
    "conferences": ("events", "Conference Coverage"),
    "magazine": ("editorial", "Magazine Design"),
    "motion": ("motion", "Motion Design"),
    "election": ("graphics", "Election Campaigns"),
    "fasa-week": ("graphics", "FASA Week"),
    "flp-posters": ("graphics", "Formline Picks"),
    "general-posters": ("graphics", "General Posters"),
    "jc-week": ("graphics", "Judicial Council Week"),
    "sports-posters": ("graphics", "Sports Posters"),
    "ulaps-sports-week": ("graphics", "ULAPS Sports Week"),
    "caprisun-party": ("graphics", "Caprisun Party"),
    "slur-party": ("graphics", "SLUR Party"),
    "steeze-in-the-city": ("graphics", "Steeze in the City"),
}

VIDEO_EXTENSIONS = {".mov", ".mp4", ".m4v", ".webm"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def humanize(filename: str) -> str:
    title = Path(filename).stem
    title = re.sub(r"[_\[\]()]+", " ", title)
    title = re.sub(r"\s+", " ", title).strip(" -")
    return title or filename


def item_year(lines: list[str]) -> str:
    joined = " ".join(lines)
    match = re.search(r"\b(20\d{2})\b", joined)
    return match.group(1) if match else "2026"


def file_kind(filename: str) -> str | None:
    suffix = Path(filename).suffix.lower()
    if suffix in VIDEO_EXTENSIONS:
        return "video"
    if suffix == ".pdf":
        return "pdf"
    if suffix in IMAGE_EXTENSIONS:
        return "image"
    return None


def download_thumbnail(item: dict, output_dir: Path) -> tuple[str, str | None]:
    output = output_dir / f"{item['id']}.webp"
    if output.exists():
        return item["id"], output.as_posix()

    url = f"https://drive.google.com/thumbnail?id={item['id']}&sz=w1200"
    request = Request(url, headers={"User-Agent": "Mozilla/5.0 OlympusPortfolio/1.0"})
    try:
        data = urlopen(request, timeout=35).read()
        image = Image.open(BytesIO(data))
        image = ImageOps.exif_transpose(image).convert("RGB")
        image.thumbnail((1200, 1440), Image.Resampling.LANCZOS)
        image.save(output, "WEBP", quality=78, method=6)
        return item["id"], output.as_posix()
    except (HTTPError, URLError, OSError, ValueError):
        return item["id"], None


def build_items(inventory: list[dict]) -> list[dict]:
    items: list[dict] = []
    for source in inventory:
        source_name = source.get("source")
        if source_name not in SOURCE_META:
            continue
        category, collection = SOURCE_META[source_name]
        for raw in source.get("items", []):
            lines = raw.get("lines") or []
            if not lines:
                continue
            filename = lines[0].strip()
            media_type = file_kind(filename)
            if media_type is None:
                continue
            drive_id = raw["id"]
            items.append(
                {
                    "id": drive_id,
                    "title": humanize(filename),
                    "category": category,
                    "collection": collection,
                    "mediaType": media_type,
                    "thumbnailSrc": f"assets/portfolio/{drive_id}.webp",
                    "previewSrc": None,
                    "originalUrl": f"https://drive.google.com/file/d/{drive_id}/view",
                    "alt": f"{humanize(filename)} — {collection} by Olympus Studio",
                    "year": item_year(lines),
                    "featured": False,
                }
            )
    return items


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("inventory", type=Path)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    args = parser.parse_args()

    root = args.root.resolve()
    portfolio_dir = root / "assets" / "portfolio"
    portfolio_dir.mkdir(parents=True, exist_ok=True)
    inventory = json.loads(args.inventory.read_text(encoding="utf-8"))
    drive_items = build_items(inventory)

    successes: dict[str, str | None] = {}
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(download_thumbnail, item, portfolio_dir): item for item in drive_items}
        for index, future in enumerate(as_completed(futures), start=1):
            drive_id, path = future.result()
            successes[drive_id] = path
            if index % 25 == 0 or index == len(futures):
                print(f"processed {index}/{len(futures)} thumbnails", file=sys.stderr)

    for item in drive_items:
        if not successes.get(item["id"]):
            item["thumbnailSrc"] = "assets/portfolio-fallback.svg"

    # Use four distinct public Drive films from the conference green carpet.
    local_video_items = [
        {
            "id": "1xOWqFVhUX5DXtpUGuhOxdA_pxGL2ZnNO",
            "title": "Chuks Ezimadu - Green Carpet Interview",
            "category": "events",
            "collection": "CIoD Conference Green Carpet",
            "mediaType": "video",
            "thumbnailSrc": "assets/portfolio/1xOWqFVhUX5DXtpUGuhOxdA_pxGL2ZnNO.webp",
            "previewSrc": None,
            "originalUrl": "https://drive.google.com/file/d/1xOWqFVhUX5DXtpUGuhOxdA_pxGL2ZnNO/view",
            "alt": "Chuks Ezimadu speaking during a CIoD conference green carpet interview",
            "year": "2025",
            "featured": True,
        },
        {
            "id": "1xv2SiAylmGIp9SgiRlK_pQ_zv-enBjoU",
            "title": "Franca Eqwuekwe - Green Carpet Interview",
            "category": "events",
            "collection": "CIoD Conference Green Carpet",
            "mediaType": "video",
            "thumbnailSrc": "assets/portfolio/1xv2SiAylmGIp9SgiRlK_pQ_zv-enBjoU.webp",
            "previewSrc": None,
            "originalUrl": "https://drive.google.com/file/d/1xv2SiAylmGIp9SgiRlK_pQ_zv-enBjoU/view",
            "alt": "Franca Eqwuekwe in conversation during a CIoD conference green carpet interview",
            "year": "2025",
            "featured": False,
        },
        {
            "id": "1Af5MhIV-76LJdx106s1RLbSWBu9H4lrR",
            "title": "Olukemi Peter - Green Carpet Interview",
            "category": "events",
            "collection": "CIoD Conference Green Carpet",
            "mediaType": "video",
            "thumbnailSrc": "assets/portfolio/1Af5MhIV-76LJdx106s1RLbSWBu9H4lrR.webp",
            "previewSrc": None,
            "originalUrl": "https://drive.google.com/file/d/1Af5MhIV-76LJdx106s1RLbSWBu9H4lrR/view",
            "alt": "Olukemi Peter speaking during a CIoD conference green carpet interview",
            "year": "2025",
            "featured": False,
        },
        {
            "id": "1UWRIR8lmqtK_068iXv5AqqaowjnUjDNO",
            "title": "Oladipo Sadibo - Green Carpet Interview",
            "category": "events",
            "collection": "CIoD Conference Green Carpet",
            "mediaType": "video",
            "thumbnailSrc": "assets/portfolio/1UWRIR8lmqtK_068iXv5AqqaowjnUjDNO.webp",
            "previewSrc": None,
            "originalUrl": "https://drive.google.com/file/d/1UWRIR8lmqtK_068iXv5AqqaowjnUjDNO/view",
            "alt": "Oladipo Sadibo speaking during a CIoD conference green carpet interview",
            "year": "2025",
            "featured": False,
        },
    ]

    magazine_previews = {
        "1L-nzRD_Q77Vcz8KTxuvTePu4K-KkLHHu": "2024",
        "15Z1Hj69nZFdDDGWbDX5_YUZ3NIBq1OUX": "2025",
        "199tVx4cR2m23wKG-JDhXe4KKuQtZixKm": "2026",
    }
    for item in drive_items:
        if item["id"] in magazine_previews:
            year = magazine_previews[item["id"]]
            item["thumbnailSrc"] = f"assets/portfolio/{item['id']}.webp"
            item["previewSrc"] = f"assets/documents/ulaps-{year}-web.pdf"
            item["downloadUrl"] = (
                f"https://drive.usercontent.google.com/download?id={item['id']}"
                "&export=download&confirm=t"
            )

    for index in [0, 1, 2, 4, 5, 8, 9, 12]:
        if index < len(drive_items):
            drive_items[index]["featured"] = True

    content = {
        "siteConfig": {
            "brandName": "Olympus Studio",
            "whatsappNumber": "2348087172313",
            "whatsappDisplay": "+234 808 717 2313",
            "email": None,
            "location": None,
            "socials": {"instagram": None, "tiktok": None, "x": None, "linkedin": None},
            "placeholders": True,
        },
        "services": [
            {"id": "photo-film", "title": "Photography & Film", "summary": "Editorial photography, interviews, event films, and polished visual stories."},
            {"id": "graphics", "title": "Graphics & Branding", "summary": "Campaign systems, posters, identity assets, and social-first visual design."},
            {"id": "editorial", "title": "Editorial & Magazine Design", "summary": "Long-form publications, magazine systems, certificates, and print-ready layouts."},
            {"id": "motion", "title": "Motion Design", "summary": "Animated brand moments, launch visuals, explainers, and digital motion assets."},
            {"id": "events", "title": "Events & Conferences", "summary": "End-to-end coverage for summits, celebrations, panels, and corporate gatherings."},
            {"id": "web", "title": "Website Design & Development", "summary": "Responsive portfolio, campaign, and business websites designed to feel distinctive and perform reliably."},
        ],
        "teamMembers": [
            {"name": "John", "role": "Creative Lead", "image": "assets/team/john.webp", "bio": "John leads Olympus Studio's creative direction, shaping cohesive concepts across film, photography, design, and editorial production."},
            {"name": "Name coming soon", "role": "Photographer", "image": "assets/team/photographer.webp", "bio": "Focused on people, events, and editorial moments with an energetic, human point of view."},
            {"name": "Name coming soon", "role": "Cinematographer / Editor / Visual Designer", "image": "assets/team/cinematographer-editor.webp", "bio": "Builds visual narratives from camera through post-production, motion, and final design delivery."},
            {"name": "Ayomide", "role": "Website Designer", "image": "assets/team/ayomide.webp", "bio": "Designs and develops responsive digital experiences that extend Olympus Studio's visual direction onto the web."},
        ],
        "socialProof": {
            "placeholder": True,
            "stats": [
                {"value": "1.2", "suffix": "M+", "label": "Media Views"},
                {"value": "240", "suffix": "+", "label": "Projects Delivered"},
                {"value": "99.8", "suffix": "%", "label": "Client Success"},
                {"value": "15", "suffix": "+", "label": "Global Awards"},
            ],
            "testimonials": [
                {"quote": "Olympus completely re-packaged our brand identity and interactive web layer.", "name": "Elena Rostova", "role": "Director, Ledge"},
                {"quote": "Their video campaign captures exactly the raw intensity of our designs.", "name": "David Miller", "role": "Brand Lead, SynthDev"},
                {"quote": "The customized campaign system increased our website conversions.", "name": "Marcus Thorne", "role": "CTO, Apex Systems"},
                {"quote": "The editorial design layouts are beautiful and command attention.", "name": "Clara Oswald", "role": "Visual Lead, Zephyr"},
                {"quote": "Their creative direction delivered a site that feels alive.", "name": "Liam Neale", "role": "Founding Partner, Vektor"},
                {"quote": "Outstanding communication and delivery timelines.", "name": "Sophia Vance", "role": "Manager, Kroma Agency"},
            ],
        },
        "filters": [
            {"id": "all", "label": "All work"},
            {"id": "film", "label": "Film"},
            {"id": "events", "label": "Events"},
            {"id": "graphics", "label": "Graphics"},
            {"id": "editorial", "label": "Editorial"},
            {"id": "motion", "label": "Motion"},
        ],
        "homeFeaturedIds": [
            "1xOWqFVhUX5DXtpUGuhOxdA_pxGL2ZnNO",
            "199tVx4cR2m23wKG-JDhXe4KKuQtZixKm",
            "1A9JkTR6Avafm3yZzqPleNlTXmql4i88-",
            "1qHAdquNAFo3xzKceDPG8qW0H8UdTwFh5",
        ],
        "portfolioItems": local_video_items + drive_items,
    }

    output = root / "content.js"
    output.write_text(
        "window.OLYMPUS_CONTENT = " + json.dumps(content, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    success_count = sum(path is not None for path in successes.values())
    print(f"wrote {output} with {len(content['portfolioItems'])} items and {success_count} Drive thumbnails")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
