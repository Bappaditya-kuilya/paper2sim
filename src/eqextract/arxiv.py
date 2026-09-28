"""arXiv paper source downloader and metadata fetcher.

Slimmed port of ``paper2sim.arxiv``: stdlib only (urllib, tarfile, xml).
Fixes at port time: 15s timeouts, ~5MB download cap raising
``ValueError("too_large")``, Atom API over https. ``download_pdf`` is
dropped (``urlretrieve`` takes no timeout; e-print covers the need).
"""

import gzip
import io
import re
import tarfile
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

TIMEOUT = 15
MAX_DOWNLOAD_BYTES = 5 * 1024 * 1024
MAX_PDF_BYTES = 20 * 1024 * 1024
MAX_PDF_PAGES = 50
MAX_PDF_TEXT_CHARS = 200 * 1024
_CHUNK_SIZE = 64 * 1024
_NS = {"atom": "http://www.w3.org/2005/Atom"}


class SourceTooLarge(ValueError):
    """Response exceeded ``MAX_DOWNLOAD_BYTES`` — a normal condition, not a server fault."""


def _canonical_id(arxiv_id: str) -> str:
    """arXiv's endpoints are case-sensitive: legacy ids are canonical lowercase (hep-th/9901001)."""
    return arxiv_id.lower()


def parse_arxiv_url(url: str) -> str | None:
    """Extract arXiv ID from various URL formats.

    Handles:
    - https://arxiv.org/abs/2301.12345
    - https://arxiv.org/pdf/2301.12345
    - https://arxiv.org/pdf/2301.12345v2
    - Legacy ID: math/0211159, HEP-TH/9901001, math.GT/0309136 (bare or abs/pdf URL)
    - Bare ID: 2301.12345

    Returns the ID as typed; downstream fetches canonicalize case.
    """
    url = url.strip()
    modern = r"\d{4}\.\d{4,5}(?:v\d+)?"
    legacy = r"[A-Za-z-]+(?:\.[A-Za-z-]+)?/\d{7}(?:v\d+)?"
    patterns = [
        # (?!\d): URL form is unanchored — reject tails like .../abs/2301.123456
        rf"arxiv\.org/(?:abs|pdf|html)/({modern}|{legacy})(?!\d)",
        rf"^({modern}|{legacy})$",
    ]
    for pat in patterns:
        m = re.search(pat, url)
        if m:
            return re.sub(r"v\d+$", "", m.group(1))
    return None


def _read_url(url: str) -> tuple[bytes, str]:
    """GET a URL with timeout and size cap.

    Returns (body, content-type). Raises ``SourceTooLarge`` beyond
    ``MAX_DOWNLOAD_BYTES``; network errors propagate as ``URLError``/``OSError``.
    """
    req = urllib.request.Request(url, headers={"User-Agent": "paper2sim/0.1"})
    chunks: list[bytes] = []
    total = 0
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        content_type = resp.headers.get("Content-Type", "")
        while True:
            part = resp.read(_CHUNK_SIZE)
            if not part:
                break
            total += len(part)
            if total > MAX_DOWNLOAD_BYTES:
                raise SourceTooLarge("too_large")
            chunks.append(part)
    return b"".join(chunks), content_type


def download_source(arxiv_id: str, dest_dir: str) -> Path | None:
    """Download and extract the TeX source for an arXiv paper.

    Returns ``None`` on any network failure; propagates ``SourceTooLarge``
    so the caller can report the size cap instead of a generic outage.
    """
    dest = Path(dest_dir)
    dest.mkdir(parents=True, exist_ok=True)
    url = f"https://arxiv.org/e-print/{_canonical_id(arxiv_id)}"
    try:
        data, content_type = _read_url(url)
    except (urllib.error.URLError, OSError):
        return None

    if not data:
        return None

    if data[:2] == b"\x1f\x8b" or content_type in ("application/gzip", "application/x-gzip", "application/x-tar"):
        out = _extract_tar_gz(data, dest)
        if out is not None:
            return out
        if data[:2] == b"\x1f\x8b":
            return _gunzip_single_tex(data, dest)
    return _save_plain_tex(data, dest)


def _extract_tar_gz(data: bytes, dest: Path) -> Path | None:
    """Extract .tex files from a tar.gz archive with path traversal protection."""
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


def _gunzip_single_tex(data: bytes, dest: Path) -> Path | None:
    """Decompress a single gzipped .tex e-print, sniffing out PDF/HTML impostors."""
    try:
        raw = gzip.decompress(data)
    except (OSError, EOFError):
        return None
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        return None
    stripped = text.lstrip()
    if stripped.startswith("%PDF"):
        return None
    low = stripped[:256].lower()
    if low.startswith("<html") or low.startswith("<!doctype"):
        return None
    # ponytail: strictness costs nothing — single-file arXiv e-prints always carry \documentclass.
    if not any(
        s in text
        for s in (
            "\\documentclass",
            "\\begin{",
            "\\end{",
            "\\section",
            "\\subsection",
            "\\usepackage",
            "\\cite",
            "\\label",
            "\\ref",
            "\\eqref",
        )
    ):
        return None
    out = dest / "source.tex"
    out.write_text(text)
    return out


