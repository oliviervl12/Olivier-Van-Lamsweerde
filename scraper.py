#!/usr/bin/env python3
"""
Huisartsenpraktijken Lead Scraper
Scrapt contactgegevens van huisartsenpraktijken via zorgkaartnederland.nl

Gebruik (CLI):
  python scraper.py
  python scraper.py --steden amsterdam,rotterdam --paginas 5
  python scraper.py --steden amsterdam --uitvoer leads.csv --json leads.json --verbose
"""

import requests
from bs4 import BeautifulSoup
import csv
import time
import re
import logging
import argparse
import json
import sys
from dataclasses import dataclass, asdict
from typing import Dict, Generator, Iterator, List, Optional, Tuple
from urllib.parse import urljoin

# ── Constanten ──────────────────────────────────────────────────────────────

BASE_URL = "https://www.zorgkaartnederland.nl"
LIJST_URL = f"{BASE_URL}/huisartsenpraktijk"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# ── Data model ───────────────────────────────────────────────────────────────

@dataclass
class Lead:
    praktijk_naam: str = ""
    dokter_naam: str = ""
    telefoon: str = ""
    email: str = ""
    adres: str = ""
    postcode: str = ""
    stad: str = ""
    website: str = ""
    bron_url: str = ""


CSV_VELDEN = [
    "praktijk_naam", "dokter_naam", "telefoon", "email",
    "adres", "postcode", "stad", "website", "bron_url",
]


# ── Hulpfuncties ─────────────────────────────────────────────────────────────

def _schoon(tekst: str) -> str:
    return " ".join(tekst.split())


def _zoek_email(soup: BeautifulSoup, paginatekst: str) -> str:
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("mailto:"):
            return href.replace("mailto:", "").split("?")[0].strip().lower()
    match = re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", paginatekst)
    return match.group(0).lower() if match else ""


def _zoek_telefoon(soup: BeautifulSoup, paginatekst: str) -> str:
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("tel:"):
            nummer = re.sub(r"[^\d+]", "", href.replace("tel:", ""))
            if len(nummer) >= 9:
                return nummer
    match = re.search(r"(?:\+31|0)[\s\-]?(?:\d[\s\-]?){8,10}", paginatekst)
    if match:
        return re.sub(r"[\s\-]", "", match.group(0))
    return ""


def _zoek_dokters(soup: BeautifulSoup, paginatekst: str) -> str:
    namen: List[str] = []

    # Selectors voor zorgverlener-blokken
    for selector in [
        "[class*='zorgverlener']", "[class*='behandelaar']",
        "[class*='professional']", "[class*='medewerker']",
        "[class*='staff']", "[class*='team']",
        "[class*='doctor']", "[class*='arts']",
    ]:
        try:
            for el in soup.select(selector):
                naam = _schoon(el.get_text())
                if 4 < len(naam) < 60:
                    namen.append(naam)
        except Exception:
            pass

    # Regex: namen na een medische titel
    for m in re.finditer(
        r"\b(?:Drs?\.|drs?\.|Dr\.|dr\.|Huisarts|huisarts)\s+"
        r"([A-Z][a-z]+(?:\s+(?:van |de |den |der |'t )?[A-Z][a-z]+){0,4})",
        paginatekst,
    ):
        naam = m.group(1).strip()
        if len(naam) > 3:
            namen.append(naam)

    seen: set = set()
    uniek = []
    for n in namen:
        if n not in seen:
            seen.add(n)
            uniek.append(n)
    return "; ".join(uniek[:5])


def _zoek_adres(soup: BeautifulSoup, paginatekst: str) -> Tuple[str, str, str]:
    postcode = ""
    adres = ""
    stad = ""

    pc_match = re.search(r"\b(\d{4}\s?[A-Z]{2})\b", paginatekst)
    if pc_match:
        postcode = pc_match.group(1).replace(" ", "")

    for sel in ["address", "[class*='address']", "[class*='adres']", "[class*='locatie']"]:
        try:
            el = soup.select_one(sel)
            if el:
                adres = _schoon(el.get_text())
                break
        except Exception:
            pass

    return adres, postcode, stad


