import React from "react";
import { MARKING_DISCLOSURE_SHORT, DISCLAIMER_SHORT } from "../legalContent.js";

/* Small shared and leaf UI components used across the views. */

export function WorkDiagram({ d }) {
  if (!d) return null;
  const C = { line: "#9DB2C8", ink: "#131A22", go: "#1E8E5A", stop: "#C0392B", sig: "#B97A0E" };

  if (d.type === "pctchange") {
    return (
      <svg viewBox="0 0 420 150" className="wd" aria-label="How to work out percentage change">
        <text x="0" y="14" fontSize="11" fill={C.sig} fontFamily="monospace">STEP 1 · find the difference</text>
        <rect x="0" y="24" width="90" height="30" fill="none" stroke={C.line} />
        <text x="45" y="43" fontSize="12" fill={C.ink} textAnchor="middle">{d.b}</text>
        <text x="100" y="43" fontSize="13" fill={C.ink}>−</text>
        <rect x="118" y="24" width="90" height="30" fill="none" stroke={C.line} />
        <text x="163" y="43" fontSize="12" fill={C.ink} textAnchor="middle">{d.a}</text>
        <text x="218" y="43" fontSize="13" fill={C.ink}>=</text>
        <rect x="236" y="24" width="90" height="30" fill="none" stroke={C.go} strokeWidth="1.6" />
        <text x="281" y="43" fontSize="12" fill={C.go} textAnchor="middle" fontWeight="700">{d.diff}</text>

        <text x="0" y="80" fontSize="11" fill={C.sig} fontFamily="monospace">STEP 2 · divide by the ORIGINAL, never the new one</text>
        <text x="0" y="112" fontSize="13" fill={C.ink}>{d.diff}</text>
        <line x1="0" y1="118" x2="86" y2="118" stroke={C.go} strokeWidth="1.8" />
        <text x="0" y="136" fontSize="13" fill={C.go} fontWeight="700">{d.a}</text>
        <text x="96" y="126" fontSize="13" fill={C.ink}>× 100  =  {d.res}</text>
        <text x="236" y="112" fontSize="11" fill={C.stop} fontFamily="monospace">✗ dividing by {d.b}</text>
        <text x="236" y="128" fontSize="11" fill={C.stop} fontFamily="monospace">is the classic error</text>
      </svg>
    );
  }

  if (d.type === "compare") {
    const w = (v) => Math.max(12, (v / Math.max(d.tA, d.tB)) * 200);
    return (
      <svg viewBox="0 0 420 140" className="wd" aria-label="How to compare two totals">
        <text x="0" y="14" fontSize="11" fill={C.sig} fontFamily="monospace">STEP 1 · total each row completely</text>
        <text x="0" y="40" fontSize="11" fill={C.ink}>{d.nA}</text>
        <rect x="110" y="28" width={w(d.tA)} height="16" fill="#2F71B855" stroke="#2F71B8" />
        <text x={118 + w(d.tA)} y="41" fontSize="11" fill={C.ink}>{d.tA}</text>
        <text x="0" y="70" fontSize="11" fill={C.ink}>{d.nB}</text>
        <rect x="110" y="58" width={w(d.tB)} height="16" fill="#F5A52455" stroke={C.sig} />
        <text x={118 + w(d.tB)} y="71" fontSize="11" fill={C.ink}>{d.tB}</text>

        <text x="0" y="100" fontSize="11" fill={C.sig} fontFamily="monospace">STEP 2 · the answer needs BOTH parts</text>
        <rect x="0" y="110" width="180" height="24" fill="none" stroke={C.go} strokeWidth="1.6" />
        <text x="90" y="126" fontSize="11.5" fill={C.go} textAnchor="middle" fontWeight="700">which one: {d.bigger}</text>
        <rect x="192" y="110" width="180" height="24" fill="none" stroke={C.go} strokeWidth="1.6" />
        <text x="282" y="126" fontSize="11.5" fill={C.go} textAnchor="middle" fontWeight="700">by how much: {d.gap}</text>
      </svg>
    );
  }

  if (d.type === "share") {
    const pct = Math.max(4, Math.min(96, d.pct));
    return (
      <svg viewBox="0 0 420 130" className="wd" aria-label="How to work out a share of a total">
        <text x="0" y="14" fontSize="11" fill={C.sig} fontFamily="monospace">part ÷ WHOLE TABLE, not the row you are looking at</text>
        <rect x="0" y="26" width="360" height="26" fill="none" stroke={C.line} />
        <rect x="0" y="26" width={(pct / 100) * 360} height="26" fill="#3ECF8E44" stroke={C.go} strokeWidth="1.4" />
        <text x={(pct / 100) * 180} y="44" fontSize="11" fill={C.go} textAnchor="middle" fontWeight="700">{d.part}</text>
        <text x="368" y="44" fontSize="11" fill={C.ink}>whole: {d.whole}</text>
        <text x="0" y="82" fontSize="13" fill={C.ink}>{d.part}</text>
        <line x1="0" y1="88" x2="96" y2="88" stroke={C.go} strokeWidth="1.8" />
        <text x="0" y="106" fontSize="13" fill={C.go} fontWeight="700">{d.whole}</text>
        <text x="106" y="96" fontSize="13" fill={C.ink}>× 100  =  {d.res}</text>
      </svg>
    );
  }

  if (d.type === "mean") {
    return (
      <svg viewBox="0 0 420 110" className="wd" aria-label="How to work out a mean">
        <text x="0" y="14" fontSize="11" fill={C.sig} fontFamily="monospace">add every cell in the row, then divide by how many</text>
        {d.cells.map((v, i) => (
          <g key={i}>
            <rect x={i * 62} y="26" width="52" height="26" fill="none" stroke={C.line} />
            <text x={i * 62 + 26} y="44" fontSize="11" fill={C.ink} textAnchor="middle">{v}</text>
            {i < d.cells.length - 1 && <text x={i * 62 + 55} y="44" fontSize="12" fill={C.ink}>+</text>}
          </g>
        ))}
        <text x="0" y="76" fontSize="12" fill={C.ink}>total {d.total}  ÷  {d.n}  =</text>
        <rect x="150" y="58" width="90" height="26" fill="none" stroke={C.go} strokeWidth="1.6" />
        <text x="195" y="76" fontSize="12" fill={C.go} textAnchor="middle" fontWeight="700">{d.res}</text>
      </svg>
    );
  }

  if (d.type === "tfc") {
    return (
      <svg viewBox="0 0 420 132" className="wd" aria-label="How to decide true, false or can't tell">
        <text x="0" y="14" fontSize="11" fill={C.sig} fontFamily="monospace">ask one question, in this order</text>
        <rect x="0" y="24" width="418" height="28" fill="none" stroke={C.line} />
        <text x="10" y="42" fontSize="11.5" fill={C.ink}>Does the passage SAY it?</text>
        <text x="330" y="42" fontSize="11.5" fill={C.go} fontWeight="700">→ TRUE</text>
        <rect x="0" y="58" width="418" height="28" fill="none" stroke={C.line} />
        <text x="10" y="76" fontSize="11.5" fill={C.ink}>Does the passage CONTRADICT it?</text>
        <text x="326" y="76" fontSize="11.5" fill={C.stop} fontWeight="700">→ FALSE</text>
        <rect x="0" y="92" width="418" height="28" fill="none" stroke={C.sig} strokeWidth="1.8" />
        <text x="10" y="110" fontSize="11.5" fill={C.ink}>Neither? The passage is SILENT.</text>
        <text x="300" y="110" fontSize="11.5" fill={C.sig} fontWeight="700">→ CAN'T TELL</text>
      </svg>
    );
  }
  return null;
}

