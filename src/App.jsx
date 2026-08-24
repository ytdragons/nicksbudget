import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Wallet, TrendingUp, Receipt, Heart, CreditCard, ChevronRight, ChevronDown, Check, Plus, Trash2, ArrowUpRight, Shield, Plane, Home, PiggyBank, DollarSign, Banknote, Sun, Moon, Lock, Settings, CheckCircle } from "lucide-react";

/* ── Storage (Firebase + localStorage) ── */
const STORE = "nick-budget-v8";
const FB_URL = "https://nick-budget-default-rtdb.asia-southeast1.firebasedatabase.app";

// Local
const loadLocal = async () => { try { const raw = localStorage.getItem(STORE); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const saveLocal = async (d) => { try { localStorage.setItem(STORE, JSON.stringify(d)); } catch {} };

// Firebase
let _fbTimer = null;
const saveFirebase = (d) => {
  clearTimeout(_fbTimer);
  _fbTimer = setTimeout(() => {
    fetch(`${FB_URL}/budget.json`, { method: "PUT", body: JSON.stringify(d) }).catch(() => {});
  }, 800); // debounce 800ms so rapid edits don't spam
};
const loadFirebase = async () => {
  try { const r = await fetch(`${FB_URL}/budget.json`); const d = await r.json(); return d; }
  catch { return null; }
};

// Combined
const load = () => null; // sync load for initial render
const save = (d) => { saveLocal(d); saveFirebase(d); }; // save to both

const loadTheme = async () => { try { return localStorage.getItem("nick-theme") || "dark"; } catch { return "dark"; } };
const saveTheme = async (t) => { try { localStorage.setItem("nick-theme", t); } catch {} };

/* ── Password ── */
const hashPin = async (pin) => { const enc = new TextEncoder().encode(pin); const buf = await crypto.subtle.digest("SHA-256", enc); return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join(""); };
const getStoredHash = async () => { try { return localStorage.getItem("nick-pin-hash") || "82209d6e1505dc1e53f3149c0946cfc50079929043fd8f6911368611cfd4ff8b"; } catch { return "82209d6e1505dc1e53f3149c0946cfc50079929043fd8f6911368611cfd4ff8b"; } };
const setStoredHash = async (h) => { try { localStorage.setItem("nick-pin-hash", h); } catch {} };

/* ── Lock Screen ── */
function LockScreen({ onUnlock }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isNew, setIsNew] = useState(false);
  useEffect(() => { getStoredHash().then(h => { if (!h) setIsNew(true); }); }, []);
  const [step, setStep] = useState(1); // 1 = enter, 2 = confirm (new only)
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, [step]);

  const handleSubmit = async () => {
    setError("");
    if (isNew) {
      if (step === 1) {
        if (pin.length < 4) { setError("At least 4 characters"); return; }
        setStep(2);
        setConfirm("");
      } else {
        if (confirm !== pin) { setError("Doesn't match — try again"); setConfirm(""); return; }
        const h = await hashPin(pin);
        setStoredHash(h);
        onUnlock();
      }
    } else {
      const h = await hashPin(pin);
      const stored = await getStoredHash();
      if (h === stored) { onUnlock(); }
      else { setError("Wrong password"); setPin(""); }
    }
  };

  const dots = (val, max = 12) => {
    const filled = Math.min(val.length, max);
    return Array.from({ length: max }, (_, i) => (
      <div key={i} style={{
        width: 10, height: 10, borderRadius: 10, transition: "all 0.15s",
        background: i < filled ? "#E2B94E" : "rgba(255,255,255,0.1)",
        transform: i < filled ? "scale(1.2)" : "scale(1)",
      }} />
    ));
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#09090B", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif",
      color: "#F4F4F5", WebkitFontSmoothing: "antialiased",
    }}>
      <div style={{ textAlign: "center", maxWidth: 340, width: "100%", padding: "0 24px" }}>
        {/* Logo */}
        <div style={{
          width: 64, height: 64, borderRadius: 20, margin: "0 auto 32px",
          background: "linear-gradient(135deg, #E2B94E, #CCA030)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 32px rgba(226,185,78,0.2)",
        }}>
          <Lock size={28} color="#09090B" strokeWidth={2.2} />
        </div>

        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 8 }}>
          {isNew ? (step === 1 ? "Create a Password" : "Confirm Password") : "Welcome Back"}
        </div>
        <div style={{ fontSize: 14, color: "#63636E", marginBottom: 36 }}>
          {isNew
            ? (step === 1 ? "Set a password to protect your finances" : "Enter it again to confirm")
            : "Enter your password to continue"
          }
        </div>

        <div>
          <input
            ref={inputRef}
            type="password"
            value={step === 2 ? confirm : pin}
            onChange={e => step === 2 ? setConfirm(e.target.value) : setPin(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
            placeholder={isNew ? (step === 1 ? "Create password" : "Confirm password") : "Enter password"}
            autoFocus
            autoComplete="off"
            style={{
              width: "100%", padding: "14px 18px", borderRadius: 12,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#F4F4F5", fontSize: 16, fontFamily: "inherit", outline: "none",
              boxSizing: "border-box", marginBottom: 16, letterSpacing: "0.1em",
              transition: "border-color 0.2s",
            }}
            onFocus={e => e.target.style.borderColor = "#E2B94E"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
          />

          {error && (
            <div style={{ color: "#F87171", fontSize: 13, marginBottom: 16, fontWeight: 500 }}>{error}</div>
          )}

          <button type="button" onClick={handleSubmit} style={{
            width: "100%", padding: "14px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #E2B94E, #CCA030)",
            color: "#09090B", fontSize: 15, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit", letterSpacing: "0.01em",
            transition: "transform 0.15s, opacity 0.15s",
            opacity: (step === 2 ? confirm : pin).length >= 4 ? 1 : 0.4,
          }}
          onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
          >
            {isNew ? (step === 1 ? "Next" : "Set Password") : "Unlock"}
          </button>
        </div>

        <div style={{ fontSize: 11, color: "#63636E", marginTop: 24 }}>
          Stored locally on this device only
        </div>
      </div>
    </div>
  );
}

/* ── Change Password Modal ── */
function ChangePasswordModal({ onClose }) {
  const [current, setCurrent] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const ref = useRef(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 100); }, [step]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError("");
    if (step === 1) {
      const h = await hashPin(current);
      if (h !== await getStoredHash()) { setError("Current password is wrong"); setCurrent(""); return; }
      setStep(2);
    } else if (step === 2) {
      if (newPin.length < 4) { setError("At least 4 characters"); return; }
      setStep(3);
    } else {
      if (confirm !== newPin) { setError("Doesn't match"); setConfirm(""); return; }
      const h = await hashPin(newPin);
      setStoredHash(h);
      onClose("Password changed");
    }
  };

  const labels = { 1: "Current Password", 2: "New Password", 3: "Confirm New Password" };
  const vals = { 1: current, 2: newPin, 3: confirm };
  const setters = { 1: setCurrent, 2: setNewPin, 3: setConfirm };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#1C1C1F", borderRadius: 20, padding: 32, width: 340, border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 16px 48px rgba(0,0,0,0.4)" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#F4F4F5", marginBottom: 4 }}>Change Password</div>
        <div style={{ fontSize: 13, color: "#63636E", marginBottom: 24 }}>{labels[step]}</div>
        <form onSubmit={handleSubmit}>
          <input ref={ref} type="password" value={vals[step]} onChange={e => setters[step](e.target.value)} autoFocus placeholder={labels[step]}
            style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#F4F4F5", fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 12 }}
            onFocus={e => e.target.style.borderColor = "#E2B94E"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
          {error && <div style={{ color: "#F87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#A1A1AA", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button type="submit" style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #E2B94E, #CCA030)", color: "#09090B", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {step === 3 ? "Save" : "Next"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Format ── */
const fmt = (n, d) => { if (n == null) return "$0"; const dec = d !== undefined ? d : (Number.isInteger(n) && Math.abs(n) >= 100 ? 0 : 2); return (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-AU", { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
const fmtK = (n) => Math.abs(n) >= 10000 ? (n < 0 ? "-" : "") + "$" + (Math.abs(n) / 1000).toFixed(Math.abs(n) % 1000 === 0 ? 0 : 1) + "k" : fmt(n, 0);

/* ── Palettes ── */
const DARK = {
  bg: "#09090B", surface: "#131316", card: "#18181C",
  cardBorder: "rgba(255,255,255,0.07)", cardSh: "0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.25)",
  cardShH: "0 4px 16px rgba(0,0,0,0.5), 0 16px 40px rgba(0,0,0,0.35)",
  border: "rgba(255,255,255,0.07)", text: "#F8F8FA", sub: "#A0A0B0", dim: "#5C5C6E",
  gold: "#E2B94E", goldBg: "rgba(226,185,78,0.1)", goldBorder: "rgba(226,185,78,0.25)",
  green: "#22E87A", greenBg: "rgba(34,232,122,0.08)",
  orange: "#FF8C1A", orangeBg: "rgba(255,140,26,0.08)",
  red: "#FF4757", redBg: "rgba(255,71,87,0.08)",
  pink: "#FF3A6E", pinkBg: "rgba(255,58,110,0.08)",
  purple: "#B44EFF", teal: "#00D9FF", indigo: "#8B6CFF", blue: "#3B8BFF",
  inputBg: "rgba(255,255,255,0.06)", navBg: "rgba(9,9,11,0.85)", editDash: "rgba(255,255,255,0.15)",
  hoverBg: "rgba(255,255,255,0.02)", tickBg: "transparent", dateSch: "dark",
  toastBg: "#E2B94E", toastColor: "#09090B", toastSh: "0 4px 20px rgba(226,185,78,0.35)",
};
const LIGHT = {
  bg: "#F4F4F7", surface: "#EAEAEE", card: "#FFFFFF",
  cardBorder: "rgba(0,0,0,0.06)", cardSh: "0 1px 3px rgba(0,0,0,0.05), 0 6px 16px rgba(0,0,0,0.04)",
  cardShH: "0 2px 8px rgba(0,0,0,0.07), 0 12px 28px rgba(0,0,0,0.06)",
  border: "rgba(0,0,0,0.06)", text: "#111118", sub: "#555566", dim: "#999AAA",
  gold: "#B38A1D", goldBg: "rgba(179,138,29,0.08)", goldBorder: "rgba(179,138,29,0.22)",
  green: "#0A9E42", greenBg: "rgba(10,158,66,0.06)",
  orange: "#D97200", orangeBg: "rgba(217,114,0,0.06)",
  red: "#E02040", redBg: "rgba(224,32,64,0.06)",
  pink: "#D91560", pinkBg: "rgba(217,21,96,0.06)",
  purple: "#7B2FE0", teal: "#0093B8", indigo: "#5B42D9", blue: "#1A6FE0",
  inputBg: "rgba(0,0,0,0.03)", navBg: "rgba(244,244,247,0.85)", editDash: "rgba(0,0,0,0.14)",
  hoverBg: "rgba(0,0,0,0.018)", tickBg: "transparent", dateSch: "light",
  toastBg: "#111118", toastColor: "#fff", toastSh: "0 4px 20px rgba(0,0,0,0.18)",
};

/* ── Theme context ── */
const ThemeCtx = createContext(DARK);
const useP = () => useContext(ThemeCtx);

/* ── Responsive hook ── */
const MobileCtx = createContext(false);
const useMobile = () => useContext(MobileCtx);
function useIsMobile() {
  const get = () => {
    if (typeof window === "undefined") return false;
    // Use the smaller of viewport width and screen width, and also honour coarse pointers
    const w = Math.min(window.innerWidth || 9999, document.documentElement?.clientWidth || 9999);
    return w < 600;
  };
  const [m, setM] = useState(get);
  useEffect(() => {
    const on = () => setM(get());
    on();
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    return () => { window.removeEventListener("resize", on); window.removeEventListener("orientationchange", on); };
  }, []);
  return m;
}

/* ── Editable number ── */
function Editable({ value, onChange, style = {}, format }) {
  const P = useP();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef(null);
  const start = () => { setDraft(String(value ?? "")); setEditing(true); setTimeout(() => ref.current?.select(), 20); };
  const commit = () => { const n = parseFloat(draft); if (!isNaN(n)) onChange(n); setEditing(false); };
  if (editing) return <input ref={ref} type="number" value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }} autoFocus style={{ background: P.inputBg, border: `2px solid ${P.gold}`, borderRadius: 8, padding: "4px 8px", fontSize: "inherit", fontWeight: "inherit", fontFamily: "inherit", color: P.text, outline: "none", width: "100%", minWidth:0, boxSizing: "border-box", ...style }} />;
  return <span onClick={start} style={{ cursor: "pointer", borderBottom: `1px dashed ${P.editDash}`, transition: "all 0.2s", display:"inline-block", maxWidth:"100%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", ...style }} onMouseEnter={e => e.target.style.borderBottomColor = P.gold} onMouseLeave={e => e.target.style.borderBottomColor = P.editDash}>{format ? format(value) : fmt(value)}</span>;
}
function EditableText({ value, onChange, style = {} }) {
  const P = useP();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const ref = useRef(null);
  const start = () => { setDraft(value || ""); setEditing(true); setTimeout(() => ref.current?.focus(), 20); };
  const commit = () => { onChange(draft); setEditing(false); };
  if (editing) return <input ref={ref} value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }} autoFocus style={{ background: P.inputBg, border: `2px solid ${P.gold}`, borderRadius: 6, padding: "2px 6px", fontSize: "inherit", fontWeight: "inherit", fontFamily: "inherit", color: P.text, outline: "none", width: "100%", minWidth:0, boxSizing: "border-box", ...style }} />;
  return <span onClick={start} style={{ cursor: "pointer", borderBottom: `1px dashed ${P.editDash}`, display:"inline-block", maxWidth:"100%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", ...style }} onMouseEnter={e => e.target.style.borderBottomColor = P.gold} onMouseLeave={e => e.target.style.borderBottomColor = P.editDash}>{value || "—"}</span>;
}
function EditableDate({ value, onChange, style = {} }) {
  const P = useP();
  const [editing, setEditing] = useState(false);
  const ref = useRef(null);
  const toISO = v => { if (!v) return ""; const p = v.split("/"); return p.length === 3 ? `${p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}` : v; };
  const fromISO = v => { if (!v) return ""; const p = v.split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : v; };
  const display = v => { if (!v) return "—"; const p = v.split("/"); if (p.length !== 3) return v; const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${parseInt(p[0],10)} ${m[parseInt(p[1],10)-1]||p[1]} ${p[2]}`; };
  if (editing) return <input ref={ref} type="date" defaultValue={toISO(value)} onChange={e => { onChange(fromISO(e.target.value)); setEditing(false); }} onBlur={() => setEditing(false)} autoFocus style={{ background: P.inputBg, border: `2px solid ${P.gold}`, borderRadius: 8, padding: "4px 8px", fontSize: "inherit", fontWeight: "inherit", fontFamily: "inherit", color: P.text, outline: "none", colorScheme: P.dateSch, ...style }} />;
  return <span onClick={() => { setEditing(true); setTimeout(() => ref.current?.showPicker?.(), 50); }} style={{ cursor: "pointer", borderBottom: `1px dashed ${P.editDash}`, transition: "all 0.2s", ...style }} onMouseEnter={e => e.target.style.borderBottomColor = P.gold} onMouseLeave={e => e.target.style.borderBottomColor = P.editDash}>{display(value)}</span>;
}

/* ── Account styles ── */
const useAcctStyle = (n) => { const P = useP(); const m = { "Nick Holidays": { icon: Plane, color: P.blue }, "Nick Savings": { icon: PiggyBank, color: P.green }, "Wedding Fund": { icon: Heart, color: P.pink }, "Honeymoon": { icon: Plane, color: P.purple }, "Joint Bills Account": { icon: Receipt, color: P.indigo }, "House and Reno Fund": { icon: Home, color: P.teal }, "Nick Emergency": { icon: Shield, color: P.orange }, "Home Loan Offset": { icon: Home, color: P.green } }; return m[n] || { icon: DollarSign, color: P.gold }; };

/* ── Tabs ── */
const ALL_TABS = { overview: { label: "Overview", icon: Wallet }, allocate: { label: "Allocate Pay", icon: Banknote }, bills: { label: "Bills", icon: Receipt }, wedding: { label: "Wedding", icon: Heart }, credit: { label: "Credit Card", icon: CreditCard } };
const DEFAULT_TAB_ORDER = ["overview","allocate","bills","wedding","credit"];
const MONTHS = ["Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May"];

/* ── Defaults ── */
const DEFAULTS = {
  tabOrder: DEFAULT_TAB_ORDER,
  accounts: [{ name: "Nick Holidays", balance: 6000, offset: true },{ name: "Nick Savings", balance: 106000, offset: true },{ name: "Wedding Fund", balance: 18500, offset: true },{ name: "Honeymoon", balance: 730.59, offset: true },{ name: "Joint Bills Account", balance: 2013.67, offset: true },{ name: "House and Reno Fund", balance: 2000, offset: true },{ name: "Nick Emergency", balance: 42000, offset: true },{ name: "Home Loan Offset", balance: 1631.55, offset: true }],
  payAmount: 0, allocations: {}, payMonth: "August 2026", payHistory: [],
  goals: { wedding: 75000, honeymoon: 30000 },
  mortgage: { label: "CompleteME Home Loan", balance: -693505.92, rate: 6.09, nextPayment: 4246.35, nextPaymentDate: "28/08/2026" },
  currentBills: { month: "August", budget: 2525, items: [{ name: "Gym", forecast: 58, paid: 58 },{ name: "NZ Fine", forecast: 50, paid: 38.56 },{ name: "Haircut", forecast: 45, paid: 45 },{ name: "Bernie", forecast: 50, paid: 50 },{ name: "Gym", forecast: 58, paid: 58 },{ name: "Gym", forecast: 58, paid: 58 },{ name: "Petrol", forecast: 100, paid: 100 },{ name: "Car Insurance", forecast: 101.09, paid: 101.09 },{ name: "Father's Day", forecast: 75, paid: 0 },{ name: "Oura", forecast: 10, paid: 10 },{ name: "Uber", forecast: 10, paid: 10 },{ name: "Susie", forecast: 75, paid: 0 },{ name: "Anno Present", forecast: 50, paid: 80 },{ name: "Budget Moved", forecast: 0, paid: 76.64 }] },
  wedding: { contributions: [{ name: "Mum & Trace", amount: 20000 },{ name: "Dad", amount: 5000 },{ name: "Meme Money", amount: 4000 }], expenses: [{ name: "Wedding Deposit", deposit: 5500, unpaid: 25000 },{ name: "Photographer", deposit: 1500, unpaid: 4100 },{ name: "Dress", deposit: 0, unpaid: 9000 },{ name: "Entertainment", deposit: 0, unpaid: 4000 },{ name: "Suits", deposit: 0, unpaid: 2500 }], monthlySaving: 1000 },
  honeymoonBooked: [{ name: "Flights to Europe", deposit: 3598.26, unpaid: 0 },{ name: "Accom Melbourne", deposit: 151.42, unpaid: 0 },{ name: "Flight to Melbourne", deposit: 121.30, unpaid: 0 }],
  headings: {},
  creditCard: { savingsTarget: 15000, savingsCurrent: 11668.70, workExpenses: [{ desc: "", amount: 18.74, checked: false },{ desc: "", amount: 84.16, checked: false },{ desc: "", amount: 17.53, checked: false },{ desc: "", amount: 204, checked: false },{ desc: "", amount: 98, checked: false },{ desc: "", amount: 767.80, checked: false },{ desc: "", amount: 761.20, checked: false },{ desc: "Zushi", amount: 116.05, checked: false },{ desc: "Cook & Archies", amount: 64.96, checked: false },{ desc: "Uber", amount: 30.05, checked: false },{ desc: "Uber", amount: 37.86, checked: false },{ desc: "Uber", amount: 29.39, checked: false },{ desc: "Breaky Case", amount: 59.38, checked: false },{ desc: "", amount: 39.46, checked: false }], personalExpenses: [] },
  savingsGoals: {
    wedding: { start: 17500, rows: [
      { month: "August Pay & Bonus", nick: 1000, elle: 1000 },
      { month: "September Pay", nick: 1000, elle: 1000 },
      { month: "October Pay", nick: 1000, elle: 1000 },
      { month: "November Pay & Bonus", nick: 1000, elle: 1000 },
      { month: "December Pay", nick: 1000, elle: 1000 },
      { month: "January Pay", nick: 1000, elle: 1000 },
      { month: "February Pay & Bonus", nick: 1000, elle: 1000 },
      { month: "March Pay", nick: 1000, elle: 1000 },
      { month: "April Pay", nick: 1000, elle: 1000 },
    ]},
    honeymoon: { start: 0, rows: [
      { month: "August Pay & Bonus", nick: 1000, elle: 500 },
      { month: "September Pay", nick: 1000, elle: 500 },
      { month: "October Pay", nick: 1000, elle: 500 },
      { month: "November Pay & Bonus", nick: 1000, elle: 500 },
      { month: "December Pay", nick: 1000, elle: 500 },
      { month: "January Pay", nick: 1000, elle: 500 },
      { month: "February Pay & Bonus", nick: 1000, elle: 500 },
      { month: "March Pay", nick: 1000, elle: 500 },
      { month: "April Pay", nick: 1000, elle: 500 },
    ]},
  },
};

/* ── Shared UI ── */
function Card({ children, style, onClick }) { const P = useP(); const isM = useMobile(); return <div onClick={onClick} style={{ background: P.card, borderRadius: 16, border: `1px solid ${P.cardBorder}`, boxShadow: P.cardSh, padding: isM ? 16 : 24, minWidth:0, maxWidth:"100%", transition: "all 0.25s", ...(onClick?{cursor:"pointer"}:{}), ...style }} onMouseEnter={e=>{if(onClick){e.currentTarget.style.boxShadow=P.cardShH;e.currentTarget.style.borderColor=P.goldBorder;e.currentTarget.style.transform="translateY(-2px)";}}} onMouseLeave={e=>{if(onClick){e.currentTarget.style.boxShadow=P.cardSh;e.currentTarget.style.borderColor=P.cardBorder;e.currentTarget.style.transform="none";}}}>{children}</div>; }
function Section({ title, subtitle, children }) { const P = useP(); const isM = useMobile(); return <div style={{ marginBottom: isM ? 26 : 36, minWidth:0, maxWidth:"100%" }}><h2 style={{ fontSize: isM ? 18 : 20, fontWeight: 600, color: P.text, margin: 0, letterSpacing: "-0.01em" }}>{title}</h2>{subtitle&&<p style={{ fontSize: 13, color: P.sub, margin: "4px 0 0" }}>{subtitle}</p>}<div style={{ marginTop: 16 }}>{children}</div></div>; }
function Progress({ value, max, height = 4 }) { const P = useP(); const pct = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0; return <div style={{ width: "100%", height, borderRadius: height, background: P.border, overflow: "hidden" }}><div style={{ width: `${pct*100}%`, height: "100%", borderRadius: height, background: P.gold, transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)" }}/></div>; }
function ProgressC({ value, max, color, height = 4 }) { const P = useP(); const pct = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0; return <div style={{ width: "100%", height, borderRadius: height, background: P.border, overflow: "hidden" }}><div style={{ width: `${pct*100}%`, height: "100%", borderRadius: height, background: color, transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)" }}/></div>; }
function IconBubble({ icon: Icon, color, size = 36 }) { return <div style={{ width: size, height: size, borderRadius: size*0.28, background: color+"18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={size*0.44} color={color} strokeWidth={1.8}/></div>; }
function AddButton({ onClick, label }) { const P = useP(); return <button onClick={onClick} style={{ display:"flex",alignItems:"center",gap:6,background:"none",border:`1px dashed ${P.dim}`,borderRadius:10,padding:"8px 16px",color:P.dim,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",width:"100%",justifyContent:"center" }} onMouseEnter={e=>{e.currentTarget.style.borderColor=P.gold;e.currentTarget.style.color=P.gold;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=P.dim;e.currentTarget.style.color=P.dim;}}><Plus size={12}/>{label}</button>; }
function RemoveBtn({ onClick }) { const P = useP(); return <button onClick={e=>{e.stopPropagation();onClick();}} style={{ background:"none",border:"none",cursor:"pointer",padding:4,borderRadius:6,color:P.dim,transition:"color 0.15s",display:"flex",alignItems:"center" }} onMouseEnter={e=>e.currentTarget.style.color=P.red} onMouseLeave={e=>e.currentTarget.style.color=P.dim}><Trash2 size={13}/></button>; }
function Tick({ checked, onClick, size=20 }) { const P = useP(); return <div onClick={onClick} style={{ width:size,height:size,borderRadius:size,border:checked?"none":`1.5px solid ${P.dim}`,background:checked?P.gold:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 0.2s",flexShrink:0 }}>{checked&&<Check size={size*0.6} color={P.bg} strokeWidth={3}/>}</div>; }

/* ═══════════ MAIN ═══════════ */
export default function App() {
  const [locked, setLocked] = useState(true);
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("dark");
  useEffect(() => { loadTheme().then(t => setTheme(t)); }, []);
  const [dragId, setDragId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [saved, setSaved] = useState(false);
  const historyRef = useRef([]); const pointerRef = useRef(-1);
  const showToast = m => { setToast(m); setTimeout(() => setToast(null), 1200); };
  const flashSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 1500); };

  useEffect(() => {
    const init = async () => {
      // Try Firebase first (most up to date), fall back to localStorage, then defaults
      let d = null;
      try { d = await loadFirebase(); } catch {}
      if (!d) d = await loadLocal();
      if (!d) d = JSON.parse(JSON.stringify(DEFAULTS));
      // Normalise: Firebase turns empty arrays into null and sparse arrays into objects
      const toArr = (v) => Array.isArray(v) ? v.filter(Boolean) : (v && typeof v === "object" ? Object.values(v).filter(Boolean) : []);
      d.accounts = toArr(d.accounts);
      if (!d.accounts.length) d.accounts = JSON.parse(JSON.stringify(DEFAULTS.accounts));
      d.payHistory = toArr(d.payHistory);
      d.honeymoonBooked = toArr(d.honeymoonBooked);
      if (!d.wedding || typeof d.wedding !== "object") d.wedding = { contributions: [], expenses: [] };
      d.wedding.contributions = toArr(d.wedding.contributions);
      d.wedding.expenses = toArr(d.wedding.expenses);
      if (!d.currentBills || typeof d.currentBills !== "object") d.currentBills = JSON.parse(JSON.stringify(DEFAULTS.currentBills));
      d.currentBills.items = toArr(d.currentBills.items);
      if (!d.creditCard || typeof d.creditCard !== "object") d.creditCard = JSON.parse(JSON.stringify(DEFAULTS.creditCard));
      d.creditCard.workExpenses = toArr(d.creditCard.workExpenses);
      d.creditCard.personalExpenses = toArr(d.creditCard.personalExpenses);
      if (!d.savingsGoals || typeof d.savingsGoals !== "object") d.savingsGoals = JSON.parse(JSON.stringify(DEFAULTS.savingsGoals));
      ["wedding","honeymoon"].forEach(k => {
        if (!d.savingsGoals[k] || typeof d.savingsGoals[k] !== "object") d.savingsGoals[k] = JSON.parse(JSON.stringify(DEFAULTS.savingsGoals[k]));
        d.savingsGoals[k].rows = toArr(d.savingsGoals[k].rows);
        if (!d.savingsGoals[k].rows.length) d.savingsGoals[k].rows = JSON.parse(JSON.stringify(DEFAULTS.savingsGoals[k].rows));
      });
      if (!d.allocations || typeof d.allocations !== "object") d.allocations = {};
      if (!d.mortgage || typeof d.mortgage !== "object") d.mortgage = JSON.parse(JSON.stringify(DEFAULTS.mortgage));
      if (!d.payMonth) d.payMonth = "August 2026";
      d.tabOrder = Array.isArray(d.tabOrder) ? d.tabOrder.filter(t => DEFAULT_TAB_ORDER.includes(t)) : [...DEFAULT_TAB_ORDER];
      if (!d.tabOrder.length) d.tabOrder = [...DEFAULT_TAB_ORDER];
      saveLocal(d); // keep localStorage in sync
      setData(d);
      historyRef.current = [JSON.stringify(d)];
      pointerRef.current = 0;
      setLoading(false);
    };
    init();
  }, []);
  const update = useCallback(fn => { setData(prev => { const next = JSON.parse(JSON.stringify(prev)); fn(next); save(next); historyRef.current = [...historyRef.current.slice(0, pointerRef.current+1), JSON.stringify(next)].slice(-50); pointerRef.current = historyRef.current.length-1; return next; }); flashSaved(); }, []);
  const undo = useCallback(() => { if (pointerRef.current > 0) { pointerRef.current--; const d = JSON.parse(historyRef.current[pointerRef.current]); setData(d); save(d); showToast("Undo"); } }, []);
  const redo = useCallback(() => { if (pointerRef.current < historyRef.current.length-1) { pointerRef.current++; const d = JSON.parse(historyRef.current[pointerRef.current]); setData(d); save(d); showToast("Redo"); } }, []);
  useEffect(() => { const h = e => { const mod = navigator.platform.includes("Mac") ? e.metaKey : e.ctrlKey; if (!mod) return; if (e.key==="z"&&!e.shiftKey){e.preventDefault();undo();} else if((e.key==="z"&&e.shiftKey)||e.key==="y"){e.preventDefault();redo();} }; window.addEventListener("keydown",h); return()=>window.removeEventListener("keydown",h); }, [undo,redo]);
  const reset = () => { const d = JSON.parse(JSON.stringify(DEFAULTS)); setData(d); save(d); historyRef.current=[JSON.stringify(d)]; pointerRef.current=0; showToast("Reset"); };

  const isMobile = useIsMobile();

  if (locked) return <LockScreen onUnlock={() => setLocked(false)} />;
  const P = theme === "dark" ? DARK : LIGHT;
  const toggleTheme = () => { const next = theme === "dark" ? "light" : "dark"; setTheme(next); saveTheme(next); };
  const onDragStart=(e,id)=>{setDragId(id);e.dataTransfer.effectAllowed="move";}; const onDragOver=(e,id)=>{e.preventDefault();if(id!==dragId)setDropTarget(id);}; const onDrop=(e,tid)=>{e.preventDefault();if(dragId&&dragId!==tid)update(d=>{const o=d.tabOrder||[...DEFAULT_TAB_ORDER];const f=o.indexOf(dragId);const t=o.indexOf(tid);if(f>-1&&t>-1){o.splice(f,1);o.splice(t,0,dragId);d.tabOrder=o;}});setDragId(null);setDropTarget(null);};

  if (loading||!data) return <div style={{ background: P.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"-apple-system,'SF Pro Display','Inter',system-ui,sans-serif" }}><div style={{ color:P.sub }}>Loading…</div></div>;
  const tabOrder = data.tabOrder || DEFAULT_TAB_ORDER;
  const canUndo = pointerRef.current > 0, canRedo = pointerRef.current < historyRef.current.length - 1;
  const ttStyle = { background: P.card, border: `1px solid ${P.cardBorder}`, borderRadius: 10, boxShadow: P.cardSh, fontSize: 12, color: P.text, padding: "6px 12px" };

  return (
    <ThemeCtx.Provider value={P}>
    <MobileCtx.Provider value={isMobile}>
    <div style={{ background: P.bg, minHeight: "100vh", width:"100%", maxWidth:"100vw", overflowX:"hidden", fontFamily: "-apple-system,'SF Pro Display','Inter',system-ui,sans-serif", color: P.text, WebkitFontSmoothing: "antialiased", transition: "background 0.3s, color 0.3s" }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        html,body,#root{max-width:100%;overflow-x:hidden;width:100%}
        .navtabs::-webkit-scrollbar{display:none}
        body{margin:0;position:relative}
        nav div::-webkit-scrollbar{display:none}
        input{max-width:100%}
        img,svg,table{max-width:100%}
        @media (max-width: 600px){
          input[type="number"],input[type="password"],input[type="text"],input[type="date"]{font-size:16px}
        }
      `}</style>
      {toast && <div style={{ position:"fixed",top:72,left:"50%",transform:"translateX(-50%)",zIndex:999,background:P.toastBg,color:P.toastColor,padding:"6px 18px",borderRadius:980,fontSize:12,fontWeight:600,boxShadow:P.toastSh }}>{toast}</div>}
      {showChangePassword && <ChangePasswordModal onClose={(msg) => { setShowChangePassword(false); if (msg) showToast(msg); }} />}
      <nav style={{ position:"sticky",top:0,zIndex:100,background:P.navBg,backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",borderBottom:`1px solid ${P.border}` }}>
        <div style={{ maxWidth:1120,margin:"0 auto",padding: isMobile ? "0 12px" : "0 24px",display:"flex",alignItems:"center",height:52 }}>
          {!isMobile && <span style={{ fontWeight:600,fontSize:16,letterSpacing:"0.04em",marginRight:32,color:P.gold,textTransform:"uppercase" }}>Nick</span>}
          <div className="navtabs" style={{ display:"flex",gap:2,flex:1,minWidth:0,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none" }}>
            {tabOrder.map(id => { const t=ALL_TABS[id]; if(!t) return null; const Icon=t.icon; const active=tab===id;
              return <button key={id} draggable={!isMobile} onDragStart={e=>onDragStart(e,id)} onDragOver={e=>onDragOver(e,id)} onDragLeave={()=>setDropTarget(null)} onDrop={e=>onDrop(e,id)} onDragEnd={()=>{setDragId(null);setDropTarget(null);}} onClick={()=>setTab(id)}
                style={{ display:"flex",alignItems:"center",gap:isMobile?4:5,padding:isMobile?"6px 10px":"6px 12px",borderRadius:8,border:"none",fontSize:isMobile?11:12,flexShrink:0,fontWeight:active?600:400,fontFamily:"inherit",whiteSpace:"nowrap",background:active?(theme==="dark"?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)"):"transparent",color:active?P.gold:P.dim,transition:"all 0.2s",opacity:dragId===id?0.4:1,cursor:isMobile?"pointer":"grab",transform:dropTarget===id?"scale(1.06)":"scale(1)",boxShadow:dropTarget===id?`0 0 0 1px ${P.gold}`:"none",letterSpacing:"0.02em" }}>
                <Icon size={13}/>{t.label}
              </button>;
            })}
          </div>
          {/* Theme toggle */}
          <button onClick={toggleTheme} title={theme==="dark"?"Light mode":"Dark mode"} style={{ background:"none",border:"none",cursor:"pointer",padding:"4px 6px",color:P.sub,display:"flex",alignItems:"center",transition:"color 0.2s",marginRight:isMobile?4:8,flexShrink:0 }}
            onMouseEnter={e=>e.currentTarget.style.color=P.gold} onMouseLeave={e=>e.currentTarget.style.color=P.sub}>
            {theme==="dark" ? <Sun size={16}/> : <Moon size={16}/>}
          </button>
          <div style={{ display:"flex",gap:2,marginRight:isMobile?4:8,flexShrink:0 }}>
            <button onClick={undo} style={{ background:"none",border:"none",fontSize:14,cursor:canUndo?"pointer":"default",color:canUndo?P.sub:P.dim,fontFamily:"inherit",padding:"4px 6px",opacity:canUndo?1:0.3 }}>↩</button>
            <button onClick={redo} style={{ background:"none",border:"none",fontSize:14,cursor:canRedo?"pointer":"default",color:canRedo?P.sub:P.dim,fontFamily:"inherit",padding:"4px 6px",opacity:canRedo?1:0.3 }}>↪</button>
          </div>
          {/* Save indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginRight: isMobile ? 6 : 10, transition: "opacity 0.3s", opacity: saved ? 1 : 0, flexShrink:0 }}>
            <CheckCircle size={12} color={P.green} />
            {!isMobile && <span style={{ fontSize: 11, color: P.green, fontWeight: 500 }}>Synced</span>}
          </div>
          {/* Settings */}
          <button onClick={() => setShowChangePassword(true)} title="Change password" style={{ background:"none",border:"none",cursor:"pointer",padding:"4px 8px",color:P.dim,display:"flex",alignItems:"center",transition:"color 0.2s",marginRight:4 }}
            onMouseEnter={e=>e.currentTarget.style.color=P.gold} onMouseLeave={e=>e.currentTarget.style.color=P.dim}>
            <Settings size={15}/>
          </button>
          <button onClick={reset} style={{ background:"none",border:"none",fontSize:isMobile?10:11,color:P.dim,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.03em",flexShrink:0 }}>RESET</button>
        </div>
      </nav>
      <main style={{ maxWidth:1120,margin:"0 auto",padding: isMobile ? "20px 14px 80px" : "36px 24px 80px" }}>
        {tab==="overview"&&<Overview data={data} update={update} setTab={setTab} ttStyle={ttStyle}/>}
        {tab==="allocate"&&<AllocatePay data={data} update={update}/>}
        {tab==="bills"&&<BillsView data={data} update={update}/>}
        {tab==="wedding"&&<WeddingView data={data} update={update} ttStyle={ttStyle}/>}
        {tab==="credit"&&<CreditCardView data={data} update={update}/>}
      </main>
    </div>
    </MobileCtx.Provider>
    </ThemeCtx.Provider>
  );
}

/* ═══════════ OVERVIEW ═══════════ */
function Overview({ data, update, setTab, ttStyle }) {
  const P = useP(); const isMobile = useMobile();
  const accts = Array.isArray(data.accounts) ? data.accounts : [];
  const isOffset = (a) => a?.offset !== false; // default true unless explicitly turned off
  const totalOffsets = accts.reduce((s,a) => s + (isOffset(a) ? (a.balance||0) : 0), 0);
  const totalNonOffset = accts.reduce((s,a) => s + (isOffset(a) ? 0 : (a.balance||0)), 0);
  const mort = { balance:0, rate:6.09, nextPayment:0, nextPaymentDate:"" , ...(data.mortgage||{}) };
  const loan = Math.abs(mort.balance)||1; const rate = mort.rate||6.09; const effective = loan - totalOffsets;
  const netWorth = totalOffsets + totalNonOffset - loan; const mr = rate/100/12;
  const intActual = Math.max(0,effective)*mr; const intFull = loan*mr; const intSaved = intFull - intActual;

  // Wedding + Honeymoon summary
  const sg = data.savingsGoals || {};
  const goalTotal = (k) => { const g = sg[k]||{}; const rows = Array.isArray(g.rows)?g.rows:[]; return rows.reduce((s,r)=>s+(r.nick||0)+(r.elle||0), g.start||0); };
  const wed = (data?.wedding && typeof data.wedding === "object") ? data.wedding : {};
  const wContribs = Array.isArray(wed.contributions)?wed.contributions.reduce((s,x)=>s+(Number(x?.amount)||0),0):0;
  const wExp = Array.isArray(wed.expenses)?wed.expenses:[];
  const wPaid = wExp.reduce((s,e)=>s+(Number(e?.deposit)||0),0);
  const wSaved = goalTotal("wedding") + wContribs + wPaid;
  const hSpent = (Array.isArray(data?.honeymoonBooked)?data.honeymoonBooked:[]).reduce((s,e)=>s+(Number(e?.deposit ?? e?.amount)||0),0);
  const hSaved = goalTotal("honeymoon") + hSpent;
  const gls = (data?.goals && typeof data.goals === "object") ? data.goals : {};
  const wCost = Number(gls.wedding) || 75000;
  const hGoalOv = Number(gls.honeymoon) || 30000;
  return <div>
    <div style={{ marginBottom: 36 }}><div style={{ fontSize:12,color:P.dim,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6 }}>Net Worth</div>
      <div style={{ fontSize:isMobile?38:52,fontWeight:700,letterSpacing:"-0.04em",lineHeight:1,color:netWorth>=0?P.green:P.text }}>{netWorth>=0?fmtK(netWorth):"-"+fmtK(Math.abs(netWorth))}</div></div>
    <div style={{ display:"grid",minWidth:0,gridTemplateColumns: isMobile ? "1fr" : (totalNonOffset>0 ? "1fr 1fr 1fr" : "1fr 1fr"),gap:12,marginBottom:12 }}>
      <Card><div style={{ fontSize:11,color:P.dim,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em" }}>Total in Offsets</div><div style={{ fontSize:28,fontWeight:700,color:P.green,letterSpacing:"-0.03em" }}>{fmtK(totalOffsets)}</div></Card>
      {totalNonOffset>0 && <Card><div style={{ fontSize:11,color:P.dim,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em" }}>Other Accounts</div><div style={{ fontSize:28,fontWeight:700,color:P.sub,letterSpacing:"-0.03em" }}>{fmtK(totalNonOffset)}</div></Card>}
      <Card><div style={{ fontSize:11,color:P.dim,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em" }}>Home Loan</div><div style={{ fontSize:28,fontWeight:700,letterSpacing:"-0.03em" }}><Editable value={mort.balance} onChange={v=>update(d=>{d.mortgage.balance=v;})} format={v=>fmt(v,2)} style={{ fontSize:28,fontWeight:700 }}/></div></Card>
    </div>
    <div style={{ display:"grid",minWidth:0,gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",gap:12,marginBottom:isMobile?24:36 }}>
      <Card style={{ background:P.greenBg,borderColor:P.green+"20" }}><div style={{ fontSize:11,color:P.dim,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em" }}>Interest On</div><div style={{ fontSize:26,fontWeight:700 }}>{fmt(Math.max(0,effective),0)}</div></Card>
      <Card><div style={{ fontSize:11,color:P.dim,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em" }}>Next Repayment</div><div style={{ fontSize:26,fontWeight:700 }}><Editable value={mort.nextPayment} onChange={v=>update(d=>{d.mortgage.nextPayment=v;})} style={{ fontSize:26,fontWeight:700 }}/></div></Card>
      <Card><div style={{ fontSize:11,color:P.dim,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em" }}>Due Date</div><div style={{ fontSize:20,fontWeight:600,marginTop:4 }}><EditableDate value={mort.nextPaymentDate} onChange={v=>update(d=>{d.mortgage.nextPaymentDate=v;})} style={{ fontSize:20,fontWeight:600 }}/></div></Card>
    </div>
    <Section title="Repayment Split"><Card style={{ padding:0,overflow:"hidden" }}>
      <div style={{ display:"grid",minWidth:0,gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr" }}>
        <div style={{ padding:"16px 18px",borderRight: isMobile ? "none" : `1px solid ${P.border}`, borderBottom: isMobile ? `1px solid ${P.border}` : "none" }}><div style={{ fontSize:11,color:P.dim,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}>Repayment</div><div style={{ fontSize:22,fontWeight:700 }}>{fmt(mort.nextPayment,2)}</div></div>
        <div style={{ padding:"16px 18px",borderRight: isMobile ? "none" : `1px solid ${P.border}`, borderBottom: isMobile ? `1px solid ${P.border}` : "none" }}><div style={{ fontSize:11,color:P.dim,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}>Interest</div><div style={{ fontSize:22,fontWeight:700,color:P.red }}>{fmt(intActual,2)}</div></div>
        <div style={{ padding:"18px 20px" }}><div style={{ fontSize:11,color:P.dim,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}>Principal</div><div style={{ fontSize:22,fontWeight:700,color:P.green }}>{fmt(mort.nextPayment-intActual,2)}</div></div>
      </div>
      <div style={{ padding:"10px 20px",background:P.hoverBg }}><ProgressC value={mort.nextPayment-intActual} max={mort.nextPayment||1} color={P.green} height={6}/>
        <div style={{ display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,color:P.dim }}><span>{((mort.nextPayment-intActual)/(mort.nextPayment||1)*100).toFixed(1)}% principal</span><span>{(intActual/(mort.nextPayment||1)*100).toFixed(1)}% interest</span></div></div>
    </Card></Section>
    <Section title="Offset Savings" subtitle={<>Rate: <Editable value={rate} onChange={v=>update(d=>{d.mortgage.rate=v;})} format={v=>v.toFixed(2)+"%"} style={{ fontWeight:600 }}/> p.a.</>}><Card style={{ padding:0,overflow:"hidden" }}>
      <div style={{ display:"grid",minWidth:0,gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",borderBottom:`1px solid ${P.border}` }}>
        <div style={{ padding:"16px 18px",borderRight: isMobile ? "none" : `1px solid ${P.border}`, borderBottom: isMobile ? `1px solid ${P.border}` : "none" }}><div style={{ fontSize:11,color:P.dim,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}>Monthly Interest</div><div style={{ fontSize:22,fontWeight:700,color:P.orange }}>{fmt(intActual,0)}</div></div>
        <div style={{ padding:"16px 18px",borderRight: isMobile ? "none" : `1px solid ${P.border}`, borderBottom: isMobile ? `1px solid ${P.border}` : "none" }}><div style={{ fontSize:11,color:P.dim,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}>Without Offsets</div><div style={{ fontSize:22,fontWeight:700,color:P.red }}>{fmt(intFull,0)}</div></div>
        <div style={{ padding:"18px 20px" }}><div style={{ fontSize:11,color:P.dim,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}>You Save</div><div style={{ fontSize:22,fontWeight:700,color:P.green }}>{fmt(intSaved,0)}</div></div>
      </div>
      <div style={{ display:"grid",minWidth:0,gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",background:P.hoverBg }}>
        <div style={{ padding:"14px 20px",borderRight:`1px solid ${P.border}` }}><div style={{ fontSize:11,color:P.dim,marginBottom:4 }}>Annual saving</div><div style={{ fontSize:18,fontWeight:700,color:P.green }}>{fmt(intSaved*12,0)}</div></div>
        <div style={{ padding:"14px 20px" }}><div style={{ fontSize:11,color:P.dim,marginBottom:4 }}>Offset coverage</div><div style={{ fontSize:18,fontWeight:700,color:P.green }}>{(totalOffsets/loan*100).toFixed(1)}%</div></div>
      </div>
    </Card></Section>
    <Section title="Accounts" subtitle="Tap any balance to update"><div style={{ display:"grid",minWidth:0,gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)",gap:12 }}>
      {accts.map((a,i) => <AccCard key={i} acc={a} i={i} loan={loan} mr={mr} update={update}/>)}
    </div></Section>
    {/* Goals summary */}
    <Section title="Goals" subtitle="Saved vs cost">
      <div style={{ display:"grid", minWidth:0, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>
        <Card onClick={()=>setTab("wedding")} style={{ background:P.pinkBg, borderColor:P.pink+"20" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <IconBubble icon={Heart} color={P.pink} size={32}/>
            <span style={{ fontSize:14, fontWeight:600 }}>Wedding</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <div><div style={{ fontSize:11, color:P.dim }}>Total</div><div style={{ fontSize:20, fontWeight:700, color:P.green }}>{fmtK(wSaved)}</div></div>
            <div style={{ textAlign:"right" }}><div style={{ fontSize:11, color:P.dim }}>Goal</div><div style={{ fontSize:20, fontWeight:700, color:P.orange }}>{fmtK(wCost)}</div></div>
          </div>
          <ProgressC value={wSaved} max={wCost||1} color={P.pink} height={5}/>
          <div style={{ fontSize:11, color:P.dim, marginTop:5 }}>{((wSaved/(wCost||1))*100).toFixed(0)}% · {fmtK(Math.max(0,wCost-wSaved))} to go</div>
        </Card>
        <Card onClick={()=>setTab("wedding")} style={{ background:P.purpleBg, borderColor:P.purple+"20" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <IconBubble icon={Plane} color={P.purple} size={32}/>
            <span style={{ fontSize:14, fontWeight:600 }}>Honeymoon</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <div><div style={{ fontSize:11, color:P.dim }}>Total</div><div style={{ fontSize:20, fontWeight:700, color:P.green }}>{fmtK(hSaved)}</div></div>
            <div style={{ textAlign:"right" }}><div style={{ fontSize:11, color:P.dim }}>Goal</div><div style={{ fontSize:20, fontWeight:700, color:P.orange }}>{fmtK(hGoalOv)}</div></div>
          </div>
          <ProgressC value={hSaved} max={hGoalOv||1} color={P.purple} height={5}/>
          <div style={{ fontSize:11, color:P.dim, marginTop:5 }}>{((hSaved/(hGoalOv||1))*100).toFixed(0)}% · {fmtK(Math.max(0,hGoalOv-hSaved))} to go</div>
        </Card>
      </div>
    </Section>

    <Section title="Quick Actions"><div style={{ display:"grid",minWidth:0,gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)",gap:12 }}>
      {[{l:"Allocate Pay",d:"Divide this month's pay",t:"allocate",c:P.gold,i:Banknote},{l:"Monthly Bills",d:"Track what's paid",t:"bills",c:P.orange,i:Receipt},{l:"Wedding",d:"Budget & payments",t:"wedding",c:P.pink,i:Heart}].map(q=>
        <Card key={q.t} onClick={()=>setTab(q.t)}><div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}><div style={{ display:"flex",alignItems:"center",gap:10 }}><IconBubble icon={q.i} color={q.c} size={36}/><div><div style={{ fontSize:14,fontWeight:600 }}>{q.l}</div><div style={{ fontSize:12,color:P.dim }}>{q.d}</div></div></div><ChevronRight size={16} color={P.dim}/></div></Card>
      )}
    </div></Section>
  </div>;
}
function AccCard({ acc, i, loan, mr, update }) {
  const P = useP(); const s = useAcctStyle(acc.name);
  const isOff = acc?.offset !== false;
  return <Card style={ isOff ? {} : { opacity: 0.85 } }>
    <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:12 }}>
      <IconBubble icon={s.icon} color={isOff ? s.color : P.dim} size={30}/>
      <span style={{ fontSize:13,fontWeight:500,color:P.sub,flex:1,minWidth:0 }}>{acc.name}</span>
      <button onClick={()=>update(d=>{ d.accounts[i].offset = !(d.accounts[i].offset !== false); })}
        title={isOff ? "Counts toward offset — click to exclude" : "Not an offset — click to include"}
        style={{ fontSize:9, fontWeight:600, letterSpacing:"0.04em", textTransform:"uppercase",
          color: isOff ? P.green : P.dim, background: isOff ? P.greenBg : P.inputBg,
          border:`1px solid ${isOff ? P.green+"30" : "transparent"}`, borderRadius:5, padding:"3px 7px",
          cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>
        {isOff ? "Offset" : "Excluded"}
      </button>
    </div>
    <Editable value={acc.balance} onChange={v=>update(d=>{d.accounts[i].balance=v;})} format={v=>fmt(v,2)} style={{ fontSize:24,fontWeight:700,letterSpacing:"-0.02em" }}/>
    <div style={{ fontSize:11,color:P.dim,marginTop:6 }}>
      {isOff ? `Saving ${fmt(acc.balance*mr,0)}/mo · ${(acc.balance/loan*100).toFixed(1)}% of loan` : "Not offsetting the loan"}
    </div>
  </Card>;
}

/* ═══════════ ALLOCATE PAY ═══════════ */
const MONTH_SEQ = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const nextMonthLabel = (label) => {
  if (!label) return "August 2026";
  const parts = String(label).trim().split(/\s+/);
  const mName = parts[0];
  const year = parseInt(parts[1], 10);
  const idx = MONTH_SEQ.findIndex(m => m.toLowerCase() === mName.toLowerCase());
  if (idx === -1 || isNaN(year)) return label;
  const nextIdx = (idx + 1) % 12;
  const nextYear = nextIdx === 0 ? year + 1 : year;
  return `${MONTH_SEQ[nextIdx]} ${nextYear}`;
};

function AllocatePay({ data, update }) {
  const P = useP(); const isMobile = useMobile();
  const [expanded, setExpanded] = useState(null);
  const [editingIdx, setEditingIdx] = useState(null); // index in payHistory being edited
  const allocs = data.allocations||{};
  const totalA = Object.values(allocs).reduce((s,v)=>s+(v||0),0);
  const remaining = (data.payAmount||0) - totalA;
  const history = Array.isArray(data.payHistory) ? data.payHistory : [];
  const isEditing = editingIdx !== null;

  // Sync a month's Wedding Fund / Honeymoon allocation into the savings goal tables
  const syncGoals = (d, monthLabel, allocations) => {
    const map = { "Wedding Fund": "wedding", "Honeymoon": "honeymoon" };
    Object.entries(map).forEach(([acctName, goalKey]) => {
      const amt = allocations?.[acctName] || 0;
      if (!d.savingsGoals) d.savingsGoals = {};
      if (!d.savingsGoals[goalKey]) d.savingsGoals[goalKey] = { start: 0, rows: [] };
      if (!Array.isArray(d.savingsGoals[goalKey].rows)) d.savingsGoals[goalKey].rows = [];
      const rows = d.savingsGoals[goalKey].rows;
      // match by first word of month label (e.g. "August")
      const shortMonth = String(monthLabel).split(/\s+/)[0].toLowerCase();
      const existing = rows.find(r => String(r.month).toLowerCase().startsWith(shortMonth));
      if (existing) { existing.nick = amt; }
      else if (amt > 0) { rows.push({ month: monthLabel, nick: amt, elle: 0 }); }
    });
  };

  const START_MONTH = "August 2026";
  // Work out the next month that hasn't been saved yet, starting from August
  const computeNextMonth = (hist) => {
    const saved = new Set((hist||[]).map(h => String(h?.month||"").trim().toLowerCase()));
    let m = START_MONTH;
    for (let i = 0; i < 60; i++) {
      if (!saved.has(m.toLowerCase())) return m;
      m = nextMonthLabel(m);
    }
    return m;
  };
  const currentMonth = isEditing ? (data.payMonth || START_MONTH) : computeNextMonth(history);

  const saveMonth = () => {
    if (!data.payAmount && !isEditing) return;
    update(d => {
      if (!Array.isArray(d.payHistory)) d.payHistory = [];
      const thisMonth = currentMonth;
      if (isEditing) {
        // Reverse the OLD allocations from balances
        const old = d.payHistory[editingIdx];
        (d.accounts||[]).forEach(a => { if (old?.allocations?.[a.name]) a.balance -= old.allocations[a.name]; });
        // Apply the NEW allocations
        (d.accounts||[]).forEach(a => { if (d.allocations?.[a.name]) a.balance += d.allocations[a.name]; });
        // Update the record in place
        d.payHistory[editingIdx] = {
          month: thisMonth,
          pay: d.payAmount,
          allocations: { ...(d.allocations||{}) },
          total: Object.values(d.allocations||{}).reduce((s,v)=>s+(v||0),0),
          savedAt: old?.savedAt || new Date().toISOString(),
        };
        syncGoals(d, thisMonth, d.allocations);
        d.payMonth = null;
      } else {
        (d.accounts||[]).forEach(a => { if (d.allocations?.[a.name]) a.balance += d.allocations[a.name]; });
        d.payHistory.unshift({
          month: thisMonth,
          pay: d.payAmount,
          allocations: { ...(d.allocations||{}) },
          total: totalA,
          savedAt: new Date().toISOString(),
        });
        syncGoals(d, thisMonth, d.allocations);
        d.payMonth = null;
      }
      d.allocations = {};
      d.payAmount = 0;
    });
    setEditingIdx(null);
    setExpanded(null);
  };

  const startEdit = (i) => {
    const h = history[i];
    update(d => {
      d.payMonth = h.month;
      d.payAmount = h.pay;
      d.allocations = { ...(h.allocations||{}) };
    });
    setEditingIdx(i);
    setExpanded(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    update(d => { d.payMonth = null; d.allocations = {}; d.payAmount = 0; });
    setEditingIdx(null);
  };

  return <div>
    <Section title={isEditing ? "Editing Saved Month" : "Allocate Pay"} subtitle={isEditing ? "Change the numbers and save to update this month" : "One entry per month — saving advances to the next month automatically"}>
      <Card style={{ marginBottom:20, position:"sticky", top:60, zIndex:40, borderColor: isEditing ? P.blue+"50" : P.goldBorder, boxShadow:`${P.cardSh}, 0 0 40px ${isEditing?P.blue:P.gold}12` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div>
            <div style={{ fontSize:11, color:P.dim, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>Month</div>
            <div style={{ fontSize:16, fontWeight:700, color: isEditing ? P.blue : P.text }}>{currentMonth}</div>
          </div>
          {isEditing && <button onClick={cancelEdit} style={{ background:"none", border:`1px solid ${P.border}`, borderRadius:8, padding:"6px 14px", color:P.sub, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Cancel Edit</button>}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
          <div style={{ minWidth:0, flex:1 }}><div style={{ fontSize:11,color:P.dim,marginBottom:2,textTransform:"uppercase",letterSpacing:"0.08em" }}>Pay Received</div><div style={{ fontSize:isMobile?26:38,fontWeight:700,letterSpacing:"-0.04em" }}><Editable value={data.payAmount||0} onChange={v=>update(d=>{d.payAmount=v;})} style={{ fontSize:isMobile?26:38,fontWeight:700 }}/></div></div>
          <div style={{ textAlign:"right", minWidth:0 }}><div style={{ fontSize:11,color:P.dim,marginBottom:2,textTransform:"uppercase",letterSpacing:"0.08em" }}>Remaining</div><div style={{ fontSize:isMobile?26:38,fontWeight:700,color:remaining>0?P.text:remaining===0?P.green:P.red,transition:"color 0.3s",letterSpacing:"-0.04em" }}>{fmt(remaining,0)}</div></div>
        </div>
        <div style={{ marginTop:14 }}><ProgressC value={totalA} max={data.payAmount||1} color={remaining>=0?(isEditing?P.blue:P.gold):P.red} height={4}/></div>
      </Card>

      <Card style={{ padding:0,overflow:"hidden",marginBottom:14 }}>
        <div style={{ display:"grid",minWidth:0,gridTemplateColumns: isMobile ? "1.5fr 1fr 1fr" : "2fr 1fr 1fr 1fr",gap:isMobile?6:10,padding:isMobile?"12px 14px":"14px 20px",fontSize:10,fontWeight:600,color:P.dim,textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:`1px solid ${P.border}` }}><span>Account</span>{!isMobile && <span style={{ textAlign:"right" }}>Current</span>}<span style={{ textAlign:"center" }}>Add</span><span style={{ textAlign:"right" }}>New Balance</span></div>
        {(data.accounts||[]).map((acc,i) => <AllocRow key={i} acc={acc} i={i} allocs={allocs} update={update}/>)}
      </Card>
      <AddButton onClick={()=>update(d=>{(d.accounts = d.accounts||[]).push({name:"New Account",balance:0,offset:false});})} label="Add account"/>

      <div style={{ display:"flex",gap:10,marginTop:20,flexDirection: isMobile ? "column-reverse" : "row" }}>
        <button onClick={()=>update(d=>{d.allocations={};})} style={{ flex:1,padding:"14px",borderRadius:12,border:`1px solid ${P.border}`,background:"transparent",color:P.sub,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"inherit" }}>Clear</button>
        <button onClick={saveMonth} style={{ flex:2,padding:"14px",borderRadius:12,border:"none",background:isEditing?`linear-gradient(135deg,${P.blue},${P.blue}CC)`:`linear-gradient(135deg,${P.gold},${P.gold}CC)`,color:isEditing?"#fff":P.bg,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>
          {isEditing ? `Update ${currentMonth}` : `Save ${currentMonth} & Update Balances`}
        </button>
      </div>
    </Section>

    {history.length > 0 && (
      <Section title="Previous Months" subtitle={`${history.length} saved · ${fmt(history.reduce((s,h)=>s+(h.pay||0),0),0)} total tracked`}>
        <Card style={{ padding:0, overflow:"hidden" }}>
          {history.map((h,i) => {
            const isOpen = expanded === i;
            const beingEdited = editingIdx === i;
            return <div key={i} style={{ borderBottom: i<history.length-1 ? `1px solid ${P.border}` : "none", background: beingEdited ? P.blue+"10" : "transparent" }}>
              <div onClick={()=>setExpanded(isOpen?null:i)} style={{ display:"flex", alignItems:"center", padding:"12px 20px", cursor:"pointer", transition:"background 0.15s" }}
                onMouseEnter={e=>{ if(!beingEdited) e.currentTarget.style.background=P.hoverBg; }}
                onMouseLeave={e=>{ if(!beingEdited) e.currentTarget.style.background="transparent"; }}>
                {isOpen ? <ChevronDown size={14} color={P.dim}/> : <ChevronRight size={14} color={P.dim}/>}
                <span style={{ fontSize:13, fontWeight:600, marginLeft:10, flex:1 }} onClick={e=>e.stopPropagation()}><EditableText value={h.month} onChange={v=>update(d=>{d.payHistory[i].month=v;})} style={{ fontSize:13, fontWeight:600 }}/>{beingEdited && <span style={{ fontSize:10, color:P.blue, marginLeft:8, fontWeight:600 }}>EDITING</span>}</span>
                <span style={{ fontSize:12, color:P.dim, marginRight:16 }}>{Object.keys(h.allocations||{}).filter(k=>h.allocations[k]>0).length} accounts</span>
                <span style={{ fontSize:14, fontWeight:700, color:P.gold, minWidth:90, textAlign:"right" }}>{fmt(h.pay,0)}</span>
              </div>
              {isOpen && (
                <div style={{ padding:"4px 20px 14px 44px", background:P.hoverBg }}>
                  {Object.entries(h.allocations||{}).filter(([_,v])=>v>0).map(([name,amt])=>(
                    <div key={name} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", fontSize:12, borderBottom:`1px solid ${P.border}` }}>
                      <span style={{ color:P.sub }}>{name}</span>
                      <span style={{ fontWeight:600 }}>{fmt(amt,0)}</span>
                    </div>
                  ))}
                  <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0 0", fontSize:12, fontWeight:700 }}>
                    <span>Allocated</span><span style={{ color:P.green }}>{fmt(h.total,0)}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", paddingTop:4, fontSize:12, color:P.dim }}>
                    <span>Left over</span><span>{fmt((h.pay||0)-(h.total||0),0)}</span>
                  </div>
                  <div style={{ display:"flex", gap:8, marginTop:14 }}>
                    <button onClick={()=>startEdit(i)} style={{ flex:1, padding:"8px", borderRadius:8, border:"none", background:P.blue, color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Edit This Month</button>
                    <button onClick={()=>{
                      update(d=>{
                        const old = d.payHistory[i];
                        // Reverse this month's allocations from account balances
                        (d.accounts||[]).forEach(a=>{ if(old?.allocations?.[a.name]) a.balance -= old.allocations[a.name]; });
                        // Clear the matching row in wedding/honeymoon savings tables
                        const shortMonth = String(old?.month||"").split(/\s+/)[0].toLowerCase();
                        ["wedding","honeymoon"].forEach(gk=>{
                          const rows = d.savingsGoals?.[gk]?.rows;
                          if (Array.isArray(rows)) {
                            const row = rows.find(r=>String(r?.month||"").toLowerCase().startsWith(shortMonth));
                            if (row) row.nick = 0;
                          }
                        });
                        d.payHistory.splice(i,1);
                        d.payMonth = null;
                        d.allocations = {};
                        d.payAmount = 0;
                      });
                      setEditingIdx(null);
                      setExpanded(null);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }} style={{ padding:"8px 14px", borderRadius:8, border:`1px solid ${P.border}`, background:"transparent", color:P.red, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Delete</button>
                  </div>
                </div>
              )}
            </div>;
          })}
        </Card>
      </Section>
    )}
  </div>;
}

function AllocRow({ acc, i, allocs, update }) {
  const P = useP(); const isMobile = useMobile(); const s = useAcctStyle(acc.name); const adding = allocs[acc.name]||0; const hasA = adding>0;
  return <div style={{ display:"grid",minWidth:0,gridTemplateColumns: isMobile ? "1.5fr 1fr 1fr" : "2fr 1fr 1fr 1fr",gap:isMobile?6:10,padding:isMobile?"12px 10px":"14px 20px",borderBottom:`1px solid ${P.border}`,alignItems:"center",background:hasA?P.goldBg:"transparent",minWidth:0 }}>
    <div style={{ display:"flex",alignItems:"center",gap:isMobile?6:8,minWidth:0 }}>{!isMobile && <IconBubble icon={s.icon} color={acc?.offset===false ? P.dim : s.color} size={28}/>}<div style={{ minWidth:0 }}><EditableText value={acc.name} onChange={v=>update(d=>{d.accounts[i].name=v;})} style={{ fontSize:isMobile?12:13,fontWeight:600 }}/>{isMobile && <div style={{ fontSize:10,color:P.dim,marginTop:2 }}>{fmt(acc.balance,0)}</div>}</div></div>
    {!isMobile && <div style={{ textAlign:"right" }}><Editable value={acc.balance} onChange={v=>update(d=>{d.accounts[i].balance=v;})} style={{ fontSize:14,color:P.sub }}/></div>}
    <div style={{ display:"flex",justifyContent:"center" }}><div style={{ background:hasA?P.goldBg:P.inputBg,borderRadius:8,padding:isMobile?"4px 6px":"4px 10px",minWidth:isMobile?58:80,textAlign:"center",border:hasA?`1px solid ${P.goldBorder}`:"1px solid transparent" }}><Editable value={adding} onChange={v=>update(d=>{if(!d.allocations)d.allocations={};d.allocations[acc.name]=v;})} style={{ fontSize:isMobile?13:15,fontWeight:700,color:hasA?P.gold:P.dim }}/></div></div>
    <div style={{ textAlign:"right",fontSize:isMobile?13:15,fontWeight:700,color:hasA?P.text:P.dim }}>{fmt(acc.balance+adding,0)}</div>
  </div>;
}

/* ═══════════ BILLS ═══════════ */
function BillsView({ data, update }) {
  const P = useP(); const isMobile = useMobile();
  const [dragIdx, setDragIdx] = useState(null);
  const [dropIdx, setDropIdx] = useState(null);
  const b = { month:"", budget:0, items:[], ...(data.currentBills||{}) };
  if (!Array.isArray(b.items)) b.items = [];
  const tP = b.items.reduce((s,i) => s+(i.paid||0), 0);
  const tF = b.items.reduce((s,i) => s+(i.forecast||0), 0);
  const tU = b.items.filter(i => !i.paid).reduce((s,i) => s+i.forecast, 0);
  const free = b.budget - tP - tU;

  const onBillDragStart = (e, i) => { setDragIdx(i); e.dataTransfer.effectAllowed = "move"; };
  const onBillDragOver = (e, i) => { e.preventDefault(); if (i !== dragIdx) setDropIdx(i); };
  const onBillDrop = (e, targetIdx) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== targetIdx) {
      update(d => {
        const items = d.currentBills.items;
        const [moved] = items.splice(dragIdx, 1);
        items.splice(targetIdx, 0, moved);
      });
    }
    setDragIdx(null); setDropIdx(null);
  };
  const onBillDragEnd = () => { setDragIdx(null); setDropIdx(null); };

  return <Section title="Monthly Bills" subtitle={<><EditableText value={b.month} onChange={v=>update(d=>{d.currentBills.month=v;})} style={{ fontWeight:600 }}/>{" — Budget: "}<Editable value={b.budget} onChange={v=>update(d=>{d.currentBills.budget=v;})} style={{ fontWeight:600 }}/></>}>
    <div style={{ display:"grid",minWidth:0,gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)",gap:10,marginBottom:20 }}>
      {[{l:"Forecast",v:tF,c:P.text},{l:"Paid",v:tP,c:P.green},{l:"Unpaid",v:tU,c:P.orange},{l:"Free",v:free,c:free>=0?P.green:P.red,bg:free>=0?P.greenBg:P.redBg}].map(s=>
        <Card key={s.l} style={{ padding:14,...(s.bg?{background:s.bg,borderColor:s.c+"20"}:{}) }}><div style={{ fontSize:10,color:P.dim,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.08em" }}>{s.l}</div><div style={{ fontSize:22,fontWeight:700,color:s.c }}>{fmt(s.v,0)}</div></Card>
      )}
    </div>
    <ProgressC value={tP} max={b.budget} color={P.green} height={4}/>
    <div style={{ fontSize:11,color:P.dim,margin:"6px 0 16px" }}>{b.budget>0?(tP/b.budget*100).toFixed(0):0}% used</div>
    <Card style={{ padding:0,overflow:"hidden" }}>
      {b.items.map((item,i)=>{const paid=item.paid>0; const isDragging=dragIdx===i; const isDropTarget=dropIdx===i;
        return <div key={i} draggable
          onDragStart={e=>onBillDragStart(e,i)} onDragOver={e=>onBillDragOver(e,i)} onDragLeave={()=>setDropIdx(null)} onDrop={e=>onBillDrop(e,i)} onDragEnd={onBillDragEnd}
          style={{ display:"flex",alignItems:"center",padding:isMobile?"11px 12px":"12px 18px",borderBottom:i<b.items.length-1?`1px solid ${P.border}`:"none",
            opacity:isDragging?0.4:1, background:isDropTarget?P.goldBg:"transparent",
            borderTop:isDropTarget?`2px solid ${P.gold}`:"2px solid transparent",
            cursor:"grab", transition:"background 0.15s, opacity 0.15s" }}>
          <Tick checked={paid} onClick={()=>update(d=>{const it=d.currentBills.items[i];it.paid=it.paid>0?0:it.forecast;})}/>
          <div style={{ flex:1,marginLeft:isMobile?10:12,minWidth:0 }}><EditableText value={item.name} onChange={v=>update(d=>{d.currentBills.items[i].name=v;})} style={{ fontSize:isMobile?12:13,fontWeight:500,color:paid?P.dim:P.text }}/></div>
          <div style={{ display:"flex",gap:isMobile?8:14,alignItems:"center" }}>
            <div style={{ textAlign:"right",minWidth:isMobile?52:0 }}><div style={{ fontSize:9,color:P.dim }}>Forecast</div><Editable value={item.forecast} onChange={v=>update(d=>{d.currentBills.items[i].forecast=v;})} style={{ fontSize:isMobile?12:13,color:P.sub }}/></div>
            <div style={{ textAlign:"right",minWidth:isMobile?48:60 }}><div style={{ fontSize:9,color:P.dim }}>Paid</div><Editable value={item.paid} onChange={v=>update(d=>{d.currentBills.items[i].paid=v;})} style={{ fontSize:isMobile?12:13,fontWeight:600,color:paid?P.green:P.dim }}/></div>
            <RemoveBtn onClick={()=>update(d=>{d.currentBills.items.splice(i,1);})}/>
          </div>
        </div>;
      })}
      {/* Totals row */}
      <div style={{ display:"flex",alignItems:"center",padding:isMobile?"12px 12px":"14px 18px",borderTop:`2px solid ${P.border}`,background:P.hoverBg }}>
        <div style={{ flex:1,marginLeft:isMobile?34:36,fontSize:isMobile?12:13,fontWeight:700 }}>Total ({b.items.length})</div>
        <div style={{ display:"flex",gap:isMobile?8:14,alignItems:"center" }}>
          <div style={{ textAlign:"right",minWidth:isMobile?52:60 }}><div style={{ fontSize:9,color:P.dim }}>Forecast</div><div style={{ fontSize:isMobile?12:13,fontWeight:700 }}>{fmt(tF,0)}</div></div>
          <div style={{ textAlign:"right",minWidth:isMobile?48:60 }}><div style={{ fontSize:9,color:P.dim }}>Paid</div><div style={{ fontSize:isMobile?12:13,fontWeight:700,color:P.green }}>{fmt(tP,0)}</div></div>
          <div style={{ width:isMobile?21:27 }}/>
        </div>
      </div>
      <div style={{ padding:"10px 18px" }}><AddButton onClick={()=>update(d=>{(d.currentBills = d.currentBills||{items:[]}, d.currentBills.items = d.currentBills.items||[]).push({name:"New",forecast:0,paid:0});})} label="Add bill"/></div>
    </Card>
  </Section>;
}

/* ═══════════ WEDDING & HONEYMOON ═══════════ */
function WeddingView({ data, update, ttStyle }) {
  const P = useP(); const isMobile = useMobile();
  const DEFAULT_ROWS = [
    { month: "August Pay & Bonus", nick: 0, elle: 0 },
    { month: "September Pay", nick: 0, elle: 0 },
    { month: "October Pay", nick: 0, elle: 0 },
    { month: "November Pay & Bonus", nick: 0, elle: 0 },
    { month: "December Pay", nick: 0, elle: 0 },
    { month: "January Pay", nick: 0, elle: 0 },
    { month: "February Pay & Bonus", nick: 0, elle: 0 },
    { month: "March Pay", nick: 0, elle: 0 },
    { month: "April Pay", nick: 0, elle: 0 },
  ];
  const META = {
    wedding:   { label: "Wedding", color: P.pink, icon: Heart },
    honeymoon: { label: "Honeymoon", color: P.purple, icon: Plane },
  };
  const sg = (data && typeof data.savingsGoals === "object" && data.savingsGoals !== null) ? data.savingsGoals : {};
  const getGoal = (k) => {
    const g = (sg && typeof sg[k] === "object" && sg[k] !== null) ? sg[k] : {};
    const rows = Array.isArray(g.rows) ? g.rows.filter(Boolean) : [];
    return { start: Number(g.start)||0, rows: rows.length ? rows : DEFAULT_ROWS.map(r=>({...r})) };
  };
  const ensure = (d,k) => {
    if (!d.savingsGoals) d.savingsGoals = {};
    if (!d.savingsGoals[k]) d.savingsGoals[k] = { start: 0, rows: DEFAULT_ROWS.map(r=>({...r})) };
    if (!Array.isArray(d.savingsGoals[k].rows) || !d.savingsGoals[k].rows.length) d.savingsGoals[k].rows = DEFAULT_ROWS.map(r=>({...r}));
    return d.savingsGoals[k];
  };
  const setRow = (k,i,f,v) => update(d => { ensure(d,k).rows[i][f] = v; });
  const setStart = (k,v) => update(d => { ensure(d,k).start = v; });
  const setMonth = (k,i,v) => update(d => { ensure(d,k).rows[i].month = v; });
  const addRow = (k) => update(d => { ensure(d,k).rows.push({ month:"New Month", nick:0, elle:0 }); });
  const removeRow = (k,i) => update(d => { d.savingsGoals?.[k]?.rows?.splice(i,1); });

  // Wedding expense data (defensive)
  const rawW = (data && typeof data.wedding === "object" && data.wedding !== null) ? data.wedding : {};
  const w = {
    contributions: Array.isArray(rawW.contributions) ? rawW.contributions.filter(Boolean) : [],
    expenses: Array.isArray(rawW.expenses) ? rawW.expenses.filter(Boolean) : [],
  };
  const tG = w.contributions.reduce((s,c)=>s+(Number(c?.amount)||0),0);
  const tD = w.expenses.reduce((s,e)=>s+(Number(e?.deposit)||0),0);
  const tU = w.expenses.reduce((s,e)=>s+(Number(e?.unpaid)||0),0);
  const tPd = w.expenses.reduce((s,e)=>s+(Number(e?.paid)||0),0);
  const hb = Array.isArray(data?.honeymoonBooked) ? data.honeymoonBooked.filter(Boolean) : [];
  const hbDep = hb.reduce((s,e)=>s+(Number(e?.deposit ?? e?.amount)||0),0);
  const hbUnpaid = hb.reduce((s,e)=>s+(Number(e?.unpaid)||0),0);
  const hbTotal = hbDep + hbUnpaid;

  // Editable section headings
  const headings = (data?.headings && typeof data.headings === "object") ? data.headings : {};
  const hdr = (k, fallback) => headings[k] || fallback;
  const setHdr = (k, v) => update(d => { if(!d.headings) d.headings = {}; d.headings[k] = v; });

  // Compute final saved totals for each goal
  const computeTotal = (k) => {
    const g = getGoal(k);
    return g.rows.reduce((s,r)=>s+(Number(r?.nick)||0)+(Number(r?.elle)||0), g.start);
  };
  const weddingSaved = computeTotal("wedding");
  const honeymoonSaved = computeTotal("honeymoon");
  const goals = (data?.goals && typeof data.goals === "object") ? data.goals : {};
  const wGoal = Number(goals.wedding) || 75000;
  const hGoal = Number(goals.honeymoon) || 30000;
  const wGrand = tG + tD + weddingSaved;
  const hGrand = hbDep + honeymoonSaved;

  // Savings table renderer
  const SavingsTable = ({ k }) => {
    const g = getGoal(k); const m = META[k];
    let running = g.start;
    const computed = g.rows.map(r => { const pre = running; const final = pre + (Number(r?.nick)||0) + (Number(r?.elle)||0); running = final; return { month: r?.month||"Month", nick: Number(r?.nick)||0, elle: Number(r?.elle)||0, pre, final }; });
    const total = running;
    const tN = g.rows.reduce((s,r)=>s+(Number(r?.nick)||0),0);
    const tE = g.rows.reduce((s,r)=>s+(Number(r?.elle)||0),0);
    const chartData = [{ month:"Start", balance:g.start }, ...computed.map(r=>({ month:String(r.month||"").split(" ")[0].slice(0,3), balance:r.final }))];
    return <Card style={{ marginBottom:20, padding:0, overflow:"hidden" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 22px 14px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <IconBubble icon={m.icon} color={m.color} size={34}/>
          <div>
            <div style={{ fontSize:14, fontWeight:600 }}><EditableText value={hdr(k+"Sav", m.label+" Savings")} onChange={v=>setHdr(k+"Sav",v)} style={{ fontSize:14, fontWeight:600 }}/></div>
            <div style={{ fontSize:12, color:P.dim }}>Starting: <Editable value={g.start} onChange={v=>setStart(k,v)} format={v=>fmt(v,0)} style={{ fontSize:12, color:P.sub }}/></div>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:10, color:P.dim, textTransform:"uppercase", letterSpacing:"0.08em" }}>Final Total</div>
          <div style={{ fontSize:24, fontWeight:700, color:m.color, letterSpacing:"-0.02em" }}>{fmt(total,0)}</div>
        </div>
      </div>
      <div style={{ height:80, padding:"0 12px 6px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{top:4,right:4,bottom:4,left:4}}>
            <defs><linearGradient id={`wg-${k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={m.color} stopOpacity={0.22}/><stop offset="100%" stopColor={m.color} stopOpacity={0}/></linearGradient></defs>
            <Tooltip contentStyle={ttStyle} formatter={v=>[fmt(v,0),"Balance"]}/>
            <Area type="monotone" dataKey="balance" stroke={m.color} fill={`url(#wg-${k})`} strokeWidth={2} dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display:"grid", minWidth:0, gridTemplateColumns: isMobile ? "1.4fr 1fr 1fr 1fr 24px" : "1.6fr 1fr 1fr 1fr 1fr 28px", gap:isMobile?5:8, padding:isMobile?"9px 12px":"10px 22px", borderTop:`1px solid ${P.border}`, borderBottom:`1px solid ${P.border}`, background:P.hoverBg, fontSize:isMobile?9:10, fontWeight:600, color:P.dim, textTransform:"uppercase", letterSpacing:"0.05em" }}>
        <span>Month</span>{!isMobile && <span style={{textAlign:"right"}}>Pre Total</span>}<span style={{textAlign:"right"}}>Nick</span><span style={{textAlign:"right"}}>Elle</span><span style={{textAlign:"right"}}>Final Total</span><span/>
      </div>
      {computed.map((r,i)=>(
        <div key={i} style={{ display:"grid", minWidth:0, gridTemplateColumns: isMobile ? "1.4fr 1fr 1fr 1fr 24px" : "1.6fr 1fr 1fr 1fr 1fr 28px", gap:isMobile?5:8, padding:isMobile?"9px 12px":"9px 22px", borderBottom:`1px solid ${P.border}`, alignItems:"center" }}
          onMouseEnter={e=>e.currentTarget.style.background=P.hoverBg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <EditableText value={r.month} onChange={v=>setMonth(k,i,v)} style={{ fontSize:isMobile?11:12, fontWeight:500 }}/>
          {!isMobile && <span style={{ textAlign:"right", fontSize:12, color:P.dim }}>{fmt(r.pre,0)}</span>}
          <div style={{ textAlign:"right" }}><Editable value={r.nick} onChange={v=>setRow(k,i,"nick",v)} format={v=>fmt(v,0)} style={{ fontSize:isMobile?12:13, fontWeight:600, color:r.nick>0?P.blue:P.dim }}/></div>
          <div style={{ textAlign:"right" }}><Editable value={r.elle} onChange={v=>setRow(k,i,"elle",v)} format={v=>fmt(v,0)} style={{ fontSize:isMobile?12:13, fontWeight:600, color:r.elle>0?P.pink:P.dim }}/></div>
          <span style={{ textAlign:"right", fontSize:isMobile?12:13, fontWeight:700 }}>{fmt(r.final,0)}</span>
          <RemoveBtn onClick={()=>removeRow(k,i)}/>
        </div>
      ))}
      <div style={{ display:"grid", minWidth:0, gridTemplateColumns: isMobile ? "1.4fr 1fr 1fr 1fr 24px" : "1.6fr 1fr 1fr 1fr 1fr 28px", gap:isMobile?5:8, padding:isMobile?"11px 12px":"12px 22px", borderTop:`2px solid ${P.border}`, background:P.hoverBg, fontWeight:700, fontSize:isMobile?12:13 }}>
        <span>TOTAL</span>{!isMobile && <span/>}
        <span style={{ textAlign:"right", color:P.blue }}>{fmt(tN,0)}</span>
        <span style={{ textAlign:"right", color:P.pink }}>{fmt(tE,0)}</span>
        <span style={{ textAlign:"right", color:m.color }}>{fmt(total,0)}</span><span/>
      </div>
      <div style={{ padding:"10px 22px 14px" }}><AddButton onClick={()=>addRow(k)} label="Add month"/></div>
    </Card>;
  };

  return <div>
    {/* WEDDING */}
    <Section title={<EditableText value={hdr("secWedding","Wedding")} onChange={v=>setHdr("secWedding",v)} style={{ fontSize:20, fontWeight:600 }}/>}>
      <div style={{ display:"grid",minWidth:0,gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)",gap:10,marginBottom:14 }}>
        <Card style={{ padding:14 }}><div style={{ fontSize:10,color:P.dim,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}><EditableText value={hdr("cGifted","Gifted")} onChange={v=>setHdr("cGifted",v)} style={{ fontSize:10, color:P.dim }}/></div><div style={{ fontSize:22,fontWeight:700,color:P.green }}>{fmt(tG,0)}</div></Card>
        <Card style={{ padding:14 }}><div style={{ fontSize:10,color:P.dim,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}><EditableText value={hdr("cDeposits","Deposits Paid")} onChange={v=>setHdr("cDeposits",v)} style={{ fontSize:10, color:P.dim }}/></div><div style={{ fontSize:22,fontWeight:700,color:P.green }}>{fmt(tD,0)}</div></Card>
        <Card style={{ padding:14 }}><div style={{ fontSize:10,color:P.dim,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}><EditableText value={hdr("cWedSav","Wedding Savings")} onChange={v=>setHdr("cWedSav",v)} style={{ fontSize:10, color:P.dim }}/></div><div style={{ fontSize:22,fontWeight:700,color:P.pink }}>{fmt(weddingSaved,0)}</div></Card>
        <Card style={{ padding:14, background:P.greenBg, borderColor:P.green+"25" }}><div style={{ fontSize:10,color:P.dim,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}>Grand Total</div><div style={{ fontSize:22,fontWeight:700,color:P.green }}>{fmt(wGrand,0)}</div></Card>
      </div>
      <Card style={{ marginBottom:20, padding:18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10 }}>
          <span style={{ fontSize:11, color:P.dim, textTransform:"uppercase", letterSpacing:"0.08em" }}>Progress to Goal</span>
          <span style={{ fontSize:13, color:P.sub }}>Goal: <Editable value={wGoal} onChange={v=>update(d=>{ if(!d.goals) d.goals={}; d.goals.wedding=v; })} format={v=>fmt(v,0)} style={{ fontSize:13, fontWeight:600 }}/></span>
        </div>
        <ProgressC value={wGrand} max={wGoal||1} color={P.pink} height={8}/>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
          <span style={{ fontSize:12, color:P.dim }}>{((wGrand/(wGoal||1))*100).toFixed(1)}% there</span>
          <span style={{ fontSize:12, color: wGoal-wGrand>0 ? P.orange : P.green, fontWeight:600 }}>{wGoal-wGrand>0 ? `${fmt(wGoal-wGrand,0)} to go` : `${fmt(wGrand-wGoal,0)} over goal`}</span>
        </div>
      </Card>

      <SavingsTable k="wedding"/>

      {/* Money Given */}
      <Card style={{ marginBottom:20, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"16px 22px 10px", fontSize:13, fontWeight:600, color:P.sub }}><EditableText value={hdr("wGiven","Money Given")} onChange={v=>setHdr("wGiven",v)} style={{ fontSize:13, fontWeight:600, color:P.sub }}/></div>
        {w.contributions.map((c,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 22px", borderTop:`1px solid ${P.border}` }}>
            <EditableText value={c.name} onChange={v=>update(d=>{ if(d.wedding?.contributions?.[i]) d.wedding.contributions[i].name=v; })} style={{ fontSize:13 }}/>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <Editable value={c.amount} onChange={v=>update(d=>{ if(d.wedding?.contributions?.[i]) d.wedding.contributions[i].amount=v; })} format={v=>fmt(v,0)} style={{ fontSize:14, fontWeight:600, color:P.green }}/>
              <RemoveBtn onClick={()=>update(d=>{ d.wedding?.contributions?.splice(i,1); })}/>
            </div>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 22px", borderTop:`2px solid ${P.border}`, background:P.hoverBg }}>
          <span style={{ fontWeight:700, fontSize:13 }}>TOTAL</span>
          <span style={{ fontWeight:700, fontSize:13, color:P.green }}>{fmt(tG,0)}</span>
        </div>
        <div style={{ padding:"10px 22px 14px" }}><AddButton onClick={()=>update(d=>{ (d.wedding = d.wedding||{contributions:[]}, d.wedding.contributions = d.wedding.contributions||[]).push({name:"New",amount:0}); })} label="Add"/></div>
      </Card>

      {/* Money Already Spent */}
      <Card style={{ padding:0, overflow:"hidden" }}>
        <div style={{ padding:"16px 22px 10px", fontSize:13, fontWeight:600, color:P.sub }}>
          <EditableText value={hdr("wSpent","Money Already Spent")} onChange={v=>setHdr("wSpent",v)} style={{ fontSize:13, fontWeight:600, color:P.sub }}/>
        </div>
        <div style={{ display:"grid", minWidth:0, gridTemplateColumns: isMobile ? "1.6fr 1fr 1fr 24px" : "2fr 1fr 1fr 28px", gap:isMobile?5:8, padding: isMobile ? "0 12px 8px" : "0 22px 8px", fontSize:10, fontWeight:600, color:P.dim, textTransform:"uppercase", letterSpacing:"0.06em" }}>
          <span>Item</span><span style={{textAlign:"right"}}>Deposit</span><span style={{textAlign:"right"}}>Unpaid</span><span/>
        </div>
        {w.expenses.map((e,i)=>(
          <div key={i} style={{ display:"grid", minWidth:0, gridTemplateColumns: isMobile ? "1.6fr 1fr 1fr 24px" : "2fr 1fr 1fr 28px", gap:isMobile?5:8, padding: isMobile ? "9px 12px" : "9px 22px", borderTop:`1px solid ${P.border}`, alignItems:"center" }}>
            <EditableText value={e.name} onChange={v=>update(d=>{ if(d.wedding?.expenses?.[i]) d.wedding.expenses[i].name=v; })} style={{ fontSize:13, fontWeight:500 }}/>
            <div style={{textAlign:"right"}}><Editable value={e.deposit} onChange={v=>update(d=>{ if(d.wedding?.expenses?.[i]) d.wedding.expenses[i].deposit=v; })} format={v=>fmt(v,0)} style={{ fontSize:13, color:e.deposit>0?P.green:P.dim, fontWeight:e.deposit>0?600:400 }}/></div>
            <div style={{textAlign:"right"}}><Editable value={e.unpaid} onChange={v=>update(d=>{ if(d.wedding?.expenses?.[i]) d.wedding.expenses[i].unpaid=v; })} format={v=>fmt(v,0)} style={{ fontSize:13, color:e.unpaid>0?P.orange:P.dim, fontWeight:e.unpaid>0?600:400 }}/></div>
            <RemoveBtn onClick={()=>update(d=>{ d.wedding?.expenses?.splice(i,1); })}/>
          </div>
        ))}
        <div style={{ display:"grid", minWidth:0, gridTemplateColumns: isMobile ? "1.6fr 1fr 1fr 24px" : "2fr 1fr 1fr 28px", gap:isMobile?5:8, padding: isMobile ? "11px 12px" : "12px 22px", borderTop:`2px solid ${P.border}`, background:P.hoverBg, fontWeight:700, fontSize:13 }}>
          <span>TOTAL</span>
          <span style={{textAlign:"right", color:P.green}}>{fmt(tD,0)}</span>
          <span style={{textAlign:"right", color:P.orange}}>{fmt(tU,0)}</span><span/>
        </div>
        <div style={{ padding:"10px 22px 14px" }}><AddButton onClick={()=>update(d=>{ (d.wedding = d.wedding||{expenses:[]}, d.wedding.expenses = d.wedding.expenses||[]).push({name:"New",deposit:0,unpaid:0}); })} label="Add expense"/></div>
      </Card>

    </Section>

    {/* HONEYMOON */}
    <Section title={<EditableText value={hdr("secHoneymoon","Honeymoon")} onChange={v=>setHdr("secHoneymoon",v)} style={{ fontSize:20, fontWeight:600 }}/>}>
      <div style={{ display:"grid",minWidth:0,gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)",gap:10,marginBottom:14 }}>
        <Card style={{ padding:14 }}><div style={{ fontSize:10,color:P.dim,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}><EditableText value={hdr("cHmSpent","Already Spent")} onChange={v=>setHdr("cHmSpent",v)} style={{ fontSize:10, color:P.dim }}/></div><div style={{ fontSize:22,fontWeight:700,color:P.green }}>{fmt(hbDep,0)}</div></Card>
        <Card style={{ padding:14 }}><div style={{ fontSize:10,color:P.dim,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}><EditableText value={hdr("cHmSav","Honeymoon Savings")} onChange={v=>setHdr("cHmSav",v)} style={{ fontSize:10, color:P.dim }}/></div><div style={{ fontSize:22,fontWeight:700,color:P.purple }}>{fmt(honeymoonSaved,0)}</div></Card>
        <Card style={{ padding:14, background:P.greenBg, borderColor:P.green+"25" }}><div style={{ fontSize:10,color:P.dim,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}>Grand Total</div><div style={{ fontSize:22,fontWeight:700,color:P.green }}>{fmt(hGrand,0)}</div></Card>
      </div>
      <Card style={{ marginBottom:20, padding:18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10 }}>
          <span style={{ fontSize:11, color:P.dim, textTransform:"uppercase", letterSpacing:"0.08em" }}>Progress to Goal</span>
          <span style={{ fontSize:13, color:P.sub }}>Goal: <Editable value={hGoal} onChange={v=>update(d=>{ if(!d.goals) d.goals={}; d.goals.honeymoon=v; })} format={v=>fmt(v,0)} style={{ fontSize:13, fontWeight:600 }}/></span>
        </div>
        <ProgressC value={hGrand} max={hGoal||1} color={P.purple} height={8}/>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
          <span style={{ fontSize:12, color:P.dim }}>{((hGrand/(hGoal||1))*100).toFixed(1)}% there</span>
          <span style={{ fontSize:12, color: hGoal-hGrand>0 ? P.orange : P.green, fontWeight:600 }}>{hGoal-hGrand>0 ? `${fmt(hGoal-hGrand,0)} to go` : `${fmt(hGrand-hGoal,0)} over goal`}</span>
        </div>
      </Card>
      <SavingsTable k="honeymoon"/>
      <Card style={{ padding:0, overflow:"hidden" }}>
        <div style={{ padding:"16px 22px 10px", fontSize:13, fontWeight:600, color:P.sub }}>
          <EditableText value={hdr("hSpent","Money Already Spent")} onChange={v=>setHdr("hSpent",v)} style={{ fontSize:13, fontWeight:600, color:P.sub }}/>
        </div>
        <div style={{ display:"grid", minWidth:0, gridTemplateColumns: isMobile ? "1.6fr 1fr 1fr 24px" : "2fr 1fr 1fr 28px", gap:isMobile?5:8, padding: isMobile ? "0 12px 8px" : "0 22px 8px", fontSize:10, fontWeight:600, color:P.dim, textTransform:"uppercase", letterSpacing:"0.06em" }}>
          <span>Item</span><span style={{textAlign:"right"}}>Deposit</span><span style={{textAlign:"right"}}>Unpaid</span><span/>
        </div>
        {hb.map((e,i)=>(
          <div key={i} style={{ display:"grid", minWidth:0, gridTemplateColumns: isMobile ? "1.6fr 1fr 1fr 24px" : "2fr 1fr 1fr 28px", gap:isMobile?5:8, padding: isMobile ? "9px 12px" : "9px 22px", borderTop:`1px solid ${P.border}`, alignItems:"center" }}>
            <EditableText value={e.name} onChange={v=>update(d=>{ if(d.honeymoonBooked?.[i]) d.honeymoonBooked[i].name=v; })} style={{ fontSize:13, fontWeight:500 }}/>
            <div style={{textAlign:"right"}}><Editable value={Number(e.deposit ?? e.amount) || 0} onChange={v=>update(d=>{ if(d.honeymoonBooked?.[i]){ d.honeymoonBooked[i].deposit=v; delete d.honeymoonBooked[i].amount; } })} format={v=>fmt(v,0)} style={{ fontSize:13, color:(Number(e.deposit ?? e.amount)||0)>0?P.green:P.dim, fontWeight:(Number(e.deposit ?? e.amount)||0)>0?600:400 }}/></div>
            <div style={{textAlign:"right"}}><Editable value={Number(e.unpaid)||0} onChange={v=>update(d=>{ if(d.honeymoonBooked?.[i]) d.honeymoonBooked[i].unpaid=v; })} format={v=>fmt(v,0)} style={{ fontSize:13, color:(Number(e.unpaid)||0)>0?P.orange:P.dim, fontWeight:(Number(e.unpaid)||0)>0?600:400 }}/></div>
            <RemoveBtn onClick={()=>update(d=>{ d.honeymoonBooked?.splice(i,1); })}/>
          </div>
        ))}
        <div style={{ display:"grid", minWidth:0, gridTemplateColumns: isMobile ? "1.6fr 1fr 1fr 24px" : "2fr 1fr 1fr 28px", gap:isMobile?5:8, padding: isMobile ? "11px 12px" : "12px 22px", borderTop:`2px solid ${P.border}`, background:P.hoverBg, fontWeight:700, fontSize:13 }}>
          <span>TOTAL</span>
          <span style={{textAlign:"right", color:P.green}}>{fmt(hbDep,0)}</span>
          <span style={{textAlign:"right", color:P.orange}}>{fmt(hbUnpaid,0)}</span><span/>
        </div>
        <div style={{ padding:"10px 22px 14px" }}><AddButton onClick={()=>update(d=>{ (d.honeymoonBooked = d.honeymoonBooked||[]).push({name:"New",deposit:0,unpaid:0}); })} label="Add expense"/></div>
      </Card>

    </Section>
  </div>;
}

/* ═══════════ CREDIT CARD ═══════════ */
function CreditCardView({ data, update }) {
  const P = useP(); const isMobile = useMobile(); const cc = { savingsTarget:0, savingsCurrent:0, workExpenses:[], personalExpenses:[], ...(data.creditCard||{}) };
  if (!Array.isArray(cc.workExpenses)) cc.workExpenses = [];
  if (!Array.isArray(cc.personalExpenses)) cc.personalExpenses = [];
  const wT=cc.workExpenses.reduce((s,e)=>s+(e.amount||0),0); const pT=cc.personalExpenses.reduce((s,e)=>s+(e.amount||0),0);
  const gap=cc.savingsTarget-cc.savingsCurrent; const fin=gap-wT-pT;
  const Col = ({ title, items, path, color, total }) => (
    <div style={{ flex:1 }}>
      <div style={{ fontSize:12,fontWeight:600,color:P.sub,marginBottom:8,display:"flex",justifyContent:"space-between" }}><span>{title}</span><span style={{ color }}>{fmt(total)}</span></div>
      <Card style={{ padding:0,overflow:"hidden" }}>
        <div style={{ maxHeight:400,overflowY:"auto" }}>
          {items.map((exp,i)=><div key={i} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderBottom:`1px solid ${P.border}`,fontSize:13 }}>
            <Tick checked={exp.checked} onClick={()=>update(d=>{d.creditCard[path][i].checked=!d.creditCard[path][i].checked;})} size={18}/>
            <div style={{ flex:1,minWidth:0 }}><EditableText value={exp.desc||`Item ${i+1}`} onChange={v=>update(d=>{d.creditCard[path][i].desc=v;})} style={{ fontSize:12,color:exp.checked?P.dim:(exp.desc?P.text:P.dim),textDecoration:exp.checked?"line-through":"none" }}/></div>
            <Editable value={exp.amount} onChange={v=>update(d=>{d.creditCard[path][i].amount=v;})} style={{ fontSize:13,fontWeight:600,color:exp.checked?P.dim:P.text }}/>
            <RemoveBtn onClick={()=>update(d=>{d.creditCard[path].splice(i,1);})}/>
          </div>)}
          {items.length===0&&<div style={{ padding:16,textAlign:"center",color:P.dim,fontSize:12 }}>None yet</div>}
        </div>
        <div style={{ padding:"8px 14px",borderTop:`1px solid ${P.border}` }}><AddButton onClick={()=>update(d=>{(d.creditCard[path] = d.creditCard[path]||[]).push({desc:"",amount:0,checked:false});})} label="Add"/></div>
      </Card>
    </div>
  );
  return <Section title="Credit Card" subtitle="Track & verify expenses">
    <Card style={{ marginBottom:20 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
        <div><div style={{ fontSize:11,color:P.dim,marginBottom:2,textTransform:"uppercase",letterSpacing:"0.08em" }}>Savings Target</div><Editable value={cc.savingsTarget} onChange={v=>update(d=>{d.creditCard.savingsTarget=v;})} style={{ fontSize:26,fontWeight:700 }}/></div>
        <div style={{ textAlign:"right" }}><div style={{ fontSize:11,color:P.dim,marginBottom:2,textTransform:"uppercase",letterSpacing:"0.08em" }}>Current</div><Editable value={cc.savingsCurrent} onChange={v=>update(d=>{d.creditCard.savingsCurrent=v;})} style={{ fontSize:20,fontWeight:700 }}/></div>
      </div>
      <ProgressC value={cc.savingsCurrent} max={cc.savingsTarget} color={P.green} height={4}/>
      <div style={{ fontSize:12,color:P.orange,fontWeight:600,marginTop:6 }}>Gap: {fmt(gap)}</div>
    </Card>
    <div style={{ display:"grid",minWidth:0,gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)",gap:10,marginBottom:20 }}>
      <Card style={{ padding:14 }}><div style={{ fontSize:10,color:P.dim,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}>Work</div><div style={{ fontSize:20,fontWeight:700,color:P.blue }}>{fmt(wT)}</div></Card>
      <Card style={{ padding:14 }}><div style={{ fontSize:10,color:P.dim,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}>Personal</div><div style={{ fontSize:20,fontWeight:700,color:P.pink }}>{fmt(pT)}</div></Card>
      <Card style={{ padding:14,background:fin>=0?P.greenBg:P.redBg,borderColor:fin>=0?P.green+"20":P.red+"20" }}><div style={{ fontSize:10,color:P.dim,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em" }}>After Payback</div><div style={{ fontSize:20,fontWeight:700,color:fin>=0?P.green:P.red }}>{fmt(fin)}</div></Card>
    </div>
    <div style={{ display:"flex",gap:14 }}>
      <Col title="Work Expenses" items={cc.workExpenses} path="workExpenses" color={P.blue} total={wT}/>
      <Col title="Personal Expenses" items={cc.personalExpenses} path="personalExpenses" color={P.pink} total={pT}/>
    </div>
  </Section>;
}
