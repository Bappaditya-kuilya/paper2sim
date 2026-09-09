"""Tests for arXiv URL parsing, download, and metadata functions."""

import io
import tarfile
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from paper2sim.arxiv import (
    _extract_tar_gz,
    _save_plain_tex,
    download_pdf,
    download_source,
    get_paper_info,
    parse_arxiv_url,
)


class TestParseArxivUrl:
    """Tests for arXiv URL parsing."""

    def test_abs_url(self):
        assert parse_arxiv_url("https://arxiv.org/abs/1706.03762") == "1706.03762"

    def test_pdf_url(self):
        assert parse_arxiv_url("https://arxiv.org/pdf/1706.03762") == "1706.03762"

    def test_pdf_url_with_version(self):
        assert parse_arxiv_url("https://arxiv.org/pdf/1706.03762v2") == "1706.03762"

    def test_html_url(self):
        assert parse_arxiv_url("https://arxiv.org/html/2301.12345") == "2301.12345"

    def test_bare_id(self):
        assert parse_arxiv_url("1706.03762") == "1706.03762"

    def test_bare_id_with_version(self):
        assert parse_arxiv_url("1706.03762v1") == "1706.03762"

    def test_new_format_id(self):
        assert parse_arxiv_url("2301.12345") == "2301.12345"

    def test_invalid_url(self):
        assert parse_arxiv_url("https://google.com") is None

    def test_empty_string(self):
        assert parse_arxiv_url("") is None

    def test_whitespace(self):
        assert parse_arxiv_url("  1706.03762  ") == "1706.03762"


class TestExtractTarGz:
    """Tests for tar.gz extraction."""

    def _make_tar_gz(self, tex_files: dict[str, str]) -> bytes:
        """Create a tar.gz archive in memory with the given tex files."""
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w:gz") as tar:
            for name, content in tex_files.items():
                data = content.encode("utf-8")
                info = tarfile.TarInfo(name=name)
                info.size = len(data)
                tar.addfile(info, io.BytesIO(data))
        return buf.getvalue()

    def test_extracts_tex_files(self):
        data = self._make_tar_gz({"main.tex": r"\documentclass{article}"})
        with tempfile.TemporaryDirectory() as tmpdir:
            result = _extract_tar_gz(data, Path(tmpdir))
            assert result is not None
            assert result.exists()
            assert result.name == "main.tex"

    def test_prefers_main_tex(self):
        data = self._make_tar_gz({
            "main.tex": "main",
            "appendix.tex": "appendix",
        })
        with tempfile.TemporaryDirectory() as tmpdir:
            result = _extract_tar_gz(data, Path(tmpdir))
            assert result is not None
            assert result.name == "main.tex"

    def test_returns_none_on_empty(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = _extract_tar_gz(b"", Path(tmpdir))
            assert result is None

    def test_path_traversal_protection(self):
        """Archives with ../ paths should be rejected."""
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w:gz") as tar:
            data = b"evil"
            info = tarfile.TarInfo(name="../../../etc/passwd")
            info.size = len(data)
            tar.addfile(info, io.BytesIO(data))
        with tempfile.TemporaryDirectory() as tmpdir:
            result = _extract_tar_gz(buf.getvalue(), Path(tmpdir))
            assert result is None


class TestSavePlainTex:
    """Tests for plain tex file saving."""

    def test_saves_utf8(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = _save_plain_tex(b"Hello world", Path(tmpdir))
            assert result is not None
            assert result.read_text() == "Hello world"

    def test_returns_none_on_empty(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = _save_plain_tex(b"", Path(tmpdir))
            assert result is None


class TestDownloadPdf:
    """Tests for PDF download."""

    @patch("paper2sim.arxiv.urllib.request.urlretrieve")
    def test_downloads_to_dest(self, mock_retrieve):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = download_pdf("1706.03762", tmpdir)
            assert result is not None
            mock_retrieve.assert_called_once()

    @patch("paper2sim.arxiv.urllib.request.urlretrieve", side_effect=OSError)
    def test_returns_none_on_failure(self, mock_retrieve):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = download_pdf("1706.03762", tmpdir)
            assert result is None


class TestGetPaperInfo:
    """Tests for paper metadata fetch."""

    def test_parses_xml(self):
        xml = """<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <entry>
            <title>Attention Is All You Need</title>
            <summary>We propose a new architecture...</summary>
            <author><name>Ashish Vaswani</name></author>
            <author><name>Noam Shazeer</name></author>
          </entry>
        </feed>"""
        with patch("paper2sim.arxiv.urllib.request.urlopen") as mock:
            resp = MagicMock()
            resp.read.return_value = xml.encode("utf-8")
            resp.__enter__ = lambda s: s
            resp.__exit__ = MagicMock(return_value=False)
            mock.return_value = resp
            result = get_paper_info("1706.03762")
            assert result is not None
            assert result["title"] == "Attention Is All You Need"
            assert len(result["authors"]) == 2
            assert "Vaswani" in result["authors"][0]

    @patch("paper2sim.arxiv.urllib.request.urlopen", side_effect=OSError)
    def test_returns_none_on_network_error(self, mock):
        result = get_paper_info("1706.03762")
        assert result is None