export function BrandMark({ onClick }) {
  return (
    <button className="ud-markbtn" onClick={onClick} aria-label="Go to home">
      <span className="ud-mark"><b>Tempo</b><span>UCAT trainer</span></span>
    </button>
  );
}

export function ExitGuard({ open, onStay, onLeave }) {
  if (!open) return null;
  return (
    <div className="ud-modal" role="dialog" aria-modal="true">
      <div className="box">
        <h3>Leave this session?</h3>
        <p>This run's answers won't be saved to your history or mistake bank.</p>
        <div className="row">
          <button className="ud-btn ghost" onClick={onStay}>Stay</button>
          <button className="ud-btn" onClick={onLeave}>Leave session</button>
        </div>
      </div>
    </div>
  );
}

export function LastChecked({ when }) {
  return (
    <p className="mono" style={{ fontSize: 11, color: "var(--mute)", letterSpacing: "0.04em", margin: "10px 0 0" }}>
      Last checked against official sources: {when}. Always confirm on the university's own page before deciding.
    </p>
  );
}

export function MarkingNotice() {
  return (
    <p className="mono" style={{ fontSize: 11, color: "var(--mute)", letterSpacing: "0.04em", margin: "10px 0 0", lineHeight: 1.55 }}>
      {MARKING_DISCLOSURE_SHORT}
    </p>
  );
}

export function SiteDisclaimer() {
  return (
    <p className="ud-empty" style={{ paddingTop: 10, fontSize: 11.5, lineHeight: 1.6 }}>{DISCLAIMER_SHORT}</p>
  );
}

export function Monogram({ u }) {
  const init = u.name.replace("University of ", "").replace("Queen's University ", "").replace(" University", "").replace("Queen Mary University of London", "QM").slice(0, 2).toUpperCase();
  return <span className="uni-mono" style={{ background: u.col + "22", color: u.col, borderColor: u.col }}>{u.id === "qmul" ? "QM" : u.id === "kcl" ? "KC" : init}</span>;
}

export function Locked({ children, onUnlock, label }) {
  return (
    <div className="lk-wrap">
      <div className="lk-blur" aria-hidden="true">{children}</div>
      <div className="lk-over">
        <div className="lk-pill">
          <b>LOCKED</b>
          <span>{label || "Included with full access"}</span>
          <button onClick={onUnlock}>Unlock</button>
        </div>
      </div>
    </div>
  );
}
