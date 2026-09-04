"""arXiv paper downloader and source TeX extractor.

Provides utilities to parse arXiv URLs, download PDFs and TeX sources,
and fetch paper metadata from the arXiv Atom API.
"""

import io
import re
import tarfile
import tempfile
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from pathlib import Path


def parse_arxiv_url(url: str) -> str | None:
    """Extract arXiv ID from URL or bare ID string.

    Handles:
    - https://arxiv.org/abs/2301.12345
    - https://arxiv.org/pdf/2301.12345
    - https://arxiv.org/pdf/2301.12345v2
    - Bare ID: 2301.12345
    """
    url = url.strip()
    patterns = [
        r"arxiv\.org/(?:abs|pdf|html)/(\d{4}\.\d{4,5}(?:v\d+)?)",
        r"^(\d{4}\.\d{4,5}(?:v\d+)?)$",
    ]
    for pat in patterns:
        m = re.search(pat, url)
        if m:
            return re.sub(r"v\d+$", "", m.group(1))
    return None


def download_pdf(arxiv_id: str, dest_dir: str) -> Path | None:
    """Download PDF from arXiv. Returns path or None on failure."""
    dest = Path(dest_dir)
    dest.mkdir(parents=True, exist_ok=True)
    url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
    out_path = dest / f"{arxiv_id.replace('/', '_')}.pdf"
    try:
        urllib.request.urlretrieve(url, str(out_path))
        return out_path
    except (urllib.error.URLError, OSError):
        return None


def download_source(arxiv_id: str, dest_dir: str) -> Path | None:
    """Download source TeX from arXiv and extract .tex files.

    The source arrives as tar.gz from /e-print/. If the response is a plain
    .tex file, it is saved directly. Returns the path to the main .tex file.
    """
    dest = Path(dest_dir)
    dest.mkdir(parents=True, exist_ok=True)
    url = f"https://arxiv.org/e-print/{arxiv_id}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "paper2sim/0.1"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
            content_type = resp.headers.get("Content-Type", "")
    except (urllib.error.URLError, OSError):
        return None

    if not data:
        return None

    if b"tar" in data[:8] or content_type in ("application/gzip", "application/x-gzip", "application/x-tar"):
        return _extract_tar_gz(data, dest)
    return _save_plain_tex(data, dest)


def _extract_tar_gz(data: bytes, dest: Path) -> Path | None:
    """Extract .tex files from tar.gz bytes. Return the main .tex file."""
    tex_files: list[Path] = []
    dest_resolved = dest.resolve()
    try:
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
            for member in tar.getmembers():
                if member.isfile() and member.name.endswith(".tex"):
                    # Path traversal protection
                    member_path = (dest / member.name).resolve()
                    if not str(member_path).startswith(str(dest_resolved)):
                        continue
                    tar.extract(member, path=str(dest))
                    tex_files.append(member_path)
    except (tarfile.TarError, EOFError):
        return None
    if not tex_files:
        return None
    # Prefer main.tex, then index.tex, then alphabetical
    for candidate in ("main.tex", "index.tex", "paper.tex"):
        for f in tex_files:
            if f.name == candidate:
                return f
    return sorted(tex_files)[0]


def _save_plain_tex(data: bytes, dest: Path) -> Path | None:
    """Save raw bytes as .tex file.

    Args:
        data: Raw bytes from arXiv e-print endpoint.
        dest: Destination directory.

    Returns:
        Path to saved .tex file, or None if decoding fails.
    """
    try:
        text = data.decode("utf-8", errors="replace")
    except Exception:
        return None
    out = dest / "source.tex"
    out.write_text(text)
    return out


def get_paper_info(arxiv_id: str) -> dict | None:
    """Fetch paper metadata from the arXiv API.

    Returns dict with keys: title, authors, abstract. None on failure.
    """
    url = f"http://export.arxiv.org/api/query?id_list={arxiv_id}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "paper2sim/0.1"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            xml_data = resp.read().decode("utf-8")
    except (urllib.error.URLError, OSError):
        return None

    ns = {"atom": "http://www.w3.org/2005/Atom"}
    try:
        root = ET.fromstring(xml_data)
        entry = root.find("atom:entry", ns)
        if entry is None:
            return None
        title = entry.findtext("atom:title", "", ns).strip().replace("\n", " ")
        abstract = entry.findtext("atom:summary", "", ns).strip().replace("\n", " ")
        authors = [a.findtext("atom:name", "", ns) for a in entry.findall("atom:author", ns)]
        return {"title": title, "authors": authors, "abstract": abstract}
    except ET.ParseError:
        return None
