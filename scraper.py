#!/usr/bin/env python3
"""
Huisartsenpraktijken Lead Scraper
Scrapt contactgegevens (naam dokter, telefoon, email) van huisartsenpraktijken
via zorgkaartnederland.nl

Gebruik:
  python scraper.py                                    # Scrapt landelijk, 5 pagina's
  python scraper.py --steden amsterdam                 # Alleen Amsterdam
  python scraper.py --steden amsterdam,rotterdam,utrecht --paginas 10
  python scraper.py --uitvoer mijn_leads.csv --json mijn_leads.json
  python scraper.py --verbose
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
from typing import List, Optional, Tuple
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


# ── Hulpfuncties ─────────────────────────────────────────────────────────────

def _schoon_tekst(tekst: str) -> str:
    return " ".join(tekst.split())


def _zoek_email(soup: BeautifulSoup, tekst: str) -> str:
    # 1. mailto-links (meest betrouwbaar)
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("mailto:"):
            return href.replace("mailto:", "").split("?")[0].strip()
    # 2. Regex in de paginatekst
    match = re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", tekst)
    return match.group(0) if match else ""


def _zoek_telefoon(soup: BeautifulSoup, tekst: str) -> str:
    # 1. tel:-links
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("tel:"):
            nummer = re.sub(r"[^\d+]", "", href.replace("tel:", ""))
            if len(nummer) >= 9:
                return nummer
    # 2. Regex: Nederlands formaat  0xx-xxxxxxx / +31xx / 085 / 088
    match = re.search(
        r"(?:\+31|0)[\s\-]?(?:\d[\s\-]?){8,10}",
        tekst,
    )
    if match:
        return re.sub(r"[\s\-]", "", match.group(0))
    return ""


def _zoek_dokters(soup: BeautifulSoup, tekst: str) -> str:
    """Verzamel doktersnamen uit de pagina."""
    namen = []

    # Zoek in elementen met relevante klassen/tekst
    kandidaat_selectors = [
        "[class*='zorgverlener']",
        "[class*='behandelaar']",
        "[class*='professional']",
        "[class*='medewerker']",
        "[class*='staff']",
        "[class*='team']",
        "[class*='doctor']",
        "[class*='arts']",
    ]
    for selector in kandidaat_selectors:
        try:
            for el in soup.select(selector):
                naam = _schoon_tekst(el.get_text())
                if 4 < len(naam) < 60:
                    namen.append(naam)
        except Exception:
            pass

    # Regex: namen voorafgegaan door een titel
    for match in re.finditer(
        r"\b(?:drs?\.|dr\.|Drs?\.|Dr\.|Huisarts|huisarts)\s+"
        r"([A-Z][a-z]+(?:\s+(?:van\s+|de\s+|den\s+|der\s+)?[A-Z][a-z]+){0,4})",
        tekst,
    ):
        naam = match.group(1).strip()
        if len(naam) > 3:
            namen.append(naam)

    # Deduplicate, behoud volgorde
    seen: set = set()
    uniek = []
    for n in namen:
        if n not in seen:
            seen.add(n)
            uniek.append(n)

    return "; ".join(uniek[:5])  # Maximaal 5 doktersnamen


def _zoek_adres(soup: BeautifulSoup, tekst: str) -> Tuple[str, str, str]:
    """Geeft (adres, postcode, stad) terug."""
    postcode = ""
    adres = ""
    stad = ""

    # Postcode-patroon: 1234 AB of 1234AB
    pc_match = re.search(r"\b(\d{4}\s?[A-Z]{2})\b", tekst)
    if pc_match:
        postcode = pc_match.group(1).replace(" ", "")

    # Zoek structured address-elementen
    for sel in ["address", "[class*='address']", "[class*='adres']", "[class*='locatie']"]:
        try:
            el = soup.select_one(sel)
            if el:
                adres_tekst = _schoon_tekst(el.get_text())
                adres = adres_tekst
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


# ── Paginafuncties ────────────────────────────────────────────────────────────

def _haal_pagina(
    url: str,
    session: requests.Session,
    vertraging: float = 1.5,
) -> Optional[BeautifulSoup]:
    time.sleep(vertraging)
    try:
        resp = session.get(url, timeout=20)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "html.parser")
    except requests.RequestException as e:
        logging.warning(f"Kon pagina niet ophalen {url}: {e}")
        return None


def _haal_praktijk_urls(
    stad: str,
    pagina: int,
    session: requests.Session,
) -> Tuple[List[str], bool]:
    """Geeft lijst van praktijk-URLs + of er een volgende pagina is."""
    if stad:
        stad_slug = stad.lower().replace(" ", "-").replace("'", "").replace("ij", "ij")
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
        # Praktijk-detail-URLs hebben minimaal 3 segmenten
        if "/huisartsenpraktijk/" in href and href.count("/") >= 3:
            full = urljoin(BASE_URL, href.split("?")[0])
            if full != url:
                urls.add(full)

    # Volgende pagina aanwezig?
    volgende = bool(
        soup.find(
            lambda tag: tag.name == "a"
            and any(
                w in (tag.get("class") or []) or w in (tag.get_text(strip=True).lower())
                for w in ["next", "volgende", "→", ">"]
            )
        )
    )

    return list(urls), volgende


def _scrape_praktijk(url: str, session: requests.Session) -> Lead:
    lead = Lead(bron_url=url)
    soup = _haal_pagina(url, session, vertraging=1.5)
    if not soup:
        return lead

    tekst = soup.get_text(" ", strip=True)

    # Naam
    h1 = soup.find("h1")
    if h1:
        lead.praktijk_naam = _schoon_tekst(h1.get_text())

    # Contactgegevens
    lead.email = _zoek_email(soup, tekst)
    lead.telefoon = _zoek_telefoon(soup, tekst)
    lead.dokter_naam = _zoek_dokters(soup, tekst)
    lead.adres, lead.postcode, lead.stad = _zoek_adres(soup, tekst)
    lead.website = _zoek_website(soup)

    return lead


# ── Hoofd scraper ─────────────────────────────────────────────────────────────

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

    session = requests.Session()
    session.headers.update(HEADERS)

    alle_leads: List[Lead] = []
    geziene_urls: set = set()

    zoek_steden = steden if steden else [""]

    for stad in zoek_steden:
        label = stad or "heel Nederland"
        logging.info(f"\n── Stad: {label} ──")

        for pagina in range(1, max_paginas + 1):
            logging.info(f"  Pagina {pagina} ophalen...")
            urls, heeft_volgende = _haal_praktijk_urls(stad, pagina, session)

            nieuwe_urls = [u for u in urls if u not in geziene_urls]
            geziene_urls.update(nieuwe_urls)

            if not nieuwe_urls:
                logging.info("  Geen nieuwe praktijken gevonden, stop.")
                break

            logging.info(f"  {len(nieuwe_urls)} praktijken gevonden")

            for i, url in enumerate(nieuwe_urls, 1):
                logging.info(f"  [{i}/{len(nieuwe_urls)}] {url}")
                lead = _scrape_praktijk(url, session)
                alle_leads.append(lead)

            if not heeft_volgende:
                break

    # ── CSV opslaan ──
    velden = ["praktijk_naam", "dokter_naam", "telefoon", "email",
              "adres", "postcode", "stad", "website", "bron_url"]

    with open(uitvoer_csv, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=velden)
        writer.writeheader()
        for lead in alle_leads:
            writer.writerow(asdict(lead))

    # ── JSON opslaan (optioneel) ──
    if uitvoer_json:
        with open(uitvoer_json, "w", encoding="utf-8") as f:
            json.dump([asdict(l) for l in alle_leads], f, ensure_ascii=False, indent=2)
        logging.info(f"JSON opgeslagen: {uitvoer_json}")

    return alle_leads


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Huisartsenpraktijken Lead Scraper\n"
            "Scrapt naam van de dokter, telefoon en email van zorgkaartnederland.nl"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
VOORBEELDEN
  # Scrapt landelijk (5 pagina's)
  python scraper.py

  # Alleen Amsterdam, maximaal 3 pagina's
  python scraper.py --steden amsterdam --paginas 3

  # Meerdere steden, ook JSON exporteren
  python scraper.py --steden amsterdam,rotterdam,utrecht,eindhoven --paginas 5 --json leads.json

  # Aangepaste bestandsnaam + uitgebreide logging
  python scraper.py --steden den-haag --uitvoer denhaag_leads.csv --verbose

OUTPUT CSV-KOLOMMEN
  praktijk_naam  - Naam van de praktijk
  dokter_naam    - Naam van de huisarts(en)
  telefoon       - Telefoonnummer
  email          - E-mailadres
  adres          - Straatadres
  postcode       - Postcode
  stad           - Stad
  website        - Website van de praktijk
  bron_url       - URL van de bronpagina
        """,
    )
    parser.add_argument(
        "--steden",
        type=str,
        default="",
        metavar="STAD[,STAD...]",
        help="Steden om te scrapen, komma-gescheiden (bijv: amsterdam,rotterdam). "
             "Leeg = heel Nederland.",
    )
    parser.add_argument(
        "--paginas",
        type=int,
        default=5,
        metavar="N",
        help="Maximaal aantal pagina's per stad (standaard: 5, ±20 praktijken per pagina)",
    )
    parser.add_argument(
        "--uitvoer",
        type=str,
        default="huisartsen_leads.csv",
        metavar="BESTAND.csv",
        help="Naam van het output CSV-bestand (standaard: huisartsen_leads.csv)",
    )
    parser.add_argument(
        "--json",
        type=str,
        default=None,
        metavar="BESTAND.json",
        help="Optioneel: exporteer ook naar JSON",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Uitgebreide logging",
    )

    args = parser.parse_args()

    steden = [s.strip() for s in args.steden.split(",") if s.strip()] if args.steden else []

    leads = scrape(
        steden=steden,
        max_paginas=args.paginas,
        uitvoer_csv=args.uitvoer,
        uitvoer_json=args.json,
        verbose=args.verbose,
    )

    # ── Samenvatting ──
    met_email = sum(1 for l in leads if l.email)
    met_tel = sum(1 for l in leads if l.telefoon)
    met_dokter = sum(1 for l in leads if l.dokter_naam)

    print("\n" + "=" * 40)
    print("RESULTATEN")
    print("=" * 40)
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