def _save_plain_tex(data: bytes, dest: Path) -> Path | None:
    """Save raw bytes as .tex file.

    Args:
        data: Raw bytes from arXiv e-print endpoint.
        dest: Destination directory.

    Returns:
        Path to saved .tex file, or None if decoding fails or data is empty.
    """
    if not data:
        return None
    try:
        text = data.decode("utf-8", errors="replace")
    except Exception:
        return None
    if not text.strip():
        return None
    out = dest / "source.tex"
    out.write_text(text)
    return out


def _atom_query(arxiv_id: str) -> ET.Element:
    """GET the ``id_list`` Atom feed. Raises on any fetch/parse failure."""
    url = f"https://export.arxiv.org/api/query?id_list={_canonical_id(arxiv_id)}"
    xml_bytes, _ = _read_url(url)
    return ET.fromstring(xml_bytes.decode("utf-8"))


def get_paper_info(arxiv_id: str) -> dict | None:
    """Fetch paper metadata from the arXiv Atom API.

    Best-effort: any fetch/parse failure (network, size cap, bad encoding)
    returns ``None`` rather than raising.
    """
    try:
        root = _atom_query(arxiv_id)
    except (urllib.error.URLError, OSError, ValueError, ET.ParseError):
        return None
    entry = root.find("atom:entry", _NS)
    if entry is None:
        return None
    title = entry.findtext("atom:title", "", _NS).strip().replace("\n", " ")
    abstract = entry.findtext("atom:summary", "", _NS).strip().replace("\n", " ")
    authors = [a.findtext("atom:name", "", _NS) for a in entry.findall("atom:author", _NS)]
    return {"title": title, "authors": authors, "abstract": abstract}


def atom_has_entry(arxiv_id: str) -> bool | None:
    """Verdict from the id_list query: True/False from a parsed feed, None if unanswerable.

    A parsed feed carries an entry for every id arXiv knows — zero entries, or
    arXiv's HTTP 400 for a malformed id, mean the id does not exist. Anything
    else (network, 5xx, parse) is not a verdict. Atom only knows subject-
    qualified legacy ids in bare-archive form (math.GT/0309136 → math/0309136),
    so the query drops the qualifier the way arXiv's abs pages do.
    """
    bare = re.sub(r"^([A-Za-z-]+)\.[A-Za-z-]+/", r"\1/", arxiv_id)
    try:
        root = _atom_query(bare)
    except urllib.error.HTTPError as e:
        return False if e.code == 400 else None
    except (urllib.error.URLError, OSError, ValueError, ET.ParseError):
        return None
    return root.find("atom:entry", _NS) is not None


def fetch_pdf_text(arxiv_id: str) -> str | None:
    """Fetch the arXiv PDF and extract plain text (ladder step 2).

    Returns the text (capped), ``""`` when the PDF has zero text layer
    (scanned), or ``None`` when the fetch fails (network, >20MB, non-PDF).
    """
    url = f"https://arxiv.org/pdf/{_canonical_id(arxiv_id)}"
    req = urllib.request.Request(url, headers={"User-Agent": "paper2sim/0.1"})
    chunks: list[bytes] = []
    total = 0
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            while True:
                part = resp.read(_CHUNK_SIZE)
                if not part:
                    break
                total += len(part)
                if total > MAX_PDF_BYTES:
                    return None
                chunks.append(part)
    except (urllib.error.URLError, OSError, ValueError):
        return None
    data = b"".join(chunks)
    if not data:
        return None
    try:
        import fitz  # lazy: PyMuPDF needed only on the PDF path
    except ImportError:
        return None
    try:
        # ponytail: 50 pages / 200KB cap bounds memory on huge PDFs; raise MAX_PDF_PAGES/MAX_PDF_TEXT_CHARS or stream pages to upgrade
        parts: list[str] = []
        chars = 0
        with fitz.open(stream=data, filetype="pdf") as doc:
            for i, page in enumerate(doc):
                if i >= MAX_PDF_PAGES:
                    break
                try:
                    t = page.get_text()
                except Exception:
                    continue
                if t:
                    parts.append(t)
                    chars += len(t)
                    if chars >= MAX_PDF_TEXT_CHARS:
                        break
        return "".join(parts)[:MAX_PDF_TEXT_CHARS]
    except Exception:
        return None