def _zoek_website(soup: BeautifulSoup) -> str:
    for a in soup.find_all("a", href=True):
        href = a["href"]
        tekst = a.get_text(strip=True).lower()
        if (
            href.startswith("http")
            and BASE_URL not in href
            and any(w in tekst for w in ["website", "www", "site", "homepage"])
        ):
            return href
    return ""


# ── HTTP ──────────────────────────────────────────────────────────────────────

def _haal_pagina(url: str, session: requests.Session, vertraging: float = 1.5) -> Optional[BeautifulSoup]:
    time.sleep(vertraging)
    try:
        resp = session.get(url, timeout=20)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "html.parser")
    except requests.RequestException as e:
        logging.warning(f"Kon pagina niet ophalen {url}: {e}")
        return None


def _haal_praktijk_urls(stad: str, pagina: int, session: requests.Session) -> Tuple[List[str], bool]:
    if stad:
        stad_slug = stad.lower().replace(" ", "-").replace("'", "")
        url = f"{LIJST_URL}/{stad_slug}"
    else:
        url = LIJST_URL

    if pagina > 1:
        url = f"{url}?pagina={pagina}"

    soup = _haal_pagina(url, session, vertraging=1.0)
    if not soup:
        return [], False

    urls: set = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/huisartsenpraktijk/" in href and href.count("/") >= 3:
            full = urljoin(BASE_URL, href.split("?")[0])
            if full != url:
                urls.add(full)

    heeft_volgende = bool(
        soup.find(
            lambda tag: tag.name == "a"
            and any(
                w in (tag.get("class") or []) or w in tag.get_text(strip=True).lower()
                for w in ["next", "volgende", "→"]
            )
        )
    )

    return list(urls), heeft_volgende


def _scrape_praktijk(url: str, session: requests.Session) -> Lead:
    lead = Lead(bron_url=url)
    soup = _haal_pagina(url, session, vertraging=1.5)
    if not soup:
        return lead

    tekst = soup.get_text(" ", strip=True)

    h1 = soup.find("h1")
    if h1:
        lead.praktijk_naam = _schoon(h1.get_text())

    lead.email = _zoek_email(soup, tekst)
    lead.telefoon = _zoek_telefoon(soup, tekst)
    lead.dokter_naam = _zoek_dokters(soup, tekst)
    lead.adres, lead.postcode, lead.stad = _zoek_adres(soup, tekst)
    lead.website = _zoek_website(soup)

    return lead


# ── Generator API (voor interactieve app) ─────────────────────────────────────

def scrape_generator(
    steden: List[str],
    max_paginas: int,
) -> Generator[Dict, None, None]:
    """
    Generator die scraping-events yieldt. Gebruik dit in de Streamlit-app.

    Event types:
      {"type": "log",      "message": str}
      {"type": "progress", "value": float (0-1), "message": str}
      {"type": "lead",     "lead": dict}
      {"type": "done",     "totaal": int}
    """
    session = requests.Session()
    session.headers.update(HEADERS)

    geziene_urls: set = set()
    totaal_leads = 0
    zoek_steden = steden if steden else [""]
    n_steden = len(zoek_steden)

    for stad_idx, stad in enumerate(zoek_steden):
        label = stad or "heel Nederland"
        yield {"type": "log", "message": f"Stad: {label}"}

        stad_urls_totaal = 0

        for pagina in range(1, max_paginas + 1):
            yield {"type": "log", "message": f"  Pagina {pagina} ophalen..."}
            urls, heeft_volgende = _haal_praktijk_urls(stad, pagina, session)

            nieuwe_urls = [u for u in urls if u not in geziene_urls]
            geziene_urls.update(nieuwe_urls)

            if not nieuwe_urls:
                yield {"type": "log", "message": "  Geen nieuwe praktijken gevonden."}
                break

            yield {"type": "log", "message": f"  {len(nieuwe_urls)} praktijken gevonden"}
            stad_urls_totaal += len(nieuwe_urls)

            for i, url in enumerate(nieuwe_urls):
                # Ruwe voortgangsschatting
                stap = stad_idx * max_paginas * 20 + (pagina - 1) * 20 + i
                totaal_stappen = max(1, n_steden * max_paginas * 20)
                pct = min(stap / totaal_stappen, 0.98)

                yield {
                    "type": "progress",
                    "value": pct,
                    "message": f"[{totaal_leads + 1}] {url.split('/')[-1]}",
                }

                lead = _scrape_praktijk(url, session)
                totaal_leads += 1
                yield {"type": "lead", "lead": asdict(lead)}

            if not heeft_volgende:
                break

    yield {"type": "progress", "value": 1.0, "message": "Klaar!"}
    yield {"type": "done", "totaal": totaal_leads}


