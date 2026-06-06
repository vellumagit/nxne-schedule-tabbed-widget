(function() {
  // ─── CONFIG ───────────────────────────────────────────────────
  const PROXY_URL = 'https://velluma.co/nxne-proxy.php';
  const POLL_MS   = 3 * 60 * 1000;

  /* Festival date constants */
  const FEST_YEAR  = 2026;
  const FEST_MONTH = 5; // 0-indexed: June
  const DAY_KEYS = ['jun10','jun11','jun12','jun13','jun14'];          // festival proper
  const LEAD_UP_DAYS = ['jun2'];                                       // pre-festival days (not in "All Days" view)
  /* Day themes intentionally blank — re-enable per-day labels by filling in
     a string for any theme below; the render sites already handle empty. */
  const DAY_INFO = {
    jun2:  { name:'Mon', full:'Monday',    date:'June 2',  num:'2',  dom:2,  theme:'' },
    jun10: { name:'Wed', full:'Wednesday', date:'June 10', num:'10', dom:10, theme:'' },
    jun11: { name:'Thu', full:'Thursday',  date:'June 11', num:'11', dom:11, theme:'' },
    jun12: { name:'Fri', full:'Friday',    date:'June 12', num:'12', dom:12, theme:'' },
    jun13: { name:'Sat', full:'Saturday',  date:'June 13', num:'13', dom:13, theme:'' },
    jun14: { name:'Sun', full:'Sunday',    date:'June 14', num:'14', dom:14, theme:'' },
  };

  /* Hardcoded events — always merged with proxy data. Use sparingly for one-offs
     that don't live in the EVENTS CALENDAR sheet (e.g. pre-festival webinars,
     last-minute partner additions). Each entry needs day/date/time/event/venue
     /category. ticketUrl + description optional. */
  const HARDCODED_EVENTS = [
    {
      day: 'Mon',
      date: 'Jun 2',
      time: '7:00 PM – 8:00 PM',
      event: "The Artist's Guide to Showcasing",
      venue: 'Online webinar',
      category: 'Industry',
      ticketUrl: 'https://www.nxne.com/tickets',
      description: "A webinar on turning showcases into meaningful career steps.\n\nSpeaker: Claire Boning, Misfit Music Inc.\n\nPresented by Misfit Music Inc. & NXNE."
    },
    {
      day: 'Wed',
      date: 'Jun 10',
      time: '7:00 PM – 9:00 PM',
      event: "Rolling Stone Creator Series with Fridayy",
      venue: 'TIFF Lightbox',
      category: 'Partner Events',
      ticketUrl: 'https://www.nxne.com/tickets',
      description: "An intimate Rolling Stone creator conversation featuring Fridayy.\n\nDoors at 7 PM. Sessions begin at 8 PM.\n\nPresented by Rolling Stone × NXNE."
    },
    {
      day: 'Thu',
      date: 'Jun 11',
      time: '4:00 PM – 6:00 PM',
      event: "TIME Magazine Launch",
      venue: 'TIFF Lightbox',
      category: 'Partner Events',
      ticketUrl: 'https://www.nxne.com/tickets',
      description: "TIME Magazine launch event at NXNE 2026.\n\nDoors at 4 PM. Program begins at 5 PM."
    }
  ];
  const DAY_START_HOUR = 10;
  const DAY_END_HOUR   = 27;
  const SLOTS_PER_HOUR = 2;
  const SLOT_COUNT     = (DAY_END_HOUR - DAY_START_HOUR) * SLOTS_PER_HOUR;

  const CAT_STYLE = {
    'Showcase':       { color: '#d94f2b' },
    'Party':          { color: '#d63a8a' },
    'Industry':       { color: '#5589c2' },
    'Awards':         { color: '#9f6fc9' },
    'Watch Party':    { color: '#3a9968' },
    'Free Outdoor':   { color: '#e89818' },
    'Partner Events': { color: '#0099a8' },
    'Hub':            { color: '#c2bd92' },
  };
  const DEFAULT_CAT = { color: '#888375' };

  /* Filter chips for the Industry tab. Panelist is intentionally excluded — panelists
     live in their own tab. "Other" is also excluded so the chips stay focused. */
  const PEOPLE_FILTER_ORDER = ['Artist','Media','Music Industry Professional','NXNE Partner','Sponsor'];

  /* Fallback events — used only on cold-start proxy failure. */
  const FALLBACK_EVENTS = [
    ['Wed','Jun 10','10:00 AM – 7:00 PM','HQ Coffee & Networking','NXNE HQ','Hub'],
    ['Wed','Jun 10','10:00 AM – 3:00 PM','Billboard Summit','TIFF Lightbox','Industry'],
    ['Wed','Jun 10','4:00 PM – 8:00 PM','Billboard Power Players','Rebel','Industry'],
    ['Wed','Jun 10','5:00 PM – 8:00 PM','NXNE Launch Party','Artist House','Party'],
    ['Wed','Jun 10','6:00 PM – 8:00 PM','Industry Mixer','W Toronto','Industry'],
    ['Wed','Jun 10','8:00 PM – 2:00 AM','Discovery Showcases','Clubs across Toronto','Showcase'],
    ['Wed','Jun 10','9:00 PM – 12:00 AM','Billboard The Stage — Underplay','TBA','Showcase'],
    ['Wed','Jun 10','9:00 PM – 1:00 AM','Billboard Spotlight Shows','Clubs across Toronto','Showcase'],
    ['Thu','Jun 11','10:00 AM – 7:00 PM','HQ Coffee & Networking','NXNE HQ','Hub'],
    ['Thu','Jun 11','10:00 AM – 4:30 PM','SYNC: Sound & Vision','W Toronto','Industry'],
    ['Thu','Jun 11','2:00 PM – 4:00 PM','World Cup Watch Party','Nathan Phillips Square','Watch Party'],
    ['Thu','Jun 11','3:00 PM – 5:00 PM','Billboard Managers to Watch','W Toronto','Industry'],
    ['Thu','Jun 11','5:30 PM – 9:00 PM','SYNC Awards','Concert Hall','Awards'],
    ['Thu','Jun 11','8:00 PM – 2:00 AM','Discovery Showcases','Clubs across Toronto','Showcase'],
    ['Thu','Jun 11','8:00 PM – 11:00 PM','Rolling Stone: Future of Music','W Toronto','Industry'],
    ['Thu','Jun 11','9:00 PM – 12:00 AM','Billboard The Stage — Underplay','TBA','Showcase'],
    ['Thu','Jun 11','9:00 PM – 1:00 AM','Billboard Spotlight Shows','Clubs across Toronto','Showcase'],
    ['Fri','Jun 12','10:00 AM – 7:00 PM','HQ Coffee & Networking','NXNE HQ','Hub'],
    ['Fri','Jun 12','10:00 AM – 3:00 PM','Next Level Panels — Live & Touring','TIFF Lightbox','Industry'],
    ['Fri','Jun 12','11:00 AM – 4:00 PM','NXNE Day Party','Long & McQuade','Party'],
    ['Fri','Jun 12','3:00 PM – 5:00 PM','World Cup Watch Party','Nathan Phillips Square','Watch Party'],
    ['Fri','Jun 12','4:00 PM – 9:00 PM','NXNE Music @ Nathan Phillips Square','Nathan Phillips Square','Free Outdoor'],
    ['Fri','Jun 12','4:30 PM – 5:30 PM','City of Toronto + TMAC Panel','Artist House','Industry'],
    ['Fri','Jun 12','5:30 PM – 7:30 PM','Polaris Long List Announce','Artist House','Industry'],
    ['Fri','Jun 12','8:00 PM – 2:00 AM','Discovery Showcases','Clubs across Toronto','Showcase'],
    ['Fri','Jun 12','9:00 PM – 12:00 AM','Billboard The Stage — Underplay','TBA','Showcase'],
    ['Fri','Jun 12','9:00 PM – 1:00 AM','Billboard Spotlight Shows','Clubs across Toronto','Showcase'],
    ['Sat','Jun 13','10:00 AM – 7:00 PM','HQ Coffee & Networking','NXNE HQ','Hub'],
    ['Sat','Jun 13','10:00 AM – 3:00 PM','Next Level Panels — Artist Day','TIFF Lightbox','Industry'],
    ['Sat','Jun 13','3:00 PM – 5:00 PM','FIFA Watch Party','Hotel X','Watch Party'],
    ['Sat','Jun 13','4:00 PM – 8:00 PM','Believe Panel + Showcase','The Rivoli','Industry'],
    ['Sat','Jun 13','5:00 PM – 7:00 PM','YMP Mixer','Artist House','Industry'],
    ['Sat','Jun 13','5:00 PM – 9:00 PM','NXNE Music @ Nathan Phillips Square','Nathan Phillips Square','Free Outdoor'],
    ['Sat','Jun 13','8:00 PM – 2:00 AM','Discovery Showcases','Clubs across Toronto','Showcase'],
    ['Sat','Jun 13','9:00 PM – 12:00 AM','Billboard The Stage — Underplay','TBA','Showcase'],
    ['Sat','Jun 13','9:00 PM – 1:00 AM','Billboard Spotlight Shows','Clubs across Toronto','Showcase'],
    ['Sun','Jun 14','12:00 PM – 10:00 PM','Manifesto','Fort York','Free Outdoor'],
    ['Sun','Jun 14','12:00 PM – 9:00 PM','Sankofa Square Programming','Sankofa Square','Free Outdoor'],
    ['Sun','Jun 14','7:00 PM – 11:00 PM','NXNE Closing Party','Sankofa Square','Party'],
    ['Sun','Jun 14','9:00 PM – 12:00 AM','Billboard The Stage — Underplay','TBA','Showcase'],
    ['Sun','Jun 14','9:00 PM – 1:00 AM','Billboard Spotlight Shows','Clubs across Toronto','Showcase'],
    ['Sun','Jun 14','9:00 PM – 2:00 AM','Discovery Showcases — Closing Night','Clubs across Toronto','Showcase'],
  ];

  /* ─── STATE ──────────────────────────────────────────────────── */
  let SCHEDULE        = [];
  let SUMMIT_SESSIONS = [];
  let PEOPLE          = [];
  let ALL_CATS        = [];
  let state = { activeCats: new Set(), activeDay: 'jun10', currentEventIdx: null, tab: 'calendar', summitDay: 'all', industryFilter: 'all' };
  let loaded = false;

  /* ─── CSS — all scoped under #nxne-full-schedule ─────────────── */
  const css = `
    #nxne-full-schedule, #nxne-full-schedule *, #nxne-full-schedule *::before, #nxne-full-schedule *::after { box-sizing: border-box; margin: 0; padding: 0; }
    #nxne-full-schedule {
      --black: #000000;
      --black-2: #0a0a08;
      --black-3: #14130d;
      --cream: #e8e4c0;
      --cream-dim: rgba(232,228,192,0.55);
      --cream-faint: rgba(232,228,192,0.06);
      --red: #d94f2b;
      --red-bright: #ff6440;
      --red-dim: rgba(217,79,43,0.18);
      --muted: rgba(232,228,192,0.42);
      --border: rgba(232,228,192,0.13);
      --border-strong: rgba(232,228,192,0.28);
      --cat-showcase:  #d94f2b;
      --cat-party:     #d63a8a;
      --cat-industry:  #5589c2;
      --cat-awards:    #9f6fc9;
      --cat-watch:     #3a9968;
      --cat-outdoor:   #e89818;
      --cat-hub:       #c2bd92;
      --cat-default:   #888375;
      background: var(--black); color: var(--cream);
      font-family: 'Barlow', sans-serif; font-weight: 300;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
    }
    #nxne-full-schedule.embedded .page-hero { display: none; }
    #nxne-full-schedule button { font-family: inherit; }

    /* HERO */
    #nxne-full-schedule .page-hero { padding: 56px 40px 36px; border-bottom: 1px solid var(--border); position: relative; }
    #nxne-full-schedule .page-hero::before {
      content: ''; position: absolute; bottom: -1px; left: 0; width: 80px; height: 2px;
      background: var(--red);
    }
    #nxne-full-schedule .page-hero-eyebrow {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 13px;
      letter-spacing: 4px; text-transform: uppercase; color: var(--muted);
      margin-bottom: 14px; display: flex; align-items: center; gap: 10px;
    }
    #nxne-full-schedule .page-hero-eyebrow::before {
      content: ''; display: inline-block; width: 24px; height: 1px; background: var(--red);
    }
    #nxne-full-schedule .page-hero-title {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
      font-size: clamp(56px, 9vw, 110px); line-height: 0.88;
      text-transform: uppercase; letter-spacing: -1.5px;
      color: var(--cream); margin-bottom: 18px;
    }
    #nxne-full-schedule .page-hero-title em { color: var(--red); font-style: italic; font-weight: 900; }
    #nxne-full-schedule .page-hero-sub {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 13px;
      letter-spacing: 3px; text-transform: uppercase; color: var(--muted);
      display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
    }
    #nxne-full-schedule .page-hero-sub span { display: flex; align-items: center; gap: 14px; }
    #nxne-full-schedule .page-hero-sub span::after { content: '·'; color: var(--border-strong); }
    #nxne-full-schedule .page-hero-sub span:last-child::after { display: none; }

    /* LIVE CHIP */
    #nxne-full-schedule .live-chip {
      position: absolute; top: 50px; right: 40px;
      display: flex; align-items: center; gap: 8px;
      padding: 8px 14px; background: var(--red-dim);
      border: 1px solid rgba(217,79,43,0.4);
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
      font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
      color: var(--cream);
    }
    #nxne-full-schedule .live-dot {
      width: 7px; height: 7px; border-radius: 50%; background: var(--red-bright);
      animation: nxne-fs-pulse 2s ease-in-out infinite; flex-shrink: 0;
      box-shadow: 0 0 8px var(--red-bright);
    }
    @keyframes nxne-fs-pulse {
      0%,100% { opacity: 1; transform: scale(1); }
      50%     { opacity: .35; transform: scale(.65); }
    }

    /* DAY PICKER */
    #nxne-full-schedule .day-picker-wrap { padding: 28px 40px 24px; background: var(--black); }
    #nxne-full-schedule .day-picker-label {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
      font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
      color: var(--muted); margin-bottom: 14px;
      display: flex; align-items: center; gap: 10px;
    }
    #nxne-full-schedule .day-picker-label::before {
      content: ''; display: inline-block; width: 18px; height: 1px; background: var(--red);
    }
    #nxne-full-schedule .day-picker {
      display: grid; grid-template-columns: repeat(6, 1fr) auto; gap: 10px;
    }
    #nxne-full-schedule .day-card {
      background: transparent; border: 1px solid var(--border-strong);
      color: var(--cream); cursor: pointer; padding: 18px 18px 16px;
      text-align: left; transition: all 0.18s ease; position: relative;
      overflow: hidden;
    }
    #nxne-full-schedule .day-card::before {
      content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 3px;
      background: var(--red); transform: scaleX(0); transform-origin: left;
      transition: transform 0.25s ease;
    }
    #nxne-full-schedule .day-card:hover { border-color: var(--cream); background: rgba(232,228,192,0.04); }
    #nxne-full-schedule .day-card:hover::before { transform: scaleX(0.3); }
    #nxne-full-schedule .day-card.active { background: var(--red); border-color: var(--red); }
    #nxne-full-schedule .day-card.active::before { transform: scaleX(1); }
    #nxne-full-schedule .day-card.today:not(.active) { border-color: var(--red); }
    #nxne-full-schedule .day-card.today:not(.active) .day-card-name { color: var(--red); }
    #nxne-full-schedule .day-card-name {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
      font-size: 13px; letter-spacing: 2px; text-transform: uppercase;
      color: var(--cream); display: block; margin-bottom: 2px;
    }
    #nxne-full-schedule .day-card.active .day-card-name { color: var(--cream); }
    #nxne-full-schedule .day-card-num {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
      font-size: 38px; line-height: 1; color: var(--cream); display: block;
      margin: 4px 0 6px;
    }
    #nxne-full-schedule .day-card-month {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
      font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
      color: var(--cream-dim); display: block;
    }
    #nxne-full-schedule .day-card.active .day-card-month { color: rgba(232,228,192,0.85); }
    #nxne-full-schedule .day-card-meta {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
      font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
      color: var(--cream-dim); margin-top: 10px; padding-top: 8px;
      border-top: 1px solid var(--border);
    }
    #nxne-full-schedule .day-card.active .day-card-meta { color: rgba(232,228,192,0.9); border-top-color: rgba(232,228,192,0.25); }
    #nxne-full-schedule .day-card-theme { display: block; color: var(--red); font-weight: 900; margin-bottom: 2px; }
    #nxne-full-schedule .day-card.active .day-card-theme { color: var(--cream); }
    #nxne-full-schedule .day-card-all {
      background: var(--black-3); padding: 18px 22px;
      display: flex; flex-direction: column; justify-content: space-between;
      min-width: 120px;
    }
    #nxne-full-schedule .day-card-all .day-card-name { font-size: 13px; }
    #nxne-full-schedule .day-card-all .day-card-num { font-size: 28px; }
    #nxne-full-schedule .day-card-live {
      position: absolute; top: 8px; right: 8px;
      width: 7px; height: 7px; border-radius: 50%; background: var(--red-bright);
      animation: nxne-fs-pulse 2s ease-in-out infinite; box-shadow: 0 0 6px var(--red-bright);
    }

    /* SUBBAR */
    #nxne-full-schedule .subbar {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 40px; background: var(--black-2);
      border-bottom: 1px solid var(--border); flex-wrap: wrap;
    }
    #nxne-full-schedule .subbar-count {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
      font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase;
      color: var(--muted); margin-right: 8px;
    }
    #nxne-full-schedule .subbar-count strong { color: var(--cream); font-weight: 900; font-size: 14px; }
    #nxne-full-schedule .legend-pills { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    #nxne-full-schedule .legend-pill {
      display: inline-flex; align-items: center; gap: 7px;
      background: transparent; border: 1px solid var(--border-strong);
      color: var(--cream); font-family: 'Barlow Condensed', sans-serif;
      font-weight: 700; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase;
      padding: 6px 12px 6px 10px; cursor: pointer; transition: all 0.15s; user-select: none;
    }
    #nxne-full-schedule .legend-pill:hover { border-color: var(--cream); }
    #nxne-full-schedule .legend-pill.active { background: rgba(232,228,192,0.1); border-color: var(--cream); }
    #nxne-full-schedule .legend-pill.dimmed { opacity: 0.35; }
    #nxne-full-schedule .legend-swatch { width: 9px; height: 9px; flex-shrink: 0; border-radius: 50%; }
    #nxne-full-schedule .subbar-spacer { flex: 1; }
    #nxne-full-schedule .reset-btn {
      background: transparent; border: 1px solid var(--red); color: var(--red);
      font-family: 'Barlow Condensed', sans-serif; font-size: 11px; font-weight: 700;
      letter-spacing: 2px; text-transform: uppercase; padding: 7px 14px;
      cursor: pointer; transition: all 0.15s; opacity: 0; pointer-events: none;
    }
    #nxne-full-schedule .reset-btn.visible { opacity: 1; pointer-events: auto; }
    #nxne-full-schedule .reset-btn:hover { background: var(--red); color: var(--cream); }

    /* TIMELINE */
    #nxne-full-schedule .timeline-wrap {
      background: var(--black); padding: 28px 0 80px;
      overflow-x: auto; min-height: 60vh;
      transition: opacity 0.18s ease;
    }
    #nxne-full-schedule .timeline-wrap.swapping { opacity: 0; }
    #nxne-full-schedule .day-headline {
      max-width: 880px; margin: 0 auto 20px; padding: 0 24px;
      display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap;
    }
    #nxne-full-schedule .day-headline-name {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
      font-size: clamp(42px, 6vw, 64px); line-height: 1;
      letter-spacing: -0.5px; text-transform: uppercase; color: var(--cream);
    }
    #nxne-full-schedule .day-headline-name em { color: var(--red); font-style: italic; font-weight: 900; }
    #nxne-full-schedule .day-headline-date {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
      font-size: 13px; letter-spacing: 3px; text-transform: uppercase; color: var(--muted);
    }
    #nxne-full-schedule .day-headline-now {
      display: inline-flex; align-items: center; gap: 7px;
      background: var(--red); color: var(--cream);
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
      font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
      padding: 5px 11px; margin-left: auto;
    }
    #nxne-full-schedule .day-headline-now .live-dot { background: var(--cream); box-shadow: 0 0 6px var(--cream); }

    #nxne-full-schedule .timeline {
      display: grid; grid-template-columns: 70px 1fr;
      margin: 0 auto; padding: 0 24px; max-width: 880px; position: relative;
    }
    #nxne-full-schedule .timeline.multi {
      grid-template-columns: 70px repeat(5, minmax(220px, 1fr));
      min-width: 1180px; max-width: none; margin: 0 24px; padding: 0;
    }
    #nxne-full-schedule .col-head {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 14px;
      letter-spacing: 2px; text-transform: uppercase;
      color: var(--cream); padding: 0 14px 14px; background: transparent;
    }
    #nxne-full-schedule .col-head .day-num { color: var(--red); margin-right: 8px; font-weight: 900; }
    #nxne-full-schedule .col-head .day-date {
      display: block; font-size: 10px; color: var(--muted);
      font-weight: 700; letter-spacing: 1.5px; margin-top: 2px;
    }
    #nxne-full-schedule .col-head.time-head { padding: 0 8px 14px; font-size: 9px; color: var(--muted); }
    #nxne-full-schedule .time-cell {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
      font-size: 11px; letter-spacing: 0.5px;
      color: transparent; padding: 4px 12px 0; text-align: right;
      position: relative; white-space: nowrap;
    }
    #nxne-full-schedule .time-cell.hour { color: var(--cream-dim); font-weight: 700; }
    #nxne-full-schedule .day-cell { position: relative; }
    #nxne-full-schedule .now-line {
      position: absolute; left: 0; right: 0; height: 2px;
      background: var(--red-bright); pointer-events: none;
      z-index: 3; box-shadow: 0 0 8px var(--red-bright);
    }
    #nxne-full-schedule .now-line::before {
      content: 'NOW'; position: absolute; left: -38px; top: -7px;
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
      font-size: 10px; letter-spacing: 1.5px; color: var(--red-bright);
      background: var(--black); padding: 2px 4px;
    }

    /* EVENT BLOCKS */
    #nxne-full-schedule .event {
      margin: 2px 0; padding: 7px 11px;
      font-family: 'Barlow Condensed', sans-serif;
      font-weight: 700; font-size: 12px; line-height: 1.15; letter-spacing: 0.4px;
      overflow: hidden; cursor: pointer;
      transition: filter 0.12s ease, outline-color 0.12s ease, transform 0.12s ease;
      position: relative; z-index: 1; min-height: 0;
      outline: 1px solid transparent; outline-offset: -1px;
      border-left: 4px solid var(--cat-accent, transparent);
      animation: nxne-fs-fadeIn 0.32s ease both;
      color: #fff;
    }
    @keyframes nxne-fs-fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    #nxne-full-schedule .event:hover {
      filter: brightness(1.15) saturate(1.05);
      outline-color: var(--cream);
      z-index: 4;
      transform: translateY(-1px);
    }
    #nxne-full-schedule .event-time {
      display: block; font-family: 'Barlow Condensed', sans-serif;
      font-weight: 700; font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase;
      margin-bottom: 2px; opacity: 0.95;
      text-shadow: 0 1px 2px rgba(0,0,0,0.25);
    }
    #nxne-full-schedule .event-title {
      display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
      font-family: 'Barlow Condensed', sans-serif;
      font-weight: 900; font-size: 13px; letter-spacing: 0.3px; text-transform: uppercase;
      line-height: 1.1;
      overflow: hidden;
      text-shadow: 0 1px 3px rgba(0,0,0,0.35);
    }
    #nxne-full-schedule .event-venue {
      display: block; font-family: 'Barlow', sans-serif;
      font-weight: 500; font-size: 10.5px; opacity: 0.92;
      margin-top: 2px; letter-spacing: 0.2px;
      line-height: 1.1;
      text-shadow: 0 1px 2px rgba(0,0,0,0.25);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #nxne-full-schedule .event.live { box-shadow: inset 0 3px 0 0 var(--red-bright); padding-top: 10px; }
    #nxne-full-schedule .event.short { padding: 6px 10px; }
    #nxne-full-schedule .event.short .event-time { font-size: 9px; letter-spacing: 1px; margin-bottom: 2px; opacity: 0.9; }
    #nxne-full-schedule .event.short .event-title { font-size: 12px; line-height: 1.1; }
    #nxne-full-schedule .event.short .event-venue { display: none; }
    #nxne-full-schedule .event.tiny {
      padding: 5px 9px;
      display: flex; align-items: center; gap: 7px;
      line-height: 1.05;
    }
    #nxne-full-schedule .event.tiny .event-time {
      flex-shrink: 0; margin: 0;
      font-size: 9px; letter-spacing: 0.8px; opacity: 0.9;
    }
    #nxne-full-schedule .event.tiny .event-title {
      flex: 1; min-width: 0;
      font-size: 11px; letter-spacing: 0.2px; line-height: 1.05;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #nxne-full-schedule .event.tiny .event-venue { display: none; }
    #nxne-full-schedule .event.tiny.live { padding-top: 8px; }
    #nxne-full-schedule .event.narrow { padding: 6px 8px; border-left-width: 3px; }
    #nxne-full-schedule .event.narrow .event-time { font-size: 9px; letter-spacing: 0.8px; margin-bottom: 2px; }
    #nxne-full-schedule .event.narrow .event-title {
      font-size: 11px; letter-spacing: 0.2px; line-height: 1.1;
      display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
      overflow: hidden;
    }
    #nxne-full-schedule .event.narrow .event-venue {
      font-size: 10px; margin-top: 3px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #nxne-full-schedule .event.narrow.tiny { display: flex; padding: 5px 7px; }
    #nxne-full-schedule .event.dimmed { opacity: 0.18; }

    /* CARD LIST (mobile) */
    #nxne-full-schedule .card-list { display: none; padding: 32px 24px 80px; max-width: 880px; margin: 0 auto; }
    #nxne-full-schedule .card-list .day-headline { padding: 0; margin: 0 0 22px; }
    #nxne-full-schedule .card-section {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
      font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
      color: var(--muted); margin: 24px 0 10px;
      display: flex; align-items: center; gap: 10px;
    }
    #nxne-full-schedule .card-section::before {
      content: ''; display: inline-block; width: 18px; height: 1px; background: var(--red);
    }
    #nxne-full-schedule .card-event {
      display: grid; grid-template-columns: 84px 1fr;
      gap: 14px; padding: 16px 0;
      border-top: 1px solid var(--border); cursor: pointer;
      transition: background 0.15s;
    }
    #nxne-full-schedule .card-event:hover { background: rgba(232,228,192,0.03); }
    #nxne-full-schedule .card-event-time {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
      font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase;
      color: var(--cream-dim); padding-top: 3px;
    }
    #nxne-full-schedule .card-event-body { border-left: 3px solid; padding-left: 14px; }
    #nxne-full-schedule .card-event-title {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
      font-size: 17px; letter-spacing: 0.3px; text-transform: uppercase;
      color: var(--cream); line-height: 1.15; margin-bottom: 4px;
    }
    #nxne-full-schedule .card-event-venue {
      font-family: 'Barlow', sans-serif; font-weight: 500; font-size: 13px;
      color: var(--cream-dim); letter-spacing: 0.2px;
    }
    #nxne-full-schedule .card-event-cat {
      display: inline-block; font-family: 'Barlow Condensed', sans-serif;
      font-weight: 700; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
      margin-top: 6px; padding: 2px 8px; border: 1px solid;
    }

    /* EMPTY STATE */
    #nxne-full-schedule .empty-state {
      padding: 80px 24px; text-align: center; max-width: 480px; margin: 0 auto;
    }
    #nxne-full-schedule .empty-state-eyebrow {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
      font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
      color: var(--red); margin-bottom: 12px;
    }
    #nxne-full-schedule .empty-state-title {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
      font-size: 32px; letter-spacing: 0.5px; text-transform: uppercase;
      color: var(--cream); margin-bottom: 12px; line-height: 1.1;
    }
    #nxne-full-schedule .empty-state-text {
      font-family: 'Barlow', sans-serif; font-size: 15px;
      color: var(--cream-dim); line-height: 1.5;
    }

    /* MODAL — uses position:fixed, IDs scoped under widget container */
    #nxne-full-schedule .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 99996;
      display: none; backdrop-filter: blur(4px);
      animation: nxne-fs-fadeOverlay 0.2s ease;
    }
    @keyframes nxne-fs-fadeOverlay { from { opacity: 0; } to { opacity: 1; } }
    #nxne-full-schedule .modal-overlay.open { display: block; }
    #nxne-full-schedule .modal {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
      width: min(560px, 92vw); background: var(--black-2);
      border: 1px solid var(--cream); z-index: 99997; padding: 32px 32px 28px;
      display: none; max-height: 90vh; overflow-y: auto;
      animation: nxne-fs-modalIn 0.22s cubic-bezier(.2,.8,.2,1);
    }
    @keyframes nxne-fs-modalIn {
      from { opacity: 0; transform: translate(-50%,-46%) scale(0.96); }
      to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
    }
    #nxne-full-schedule .modal.open { display: block; }
    #nxne-full-schedule .modal-cat {
      display: inline-block; font-family: 'Barlow Condensed', sans-serif;
      font-weight: 700; font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase;
      padding: 5px 11px; border: 1px solid; margin-bottom: 18px;
    }
    #nxne-full-schedule .modal-title {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
      font-size: 32px; line-height: 1.05; letter-spacing: 0.3px; text-transform: uppercase;
      color: var(--cream); margin-bottom: 18px;
    }
    #nxne-full-schedule .modal-row {
      display: flex; gap: 14px; padding: 12px 0;
      border-top: 1px solid var(--border);
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
      font-size: 13px; letter-spacing: 1px; text-transform: uppercase;
    }
    #nxne-full-schedule .modal-row .label { color: var(--muted); width: 70px; flex-shrink: 0; }
    #nxne-full-schedule .modal-row .val { color: var(--cream); }
    #nxne-full-schedule .modal-actions {
      display: flex; gap: 10px; margin-top: 22px; flex-wrap: wrap;
    }
    #nxne-full-schedule .modal-description {
      margin-top: 24px; padding-top: 22px;
      border-top: 1px solid var(--border);
      font-family: 'Barlow', sans-serif; font-weight: 400;
      font-size: 16px; line-height: 1.65;
      color: var(--cream); opacity: 1;
    }
    #nxne-full-schedule .modal-description p { margin: 0 0 14px; }
    #nxne-full-schedule .modal-description p:last-child { margin-bottom: 0; }
    #nxne-full-schedule .modal-description.coming-soon { opacity: 0.5; font-style: italic; }
    #nxne-full-schedule .modal-description .details-soon {
      font-size: 14px; color: var(--cream-dim);
    }
    #nxne-full-schedule .modal-btn {
      flex: 1; min-width: 120px;
      background: transparent; border: 1px solid var(--cream);
      color: var(--cream); font-family: 'Barlow Condensed', sans-serif;
      font-weight: 900; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;
      padding: 12px 14px; cursor: pointer; transition: all 0.15s;
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      text-decoration: none;
    }
    #nxne-full-schedule a.modal-btn { text-decoration: none; }
    #nxne-full-schedule a.modal-btn:hover { text-decoration: none; }
    #nxne-full-schedule .modal-btn:hover { background: var(--cream); color: var(--black); }
    #nxne-full-schedule .modal-btn.primary { background: var(--red); border-color: var(--red); color: var(--cream); }
    #nxne-full-schedule .modal-btn.primary:hover { background: var(--red-bright); border-color: var(--red-bright); }
    /* Hero CTA — top-of-modal, largest button. Used for session-specific links
       like Next Level Panels "Get more info". */
    #nxne-full-schedule .modal-btn.hero {
      flex: 1 0 100%;
      background: var(--red); border-color: var(--red); color: var(--cream);
      font-size: 16px; letter-spacing: 2.5px;
      padding: 18px 20px; margin-bottom: 6px;
      box-shadow: 0 4px 14px rgba(217,79,43,0.28);
    }
    #nxne-full-schedule .modal-btn.hero:hover {
      background: var(--red-bright); border-color: var(--red-bright); color: var(--cream);
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(217,79,43,0.4);
    }
    #nxne-full-schedule .modal-btn.copied { background: var(--cat-watch); border-color: var(--cat-watch); color: var(--cream); }
    #nxne-full-schedule .modal-close {
      position: absolute; top: 14px; right: 18px; background: none;
      border: none; color: var(--muted); font-size: 24px; cursor: pointer;
      line-height: 1; transition: color 0.15s;
    }
    #nxne-full-schedule .modal-close:hover { color: var(--cream); }

    /* SYNC FOOTER */
    #nxne-full-schedule .sync-footer {
      text-align: center; padding: 24px 20px 36px;
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
      font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
      color: var(--muted); border-top: 1px solid var(--border);
    }
    #nxne-full-schedule .sync-footer .live-dot {
      display: inline-block; vertical-align: middle; margin: 0 6px 2px 0;
      width: 6px; height: 6px;
    }

    /* RESPONSIVE */
    @media (max-width: 880px) {
      #nxne-full-schedule .page-hero { padding: 36px 20px 28px; }
      #nxne-full-schedule .page-hero-title { font-size: clamp(48px, 14vw, 80px); }
      #nxne-full-schedule .page-hero-eyebrow { font-size: 11px; padding-right: 0; }
      #nxne-full-schedule .page-hero-sub { font-size: 12px; gap: 10px; }
      #nxne-full-schedule .live-chip { display: none; }
      #nxne-full-schedule .day-picker-wrap { padding: 22px 20px 18px; }
      #nxne-full-schedule .day-picker {
        grid-template-columns: repeat(6, minmax(96px, 1fr)) auto;
        overflow-x: auto; padding-bottom: 4px; gap: 8px;
        scrollbar-width: thin;
      }
      #nxne-full-schedule .day-card { padding: 12px 12px 10px; }
      #nxne-full-schedule .day-card-num { font-size: 26px; }
      #nxne-full-schedule .day-card-name { font-size: 11px; letter-spacing: 1.5px; }
      #nxne-full-schedule .day-card-month { font-size: 10px; letter-spacing: 1.5px; }
      #nxne-full-schedule .day-card-meta { font-size: 9px; letter-spacing: 1px; padding-top: 6px; margin-top: 8px; white-space: nowrap; }
      #nxne-full-schedule .day-card-theme { white-space: normal; }
      #nxne-full-schedule .day-card-all { padding: 12px 14px; min-width: 86px; }
      #nxne-full-schedule .day-card-all .day-card-num { font-size: 20px; }
      #nxne-full-schedule .subbar { padding: 10px 20px; gap: 8px; }
      #nxne-full-schedule .legend-pill { font-size: 10px; padding: 5px 10px 5px 8px; letter-spacing: 1px; }
      #nxne-full-schedule .day-headline { padding: 0 20px; }
      #nxne-full-schedule .day-headline-name { font-size: 40px; }
    }

    /* View visibility */
    #nxne-full-schedule[data-view="day"] .timeline-wrap { display: block; }
    #nxne-full-schedule[data-view="day"] .card-list { display: none; }
    #nxne-full-schedule[data-view="all"] .timeline-wrap { display: none; }
    #nxne-full-schedule[data-view="all"] .card-list { display: block; }
    @media (max-width: 880px) {
      #nxne-full-schedule[data-view="day"] .timeline-wrap { display: none; }
      #nxne-full-schedule[data-view="day"] .card-list { display: block; }
    }

    /* MAP SIDE PANEL */
    #nxne-full-schedule #nxne-map-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.75);
      z-index: 99998; display: none; backdrop-filter: blur(2px);
    }
    #nxne-full-schedule #nxne-map-overlay.open { display: block; }
    #nxne-full-schedule #nxne-map-panel {
      position: fixed; top: 0; right: -480px;
      width: 460px; height: 100vh;
      background: var(--black); border-left: 2px solid var(--cream);
      z-index: 99999; transition: right 0.3s ease;
      display: flex; flex-direction: column;
      padding-top: var(--nxne-nav-height, 0px);
    }
    #nxne-full-schedule #nxne-map-panel.open { right: 0; }
    #nxne-full-schedule #nxne-map-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    #nxne-full-schedule #nxne-map-find {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
      font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
      color: var(--muted); margin-bottom: 3px;
    }
    #nxne-full-schedule #nxne-map-name {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
      font-size: 20px; letter-spacing: 1px; text-transform: uppercase;
      color: var(--cream);
    }
    #nxne-full-schedule #nxne-map-footer {
      padding: 14px 20px; border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    #nxne-full-schedule #nxne-map-gmaps {
      display: inline-block; background: var(--red); color: var(--cream);
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
      font-size: 13px; letter-spacing: 2px; text-transform: uppercase;
      text-decoration: none; padding: 10px 18px;
      transition: background 0.15s;
    }
    #nxne-full-schedule #nxne-map-gmaps:hover { background: var(--red-bright); }
    #nxne-full-schedule #nxne-map-close {
      background: none; border: none; color: var(--muted);
      font-size: 24px; cursor: pointer; padding: 0; line-height: 1;
      transition: color 0.15s;
    }
    #nxne-full-schedule #nxne-map-close:hover { color: var(--cream); }
    #nxne-full-schedule #nxne-map-frame-wrap { flex: 1; position: relative; overflow: hidden; }
    #nxne-full-schedule #nxne-map-frame {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      border: none;
    }
    @media (max-width: 680px) {
      #nxne-full-schedule #nxne-map-panel { width: 100%; right: -100%; }
    }

    /* TAB STRIP */
    #nxne-full-schedule .tab-strip {
      display: flex; gap: 6px;
      background: var(--black-2);
      border-bottom: 1px solid var(--border-strong);
      padding: 12px 32px 0;
      overflow-x: auto;
      scrollbar-width: none;
    }
    #nxne-full-schedule .tab-strip::-webkit-scrollbar { display: none; }
    #nxne-full-schedule .tab-btn {
      background: transparent; border: 1px solid transparent;
      border-bottom: none;
      padding: 14px 28px 14px;
      cursor: pointer; position: relative;
      text-align: left;
      transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
      border-radius: 6px 6px 0 0;
      margin-bottom: -1px;
      flex-shrink: 0;
    }
    #nxne-full-schedule .tab-btn:hover { background: rgba(232,228,192,0.06); }
    /* Group accent strip — sits flush on the top edge of every tab */
    #nxne-full-schedule .tab-btn::before {
      content: '';
      position: absolute;
      top: 0; left: 8px; right: 8px;
      height: 3px;
      background: transparent;
      border-radius: 3px 3px 0 0;
      pointer-events: none;
      transition: background 0.18s ease;
    }
    #nxne-full-schedule .tab-btn[data-group="events"]::before { background: var(--red); }
    #nxne-full-schedule .tab-btn[data-group="people"]::before { background: var(--cat-industry); }
    /* Active state — group color drives the fill + glow */
    #nxne-full-schedule .tab-btn[data-group="events"].active {
      background: var(--red);
      border-color: var(--red);
      box-shadow: 0 -2px 12px rgba(217,79,43,0.35);
    }
    #nxne-full-schedule .tab-btn[data-group="people"].active {
      background: var(--cat-industry);
      border-color: var(--cat-industry);
      box-shadow: 0 -2px 12px rgba(85,137,194,0.35);
    }
    #nxne-full-schedule .tab-btn-eyebrow {
      display: block;
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
      font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase;
      color: var(--muted); margin-bottom: 3px;
      transition: color 0.18s ease;
    }
    #nxne-full-schedule .tab-btn.active .tab-btn-eyebrow { color: rgba(255,255,255,0.85); }
    #nxne-full-schedule .tab-btn-name {
      display: block;
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
      font-size: 17px; letter-spacing: 0.5px; text-transform: uppercase;
      color: var(--cream-dim);
      transition: color 0.18s ease;
    }
    #nxne-full-schedule .tab-btn:hover .tab-btn-name { color: var(--cream); }
    #nxne-full-schedule .tab-btn.active .tab-btn-name { color: #fff; }
    #nxne-full-schedule .tab-pane { display: none; }
    #nxne-full-schedule .tab-pane.active { display: block; animation: nxne-fs-tab-fade-in 0.22s ease; }
    @keyframes nxne-fs-tab-fade-in {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* SUMMIT PANE */
    #nxne-full-schedule .summit-hero {
      max-width: 920px; margin: 0 auto; padding: 56px 32px 36px;
      border-bottom: 1px solid var(--border);
    }
    #nxne-full-schedule .summit-hero-eyebrow {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
      font-size: 12px; letter-spacing: 4px; text-transform: uppercase;
      color: var(--muted); margin-bottom: 14px;
      display: flex; align-items: center; gap: 10px;
    }
    #nxne-full-schedule .summit-hero-eyebrow::before {
      content: ''; display: inline-block; width: 24px; height: 1px; background: var(--red);
    }
    #nxne-full-schedule .summit-hero-title {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
      font-size: clamp(48px, 7vw, 88px); line-height: 0.92;
      letter-spacing: -1px; text-transform: uppercase;
      color: var(--cream); margin-bottom: 18px;
    }
    #nxne-full-schedule .summit-hero-title em { color: var(--red); font-style: italic; }
    #nxne-full-schedule .summit-hero-sub {
      font-family: 'Barlow', sans-serif; font-weight: 400; font-size: 16px;
      color: var(--cream); opacity: 0.78; line-height: 1.55; max-width: 60ch;
    }
    #nxne-full-schedule .people-hero-cta {
      font-family: 'Barlow', sans-serif; font-weight: 500;
      font-size: 15px; line-height: 1.6;
      letter-spacing: 0; text-transform: none;
      color: var(--cream); margin-top: 18px;
      max-width: 70ch;
    }
    #nxne-full-schedule .people-hero-cta a {
      color: var(--red); text-decoration: none;
      border-bottom: 1px solid var(--red);
      padding-bottom: 2px;
      transition: color 0.15s, border-color 0.15s;
    }
    #nxne-full-schedule .people-hero-cta a:hover {
      color: var(--red-bright); border-color: var(--red-bright);
    }
    #nxne-full-schedule .summit-day-strip {
      max-width: 920px; margin: 0 auto; padding: 22px 32px;
      display: flex; gap: 8px; flex-wrap: wrap;
      border-bottom: 1px solid var(--border);
    }
    #nxne-full-schedule .summit-day-pill {
      background: transparent; border: 1px solid var(--border-strong);
      color: var(--cream); cursor: pointer;
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
      font-size: 12px; letter-spacing: 2px; text-transform: uppercase;
      padding: 9px 16px;
      transition: all 0.15s ease;
    }
    #nxne-full-schedule .summit-day-pill:hover { border-color: var(--cream); }
    #nxne-full-schedule .summit-day-pill.active { background: var(--red); border-color: var(--red); }
    #nxne-full-schedule .summit-list-wrap { padding: 32px 0 80px; }
    #nxne-full-schedule .summit-list { max-width: 920px; margin: 0 auto; padding: 0 32px; }
    #nxne-full-schedule .summit-day-section-head {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
      font-size: clamp(28px, 4vw, 40px); line-height: 1;
      letter-spacing: -0.3px; text-transform: uppercase; color: var(--cream);
      margin: 36px 0 20px; display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap;
    }
    #nxne-full-schedule .summit-day-section-head:first-child { margin-top: 0; }
    #nxne-full-schedule .summit-day-section-head .num { color: var(--red); }
    #nxne-full-schedule .summit-day-section-head .meta {
      font-size: 11px; letter-spacing: 2.5px; color: var(--muted); font-weight: 700;
    }
    #nxne-full-schedule .session {
      display: grid; grid-template-columns: 130px 1fr;
      gap: 22px; padding: 28px 0 32px;
      border-top: 1px solid var(--border);
      position: relative; cursor: default;
      transition: background 0.12s;
    }
    #nxne-full-schedule .session.clickable { cursor: pointer; }
    #nxne-full-schedule .session.clickable:hover { background: rgba(232, 228, 192, 0.03); }
    #nxne-full-schedule .session.clickable:hover .session-title { color: var(--red); }
    #nxne-full-schedule .session:last-child { border-bottom: 1px solid var(--border); }
    #nxne-full-schedule .session-stripe {
      position: absolute; left: 0; top: -1px; bottom: 0; width: 4px;
      background: var(--cat-industry);
    }
    #nxne-full-schedule .session-time {
      padding-left: 18px; padding-top: 4px;
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
      font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase;
      color: var(--cream-dim); line-height: 1.4;
    }
    #nxne-full-schedule .session-venue-line {
      margin-top: 8px; font-size: 11px; letter-spacing: 1px;
      color: var(--cream); opacity: 0.6;
    }
    #nxne-full-schedule .session-body { min-width: 0; }
    #nxne-full-schedule .session-eyebrow {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
      font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
      color: var(--red); margin-bottom: 8px;
    }
    #nxne-full-schedule .session-title {
      font-family: 'Barlow', sans-serif; font-weight: 500;
      font-size: clamp(18px, 2vw, 22px); letter-spacing: 1.5px; text-transform: uppercase;
      color: var(--cream); line-height: 1.3; margin-bottom: 12px;
    }
    #nxne-full-schedule .session-desc {
      font-family: 'Barlow', sans-serif; font-weight: 400; font-size: 16px;
      color: var(--cream); opacity: 0.78; line-height: 1.55;
      margin-bottom: 20px; max-width: 64ch;
    }
    #nxne-full-schedule .session-panelists {
      display: flex; flex-direction: column; gap: 8px;
      padding-top: 16px; border-top: 1px solid var(--border);
    }
    #nxne-full-schedule .session-panelists-label {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
      font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase;
      color: var(--muted); margin-bottom: 4px;
    }
    #nxne-full-schedule .session-panelist {
      font-family: 'Barlow', sans-serif; font-size: 14px; line-height: 1.4;
      color: var(--cream);
    }
    #nxne-full-schedule .session-panelist .name { font-weight: 600; }
    #nxne-full-schedule .session-panelist .role { color: var(--cream); opacity: 0.55; }
    #nxne-full-schedule .session-panelist.moderator .name::after {
      content: 'Moderator'; display: inline-block;
      margin-left: 8px; padding: 1px 7px;
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
      font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase;
      color: var(--red); border: 1px solid var(--red);
      vertical-align: 1px;
    }
    #nxne-full-schedule .summit-placeholder {
      padding: 60px 32px;
      text-align: center;
      max-width: 540px; margin: 0 auto;
    }
    #nxne-full-schedule .summit-placeholder-eyebrow {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
      font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
      color: var(--red); margin-bottom: 14px;
    }
    #nxne-full-schedule .summit-placeholder-title {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
      font-size: 32px; letter-spacing: 0.5px; text-transform: uppercase;
      color: var(--cream); margin-bottom: 14px; line-height: 1.1;
    }
    #nxne-full-schedule .summit-placeholder-text {
      font-family: 'Barlow', sans-serif; font-size: 15px;
      color: var(--cream-dim); line-height: 1.55;
    }

    /* PEOPLE TAB */
    #nxne-full-schedule .people-filter-strip {
      display: flex; gap: 8px; flex-wrap: wrap;
      padding: 0 32px 8px;
      max-width: 1200px; margin: 0 auto;
      justify-content: center;
    }
    #nxne-full-schedule .people-filter-pill {
      background: transparent;
      border: 1px solid var(--border-strong);
      color: var(--cream-dim);
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
      font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
      padding: 7px 14px; cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }
    #nxne-full-schedule .people-filter-pill:hover { color: var(--cream); border-color: var(--cream); }
    #nxne-full-schedule .people-filter-pill.active {
      background: var(--cream); color: var(--black); border-color: var(--cream);
    }
    #nxne-full-schedule .people-grid-wrap { padding: 28px 0 80px; }
    #nxne-full-schedule .people-grid {
      max-width: 1200px; margin: 0 auto; padding: 0 32px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 18px;
    }
    #nxne-full-schedule .person-card {
      background: var(--black-2);
      border: 1px solid var(--border);
      padding: 0;
      cursor: pointer;
      transition: border-color 0.15s, transform 0.15s;
      display: flex; flex-direction: column;
      overflow: hidden;
      animation: nxne-fs-fadeIn 0.32s ease both;
    }
    #nxne-full-schedule .person-card:hover {
      border-color: var(--cream);
      transform: translateY(-2px);
    }
    #nxne-full-schedule .person-headshot {
      width: 100%; aspect-ratio: 1;
      background: var(--black-3) center/cover no-repeat;
      position: relative;
      border-bottom: 1px solid var(--border);
    }
    #nxne-full-schedule .person-headshot.no-image {
      display: flex; align-items: center; justify-content: center;
      background:
        radial-gradient(ellipse at center, rgba(229, 57, 43, 0.08) 0%, transparent 70%),
        linear-gradient(135deg, var(--black-2) 0%, var(--black-3) 100%);
      color: var(--red);
      font-family: 'Barlow Condensed', sans-serif;
      font-weight: 900; font-size: 64px; letter-spacing: 2px;
      text-transform: uppercase;
      overflow: hidden;
      position: relative;
    }
    #nxne-full-schedule .person-headshot.no-image::after {
      content: '';
      position: absolute;
      bottom: 10px; right: 10px;
      width: 38%; height: 18px;
      background: url('https://images.squarespace-cdn.com/content/v1/5cc0b65dc2ff616fc1050567/b7ac7bd1-cd63-4fb7-84c3-9daa0d8c6bf5/NXNE26-Logo-RGB-Cream.png?format=300w') right center / contain no-repeat;
      opacity: 0.4;
      pointer-events: none;
    }
    #nxne-full-schedule .person-card:hover .person-headshot.no-image {
      background:
        radial-gradient(ellipse at center, rgba(229, 57, 43, 0.16) 0%, transparent 70%),
        linear-gradient(135deg, var(--black-2) 0%, var(--black-3) 100%);
    }
    #nxne-full-schedule .person-card:hover .person-headshot.no-image::after { opacity: 0.55; }
    #nxne-full-schedule .person-card-body { padding: 16px 18px 18px; }
    #nxne-full-schedule .person-role-tag {
      display: inline-block; margin-bottom: 8px;
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
      font-size: 9px; letter-spacing: 2px; text-transform: uppercase;
      color: var(--red);
      border: 1px solid var(--red);
      padding: 2px 7px;
    }
    #nxne-full-schedule .person-name {
      font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
      font-size: 19px; line-height: 1.1;
      color: var(--cream); text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 4px;
    }
    #nxne-full-schedule .person-meta {
      font-family: 'Barlow', sans-serif; font-size: 13px;
      color: var(--cream-dim); line-height: 1.35;
    }
    #nxne-full-schedule .person-meta strong { color: var(--cream); font-weight: 600; }
    #nxne-full-schedule .person-tagline {
      margin-top: 10px;
      font-family: 'Barlow', sans-serif; font-size: 12.5px;
      color: var(--cream-dim); line-height: 1.4;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
      overflow: hidden;
    }
    #nxne-full-schedule .people-empty {
      text-align: center; padding: 60px 24px;
      color: var(--cream-dim);
      font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
      font-size: 14px; letter-spacing: 2px; text-transform: uppercase;
    }
    @keyframes nxne-fs-sessionFlash {
      0%   { box-shadow: 0 0 0 0 rgba(217,79,43,0); background: transparent; }
      20%  { box-shadow: 0 0 0 6px rgba(217,79,43,0.55); background: rgba(217,79,43,0.08); }
      100% { box-shadow: 0 0 0 0 rgba(217,79,43,0); background: transparent; }
    }
    #nxne-full-schedule .summit-session-flash {
      animation: nxne-fs-sessionFlash 1.6s ease-out;
    }
    #nxne-full-schedule .person-modal-headshot {
      width: 100%; aspect-ratio: 4/3;
      background: var(--black-3) no-repeat;
      background-size: cover;
      background-position: center 20%;
      border-bottom: 1px solid var(--border);
      margin: -32px -32px 24px;
      width: calc(100% + 64px);
      position: relative;
    }
    /* Empty wrap = no headshot (e.g. session modal). Don't leak a gap. */
    #nxne-full-schedule #person-modal-headshot-wrap:empty { display: none; }
    #nxne-full-schedule .person-modal-headshot.no-image {
      display: flex; align-items: center; justify-content: center;
      background:
        radial-gradient(ellipse at center, rgba(229, 57, 43, 0.10) 0%, transparent 75%),
        linear-gradient(135deg, var(--black-2) 0%, var(--black-3) 100%);
      color: var(--red);
      font-family: 'Barlow Condensed', sans-serif;
      font-weight: 900; font-size: 92px; letter-spacing: 3px;
      text-transform: uppercase;
      overflow: hidden;
    }
    #nxne-full-schedule .person-modal-headshot.no-image::after {
      content: '';
      position: absolute;
      bottom: 16px; right: 24px;
      width: 14%; height: 28px;
      background: url('https://images.squarespace-cdn.com/content/v1/5cc0b65dc2ff616fc1050567/b7ac7bd1-cd63-4fb7-84c3-9daa0d8c6bf5/NXNE26-Logo-RGB-Cream.png?format=500w') right center / contain no-repeat;
      opacity: 0.45;
      pointer-events: none;
    }
    #nxne-full-schedule .person-modal-bio {
      font-family: 'Barlow', sans-serif; font-size: 14.5px;
      color: var(--cream); line-height: 1.55;
      white-space: pre-wrap;
    }
    #nxne-full-schedule .person-modal-links {
      margin-top: 18px; padding-top: 16px;
      border-top: 1px solid var(--border);
      display: flex; flex-wrap: wrap; gap: 10px;
    }
    @media (max-width: 720px) {
      #nxne-full-schedule .people-grid { padding: 0 20px; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
      #nxne-full-schedule .people-filter-strip { padding: 0 16px 8px; }
      #nxne-full-schedule .person-card-body { padding: 12px 14px 14px; }
      #nxne-full-schedule .person-name { font-size: 16px; }
      #nxne-full-schedule .person-meta { font-size: 12px; }
      #nxne-full-schedule .person-tagline { font-size: 11.5px; }
      #nxne-full-schedule .person-modal-headshot { aspect-ratio: 4/3; margin: -32px -32px 18px; width: calc(100% + 64px); }
    }
    #nxne-full-schedule .modal-btn.full-session {
      border-color: var(--red); color: var(--red);
      flex: 1 0 100%;
      margin-bottom: 4px;
    }
    #nxne-full-schedule .modal-btn.full-session:hover { background: var(--red); color: var(--cream); }
    #nxne-full-schedule .email-reveal {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      flex: 1 0 100%;
      padding: 10px 14px;
      background: var(--black-2);
      border: 1px solid var(--border-strong);
    }
    #nxne-full-schedule .email-display {
      flex: 1 1 auto;
      font-family: 'Barlow', sans-serif;
      font-size: 14px;
      color: var(--cream);
      text-decoration: none;
      word-break: break-all;
      overflow-wrap: anywhere;
    }
    #nxne-full-schedule .email-display:hover { color: var(--red); text-decoration: underline; }
    #nxne-full-schedule .email-copy {
      flex: 0 0 auto;
      min-width: 90px;
      padding: 8px 12px;
      font-size: 11px;
    }
    @media (max-width: 880px) {
      #nxne-full-schedule .tab-strip { padding: 0 16px; }
      #nxne-full-schedule .tab-btn { padding: 14px 16px 12px; }
      #nxne-full-schedule .tab-btn-name { font-size: 15px; }
      #nxne-full-schedule .summit-hero { padding: 36px 20px 28px; }
      #nxne-full-schedule .summit-day-strip { padding: 16px 20px; }
      #nxne-full-schedule .summit-list { padding: 0 20px; }
      #nxne-full-schedule .session {
        grid-template-columns: 1fr; gap: 8px;
        padding: 24px 16px 26px 18px;
      }
      #nxne-full-schedule .session-time { padding-left: 0; padding-top: 0; }
      #nxne-full-schedule .session-stripe { left: 0; }
      #nxne-full-schedule .session-title { font-size: 17px; }
    }
  `;

  /* ─── INJECT FONTS + CSS ──────────────────────────────────── */
  if (!document.getElementById('nxne-fs-fonts')) {
    const link = document.createElement('link');
    link.id = 'nxne-fs-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,300;0,500;0,700;0,800;0,900;1,900&family=Barlow:wght@300;400;500;600&display=swap';
    document.head.appendChild(link);
  }
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ─── MOUNT TARGET ─────────────────────────────────────────── */
  const target = document.getElementById('nxne-full-schedule') || document.currentScript.parentElement;
  if (target.id !== 'nxne-full-schedule') target.id = 'nxne-full-schedule';
  target.innerHTML = `
    <div class="page-hero">
      <div class="live-chip" id="live-chip"><span class="live-dot"></span><span id="live-chip-text">— · — events live</span></div>
      <div class="page-hero-eyebrow">North by Northeast Music Festival &amp; Conference</div>
      <div class="page-hero-title">2026 Events<br><em>Calendar</em></div>
      <div class="page-hero-sub">
        <span>June 10 – 14</span>
        <span>Toronto, Ontario</span>
        <span>5 Days</span>
        <span>One City</span>
      </div>
    </div>

    <div class="tab-strip" id="tab-strip">
      <button class="tab-btn active" data-tab="calendar" data-group="events" onclick="nxneSchedule.setTab('calendar')">
        <span class="tab-btn-eyebrow">View</span>
        <span class="tab-btn-name">Calendar</span>
      </button>
      <button class="tab-btn" data-tab="summit" data-group="events" onclick="nxneSchedule.setTab('summit')">
        <span class="tab-btn-eyebrow">Conference</span>
        <span class="tab-btn-name">Panels</span>
      </button>
      <button class="tab-btn" data-tab="panelists" data-group="people" onclick="nxneSchedule.setTab('panelists')" style="display:none">
        <span class="tab-btn-eyebrow">Voices at NXNE</span>
        <span class="tab-btn-name">Panelists</span>
      </button>
      <button class="tab-btn" data-tab="industry" data-group="people" onclick="nxneSchedule.setTab('industry')">
        <span class="tab-btn-eyebrow">Who's Coming</span>
        <span class="tab-btn-name">Industry</span>
      </button>
    </div>

    <section class="tab-pane active" data-tab="calendar" id="pane-calendar">
      <div class="day-picker-wrap">
        <div class="day-picker-label">Choose your day</div>
        <div class="day-picker" id="day-picker"></div>
      </div>
      <div class="subbar">
        <span class="subbar-count" id="subbar-count">—</span>
        <span class="legend-pills" id="legend-pills"></span>
        <span class="subbar-spacer"></span>
        <button class="reset-btn" id="reset-btn" onclick="nxneSchedule.clearFilters()">↻ Clear filters</button>
      </div>
      <div class="timeline-wrap" id="timeline-wrap">
        <div class="day-headline" id="day-headline"></div>
        <div class="timeline" id="timeline"></div>
      </div>
      <div class="card-list" id="card-list"></div>
    </section>

    <section class="tab-pane" data-tab="summit" id="pane-summit">
      <div class="summit-hero">
        <div class="summit-hero-eyebrow">Conference Programming</div>
        <h2 class="summit-hero-title">Summit <em>&amp; Panels</em></h2>
        <p class="summit-hero-sub">
          Every event at NXNE 2026 — conversations, showcases, parties, and panels — laid out day by day.
          Tap any event for full details.
        </p>
      </div>
      <div class="summit-day-strip" id="summit-day-strip"></div>
      <div class="summit-list-wrap">
        <div class="summit-list" id="summit-list"></div>
      </div>
    </section>

    <section class="tab-pane" data-tab="panelists" id="pane-panelists">
      <div class="summit-hero">
        <div class="summit-hero-eyebrow">Voices at NXNE</div>
        <h2 class="summit-hero-title">Panelists</h2>
        <p class="summit-hero-sub">
          The speakers, moderators, and panelists shaping the conversations at NXNE 2026 — the people behind every panel, talk, and discussion.
        </p>
        <p class="people-hero-cta">
          Speaking, moderating, or hosting at NXNE 2026? <a href="https://nxne.com/people" target="_blank" rel="noopener">Add yourself to the lineup →</a>
        </p>
      </div>
      <div class="people-grid-wrap">
        <div class="people-grid" id="panelists-grid"></div>
      </div>
    </section>

    <section class="tab-pane" data-tab="industry" id="pane-industry">
      <div class="summit-hero">
        <div class="summit-hero-eyebrow">Who's Coming</div>
        <h2 class="summit-hero-title">Industry</h2>
        <p class="summit-hero-sub">
          The people of NXNE 2026 — find your next collaborator, sponsor, or coffee meeting.
        </p>
        <p class="people-hero-cta">
          Whether you're a speaker, moderator, artist manager, publicist, label rep, journalist, partner, sponsor, agent, producer, promoter, or simply someone active in music and culture attending NXNE, we'd love for you to <a href="https://nxne.com/people" target="_blank" rel="noopener">join the list →</a>
        </p>
      </div>
      <div class="people-filter-strip" id="industry-filter-strip"></div>
      <div class="people-grid-wrap">
        <div class="people-grid" id="industry-grid"></div>
      </div>
    </section>

    <div class="sync-footer" id="sync-footer">
      <span class="live-dot"></span>
      Live · Last sync <span id="sync-time">—</span>
    </div>

    <div class="modal-overlay" id="modal-overlay" onclick="nxneSchedule.closeModal()"></div>
    <div class="modal" id="modal">
      <button class="modal-close" onclick="nxneSchedule.closeModal()" aria-label="Close">×</button>
      <span class="modal-cat" id="modal-cat"></span>
      <h3 class="modal-title" id="modal-title"></h3>
      <div class="modal-row"><span class="label">Day</span><span class="val" id="modal-day"></span></div>
      <div class="modal-row"><span class="label">Time</span><span class="val" id="modal-time"></span></div>
      <div class="modal-row"><span class="label">Venue</span><span class="val" id="modal-venue"></span></div>
      <div class="modal-actions">
        <a class="modal-btn hero" id="modal-info" href="#" target="_blank" rel="noopener" style="display:none">→ Get more info</a>
        <button class="modal-btn full-session" id="modal-session" onclick="nxneSchedule.jumpToSession()" style="display:none">→ View full session</button>
        <a class="modal-btn primary" id="modal-tickets" href="#" target="_blank" rel="noopener" style="display:none">🎟 Get tickets</a>
        <a class="modal-btn full-session" id="modal-lineup" href="#" target="_blank" rel="noopener" style="display:none">♪ View lineup</a>
        <button class="modal-btn" id="modal-cal" onclick="nxneSchedule.downloadIcs()">＋ Add to calendar</button>
        <button class="modal-btn" id="modal-map" onclick="nxneSchedule.openMapFromModal()">⚲ Find on map</button>
        <button class="modal-btn" id="modal-share" onclick="nxneSchedule.copyLink()">⎘ Copy link</button>
      </div>
      <div class="modal-description" id="modal-description"></div>
    </div>

    <div class="modal-overlay" id="person-modal-overlay" onclick="nxneSchedule.closePersonModal()"></div>
    <div class="modal" id="person-modal">
      <button class="modal-close" onclick="nxneSchedule.closePersonModal()" aria-label="Close">×</button>
      <div id="person-modal-headshot-wrap"></div>
      <span class="modal-cat" id="person-modal-eyebrow"></span>
      <h3 class="modal-title" id="person-modal-name"></h3>
      <div id="person-modal-body"></div>
      <div class="modal-actions" id="person-modal-actions"></div>
    </div>

    <div id="nxne-map-overlay" onclick="nxneSchedule.closeMap()"></div>
    <div id="nxne-map-panel">
      <div id="nxne-map-header">
        <div>
          <div id="nxne-map-find">Find on map</div>
          <div id="nxne-map-name">Venue</div>
        </div>
        <button id="nxne-map-close" onclick="nxneSchedule.closeMap()">&#215;</button>
      </div>
      <div id="nxne-map-footer">
        <a id="nxne-map-gmaps" href="#" target="_blank" rel="noopener">⚲ Open in Google Maps ↗</a>
      </div>
      <div id="nxne-map-frame-wrap">
        <iframe id="nxne-map-frame" src="" allowfullscreen loading="lazy"></iframe>
      </div>
    </div>
  `;

  /* DOM lookup helpers — scoped to widget root */
  function $(id) { return target.querySelector('#' + id); }

  /* ─── TIME / DAY PARSING ──────────────────────────────────── */
  function dayKeyFromDay(d) {
    const v = (d||'').toString().toLowerCase().trim().slice(0,3);
    return { mon:'jun2', wed:'jun10', thu:'jun11', fri:'jun12', sat:'jun13', sun:'jun14' }[v] || null;
  }
  function dayKeyFromDate(d) {
    const m = (d||'').toString().toLowerCase().match(/(jun|june)\s*(1[0-4]|2)\b/);
    return m ? 'jun'+m[2] : null;
  }
  function parseClock(tok) {
    if (!tok) return null;
    const m = tok.toLowerCase().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?/);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const ap = m[3];
    if (ap === 'p' || ap === 'pm') { if (h !== 12) h += 12; }
    else if (ap === 'a' || ap === 'am') { if (h === 12) h = 0; }
    return h + min/60;
  }
  function parseTimeRange(t) {
    if (!t) return null;
    const s = t.toString().trim();
    const low = s.toLowerCase();
    if (low.includes('all day')) return { start: 10, end: 23 };
    if (low === 'morning')   return { start: 9,  end: 12 };
    if (low === 'afternoon') return { start: 12, end: 17 };
    if (low === 'evening')   return { start: 18, end: 22 };
    if (low === 'night')     return { start: 22, end: 25 };
    if (low === 'late')      return { start: 23, end: 26 };
    const parts = s.split(/\s*[–—‒\-]\s*|\s+to\s+/i);
    if (parts.length >= 2) {
      const firstHasAP = /(am|pm|a|p)\b/i.test(parts[0]);
      const secondAP   = (parts[1].toLowerCase().match(/(am|pm|a|p)\b/) || [])[0];
      let first = parts[0];
      if (!firstHasAP && secondAP) first = first.trim() + ' ' + secondAP;
      const start = parseClock(first);
      const end   = parseClock(parts[1]);
      if (start == null || end == null) return null;
      let realEnd = end;
      if (realEnd <= start) realEnd += 24;
      return { start, end: realEnd };
    }
    const single = parseClock(s);
    if (single != null) return { start: single, end: single + 1 };
    return null;
  }
  function hourToSlot(h) {
    return Math.max(0, Math.min(SLOT_COUNT, Math.round((h - DAY_START_HOUR) * SLOTS_PER_HOUR)));
  }
  function fmtHour(h) {
    let hr = h % 24;
    const ap = hr >= 12 ? 'PM' : 'AM';
    let display = hr % 12; if (display === 0) display = 12;
    return display + ' ' + ap;
  }

  /* ─── "NOW" AWARENESS ─────────────────────────────────────── */
  function getNowContext() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    if (y === FEST_YEAR && m === FEST_MONTH && d >= 10 && d <= 14) {
      const dk = 'jun' + d;
      let hour = now.getHours() + now.getMinutes()/60;
      if (hour < 4) {
        if (d > 10) {
          return { todayKey: 'jun' + (d - 1), hour: hour + 24, isLive: true };
        }
      }
      return { todayKey: dk, hour, isLive: true };
    }
    return { todayKey: null, hour: null, isLive: false };
  }
  function liveEventCount() {
    const ctx = getNowContext();
    if (!ctx.isLive) return 0;
    return SCHEDULE.filter(e =>
      e.day === ctx.todayKey && ctx.hour >= e.range.start && ctx.hour < e.range.end
    ).length;
  }
  function isEventLive(e) {
    const ctx = getNowContext();
    if (!ctx.isLive || e.day !== ctx.todayKey) return false;
    return ctx.hour >= e.range.start && ctx.hour < e.range.end;
  }

  /* ─── PROCESS & FETCH ─────────────────────────────────────── */
  function processRows(rows) {
    SCHEDULE = rows.map(r => {
      const day      = (r[0]||'').toString().trim();
      const date     = (r[1]||'').toString().trim();
      const timeStr  = (r[2]||'').toString().trim();
      const event    = (r[3]||'').toString().trim();
      const venue    = (r[4]||'').toString().trim();
      const category = (r[5]||'').toString().trim();
      const orig     = r[6] || null;
      const dk = dayKeyFromDay(day) || dayKeyFromDate(date) || 'jun10';
      const range = parseTimeRange(timeStr);
      const out = { day: dk, date, timeStr, event, venue, category, range };
      if (orig) {
        if (orig.ticketUrl)   out.ticketUrl   = orig.ticketUrl;
        if (orig.lineupUrl)   out.lineupUrl   = orig.lineupUrl;
        if (orig.description) out.description = orig.description;
      }
      return out;
    }).filter(s => s.event && s.range);

    const cats = new Set();
    SCHEDULE.forEach(s => { if (s.category) cats.add(s.category); });
    const known = ['Showcase','Party','Industry','Awards','Watch Party','Free Outdoor','Partner Events','Hub'];
    ALL_CATS = [
      ...known.filter(c => cats.has(c)),
      ...Array.from(cats).filter(c => !known.includes(c)).sort(),
    ];

    if (!state._initialized) {
      const ctx = getNowContext();
      if (ctx.isLive && ctx.todayKey) state.activeDay = ctx.todayKey;
      state._initialized = true;
    }

    $('sync-time').textContent =
      new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    loaded = true;
    renderAll();
  }

  async function fetchLive() {
    try {
      const url = PROXY_URL + '?format=cache&t=' + Date.now();
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();

      let events = (data.events != null ? data.events : data.events_schedule);
      if (typeof events === 'string') {
        try { events = JSON.parse(events); } catch (e) { events = []; }
      }
      if (!Array.isArray(events)) events = [];

      let sessions = (data.sessions != null ? data.sessions : data.summit_sessions);
      if (typeof sessions === 'string') {
        try { sessions = JSON.parse(sessions); } catch (e) { sessions = []; }
      }
      if (!Array.isArray(sessions)) sessions = [];
      SUMMIT_SESSIONS = sessions;

      let people = data.people;
      if (typeof people === 'string') {
        try { people = JSON.parse(people); } catch (e) { people = []; }
      }
      if (!Array.isArray(people)) people = [];
      PEOPLE = people;
      console.log('[NXNE] Loaded ' + events.length + ' events, ' + sessions.length + ' sessions, ' + people.length + ' people from proxy');

      if (state.tab === 'panelists' || state.tab === 'industry') renderPeople();

      /* Always include hardcoded lead-up events alongside whatever the proxy returns */
      const allEvents = events.concat(HARDCODED_EVENTS);
      if (allEvents.length) {
        const rows = allEvents.map(e => [e.day, e.date, e.time, e.event, e.venue, e.category, e]);
        processRows(rows);
      } else if (!loaded) {
        processRows(FALLBACK_EVENTS);
      }

      if (state.tab === 'summit') {
        renderSummitDayStrip();
        renderSummitList();
      }

      if (data.last_updated) {
        $('sync-time').textContent =
          new Date(data.last_updated).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      }
    } catch (err) {
      console.warn('Proxy fetch failed, using fallback events:', err);
      if (!loaded) {
        /* Even on proxy failure, surface the hardcoded lead-up events */
        const hardcodedRows = HARDCODED_EVENTS.map(e => [e.day, e.date, e.time, e.event, e.venue, e.category, e]);
        processRows(FALLBACK_EVENTS.concat(hardcodedRows));
      }
    }
  }

  /* ─── DAY PICKER ──────────────────────────────────────────── */
  function renderDayPicker() {
    const el = $('day-picker');
    const ctx = getNowContext();
    /* Render lead-up days first (chronologically), then festival days */
    const allDayKeys = [...LEAD_UP_DAYS, ...DAY_KEYS];
    const counts = {};
    allDayKeys.forEach(dk => {
      counts[dk] = SCHEDULE.filter(e => e.day === dk).length;
    });
    let html = '';
    allDayKeys.forEach(dk => {
      const info = DAY_INFO[dk];
      const isActive = state.activeDay === dk;
      const isToday = ctx.todayKey === dk;
      const liveCount = isToday ? SCHEDULE.filter(e => e.day === dk && isEventLive(e)).length : 0;
      html += '<button class="day-card ' + (isActive?'active':'') + ' ' + (isToday?'today':'') + '" onclick="nxneSchedule.setActiveDay(\'' + dk + '\')">' +
        (liveCount > 0 ? '<span class="day-card-live"></span>' : '') +
        '<span class="day-card-name">' + info.name + '</span>' +
        '<span class="day-card-num">' + info.num + '</span>' +
        '<span class="day-card-month">June</span>' +
        '<span class="day-card-meta">' +
          (info.theme ? '<span class="day-card-theme">' + info.theme + '</span>' : '') +
          (counts[dk] || 0) + ' events' +
        '</span>' +
      '</button>';
    });
    /* "All Days" card counts only festival days — lead-up events are accessed via their own tab */
    const totalCount = SCHEDULE.filter(e => DAY_KEYS.includes(e.day)).length;
    html += '<button class="day-card day-card-all ' + (state.activeDay==='all'?'active':'') + '" onclick="nxneSchedule.setActiveDay(\'all\')">' +
      '<div>' +
        '<span class="day-card-name">Full</span>' +
        '<span class="day-card-num">' + totalCount + '</span>' +
        '<span class="day-card-month">All Days</span>' +
      '</div>' +
      '<span class="day-card-meta">Wed → Sun</span>' +
    '</button>';
    el.innerHTML = html;

    const liveTotal = liveEventCount();
    const chip = $('live-chip');
    const chipText = $('live-chip-text');
    if (ctx.isLive) {
      chipText.textContent = liveTotal > 0
        ? liveTotal + ' event' + (liveTotal===1?'':'s') + ' live now'
        : DAY_INFO[ctx.todayKey].full + ' · ' + DAY_INFO[ctx.todayKey].date;
      chip.style.display = '';
    } else {
      chipText.textContent = 'Live schedule · June 10–14';
    }
  }

  /* ─── FILTERS ─────────────────────────────────────────────── */
  function renderLegend() {
    const el = $('legend-pills');
    const items = ALL_CATS.map(c => {
      const style = CAT_STYLE[c] || DEFAULT_CAT;
      const active = state.activeCats.has(c);
      const dimmed = state.activeCats.size > 0 && !state.activeCats.has(c);
      return '<span class="legend-pill ' + (active?'active':'') + ' ' + (dimmed?'dimmed':'') + '" onclick="nxneSchedule.toggleCat(\'' + c.replace(/'/g, "\\'") + '\')">' +
        '<span class="legend-swatch" style="background:' + style.color + '"></span>' + c.toUpperCase() +
      '</span>';
    }).join('');
    el.innerHTML = items;
    $('reset-btn').classList.toggle('visible', state.activeCats.size > 0);
  }
  function toggleCat(c) {
    if (state.activeCats.has(c)) state.activeCats.delete(c);
    else state.activeCats.add(c);
    renderLegend();
    renderTimelineSwap();
  }
  function clearFilters() {
    state.activeCats.clear();
    renderLegend();
    renderTimelineSwap();
  }
  function isCatVisible(c) { return state.activeCats.size === 0 || state.activeCats.has(c); }

  /* ─── LANE ASSIGNMENT ─────────────────────────────────────── */
  function assignLanes(events) {
    const byDay = {};
    events.forEach(e => { (byDay[e.day] = byDay[e.day] || []).push(e); });
    const laneCounts = {};
    Object.entries(byDay).forEach(([dk, list]) => {
      list.sort((a,b) => a.range.start - b.range.start || (b.range.end - b.range.start) - (a.range.end - a.range.start));
      const laneEnds = [];
      list.forEach(e => {
        let lane = laneEnds.findIndex(end => end <= e.range.start + 0.001);
        if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
        laneEnds[lane] = e.range.end;
        e.lane = lane;
      });
      laneCounts[dk] = Math.max(1, laneEnds.length);
    });
    return laneCounts;
  }

  /* ─── RENDER — TIMELINE + CARD LIST ───────────────────────── */
  function renderTimeline() {
    const grid = $('timeline');
    const isAll = state.activeDay === 'all';
    const visibleDays = isAll ? DAY_KEYS : [state.activeDay];

    grid.classList.toggle('multi', isAll);
    if (!isAll) {
      grid.style.gridTemplateColumns = '70px 1fr';
    } else {
      grid.style.gridTemplateColumns = '';
    }

    let html = '<div class="col-head time-head" style="grid-column:1; grid-row:1">EDT</div>';
    if (isAll) {
      visibleDays.forEach((dk, i) => {
        const info = DAY_INFO[dk];
        html += '<div class="col-head" style="grid-column:' + (i+2) + '; grid-row:1">' +
          '<span class="day-num">' + info.num + '</span>' + info.full +
          '<span class="day-date">' + info.date + '</span>' +
        '</div>';
      });
    }

    for (let s = 0; s < SLOT_COUNT; s++) {
      const hour = DAY_START_HOUR + s/SLOTS_PER_HOUR;
      const isHourMark = (s % SLOTS_PER_HOUR) === 0;
      const label = isHourMark ? fmtHour(hour) : '';
      html += '<div class="time-cell ' + (isHourMark?'hour':'') + '" style="grid-column:1; grid-row:' + (s + (isAll?2:2)) + '">' + label + '</div>';
    }

    const visibleEvents = SCHEDULE.filter(e => isCatVisible(e.category) && visibleDays.includes(e.day));
    const laneCounts = assignLanes(visibleEvents);

    visibleEvents.forEach((e) => {
      const dayIdx = visibleDays.indexOf(e.day);
      if (dayIdx < 0) return;
      const startSlot = hourToSlot(e.range.start);
      const endSlot   = hourToSlot(e.range.end);
      const span      = Math.max(2, endSlot - startSlot);
      const style = CAT_STYLE[e.category] || DEFAULT_CAT;
      const compact = span <= 2 ? 'tiny' : (span <= 3 ? 'short' : '');
      const realIdx = SCHEDULE.indexOf(e);

      const lanes = laneCounts[e.day] || 1;
      const narrow = (isAll && lanes >= 3) ? ' narrow' : '';
      const lanePct = 100 / lanes;
      const laneLeft = e.lane * lanePct;
      const sideMargin = lanes > 1 ? '3px' : '0';
      const live = isEventLive(e) ? ' live' : '';

      const headerOffset = isAll ? 2 : 2;
      html += '<div class="event ' + compact + narrow + live + '"' +
        ' data-idx="' + realIdx + '"' +
        ' style="grid-column:' + (dayIdx+2) + ';' +
        ' grid-row:' + (startSlot+headerOffset) + ' / span ' + span + ';' +
        ' background: color-mix(in srgb, ' + style.color + ' 90%, #1a1a1a);' +
        ' --cat-accent: ' + style.color + ';' +
        ' margin-left: calc(' + laneLeft + '% + ' + sideMargin + ');' +
        ' width: calc(' + lanePct + '% - ' + sideMargin + ' - ' + sideMargin + ');' +
        ' margin-right: 0;"' +
        ' onclick="nxneSchedule.openModal(' + realIdx + ')">' +
        '<span class="event-time">' + escapeHtml(e.timeStr) + '</span>' +
        '<span class="event-title">' + escapeHtml(e.event) + '</span>' +
        '<span class="event-venue">' + escapeHtml(e.venue) + '</span>' +
      '</div>';
    });

    const ctx = getNowContext();
    if (!isAll && ctx.isLive && ctx.todayKey === state.activeDay && ctx.hour >= DAY_START_HOUR && ctx.hour <= DAY_END_HOUR) {
      const slot = hourToSlot(ctx.hour);
      html += '<div class="now-line" style="grid-column:2; grid-row:' + (slot+2) + '; align-self:start;"></div>';
    }

    const rowH = isAll ? (window.innerWidth <= 880 ? 18 : 14) : 18;
    grid.style.gridTemplateRows = '40px repeat(' + SLOT_COUNT + ', ' + rowH + 'px)';
    grid.innerHTML = html;

    const wrap = $('timeline-wrap');
    let headline = wrap.querySelector('.day-headline');
    if (!headline) {
      headline = document.createElement('div');
      headline.className = 'day-headline';
      wrap.insertBefore(headline, grid);
    }
    if (state.activeDay === 'all') {
      headline.innerHTML =
        '<span class="day-headline-name">Full <em>Schedule</em></span>' +
        '<span class="day-headline-date">All 5 Days · ' + SCHEDULE.length + ' Events</span>';
    } else {
      const info = DAY_INFO[state.activeDay];
      const isToday = ctx.todayKey === state.activeDay;
      const liveCount = isToday ? SCHEDULE.filter(e => e.day === state.activeDay && isEventLive(e)).length : 0;
      headline.innerHTML =
        '<span class="day-headline-name">' + info.full + '</span>' +
        '<span class="day-headline-date">' + info.date + (info.theme ? ' · ' + info.theme : '') + '</span>' +
        (liveCount > 0 ? '<span class="day-headline-now"><span class="live-dot"></span>' + liveCount + ' live now</span>' : '');
    }

    const filterText = state.activeCats.size
      ? ' · filtered by ' + [...state.activeCats].join(', ')
      : '';
    $('subbar-count').innerHTML =
      '<strong>' + visibleEvents.length + '</strong> event' + (visibleEvents.length===1?'':'s') + filterText;

    if (!visibleEvents.length) {
      grid.innerHTML =
        '<div class="empty-state" style="grid-column: 1 / -1;">' +
          '<div class="empty-state-eyebrow">Nothing to show</div>' +
          '<div class="empty-state-title">No events match</div>' +
          '<div class="empty-state-text">Try a different day or clear your category filters to see the full schedule.</div>' +
        '</div>';
    }
  }

  function renderCardList() {
    const wrap = $('card-list');
    const isAll = state.activeDay === 'all';
    const visibleDays = isAll ? DAY_KEYS : [state.activeDay];
    const ctx = getNowContext();

    let html = '';
    visibleDays.forEach((dk) => {
      const info = DAY_INFO[dk];
      const dayEvents = SCHEDULE
        .filter(e => e.day === dk && isCatVisible(e.category))
        .sort((a, b) => a.range.start - b.range.start);
      if (!dayEvents.length) return;

      const isToday = ctx.todayKey === dk;
      const liveCount = isToday ? dayEvents.filter(e => isEventLive(e)).length : 0;

      html += '<div class="day-headline">' +
        '<span class="day-headline-name">' + info.full + '</span>' +
        '<span class="day-headline-date">' + info.date + (info.theme ? ' · ' + info.theme : '') + '</span>' +
        (liveCount > 0 ? '<span class="day-headline-now"><span class="live-dot"></span>' + liveCount + ' live</span>' : '') +
      '</div>';

      const bands = [
        { label: 'Daytime',  filter: e => e.range.start < 17 },
        { label: 'Evening',  filter: e => e.range.start >= 17 && e.range.start < 21 },
        { label: 'Night',    filter: e => e.range.start >= 21 },
      ];
      bands.forEach(band => {
        const inBand = dayEvents.filter(band.filter);
        if (!inBand.length) return;
        html += '<div class="card-section">' + band.label + '</div>';
        inBand.forEach(e => {
          const style = CAT_STYLE[e.category] || DEFAULT_CAT;
          const realIdx = SCHEDULE.indexOf(e);
          html += '<div class="card-event" onclick="nxneSchedule.openModal(' + realIdx + ')">' +
            '<div class="card-event-time">' + escapeHtml(e.timeStr) + '</div>' +
            '<div class="card-event-body" style="border-left-color:' + style.color + '">' +
              '<div class="card-event-title">' + escapeHtml(e.event) + '</div>' +
              '<div class="card-event-venue">' + escapeHtml(e.venue) + '</div>' +
              (e.category ? '<span class="card-event-cat" style="color:' + style.color + ';border-color:' + style.color + '">' + e.category + '</span>' : '') +
            '</div>' +
          '</div>';
        });
      });
    });

    if (!html) {
      html = '<div class="empty-state">' +
        '<div class="empty-state-eyebrow">Nothing to show</div>' +
        '<div class="empty-state-title">No events match</div>' +
        '<div class="empty-state-text">Try a different day or clear your category filters.</div>' +
      '</div>';
    }
    wrap.innerHTML = html;
  }

  function renderTimelineSwap() {
    const wrap = $('timeline-wrap');
    wrap.classList.add('swapping');
    requestAnimationFrame(() => {
      setTimeout(() => {
        renderTimeline();
        renderCardList();
        wrap.classList.remove('swapping');
      }, 130);
    });
  }

  function renderAll() {
    renderDayPicker();
    renderLegend();
    renderTimeline();
    renderCardList();
    target.dataset.view = state.activeDay === 'all' ? 'all' : 'day';
  }

  function setActiveDay(d) {
    if (state.activeDay === d) return;
    state.activeDay = d;
    target.dataset.view = state.activeDay === 'all' ? 'all' : 'day';
    renderDayPicker();
    renderTimelineSwap();
  }

  /* ─── MODAL ───────────────────────────────────────────────── */
  function openModal(idx) {
    const e = SCHEDULE[idx];
    if (!e) return;
    state.currentEventIdx = idx;
    const style = CAT_STYLE[e.category] || DEFAULT_CAT;
    const cat = $('modal-cat');
    cat.textContent = e.category || '—';
    cat.style.color = style.color;
    cat.style.borderColor = style.color;
    $('modal-title').textContent = e.event;
    $('modal-day').textContent = (DAY_INFO[e.day]||{}).full || '';
    $('modal-time').textContent = e.timeStr;
    $('modal-venue').textContent = e.venue;
    const shareBtn = $('modal-share');
    shareBtn.classList.remove('copied');
    shareBtn.textContent = '⎘ Copy link';
    const sessionBtn = $('modal-session');
    if (sessionBtn) sessionBtn.style.display = 'none';

    // Next Level Panels — both LIVE day + ARTIST day get a hero CTA linking
    // to the dedicated info page. Matches any event title containing the phrase.
    const infoBtn = $('modal-info');
    if (infoBtn) {
      if (e.event && /next\s*level\s*panels/i.test(e.event)) {
        infoBtn.href = 'https://www.nxne.com/next-level-panels-2026';
        infoBtn.style.display = '';
      } else {
        infoBtn.style.display = 'none';
      }
    }

    const ticketBtn = $('modal-tickets');
    if (e.ticketUrl) { ticketBtn.href = e.ticketUrl; ticketBtn.style.display = ''; }
    else ticketBtn.style.display = 'none';

    const lineupBtn = $('modal-lineup');
    if (e.lineupUrl) { lineupBtn.href = e.lineupUrl; lineupBtn.style.display = ''; }
    else lineupBtn.style.display = 'none';

    const descEl = $('modal-description');
    if (descEl) {
      const raw = (e.description || '').trim();
      const isPlaceholder = /^description\s*(need|needed|tbd|coming)?$/i.test(raw);
      if (raw && !isPlaceholder) {
        descEl.innerHTML = escapeHtml(raw).replace(/\n+/g, '</p><p>').replace(/^/, '<p>') + '</p>';
        descEl.classList.remove('coming-soon');
      } else {
        descEl.innerHTML = '<p class="details-soon">Details coming soon.</p>';
        descEl.classList.add('coming-soon');
      }
    }

    $('modal').classList.add('open');
    $('modal-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    $('modal').classList.remove('open');
    $('modal-overlay').classList.remove('open');
    document.body.style.overflow = '';
    history.replaceState(null, '', '#' + state.tab);
    state.currentEventIdx = null;
  }

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const mapOpen = $('nxne-map-panel').classList.contains('open');
    const personOpen = $('person-modal').classList.contains('open');
    if (mapOpen) closeMap();
    else if (personOpen) closePersonModal();
    else closeModal();
  });

  function eventDates(e) {
    const info = DAY_INFO[e.day];
    if (!info) return null;
    const start = new Date(FEST_YEAR, FEST_MONTH, info.dom, 0, 0, 0);
    const startHour = e.range.start;
    const endHour = e.range.end;
    const startDate = new Date(start.getTime() + startHour * 3600 * 1000);
    const endDate   = new Date(start.getTime() + endHour   * 3600 * 1000);
    return { startDate, endDate };
  }
  function pad2(n) { return String(n).padStart(2,'0'); }
  function fmtIcsDate(d) {
    return d.getFullYear() + pad2(d.getMonth()+1) + pad2(d.getDate()) + 'T' + pad2(d.getHours()) + pad2(d.getMinutes()) + '00';
  }
  function downloadIcs() {
    const e = SCHEDULE[state.currentEventIdx];
    if (!e) return;
    const dates = eventDates(e);
    if (!dates) return;
    const uid = (e.day + '-' + (e.event||'').replace(/\W+/g,'-').toLowerCase() + '@nxne.com').replace(/--+/g,'-');
    const title = (e.event||'').replace(/[\\,;]/g, x => '\\'+x);
    const venue = (e.venue||'').replace(/[\\,;]/g, x => '\\'+x);
    const desc  = ('NXNE 2026 — ' + (e.category || '')).replace(/[\\,;]/g, x => '\\'+x);
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//NXNE//Schedule 2026//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:' + uid,
      'DTSTAMP:' + fmtIcsDate(new Date()),
      'DTSTART;TZID=America/Toronto:' + fmtIcsDate(dates.startDate),
      'DTEND;TZID=America/Toronto:' + fmtIcsDate(dates.endDate),
      'SUMMARY:' + title,
      'LOCATION:' + venue,
      'DESCRIPTION:' + desc,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (e.event||'event').replace(/[^a-z0-9]+/gi,'-') + '.ics';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function copyLink() {
    const url = window.location.href;
    const btn = $('modal-share');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        btn.textContent = '✓ Link copied';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = '⎘ Copy link';
          btn.classList.remove('copied');
        }, 2200);
      });
    } else {
      btn.textContent = url;
    }
  }

  function escapeHtml(s) {
    return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  /* ─── MAP SIDE PANEL ──────────────────────────────────────── */
  /*  Per-venue address overrides — used when the venue name alone returns
   *  the wrong place on Google Maps. Keys are lowercased substrings of the
   *  venue name as it appears in the sheet; values are the exact address.
   *  Resolution: exact match first, then substring match.
   *  (The displayed venue label is unaffected — only the Maps iframe and
   *  the "Open in Google Maps" link use the overridden address.) */
  const VENUE_MAP_OVERRIDES = {
    'soundstage': '90 Bloor St E, Toronto, ON M4W 1A7',  // Soundstage @ W Hotel
  };
  function resolveVenueAddress_(venueName) {
    const lower = venueName.toLowerCase().trim();
    if (VENUE_MAP_OVERRIDES[lower]) return VENUE_MAP_OVERRIDES[lower];
    const key = Object.keys(VENUE_MAP_OVERRIDES).find(k => lower.includes(k));
    return key ? VENUE_MAP_OVERRIDES[key] : (venueName + ' Toronto ON');
  }
  function openMap(venueName) {
    if (!venueName) return;
    $('nxne-map-name').textContent = venueName;
    const q = encodeURIComponent(resolveVenueAddress_(venueName));
    $('nxne-map-frame').src = 'https://maps.google.com/maps?q=' + q + '&output=embed&z=16';
    $('nxne-map-gmaps').href = 'https://www.google.com/maps/search/' + q;
    $('nxne-map-panel').classList.add('open');
    $('nxne-map-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeMap() {
    $('nxne-map-panel').classList.remove('open');
    $('nxne-map-overlay').classList.remove('open');
    $('nxne-map-frame').src = '';
    document.body.style.overflow = '';
  }
  function openMapFromModal() {
    const e = SCHEDULE[state.currentEventIdx];
    if (!e || !e.venue) return;
    const venue = e.venue;
    closeModal();
    setTimeout(() => openMap(venue), 60);
  }

  function setNavOffset() {
    const nav = document.querySelector('header') || document.querySelector('nav');
    const h = nav && nav.offsetHeight ? nav.offsetHeight : 0;
    document.documentElement.style.setProperty('--nxne-nav-height', h + 'px');
  }
  setNavOffset();
  window.addEventListener('resize', setNavOffset);

  /* ─── SUMMIT & PANELS ─────────────────────────────────────── */
  function renderSummitDayStrip() {
    const el = $('summit-day-strip');
    if (!el) return;
    const daysWithEvents = DAY_KEYS.filter(dk =>
      SCHEDULE.some(e => e.day === dk && e.range)
    );
    if (!daysWithEvents.length) { el.innerHTML = ''; return; }
    let html = '<button class="summit-day-pill ' + (state.summitDay==='all'?'active':'') + '" onclick="nxneSchedule.setSummitDay(\'all\')">All Days</button>';
    daysWithEvents.forEach(dk => {
      const info = DAY_INFO[dk];
      const isActive = state.summitDay === dk;
      html += '<button class="summit-day-pill ' + (isActive?'active':'') + '" onclick="nxneSchedule.setSummitDay(\'' + dk + '\')">' +
        info.name + ' · ' + info.date +
      '</button>';
    });
    el.innerHTML = html;
  }

  function setSummitDay(d) {
    state.summitDay = d;
    renderSummitDayStrip();
    renderSummitList();
  }

  function renderEventListRow(e) {
    const idx = SCHEDULE.indexOf(e);
    const venueLine = e.venue ? '<div class="session-venue-line">@ ' + escapeHtml(e.venue) + '</div>' : '';
    const cat = e.category ? '<div class="session-eyebrow">' + escapeHtml(e.category) + '</div>' : '';
    return '<div class="session clickable" data-event-idx="' + idx + '" onclick="nxneSchedule.openModal(' + idx + ')">' +
      '<div class="session-stripe"></div>' +
      '<div class="session-time">' +
        escapeHtml(e.timeStr || '') +
        venueLine +
      '</div>' +
      '<div class="session-body">' +
        cat +
        '<h3 class="session-title">' + escapeHtml(e.event || '') + '</h3>' +
      '</div>' +
    '</div>';
  }

  function renderSummitList() {
    const el = $('summit-list');
    if (!el) return;
    if (!SCHEDULE.length) {
      el.innerHTML = '<div class="summit-placeholder">' +
        '<div class="summit-placeholder-eyebrow">Coming soon</div>' +
        '<div class="summit-placeholder-title">Programming announced shortly</div>' +
        '<div class="summit-placeholder-text">The full lineup drops as events are confirmed. Check back closer to the festival.</div>' +
      '</div>';
      return;
    }
    const filtered = state.summitDay === 'all'
      ? SCHEDULE.slice()
      : SCHEDULE.filter(e => e.day === state.summitDay);
    const visible = filtered.filter(e => e.event && e.range);
    if (!visible.length) {
      el.innerHTML = '<div class="summit-placeholder">' +
        '<div class="summit-placeholder-eyebrow">No events</div>' +
        '<div class="summit-placeholder-title">Nothing scheduled for that day</div>' +
        '<div class="summit-placeholder-text">Try another day, or view the full schedule on the Calendar tab.</div>' +
      '</div>';
      return;
    }
    const byDay = {};
    visible.forEach(e => { (byDay[e.day] = byDay[e.day] || []).push(e); });
    let html = '';
    DAY_KEYS.forEach(dk => {
      if (!byDay[dk]) return;
      const info = DAY_INFO[dk];
      const events = byDay[dk].slice().sort((a, b) => (a.range ? a.range.start : 99) - (b.range ? b.range.start : 99));
      if (state.summitDay === 'all') {
        html += '<h2 class="summit-day-section-head">' +
          '<span class="num">' + info.num + '</span>' + info.full +
          '<span class="meta">' + info.date + ' · ' + events.length + ' event' + (events.length===1?'':'s') + '</span>' +
        '</h2>';
      }
      events.forEach(e => { html += renderEventListRow(e); });
    });
    el.innerHTML = html;
  }

  /* ─── PEOPLE TAB ──────────────────────────────────────────── */
  function escapeAttr(s) { return String(s || '').replace(/'/g, "\\'"); }

  /* Per-person card markup — shared between Panelists + Industry tabs.
     Click handler indexes into the global PEOPLE array so openPersonModal works
     regardless of which tab the card was rendered into. */
  function personCardHtml_(p) {
    const realIdx  = PEOPLE.indexOf(p);
    const initials = (p.name || '?').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
    const heroBg   = p.headshotUrl ? 'style="background-image:url(\'' + escapeAttr(p.headshotUrl) + '\')"' : '';
    const heroCls  = p.headshotUrl ? '' : ' no-image';
    const heroBody = p.headshotUrl ? '' : escapeHtml(initials);
    const tagline  = p.description || p.bio || '';
    return '<div class="person-card" onclick="nxneSchedule.openPersonModal(' + realIdx + ')">' +
      '<div class="person-headshot' + heroCls + '" ' + heroBg + '>' + heroBody + '</div>' +
      '<div class="person-card-body">' +
        (p.roleType ? '<span class="person-role-tag">' + escapeHtml(p.roleType) + '</span>' : '') +
        '<div class="person-name">' + escapeHtml(p.name) + '</div>' +
        ((p.title || p.company) ? '<div class="person-meta">' +
          (p.title ? escapeHtml(p.title) : '') +
          (p.title && p.company ? ' · ' : '') +
          (p.company ? '<strong>' + escapeHtml(p.company) + '</strong>' : '') +
        '</div>' : '') +
        (tagline ? '<div class="person-tagline">' + escapeHtml(tagline) + '</div>' : '') +
      '</div>' +
    '</div>';
  }

  function isPanelist_(p) {
    return (p.roleType || '').toLowerCase() === 'panelist';
  }

  /* ─── PANELISTS TAB — only roleType === 'Panelist', no filter chips ───────── */
  function renderPanelists() {
    const el = $('panelists-grid');
    if (!el) return;
    const list = PEOPLE.filter(isPanelist_);
    if (!list.length) {
      el.innerHTML = '<div class="people-empty" style="grid-column: 1/-1;">Panelist lineup announced shortly. Check back soon.</div>';
      return;
    }
    el.innerHTML = list.map(personCardHtml_).join('');
  }

  /* ─── INDUSTRY TAB — everyone except panelists, with filter chips ─────────── */
  function renderIndustryFilters() {
    const el = $('industry-filter-strip');
    if (!el) return;
    const industry = PEOPLE.filter(p => !isPanelist_(p));
    if (!industry.length) { el.innerHTML = ''; return; }
    const present = new Set();
    industry.forEach(p => {
      const r = (p.roleType || '').trim();
      PEOPLE_FILTER_ORDER.forEach(cat => {
        if (r.toLowerCase() === cat.toLowerCase()) present.add(cat);
      });
    });
    const visibleCats = PEOPLE_FILTER_ORDER.filter(c => present.has(c));
    if (visibleCats.length < 2) { el.innerHTML = ''; return; }
    let html = '<button class="people-filter-pill ' + (state.industryFilter==='all'?'active':'') + '" onclick="nxneSchedule.setIndustryFilter(\'all\')">All</button>';
    visibleCats.forEach(cat => {
      const active = state.industryFilter === cat;
      html += '<button class="people-filter-pill ' + (active?'active':'') + '" onclick="nxneSchedule.setIndustryFilter(\'' + escapeAttr(cat) + '\')">' + escapeHtml(cat) + '</button>';
    });
    el.innerHTML = html;
  }

  function setIndustryFilter(cat) {
    state.industryFilter = cat;
    renderIndustryFilters();
    renderIndustryGrid();
  }

  function renderIndustryGrid() {
    const el = $('industry-grid');
    if (!el) return;
    const industry = PEOPLE.filter(p => !isPanelist_(p));
    if (!industry.length) {
      el.innerHTML = '<div class="people-empty" style="grid-column: 1/-1;">Industry lineup announced shortly. Check back soon.</div>';
      return;
    }
    const filterCat = state.industryFilter;
    const list = (filterCat === 'all')
      ? industry
      : industry.filter(p => (p.roleType || '').toLowerCase() === filterCat.toLowerCase());
    if (!list.length) {
      el.innerHTML = '<div class="people-empty" style="grid-column: 1/-1;">No one in this category yet.</div>';
      return;
    }
    el.innerHTML = list.map(personCardHtml_).join('');
  }

  function renderIndustry() {
    renderIndustryFilters();
    renderIndustryGrid();
  }

  /* Composite — both tabs at once. Called on boot and on every cache refresh. */
  function renderPeople() {
    renderPanelists();
    renderIndustry();
  }

  function openPersonModal(idx) {
    const p = PEOPLE[idx];
    if (!p) return;
    const eyebrowParts = [];
    if (p.roleType) eyebrowParts.push(p.roleType);
    if (p.company)  eyebrowParts.push(p.company);
    $('person-modal-eyebrow').textContent = eyebrowParts.join(' · ');
    $('person-modal-name').textContent = p.name || '';
    const headshotWrap = $('person-modal-headshot-wrap');
    if (p.headshotUrl) {
      headshotWrap.innerHTML = '<div class="person-modal-headshot" style="background-image:url(\'' + escapeAttr(p.headshotUrl) + '\')"></div>';
    } else {
      const modalInitials = (p.name || '?').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
      headshotWrap.innerHTML = '<div class="person-modal-headshot no-image">' + escapeHtml(modalInitials) + '</div>';
    }
    const body = $('person-modal-body');
    let bodyHtml = '';
    if (p.title) {
      bodyHtml += '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:var(--cream-dim);margin-bottom:14px;">' + escapeHtml(p.title) + '</div>';
    }
    if (p.bio) {
      bodyHtml += '<div class="person-modal-bio">' + escapeHtml(p.bio) + '</div>';
    } else if (p.description) {
      bodyHtml += '<div class="person-modal-bio">' + escapeHtml(p.description) + '</div>';
    }
    body.innerHTML = bodyHtml;
    const actionsEl = $('person-modal-actions');
    const actions = [];
    if (p.linkedSessionSlug) {
      actions.push('<button class="modal-btn full-session" onclick="nxneSchedule.goToLinkedSession(\'' + escapeAttr(p.linkedSessionSlug) + '\')">→ View their session</button>');
    }
    if (p.contactEmail) {
      const enc = btoa(p.contactEmail);
      actions.push('<button class="modal-btn primary reveal-email-btn" data-enc="' + enc + '" onclick="nxneSchedule.revealEmail(this)">✉ Reveal email</button>');
    }
    if (p.websiteUrl) {
      actions.push('<a class="modal-btn" href="' + escapeAttr(p.websiteUrl) + '" target="_blank" rel="noopener">Website ↗</a>');
    }
    actionsEl.innerHTML = actions.join('');
    actionsEl.style.display = actions.length ? '' : 'none';
    $('person-modal-overlay').classList.add('open');
    $('person-modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closePersonModal() {
    $('person-modal-overlay').classList.remove('open');
    $('person-modal').classList.remove('open');
    document.body.style.overflow = '';
  }

  function openSessionModal(sessionId) {
    const s = SUMMIT_SESSIONS.find(x => (x.id === sessionId) || (x.title && x.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === sessionId));
    if (!s) return;
    const eyebrowParts = [];
    if (s.theme || s.organization) eyebrowParts.push(s.theme || s.organization);
    if (s.venue && s.venue !== 'TBA') eyebrowParts.push(s.venue);
    $('person-modal-eyebrow').textContent = eyebrowParts.join(' · ');
    $('person-modal-name').textContent = s.title || '';
    $('person-modal-headshot-wrap').innerHTML = '';
    const body = $('person-modal-body');
    let bodyHtml = '';
    const dayLabel = (DAY_INFO[s.day] || {}).full || s.day || '';
    const timeBits = [];
    if (dayLabel) timeBits.push(dayLabel);
    if (s.date && !dayLabel.includes(s.date)) timeBits.push(s.date);
    if (s.time) timeBits.push(s.time);
    if (timeBits.length) {
      bodyHtml += '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:var(--cream-dim);margin-bottom:14px;">' + escapeHtml(timeBits.join(' · ')) + '</div>';
    }
    if (s.description) {
      bodyHtml += '<div class="person-modal-bio" style="margin-bottom:18px;">' + escapeHtml(s.description) + '</div>';
    }
    const all = [];
    if (s.moderator) all.push(Object.assign({}, s.moderator, { _moderator: true }));
    if (Array.isArray(s.panelists)) s.panelists.forEach(p => all.push(p));
    if (all.length) {
      bodyHtml += '<div class="session-panelists" style="border-top: 1px solid var(--border); padding-top: 16px;">' +
        '<div class="session-panelists-label">' + (all.length === 1 ? 'Speaker' : 'Speakers') + '</div>' +
        all.map(p => '<div class="session-panelist ' + (p._moderator?'moderator':'') + '">' +
          '<span class="name">' + escapeHtml(p.name || '') + '</span>' +
          (p.role ? ' <span class="role">— ' + escapeHtml(p.role) + '</span>' : '') +
        '</div>').join('') +
      '</div>';
    }
    body.innerHTML = bodyHtml;
    const actionsEl = $('person-modal-actions');
    const actions = [];
    // Hero CTA: Next Level Panels (LIVE + Artist Day) link to their info page.
    // Matches any session title containing "next level panels" (case/space-insensitive).
    if (s.title && /next\s*level\s*panels/i.test(s.title)) {
      actions.push('<a class="modal-btn hero" href="https://www.nxne.com/next-level-panels-2026" target="_blank" rel="noopener">→ Get more info</a>');
    }
    const matchedEvent = findEventForSession_(s);
    if (matchedEvent !== -1) {
      actions.push('<button class="modal-btn full-session" onclick="nxneSchedule.closePersonModal();nxneSchedule.setTab(\'calendar\');setTimeout(function(){nxneSchedule.openModal(' + matchedEvent + ')},200);">→ View on calendar</button>');
    }
    actions.push('<a class="modal-btn primary" href="https://www.nxne.com/tickets" target="_blank" rel="noopener">🎟 Get tickets</a>');
    actionsEl.innerHTML = actions.join('');
    actionsEl.style.display = actions.length ? '' : 'none';
    $('person-modal-overlay').classList.add('open');
    $('person-modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function findEventForSession_(s) {
    if (!s || !s.title) return -1;
    const target_ = s.title.toLowerCase().trim();
    for (let i = 0; i < SCHEDULE.length; i++) {
      const evTitle = (SCHEDULE[i].event || '').toLowerCase().trim();
      if (evTitle === target_) return i;
      if (evTitle.includes(target_) || target_.includes(evTitle)) return i;
    }
    return -1;
  }

  function revealEmail(btn) {
    if (!btn || !btn.dataset || !btn.dataset.enc) return;
    let email = '';
    try { email = atob(btn.dataset.enc); }
    catch (e) { console.error('email decode error', e); return; }
    const wrapper = document.createElement('div');
    wrapper.className = 'email-reveal';
    wrapper.innerHTML =
      '<a href="mailto:' + escapeAttr(email) + '" class="email-display" title="Open in mail app">'
      + escapeHtml(email) + '</a>'
      + '<button class="modal-btn email-copy" onclick="nxneSchedule.copyEmail(this, \''
      + escapeAttr(email) + '\')">⎘ Copy</button>';
    btn.parentNode.replaceChild(wrapper, btn);
  }

  function copyEmail(btn, email) {
    if (!email) return;
    const orig = btn.innerHTML;
    const flash = function () {
      btn.innerHTML = '✓ Copied';
      btn.classList.add('copied');
      setTimeout(function () { btn.innerHTML = orig; btn.classList.remove('copied'); }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(flash).catch(flash);
    } else {
      const tmp = document.createElement('input');
      tmp.value = email;
      document.body.appendChild(tmp);
      tmp.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(tmp);
      flash();
    }
  }

  function goToLinkedSession(slug) {
    if (!slug) return;
    closeModal();
    setTab('summit');
    setTimeout(() => {
      const el = target.querySelector('[data-session-id="' + slug + '"]');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('summit-session-flash');
        setTimeout(() => el.classList.remove('summit-session-flash'), 1600);
      }
    }, 280);
  }

  /* ─── TAB ROUTING ─────────────────────────────────────────── */
  function setTab(tab, options) {
    options = options || {};
    if (state.tab === tab && !options.force) return;
    state.tab = tab;
    target.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    target.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.dataset.tab === tab));
    if (!options.fromHash) {
      const anchor = options.anchor ? '#session-' + options.anchor : ('#' + tab);
      history.replaceState(null, '', anchor);
    }
    if (tab === 'summit') {
      renderSummitDayStrip();
      renderSummitList();
      if (options.anchor) {
        requestAnimationFrame(() => {
          const t = target.querySelector('#session-' + options.anchor);
          if (t) {
            const headerOffset = 80;
            const top = t.getBoundingClientRect().top + window.scrollY - headerOffset;
            window.scrollTo({ top, behavior: 'smooth' });
          }
        });
      }
    } else if (tab === 'panelists') {
      renderPanelists();
    } else if (tab === 'industry') {
      renderIndustry();
    }
  }

  function applyHashOnBoot() {
    const h = (window.location.hash || '').replace('#', '');
    if (!h) return;
    if (h === 'summit')         { setTab('summit',         { fromHash: true }); return; }
    if (h === 'calendar')       { setTab('calendar',       { fromHash: true }); return; }
    if (h === 'panelists')      { setTab('panelists',      { fromHash: true }); return; }
    if (h === 'industry')       { setTab('industry',       { fromHash: true }); return; }
    /* Back-compat: legacy #people deep-link → land on Industry tab */
    if (h === 'people')    { setTab('industry',  { fromHash: true }); return; }
    if (h.startsWith('session-')) {
      const slug = h.replace('session-', '');
      setTab('summit', { fromHash: true, anchor: slug });
    }
  }
  window.addEventListener('hashchange', applyHashOnBoot);

  function findSessionForEvent(e) {
    if (!e || !SUMMIT_SESSIONS.length) return null;
    const t = (e.event || '').toLowerCase().trim();
    return SUMMIT_SESSIONS.find(s => {
      const candidates = [s.matchEvent, s.title].filter(Boolean).map(x => x.toLowerCase().trim());
      return candidates.includes(t);
    });
  }

  function jumpToSession() {
    const e = SCHEDULE[state.currentEventIdx];
    if (!e) return;
    const session = findSessionForEvent(e);
    if (!session) return;
    const slug = session.id || (session.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    closeModal();
    setTimeout(() => setTab('summit', { anchor: slug }), 80);
  }

  /* ─── BOOT ────────────────────────────────────────────────── */
  fetchLive();
  setInterval(fetchLive, POLL_MS);
  setInterval(() => { if (loaded) { renderDayPicker(); renderTimeline(); } }, 60*1000);
  renderSummitDayStrip();
  renderSummitList();
  renderPeople();
  applyHashOnBoot();

  /* Iframe support (no-op when used as script-injection widget) */
  if (window.self !== window.top) target.classList.add('embedded');
  function postHeight() {
    if (window.self === window.top) return;
    const h = Math.max(document.body.scrollHeight, document.body.offsetHeight);
    window.parent.postMessage({ type: 'nxne-height', height: Math.ceil(h) }, '*');
  }
  window.addEventListener('load', () => requestAnimationFrame(postHeight));
  [300, 800, 1500, 3000].forEach(ms => setTimeout(postHeight, ms));
  if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(postHeight)).observe(document.body);

  /* ─── EXPOSE FOR INLINE HANDLERS ─────────────────────────── */
  window.nxneSchedule = {
    setTab, clearFilters, closeModal, openModal, openPersonModal,
    closePersonModal, openSessionModal, setActiveDay, setSummitDay,
    setIndustryFilter, toggleCat, jumpToSession, downloadIcs,
    openMapFromModal, copyLink, closeMap, revealEmail, copyEmail,
    goToLinkedSession
  };
})();
