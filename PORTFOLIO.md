# Location Tracker — Brief per pagina portfolio

> Documento sorgente da cui ricavare una pagina del portfolio personale.
> Include vision, stack, funzionalità attuali, use case (privati + enterprise),
> e una lista ampia di estensioni possibili da usare come spunto narrativo.

---

## 1. Vision (one-liner)

**Una mappa interattiva personale per salvare luoghi e calcolare distanze e
percorsi reali tra di essi**, costruita con uno stack moderno (Next.js 16 App
Router, React 19, MapLibre via mapcn, Supabase) e un'estetica scura
amber/black ispirata ai pannelli di controllo industriali.

Il progetto nasce come tool quotidiano per uso privato, ma l'architettura è
deliberatamente estendibile a scenari enterprise (fleet, field service, asset
tracking, logistica) tramite endpoint server.

---

## 2. Stack tecnico

### Runtime & framework
- **Next.js 16.2** (App Router, Server Components, Route Handlers)
- **React 19.2** con Strict Mode disabilitato in dev per compatibilità con
  contesti WebGL multipli sotto HMR
- **TypeScript 5** in modalità strict
- **Turbopack** come bundler di sviluppo (default in Next 16)

### UI & styling
- **Tailwind CSS 4** (nuovo motore con `@theme inline`, variabili OKLCH)
- **shadcn/ui** (style "base-nova", componenti copy-paste basati su Base-UI)
- **@base-ui/react** per primitive accessibili (Dialog, ScrollArea)
- **Space Grotesk** (sans geometric) + **JetBrains Mono** (monospace)
- **lucide-react** per le icone
- Palette: amber/orange su near-black (warm graphite), accenti `oklch(0.78 0.17 70)`

### Mappa
- **mapcn** (registry di componenti map per React + shadcn)
- **MapLibre GL JS 5.24** sotto il cofano (WebGL, fork open source di
  Mapbox GL)
- **CARTO basemaps** (Positron light + Dark Matter) — gratuiti, no API key
- Marker via DOM portal, route via GeoJSON LineString layer

### Stato client
- **Zustand 5** per lo store dei marker, selezione, route attiva, loading

### Backend & dati
- **Supabase** (Postgres managed) per la persistenza dei marker
- **RLS (Row Level Security)** abilitata con policy anonima per uso single-user;
  pronta per essere sostituita con policy `auth.uid()`-based per scenari multi-utente

### Servizi esterni
- **Nominatim (OpenStreetMap)** per il geocoding forward (testo → coordinate)
- **OSRM (Open Source Routing Machine)** per il calcolo del percorso stradale
  e della distanza/tempo guida

### Pattern architetturali notevoli
- Componenti UI lazy-init via `useRef` (Strict-Mode-safe per MapLibre WebGL)
- Route handlers con `runtime = "nodejs"` come proxy verso servizi esterni
  (User-Agent corretto per ToS Nominatim, cache `revalidate` per OSRM)
- Hook `useConfirm()` con Provider globale per dialog di conferma custom
  in tema, niente più `window.confirm()` browser-native

---

## 3. Architettura e flusso dati

```
┌─────────────────────┐
│  Browser (React)    │
│  ├─ MapView (mapcn) │
│  ├─ MarkerPanel     │  ─── fetch ───►  Next.js Route Handlers
│  └─ Confirm Dialog  │                    ├─ /api/markers      → Supabase
└─────────────────────┘                    ├─ /api/markers/:id  → Supabase
        ▲                                   ├─ /api/geocode      → Nominatim
        │ WebSocket Realtime (futuro)       └─ /api/route        → OSRM
        │
        └── Supabase Postgres + RLS
```

**Flusso "aggiungi segnaposto":**
1. Utente digita un indirizzo nell'autocomplete (debounce 400ms, AbortController)
2. Client chiama `/api/geocode?q=...` → Nominatim restituisce candidati
3. Utente seleziona un risultato → coordinate salvate in state
4. POST `/api/markers` con `{name, address, latitude, longitude}` → Supabase
5. Marker appare sulla mappa con auto-fit del viewport

**Flusso "calcola distanza":**
1. Utente seleziona 2 marker (checkbox o click sul popup)
2. Client mostra immediatamente la distanza in linea d'aria (haversine)
3. In parallelo chiama `/api/route?from=lat,lng&to=lat,lng` → OSRM
4. Quando arriva la route: la mappa fa `fitBounds` sul percorso, la polyline
   amber viene disegnata, e il pannello mostra distanza stradale + durata stimata

