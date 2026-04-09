"""
Huisartsenpraktijken Lead Scraper — Interactieve webapp
Start met:  streamlit run app.py
"""

import io
import time
import pandas as pd
import streamlit as st

from scraper import scrape_generator, CSV_VELDEN

# ── Pagina-config ─────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Huisartsen Lead Scraper",
    page_icon="🏥",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── CSS voor compactere tabel ─────────────────────────────────────────────────

st.markdown(
    """
    <style>
    .metric-label  { font-size: 0.85rem !important; }
    .metric-value  { font-size: 1.6rem !important; }
    div[data-testid="stDataFrame"] { border-radius: 8px; }
    </style>
    """,
    unsafe_allow_html=True,
)

# ── Steden lijst ──────────────────────────────────────────────────────────────

ALLE_STEDEN = [
    "almelo", "almere", "alphen-aan-den-rijn", "amersfoort", "amsterdam",
    "apeldoorn", "arnhem", "assen", "breda", "delft",
    "den-haag", "deventer", "dordrecht", "eindhoven", "emmen",
    "enschede", "goes", "groningen", "haarlem", "heerlen",
    "helmond", "hengelo", "hilversum", "hoofddorp", "hoorn",
    "leeuwarden", "leiden", "lelystad", "maastricht", "middelburg",
    "nijmegen", "purmerend", "rotterdam", "s-hertogenbosch", "tilburg",
    "utrecht", "venlo", "zaandam", "zoetermeer", "zwolle",
]

# ── Session state init ────────────────────────────────────────────────────────

if "leads" not in st.session_state:
    st.session_state.leads = []
if "scraping" not in st.session_state:
    st.session_state.scraping = False
if "logs" not in st.session_state:
    st.session_state.logs = []

# ── Sidebar ───────────────────────────────────────────────────────────────────

with st.sidebar:
    st.image(
        "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/"
        "Caduceus.svg/100px-Caduceus.svg.png",
        width=60,
    )
    st.title("Instellingen")

    zoek_scope = st.radio(
        "Zoekgebied",
        ["Heel Nederland", "Specifieke steden"],
        help="'Heel Nederland' scrapt de landelijke lijstpagina's.",
    )

    steden: list = []
    if zoek_scope == "Specifieke steden":
        steden = st.multiselect(
            "Selecteer steden",
            options=ALLE_STEDEN,
            default=["amsterdam", "rotterdam"],
            format_func=lambda s: s.replace("-", " ").title(),
        )

    max_paginas = st.slider(
        "Max. pagina's per stad",
        min_value=1,
        max_value=25,
        value=3,
        help="Elke pagina bevat ±20 praktijken.",
    )

    st.divider()
    schatting = max(len(steden), 1) * max_paginas * 20
    st.caption(f"Geschat: ~{schatting} praktijken")
    st.caption("Vertraging: ~1,5 s per praktijk")
    st.caption("Bron: zorgkaartnederland.nl")

    st.divider()
    if st.button("🗑️ Resultaten wissen", use_container_width=True):
        st.session_state.leads = []
        st.session_state.logs = []
        st.rerun()

# ── Header ────────────────────────────────────────────────────────────────────

st.title("🏥 Huisartsenpraktijken Lead Scraper")
st.markdown(
    "Scrapt **doktersnaam, telefoonnummer en e-mailadres** van Nederlandse "
    "huisartsenpraktijken via [zorgkaartnederland.nl](https://www.zorgkaartnederland.nl/huisartsenpraktijk)."
)

# ── Metrics ───────────────────────────────────────────────────────────────────

leads = st.session_state.leads
m1, m2, m3, m4 = st.columns(4)
m1.metric("Totaal praktijken", len(leads))
m2.metric("Met e-mail", sum(1 for l in leads if l.get("email")))
m3.metric("Met telefoon", sum(1 for l in leads if l.get("telefoon")))
m4.metric("Met doktersnaam", sum(1 for l in leads if l.get("dokter_naam")))

st.divider()

# ── Start knop ────────────────────────────────────────────────────────────────

start_col, _ = st.columns([1, 3])
start_knop = start_col.button(
    "🚀 Start scrapen",
    type="primary",
    use_container_width=True,
    disabled=st.session_state.scraping,
)

# ── Scraping loop ─────────────────────────────────────────────────────────────

