import io
import re
import requests
from pypdf import PdfReader
from bs4 import BeautifulSoup


def extract_pdf(file_bytes: bytes) -> str:
    """Extract clean text from a PDF file (bytes)."""
    reader = PdfReader(io.BytesIO(file_bytes))
    texts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            texts.append(text)
    raw = "\n".join(texts)
    return _clean_text(raw)


def extract_url(url: str) -> str:
    """Crawl a URL and extract visible text content."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 Chrome/120 Safari/537.36"
        )
    }
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
    except Exception as e:
        raise ValueError(f"Failed to fetch URL {url}: {e}")

    soup = BeautifulSoup(response.content, "html.parser")

    # Remove noise elements
    for tag in soup(["script", "style", "nav", "footer", "header",
                     "aside", "form", "button", "meta", "noscript"]):
        tag.decompose()

    # Prefer main content
    main = soup.find("main") or soup.find("article") or soup.find("div", {"id": "content"}) or soup
    text = main.get_text(separator="\n")
    return _clean_text(text)


def _clean_text(text: str) -> str:
    """Remove excessive whitespace and junk characters."""
    # Collapse multiple blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Collapse spaces
    text = re.sub(r" {2,}", " ", text)
    # Strip leading/trailing whitespace per line
    lines = [line.strip() for line in text.splitlines()]
    # Drop very short lines (menus, buttons)
    lines = [l for l in lines if len(l) > 3]
    return "\n".join(lines).strip()