# ── Hoofd scraper (voor CLI) ──────────────────────────────────────────────────

def scrape(
    steden: List[str],
    max_paginas: int,
    uitvoer_csv: str,
    uitvoer_json: Optional[str],
    verbose: bool,
) -> List[Lead]:
    logging.basicConfig(
        format="%(asctime)s [%(levelname)s] %(message)s",
        level=logging.DEBUG if verbose else logging.INFO,
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )

    alle_leads: List[Lead] = []
    session = requests.Session()
    session.headers.update(HEADERS)
    geziene_urls: set = set()

    for stad in (steden if steden else [""]):
        label = stad or "heel Nederland"
        logging.info(f"\n── Stad: {label} ──")
        for pagina in range(1, max_paginas + 1):
            logging.info(f"  Pagina {pagina}...")
            urls, heeft_volgende = _haal_praktijk_urls(stad, pagina, session)
            nieuwe_urls = [u for u in urls if u not in geziene_urls]
            geziene_urls.update(nieuwe_urls)
            if not nieuwe_urls:
                break
            logging.info(f"  {len(nieuwe_urls)} praktijken")
            for i, url in enumerate(nieuwe_urls, 1):
                logging.info(f"  [{i}/{len(nieuwe_urls)}] {url}")
                alle_leads.append(_scrape_praktijk(url, session))
            if not heeft_volgende:
                break

    with open(uitvoer_csv, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_VELDEN)
        writer.writeheader()
        for lead in alle_leads:
            writer.writerow(asdict(lead))
    logging.info(f"\nGescrapet: {len(alle_leads)} -> {uitvoer_csv}")

    if uitvoer_json:
        with open(uitvoer_json, "w", encoding="utf-8") as f:
            json.dump([asdict(l) for l in alle_leads], f, ensure_ascii=False, indent=2)
        logging.info(f"JSON: {uitvoer_json}")

    return alle_leads


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Huisartsenpraktijken Lead Scraper — scrapt doktersnaam, telefoon en email",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
VOORBEELDEN
  python scraper.py
  python scraper.py --steden amsterdam --paginas 3
  python scraper.py --steden amsterdam,rotterdam,utrecht --paginas 5 --json leads.json
  python scraper.py --steden den-haag --uitvoer denhaag.csv --verbose

  Of start de interactieve webapp:
  streamlit run app.py
        """,
    )
    parser.add_argument("--steden", type=str, default="", metavar="STAD[,STAD...]",
                        help="Steden (komma-gescheiden). Leeg = heel Nederland.")
    parser.add_argument("--paginas", type=int, default=5, metavar="N",
                        help="Max pagina's per stad (standaard: 5)")
    parser.add_argument("--uitvoer", type=str, default="huisartsen_leads.csv", metavar="BESTAND.csv")
    parser.add_argument("--json", type=str, default=None, metavar="BESTAND.json")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()

    steden = [s.strip() for s in args.steden.split(",") if s.strip()] if args.steden else []
    leads = scrape(steden=steden, max_paginas=args.paginas,
                   uitvoer_csv=args.uitvoer, uitvoer_json=args.json, verbose=args.verbose)

    met_email = sum(1 for l in leads if l.email)
    met_tel = sum(1 for l in leads if l.telefoon)
    met_dokter = sum(1 for l in leads if l.dokter_naam)
    print(f"\n{'='*40}\nRESULTATEN\n{'='*40}")
    print(f"  Totaal praktijken  : {len(leads)}")
    print(f"  Met e-mail         : {met_email}")
    print(f"  Met telefoonnummer : {met_tel}")
    print(f"  Met doktersnaam    : {met_dokter}")
    print(f"  Opgeslagen in      : {args.uitvoer}")
    if args.json:
        print(f"  JSON               : {args.json}")
    print("=" * 40)


if __name__ == "__main__":
    main()