if start_knop:
    if zoek_scope == "Specifieke steden" and not steden:
        st.error("Selecteer minimaal één stad of kies 'Heel Nederland'.")
        st.stop()

    st.session_state.scraping = True
    st.session_state.leads = []
    st.session_state.logs = []

    progress_bar = st.progress(0.0)
    status_el = st.empty()
    log_el = st.empty()
    tabel_el = st.empty()

    leads_buffer: list = []
    logs_buffer: list = []

    for event in scrape_generator(steden=steden, max_paginas=max_paginas):
        etype = event["type"]

        if etype == "log":
            logs_buffer.append(event["message"])
            # Toon de laatste 12 regels in een code-blok
            log_el.code("\n".join(logs_buffer[-12:]), language=None)

        elif etype == "progress":
            progress_bar.progress(float(event["value"]))
            status_el.markdown(f"**{event['message']}**")

        elif etype == "lead":
            leads_buffer.append(event["lead"])
            st.session_state.leads = list(leads_buffer)
            # Live-update van de tabel elke 5 leads
            if len(leads_buffer) % 5 == 0:
                df_live = pd.DataFrame(leads_buffer)
                tabel_el.dataframe(df_live, use_container_width=True, height=300)

        elif etype == "done":
            progress_bar.progress(1.0)
            status_el.success(f"✅ Klaar! {event['totaal']} praktijken gescraped.")
            log_el.empty()
            if leads_buffer:
                df_live = pd.DataFrame(leads_buffer)
                tabel_el.dataframe(df_live, use_container_width=True, height=300)

    st.session_state.scraping = False
    st.rerun()

# ── Resultaten ────────────────────────────────────────────────────────────────

if st.session_state.leads:
    df = pd.DataFrame(st.session_state.leads)

    st.subheader(f"Resultaten ({len(df)} praktijken)")

    # ── Filterrij ──
    fc1, fc2, fc3, fc4 = st.columns([2, 1, 1, 1])
    with fc1:
        zoek = st.text_input("🔍 Zoeken", placeholder="naam, stad, e-mail, dokter...")
    with fc2:
        alleen_email = st.checkbox("Heeft e-mail")
    with fc3:
        alleen_tel = st.checkbox("Heeft telefoon")
    with fc4:
        alleen_dokter = st.checkbox("Heeft doktersnaam")

    gefilterd = df.copy()
    if alleen_email:
        gefilterd = gefilterd[gefilterd["email"].str.strip().str.len() > 0]
    if alleen_tel:
        gefilterd = gefilterd[gefilterd["telefoon"].str.strip().str.len() > 0]
    if alleen_dokter:
        gefilterd = gefilterd[gefilterd["dokter_naam"].str.strip().str.len() > 0]
    if zoek:
        mask = gefilterd.apply(
            lambda row: zoek.lower() in row.to_string().lower(), axis=1
        )
        gefilterd = gefilterd[mask]

    st.caption(f"{len(gefilterd)} van {len(df)} praktijken zichtbaar")

    # Kolomvolgorde: meest relevante velden eerst
    kolom_volgorde = ["praktijk_naam", "dokter_naam", "telefoon", "email",
                      "stad", "postcode", "adres", "website", "bron_url"]
    kolom_volgorde = [k for k in kolom_volgorde if k in gefilterd.columns]
    st.dataframe(
        gefilterd[kolom_volgorde],
        use_container_width=True,
        height=500,
        hide_index=True,
        column_config={
            "bron_url": st.column_config.LinkColumn("Bron", display_text="🔗 open"),
            "website":  st.column_config.LinkColumn("Website", display_text="🌐 open"),
            "email":    st.column_config.TextColumn("E-mail", width="medium"),
            "telefoon": st.column_config.TextColumn("Telefoon", width="small"),
        },
    )

    # ── Download knoppen ──
    dl1, dl2, _ = st.columns([1, 1, 2])

    csv_bytes = gefilterd[kolom_volgorde].to_csv(
        index=False, encoding="utf-8-sig"
    ).encode("utf-8-sig")

    dl1.download_button(
        "⬇️ Download CSV",
        data=csv_bytes,
        file_name="huisartsen_leads.csv",
        mime="text/csv",
        use_container_width=True,
    )

    json_bytes = gefilterd[kolom_volgorde].to_json(
        orient="records", force_ascii=False, indent=2
    ).encode("utf-8")

    dl2.download_button(
        "⬇️ Download JSON",
        data=json_bytes,
        file_name="huisartsen_leads.json",
        mime="application/json",
        use_container_width=True,
    )

elif not st.session_state.scraping:
    st.info(
        "Klik op **🚀 Start scrapen** om te beginnen. "
        "Resultaten verschijnen live terwijl de scraper bezig is."
    )