---

## 4. Funzionalità implementate

- **Mappa fullscreen** con tema dark CARTO, controlli zoom/compass/locate/fullscreen
- **Autocomplete indirizzi** con debounce e cache server-side (60s)
- **Persistenza segnaposto** su Supabase con CRUD completo
- **Selezione fino a 2 marker** con FIFO (il terzo selezionato sostituisce il primo)
- **Distanza in linea d'aria** (haversine, calcolata client-side, istantanea)
- **Percorso stradale** (OSRM, distanza + tempo guida)
- **Auto-fit del viewport** sui marker iniziali e sul percorso quando disponibile
- **flyTo** automatico sul marker quando se ne seleziona uno singolo
- **Popup mapcn** custom sui marker (nome, indirizzo, ID hex breve, azioni)
- **Pannello di controllo** in stile HUD tech: status indicator pulsante,
  contatore punti, label monospace, telemetry block, palette amber/black
- **Dialog di conferma** custom in tema (non `window.confirm`) per le eliminazioni

---

## 5. Use case

### 5.1 Privati / quotidiano

- **Casa-hunting**: salvare tutte le case viste durante la ricerca, vedere
  la distanza di ciascuna dal lavoro/scuola/palestra/centro
- **Pianificazione viaggio**: aggiungere tappe e vedere distanze + tempi
  guida tra di loro
- **Visite mediche / specialisti**: confrontare ospedali e ambulatori per
  distanza da casa o dall'ufficio
- **Eventi e meet-up**: scegliere un punto d'incontro misurando le distanze
  dai partecipanti
- **Famiglia distribuita**: visualizzare dove abitano parenti e amici e
  pianificare il giro festivo
- **Hobby outdoor**: mappare punti panoramici, sentieri preferiti, parcheggi
  trailhead, rifugi
- **Real estate personale**: tenere traccia di proprietà di famiglia,
  garage, magazzini, seconde case
- **Foto / travel diary**: marcare luoghi visitati, esportare l'itinerario
- **Smart working**: confrontare distanze tra spazi di coworking e capire
  quale è più conveniente in funzione di altri appuntamenti
- **Tag GPS personali**: collegare un AirTag / Tile / SmartTag o un
  tracker GSM per visualizzare in tempo reale dove si trovano oggetti
  ai quali tieni — l'auto parcheggiata in città, la bici, lo zaino,
  il bagaglio in viaggio, il drone, il collare del cane. La mappa
  diventa una "find my" personale con cronologia, geofence ("avvisami
  se la macchina esce dal quartiere") e percorso di rientro

### 5.2 Enterprise

#### Logistica e trasporti
- **Fleet management con tracker GPS**: ogni veicolo della flotta è
  equipaggiato con un tracker GSM/4G che invia coordinate periodiche
  all'endpoint dell'app; la mappa diventa un control room con posizioni
  live, storico percorsi, ETA, alert su soste anomale o uscite dalla
  zona operativa
- **Antifurto e recupero asset**: tracker nascosti su veicoli, container,
  macchinari da cantiere — in caso di furto, posizione live + percorso
  storico forniscono evidenza utile a forze dell'ordine e assicurazione
- **Last-mile delivery**: pianificare giri ottimizzati partendo da magazzino,
  visualizzare ETA per ogni cliente
- **Ottimizzazione TSP**: dato un set di marker, calcolare l'ordine ottimale
  di visita minimizzando la distanza totale
- **Multi-depot routing**: assegnare consegne al depot più vicino

#### Field service / manutenzione
- **Tecnici on-call**: visualizzare la posizione dei tecnici e dispatcharli
  sulla chiamata più vicina (electricians, idraulici, antennisti, assistenza)
- **Asset distribuiti**: aziende di automazione (cancelli, sbarre, varchi),
  ascensori, antifurti, antincendio — ogni installazione è un marker con
  metadata cliente + storico manutenzioni
- **Manutenzione preventiva**: filtrare gli impianti da revisionare per
  scadenza e raggrupparli per area geografica per pianificare il giro
- **Cantieri attivi**: dashboard con cantieri aperti, distanza dalla sede,
  workforce assegnata

#### Vendite e territorio
- **Sales territory management**: assegnare clienti a rappresentanti per
  prossimità, evitare overlap
- **Store locator** per il pubblico finale (clienti finali cercano lo store
  più vicino al loro indirizzo o IP)
- **Network di franchising**: dashboard sedi + KPI per sede sovrapposti
  sulla mappa
- **Retail analytics**: heatmap dei clienti per CAP/zip code per ottimizzare
  le sedi

#### Settori specifici
- **Health / emergenze**: routing al pronto soccorso più vicino con tempo
  reale di OSRM, valutazione tempi medi per zona
- **Assicurazioni**: dispatch perito più vicino al luogo del sinistro,
  documentazione fotografica geo-taggata
- **HR**: analisi distanze dipendenti-uffici per disegnare politiche di
  smart working / sedi distaccate
- **Real estate commerciale**: portfolio immobili in gestione + distanze
  da poli logistici/aeroporti/autostrade
- **Hospitality / B&B**: visualizzare gli alloggi gestiti, distanza da
  attrazioni turistiche, ottimizzare i check-in del personale
- **Energie / utilities**: mappa dei contatori, delle cabine, dei pali da
  ispezionare
- **Agricoltura**: mappa appezzamenti, pozzi, magazzini, distanze tra
  unità produttive
- **Mobilità elettrica**: stazioni di ricarica installate / da installare,
  distanze rispetto a target di copertura
- **Eventi e produzione**: location scouting per riprese, eventi, fiere

---

## 6. Idee di estensione (roadmap libera)

### Ingestion & integrazioni
- **Webhook endpoint per coordinate**: ricevere POST con `{device_id, lat, lng, timestamp}`
  da corrieri, veicoli, IoT — i marker si aggiornano live via Supabase Realtime
- **Bulk import CSV**: caricare un file con indirizzi e farne il batch geocode
- **Sync con CRM** (HubSpot, Salesforce, Pipedrive): import contatti/account
  geo-taggati
- **Integrazione Google Calendar / Outlook**: ogni appuntamento con location
  diventa marker, il giorno X mostra il percorso ottimale tra gli eventi
- **OCR biglietto da visita**: foto → estrazione indirizzo → marker
- **Tag GPS / Bluetooth integrabili**: collegare tracker consumer
  (Apple AirTag, Samsung SmartTag, Tile, Chipolo) o tracker GSM/4G
  attivi (per auto, moto, bici, container, valigie, animali) — ogni
  tag diventa un marker "live" sulla mappa con stato batteria, ultimo
  aggiornamento e cronologia delle posizioni. Casi d'uso:
    - **Auto parcheggiata**: ritrovare dove l'hai lasciata in una
      città sconosciuta o in un parcheggio multipiano
    - **Oggetti smarriti**: zaino, portafoglio, chiavi, drone
    - **Antifurto bici / moto**: alert se il tag si muove fuori
      da una zona definita (geofencing) o quando ti allontani
    - **Animali domestici**: cane / gatto outdoor con collare GPS
    - **Bagagli in viaggio**: visualizzare valigie in transito
      aereo / ferroviario per evitare smarrimenti
    - **Asset aziendali**: flotta veicoli, attrezzature di cantiere,
      pallet, container, casse strumenti dei tecnici on-field
    - **Family safety**: tag indossabile per bambini, anziani o
      persone con esigenze di assistenza, con notifica se escono
      da casa / scuola / area sicura
  Implementazione: endpoint POST `/api/tags/:id/ping` per i tag GSM
  con autenticazione device-key; per i tag Bluetooth si appoggia
  all'app companion mobile (PWA + Web Bluetooth API) che ritrasmette
  la posizione del telefono quando è in prossimità del tag.
- **Plug-and-play tracker industriali**: connettori per dispositivi
  LoRaWAN (rete pubblica TheThingsNetwork / Helium) e moduli GSM/NB-IoT
  via webhook MQTT bridge
- **IP geolocation**: input IP / range di IP → marker con paese-città-ISP
  (per audit di accessi, threat intel, demo geografico di traffico web)
- **Reverse geocoding on click**: click sulla mappa → indirizzo → marker

### Analisi geospaziale
- **Geofencing**: alert quando un marker live entra/esce da un poligono
  (delivery completed, fuori-area, ingresso zona ristretta)
- **Isocrone**: "tutto ciò che è raggiungibile in 15 minuti d'auto da qui"
- **Multi-stop routing ottimizzato** (TSP / VRP) con tempi finestra
- **Clustering geografico**: trovare cluster naturali nei marker
  (es. cluster di clienti da servire con una nuova filiale)
- **Heatmap density**: aggregare punti per densità (visite, vendite,
  segnalazioni)

### UX e collaborazione
- **Auth multi-utente** (Supabase Auth): ogni utente vede solo i propri
  marker; workspace condivisi per team
- **Permission granulari**: ruoli (owner/editor/viewer) sui workspace
- **Public share link**: pubblicare una collezione di marker con URL stabile
- **Embed widget**: `<iframe>` per integrare la mappa in altri siti
- **Mobile PWA**: installabile, con `navigator.geolocation` per aggiungere
  marker direttamente "dove sono adesso"
- **Tag e filtri**: ogni marker può avere tag colorati, filtri UI per
  categoria/data/distanza-da
- **Note rich-text e allegati**: salvare foto, file, link per marker
- **Voice input**: dettatura nome+indirizzo per aggiungere marker hands-free
- **Drawing tools**: poligoni e linee custom per disegnare zone, percorsi
  manuali, aree di copertura

### Livelli mappa e visualizzazione
- **Tile satellitari** (Esri World Imagery, MapTiler, Mapbox Satellite)
  come layer opzionale
- **Layer 3D building** (MapLibre `fill-extrusion`)
- **Globo 3D** (mapcn supporta `projection: { type: "globe" }`)
- **Layer meteo / traffico** in overlay
- **Toggle tema mappa** (light/dark/topo/outdoor)

### Estensioni API / piattaforma
- **REST API pubblica** con chiavi per integrazioni terze
- **GraphQL** per query complesse client-side
- **Webhook in uscita**: notifica esterna quando un marker viene
  creato/modificato/eliminato
- **SSE / Supabase Realtime** per aggiornamenti live multi-client
- **Export GPX / KML** per app outdoor e Google Earth
- **SDK JavaScript** lightweight per consumare gli endpoint

### Notifiche e automazione
- **SMS / push** quando un marker live entra in un raggio prefissato
  (es. "il corriere è a meno di 1 km")
- **Telegram / Slack bot** per query rapide ("dimmi quanto dista X da Y")
- **AI insights**: "le tue 6 case da visitare oggi richiedono 4h totali,
  consiglio quest'ordine"
- **Anomaly detection**: alert se un veicolo si ferma fuori da una zona
  pianificata o si discosta dalla rotta

### Verticali pacchettizzabili
- **Tracker corrieri SaaS**: white-label per ditte di consegne piccole
- **Asset tracker industriale**: per aziende di manutenzione cancelli,
  ascensori, sicurezza
- **Sales territory tool** per PMI commerciali
- **Real estate companion**: agente immobiliare con clienti e immobili
  geo-organizzati

---

## 7. Note narrative per la pagina portfolio

Suggerimenti per la copy della pagina:

- **Hero**: una frase che cattura — "Una mappa personale che capisce
  davvero dove sono le cose, e quanto distano." Sotto, badge dello stack
  (Next.js / React / MapLibre / Supabase / TypeScript).
- **Screenshot scuro** del pannello amber/black sopra la mappa con un
  paio di marker selezionati e la polyline che li collega.
- **Sezione "Cosa fa oggi"**: tre-quattro bullet visuali (segnaposto,
  distanze, percorsi, persistenza cloud).
- **Sezione "Come potrebbe evolvere"**: due colonne, privati ed enterprise,
  con icone. Pescare 5–6 use case più impressionanti dalla §5.
- **Sezione "Architettura"**: il diagramma ASCII della §3 trasformato in
  diagramma SVG; testo che spiega perché serverless + Postgres + WebGL
  scala bene fino a decine di migliaia di punti.
- **Sezione "Roadmap / idee aperte"**: una griglia di "card" con i temi
  della §6 (analisi geospaziale, integrazioni, mobile, ecc.).
- **CTA finale**: "Vuoi una versione customizzata per la tua azienda?" →
  contatti.

**Tone of voice consigliato**: pragmatico e tech, niente buzzword da
agenzia, esempi concreti, mostra che il progetto è production-aware
(RLS Supabase, rate-limit Nominatim, Strict-Mode safety per WebGL, ecc.).

---

## 8. Quick reference (per Claude Code quando genera la pagina)

- Repo: `location-tracker`
- Linguaggi: TypeScript, SQL (Postgres)
- Live demo: (URL da inserire se deployato)
- Source: (URL repo se pubblico)
- Tema portfolio: il sito portfolio è separato; usa la sua palette / font
  esistenti, non quelli di questo progetto (amber/black appartengono al
  Location Tracker, non al portfolio).
- Sezione consigliata del portfolio: "Lab" / "Side projects" / "Open work"
