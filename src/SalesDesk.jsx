import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Crown, TrendingUp, Watch, Plus, Check, X, Shield, Flame, Trophy,
  ChevronDown, ChevronUp, Clock, Wallet, Users, Settings, LayoutDashboard,
  ListChecks, Tag, BadgeCheck, Ban, Pencil, Trash2, LogOut, Lock,
  ArrowUpRight, ArrowDownRight, Target, Medal, Zap, Database,
  Banknote, Paperclip, Upload, Camera, Phone, Mail, MapPin, Search, Contact, Calculator,
  FileText, Download, Printer
} from "lucide-react";

/* =========================================================================
   SALESDESK — Seller Commission Portal
   Single-file React app. Shared storage (window.storage, shared=true).
   Commission model (always on deal PROFIT = sell − buy, clamped at 0):
     - Seller SOURCED the watch  → buyPct% of profit (default 10)
     - Seller SOLD the watch     → sellPct% of profit (default 10)
     - Same seller did both      → both sides (≈20%)
   Percentages: per-seller sliders (admin) + per-deal overrides.
   Deals submitted by sellers are PENDING until admin approval.
   Price visibility: sellers see prices only on deals they're involved in.
   ========================================================================= */

const STORE_KEY = "sales_desk_v7";
const LEGACY_V6 = "sales_desk_v6";
const LEGACY_V5 = "sales_desk_v5";
const LEGACY_V4 = "sales_desk_v4";
const LEGACY_V3 = "sales_desk_v3";
const LEGACY_V2 = "sales_desk_v2";
const LEGACY_V1 = "sales_desk_v1";

/* ---------------------------- CSS ---------------------------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap');
:root{
  --bg:#07080B; --panel:#0E1016; --panel2:#12151E; --line:#1F2430; --line2:#2A3040;
  --ink:#EDEFF4; --mut:#8A93A6; --dim:#5B6373;
  --gold:#E9B44C; --gold2:#FFD978; --green:#34E59B; --red:#FF5E6C; --amber:#F2A33C; --blue:#5EA8FF;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%}
body{background:var(--bg);color:var(--ink);font-family:'Hanken Grotesk',sans-serif;-webkit-font-smoothing:antialiased}
.mono{font-family:'IBM Plex Mono',monospace}
.up{text-transform:uppercase;letter-spacing:.14em}
::-webkit-scrollbar{width:8px;height:8px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--line2);border-radius:4px}
input,select,textarea,button{font-family:inherit;color:inherit;outline:none}
input,select,textarea{background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:10px 12px;font-size:14px;width:100%}
input:focus,select:focus,textarea:focus{border-color:var(--gold)}
button{cursor:pointer;border:none;background:none}
button:focus-visible,input:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes glow{0%,100%{text-shadow:0 0 18px rgba(233,180,76,.35)}50%{text-shadow:0 0 34px rgba(233,180,76,.65)}}
@keyframes sweep{0%{transform:translateX(-110%)}100%{transform:translateX(110%)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
.rise{animation:rise .35s ease both}
.heroNum{animation:glow 2.8s ease-in-out infinite}
.sweepWrap{position:relative;overflow:hidden;height:3px;background:var(--line);border-radius:2px}
.sweepBar{position:absolute;inset:0;width:45%;background:linear-gradient(90deg,transparent,var(--gold2),transparent);animation:sweep 2.2s ease-in-out infinite}
.pulse{animation:pulse 1.6s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.heroNum,.sweepBar,.pulse,.rise{animation:none}}
input[type=range]{-webkit-appearance:none;appearance:none;height:6px;border:none;padding:0;border-radius:3px;background:var(--line)}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:20px;height:20px;border-radius:50%;background:var(--gold);border:3px solid #07080B;box-shadow:0 0 0 1px var(--gold),0 0 12px rgba(233,180,76,.5);cursor:grab}
input[type=range]::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:var(--gold);border:3px solid #07080B;box-shadow:0 0 0 1px var(--gold);cursor:grab}
.repTable{width:100%;border-collapse:collapse;font-size:12px}
.repTable th{text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:var(--mut);padding:7px 8px;border-bottom:1px solid var(--line2)}
.repTable td{padding:7px 8px;border-bottom:1px solid var(--line)}
.repTable td.num,.repTable th.num{text-align:right;font-family:'IBM Plex Mono',monospace}
@media print{
  body *{visibility:hidden}
  #reportPrint,#reportPrint *{visibility:visible}
  #reportPrint{position:absolute;left:0;top:0;width:100%;padding:24px}
  #reportPrint,#reportPrint *{background:#fff !important;color:#000 !important;border-color:#bbb !important;box-shadow:none !important;text-shadow:none !important;animation:none !important}
  #reportPrint .noPrint{display:none !important}
}
`;

/* ---------------------------- helpers ---------------------------- */
const CCYS = ["EUR", "USD", "GBP", "CHF", "AED", "USDT", "HKD", "PKR"];
const SYM = { EUR: "€", USD: "$", GBP: "£", CHF: "CHF ", AED: "AED ", USDT: "₮", HKD: "HK$" };
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const fmtN = (n, dec = 0) =>
  (n == null || isNaN(n)) ? "—" :
  Number(n).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtM = (n, ccy = "EUR", dec = 0) => (n == null || isNaN(n)) ? "—" : `${SYM[ccy] || ccy + " "}${fmtN(n, dec)}`;
const monthKey = (iso) => (iso || "").slice(0, 7);
const nowISO = () => new Date().toISOString();
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
};
const lastMonths = (n) => {
  const out = []; const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const t = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
};

/* ===== ENGINE START (single source of truth — pure JS, no JSX) ===== */
function dealProfit(d) {
  if (d.buyPrice == null || d.sellPrice == null) return null;
  return d.sellPrice - d.buyPrice;
}
function commissionBase(d) {
  const p = dealProfit(d);
  if (p == null) return null;
  return Math.max(0, p); // negative profit → no commission
}
function effPct(d, side, sellersById) {
  const ov = side === "buy" ? d.overrideBuyPct : d.overrideSellPct;
  if (ov != null) return ov;
  const sid = side === "buy" ? d.sourcedBy : d.soldBy;
  const s = sellersById[sid];
  if (!s) return 0;
  return side === "buy" ? (s.buyPct ?? 10) : (s.sellPct ?? 10);
}
// Client KYC completeness: name + (phone OR email) + address
function clientComplete(c) {
  const has = (v) => v != null && String(v).trim() !== "";
  if (!c) return false;
  const srcOk = has(c.sourceType) && (c.sourceType !== "company" || has(c.sourceChannel));
  return !!(has(c.name) && (has(c.phone) || has(c.email)) && has(c.address) && srcOk);
}
// What blocks a commission side from being paid out
function sideBlockers(d, side, clientsById) {
  const has = (v) => v != null && String(v).trim() !== "";
  const b = [];
  if (!has(d.serial)) b.push("serial number");
  const cid = side === "buy" ? d.buyClientId : d.sellClientId;
  const c = clientsById ? clientsById[cid] : null;
  if (!cid || !c) b.push(side === "buy" ? "supplier client" : "buyer client");
  else if (!clientComplete(c)) b.push("client info (name, contact, address, lead source)");
  if (!has(side === "buy" ? d.buyMethod : d.sellMethod)) b.push("payment method");
  return b;
}
// A deal side is paid iff a payment record allocates it (single source of truth)
function sideIsPaid(dealId, side, payments) {
  return (payments || []).some(p => (p.allocations || []).some(a => a.dealId === dealId && a.side === side));
}
// Returns commission lines for a deal: [{sellerId, side, pct, amount, ccy, paid}]
function dealCommissions(d, sellersById, payments, clientsById, rates) {
  if (d.status !== "SOLD") return [];
  const base = commissionBase(d);
  if (base == null) return [];
  const out = [];
  // FX locked at the moment of sale; fall back to current rates for legacy deals
  const R = d.fxAtSale || rates || {};
  const line = (side, sellerId) => {
    const s = sellersById[sellerId];
    const manual = !!(s && s.commMode === "manual");
    const mAmt = side === "buy" ? d.manualBuyAmt : d.manualSellAmt;
    const pct = manual ? null : effPct(d, side, sellersById);
    const amount = manual ? (mAmt != null ? mAmt : 0) : base * pct / 100;
    const ccy = manual ? ((side === "buy" ? d.manualBuyCcy : d.manualSellCcy) || (s && s.commCcy) || "PKR") : d.ccy;
    const blockers = sideBlockers(d, side, clientsById);
    if (manual && mAmt == null) blockers.push("commission amount (set by admin)");
    const usd = (R[ccy] != null && R.USD) ? amount * R[ccy] / R.USD : null;
    return {
      sellerId, side, pct, amount, ccy, usd, manual,
      paid: sideIsPaid(d.id, side, payments),
      blockers, payable: blockers.length === 0
    };
  };
  if (d.sourcedBy && sellersById[d.sourcedBy]) out.push(line("buy", d.sourcedBy));
  if (d.soldBy && sellersById[d.soldBy]) out.push(line("sell", d.soldBy));
  return out;
}
// Aggregate per-currency maps for one seller: {earned, unpaid, paid} each {ccy: amount}
function sellerEarnings(sellerId, deals, sellersById, payments, clientsById, rates) {
  const earned = {}, unpaid = {}, paid = {}, blocked = {};
  const add = (m, ccy, v) => { m[ccy] = (m[ccy] || 0) + v; };
  for (const d of deals) {
    for (const c of dealCommissions(d, sellersById, payments, clientsById, rates)) {
      if (c.sellerId !== sellerId) continue;
      const v = c.usd ?? 0;
      add(earned, "USD", v);
      if (c.paid) add(paid, "USD", v);
      else {
        add(unpaid, "USD", v);
        if (!c.payable) add(blocked, "USD", v);
      }
    }
  }
  return { earned, unpaid, paid, blocked };
}
// Approx-EUR conversion of a per-currency map using manual rates (labelled as approx in UI)
function approxEUR(map, rates) {
  let t = 0;
  for (const [ccy, v] of Object.entries(map || {})) t += v * (rates[ccy] ?? 1);
  return t;
}
// Commissions (approx EUR) earned by a seller in a given YYYY-MM (by soldAt)
function sellerMonthEUR(sellerId, mKey, deals, sellersById, rates, payments, clientsById) {
  let t = 0;
  for (const d of deals) {
    if (monthKey(d.soldAt) !== mKey) continue;
    for (const c of dealCommissions(d, sellersById, payments, clientsById, rates)) {
      if (c.sellerId === sellerId) t += (c.usd ?? 0) * (rates.USD ?? 0.93);
    }
  }
  return t;
}
// Unpaid commission sides for a seller (for payout allocation): [{deal, side, pct, amount, ccy}]
function unpaidSides(sellerId, deals, sellersById, payments, clientsById, rates) {
  const out = [];
  for (const d of deals) {
    for (const c of dealCommissions(d, sellersById, payments, clientsById, rates)) {
      if (c.sellerId === sellerId && !c.paid && c.amount > 0) {
        out.push({ deal: d, side: c.side, pct: c.pct, amount: c.amount, ccy: c.ccy, usd: c.usd, manual: c.manual, blockers: c.blockers, payable: c.payable });
      }
    }
  }
  return out;
}
// Per-currency totals of payments received by a seller: {all, byType}
// ADVANCE_RECOVERY moves no cash (it settles debt), so it's excluded from "all"
function paymentsTotals(sellerId, payments) {
  const all = {}, byType = { COMMISSION: {}, SALARY: {}, BONUS: {}, ADVANCE: {}, ADVANCE_RECOVERY: {} };
  for (const p of (payments || [])) {
    if (p.sellerId !== sellerId) continue;
    if (p.type !== "ADVANCE_RECOVERY") all[p.ccy] = (all[p.ccy] || 0) + p.amount;
    const t = byType[p.type] || (byType[p.type] = {});
    t[p.ccy] = (t[p.ccy] || 0) + p.amount;
  }
  return { all, byType };
}
// Outstanding advance per currency: +ADVANCE given, -ADVANCE_RECOVERY settled. Positive = seller owes.
function advanceBalance(sellerId, payments) {
  const bal = {};
  for (const p of (payments || [])) {
    if (p.sellerId !== sellerId) continue;
    if (p.type === "ADVANCE") bal[p.ccy] = (bal[p.ccy] || 0) + p.amount;
    else if (p.type === "ADVANCE_RECOVERY") bal[p.ccy] = (bal[p.ccy] || 0) - p.amount;
  }
  return bal;
}
// Has a salary payment been recorded for this seller and YYYY-MM?
function salaryMonthPaid(sellerId, mKey, payments) {
  return (payments || []).some(p => p.sellerId === sellerId && p.type === "SALARY" && p.salaryMonth === mKey);
}
// One month of activity, USD figures at each deal's locked FX
function monthlyReport(store, mKey, rates) {
  const sellersById = Object.fromEntries(store.sellers.map(s => [s.id, s]));
  const clientsById = Object.fromEntries(store.clients.map(c => [c.id, c]));
  const usdOfDeal = (d, amt) => {
    const R = d.fxAtSale || rates || {};
    return (R[d.ccy] != null && R.USD) ? amt * R[d.ccy] / R.USD : 0;
  };
  const dealsSold = store.deals.filter(d => d.status === "SOLD" && monthKey(d.soldAt) === mKey);
  let profitUSD = 0, revenueUSD = 0;
  const dealRows = dealsSold.map(d => {
    const profit = (d.sellPrice ?? 0) - (d.buyPrice ?? 0);
    const pUsd = usdOfDeal(d, profit);
    profitUSD += pUsd;
    revenueUSD += usdOfDeal(d, d.sellPrice ?? 0);
    return { d, profit, profitUSD: pUsd };
  });
  const commRows = [];
  let commEarnedUSD = 0, commBlockedUSD = 0, commPaidFlagUSD = 0;
  for (const d of dealsSold) {
    for (const c of dealCommissions(d, sellersById, store.payments, clientsById, rates)) {
      commRows.push({ deal: d, ...c });
      commEarnedUSD += c.usd ?? 0;
      if (c.paid) commPaidFlagUSD += c.usd ?? 0;
      else if (!c.payable) commBlockedUSD += c.usd ?? 0;
    }
  }
  const pays = store.payments.filter(p => monthKey(p.date) === mKey)
    .slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const sumBy = (arr) => arr.reduce((m, p) => { m[p.ccy] = (m[p.ccy] || 0) + p.amount; return m; }, {});
  const paysByType = {};
  for (const t of ["COMMISSION", "SALARY", "BONUS", "ADVANCE", "ADVANCE_RECOVERY"]) {
    paysByType[t] = sumBy(pays.filter(p => p.type === t));
  }
  const perSeller = store.sellers.map(s => {
    const mine = commRows.filter(c => c.sellerId === s.id);
    const paidUSD = pays.filter(p => p.sellerId === s.id && p.type === "COMMISSION" && p.ccy === "USD")
      .reduce((a, p) => a + p.amount, 0);
    return {
      seller: s,
      dealsCount: new Set(mine.map(c => c.deal.id)).size,
      earnedUSD: mine.reduce((a, c) => a + (c.usd ?? 0), 0),
      paidUSD
    };
  }).filter(r => r.dealsCount > 0 || r.paidUSD > 0);
  return {
    mKey, dealsSold: dealRows, commRows, pays, paysByType, perSeller,
    profitUSD, revenueUSD, commEarnedUSD, commBlockedUSD, commPaidFlagUSD,
    netUSD: profitUSD - commEarnedUSD
  };
}
/* ===== ENGINE END ===== */

/* ---------------------------- storage ---------------------------- */
async function loadStore() {
  try {
    const r = await window.storage.get(STORE_KEY, true);
    if (r) return JSON.parse(r.value);
  } catch { /* no v4 yet */ }
  const tryLegacy = async (key, migrate) => {
    try {
      const o = await window.storage.get(key, true);
      if (o) {
        const migrated = migrate(JSON.parse(o.value));
        await saveStore(migrated);
        return migrated;
      }
    } catch { /* not present */ }
    return null;
  };
  return (await tryLegacy(LEGACY_V6, (s) => migrateV6(s)))
      || (await tryLegacy(LEGACY_V5, (s) => migrateV6(migrateV5(s))))
      || (await tryLegacy(LEGACY_V4, (s) => migrateV6(migrateV5(migrateV4(s)))))
      || (await tryLegacy(LEGACY_V3, (s) => migrateV6(migrateV5(migrateV4(migrateV3(s))))))
      || (await tryLegacy(LEGACY_V2, (s) => migrateV6(migrateV5(migrateV4(migrateV3(migrateV2(s)))))))
      || (await tryLegacy(LEGACY_V1, (s) => migrateV6(migrateV5(migrateV4(migrateV3(migrateV2(migrateV1(s))))))));
}
// v6 → v7: stock numbers, manual (fixed-amount) commissions, USD payout with FX locked at sale
function migrateV6(old) {
  const rates = { PKR: 0.0032, ...((old.settings && old.settings.rates) || {}) };
  return {
    ...old, v: 7,
    settings: { ...old.settings, rates },
    sellers: (old.sellers || []).map(s => ({ commMode: "pct", commCcy: null, ...s })),
    deals: (old.deals || []).map(d => ({
      stockNo: null, manualBuyAmt: null, manualBuyCcy: null, manualSellAmt: null, manualSellCcy: null,
      fxAtSale: d.status === "SOLD" ? { ...rates } : null,
      ...d
    }))
  };
}
// v5 → v6: accountancy first-approval layer (accountants list + per-deal acct sign-off fields)
function migrateV5(old) {
  return {
    ...old, v: 6,
    accountants: Array.isArray(old.accountants) ? old.accountants : [],
    deals: (old.deals || []).map(d => ({ acctApprovedBy: null, acctApprovedAt: null, ...d }))
  };
}
// v4 → v5: advances live in the payments ledger (new types only — no schema change)
function migrateV4(old) {
  return { ...old, v: 5 };
}
// v3 → v4: lead source on clients (null = to be completed, blocks payout until filled)
function migrateV3(old) {
  return {
    ...old, v: 4,
    clients: (old.clients || []).map(c => ({ sourceType: null, sourceChannel: null, ...c }))
  };
}
// v2 → v3: clients registry + watch detail / KYC / photo fields with safe defaults
function migrateV2(old) {
  const DEAL_DEFAULTS = {
    serial: null, dial: null, bracelet: null, photoIds: [],
    buyClientId: null, buyMethod: null, buyMethodRef: null,
    sellClientId: null, sellMethod: null, sellMethodRef: null
  };
  return {
    ...old, v: 3,
    clients: Array.isArray(old.clients) ? old.clients : [],
    deals: (old.deals || []).map(d => ({ ...DEAL_DEFAULTS, ...d })),
    payments: Array.isArray(old.payments) ? old.payments : []
  };
}
// v1 → v2: paid flags become payment records; sellers gain salary fields
function migrateV1(old) {
  const sellersById = Object.fromEntries((old.sellers || []).map(s => [s.id, s]));
  const payments = [];
  for (const d of (old.deals || [])) {
    if (d.status !== "SOLD") continue;
    const base = commissionBase(d);
    if (base == null) continue;
    if (d.buyPaid && d.sourcedBy && sellersById[d.sourcedBy]) {
      payments.push({
        id: uid(), sellerId: d.sourcedBy, type: "COMMISSION",
        amount: base * effPct(d, "buy", sellersById) / 100, ccy: d.ccy,
        date: d.buyPaidAt || d.soldAt || nowISO(), note: `${d.ref} · sourcing commission (migrated)`,
        allocations: [{ dealId: d.id, side: "buy" }], createdAt: nowISO()
      });
    }
    if (d.sellPaid && d.soldBy && sellersById[d.soldBy]) {
      payments.push({
        id: uid(), sellerId: d.soldBy, type: "COMMISSION",
        amount: base * effPct(d, "sell", sellersById) / 100, ccy: d.ccy,
        date: d.sellPaidAt || d.soldAt || nowISO(), note: `${d.ref} · sale commission (migrated)`,
        allocations: [{ dealId: d.id, side: "sell" }], createdAt: nowISO()
      });
    }
  }
  return {
    v: 2,
    settings: old.settings,
    sellers: (old.sellers || []).map(s => ({ salaryEnabled: false, salaryAmount: 0, salaryCcy: "EUR", ...s })),
    deals: old.deals || [],
    payments
  };
}
/* payment-proof files live in their own shared keys (never inside the main JSON blob) */
const fileKey = (id) => `sd_file_${id}`;
async function savePaymentFile(id, dataUrl) {
  try { await window.storage.set(fileKey(id), dataUrl, true); return true; }
  catch (e) { console.error("proof save failed", e); return false; }
}
async function getPaymentFile(id) {
  try { const r = await window.storage.get(fileKey(id), true); return r ? r.value : null; }
  catch { return null; }
}
async function deletePaymentFile(id) {
  try { await window.storage.delete(fileKey(id), true); } catch { /* already gone */ }
}
async function saveStore(s) {
  try { await window.storage.set(STORE_KEY, JSON.stringify(s), true); }
  catch (e) { console.error("storage save failed", e); }
}

/* ---------------------------- seed ---------------------------- */
function seedStore() {
  const J = "s_josh", U = "s_ummay", K = "s_kashan", A = "s_alina", AC = "ac_main";
  const C1 = "c_bellini", C2 = "c_weber", C3 = "c_haddad", C4 = "c_marchand", C5 = "c_whitfield", C7 = "c_ricci", C8 = "c_berg";
  const D1 = uid(), D5 = uid();
  const d = (m, day) => new Date(2026, m, day, 12).toISOString();
  const FX = { EUR: 1, USD: 0.93, GBP: 1.17, CHF: 1.06, AED: 0.25, USDT: 0.93, HKD: 0.12, PKR: 0.0032 };
  const NOMAN = { manualBuyAmt: null, manualBuyCcy: null, manualSellAmt: null, manualSellCcy: null };
  return {
    v: 7,
    settings: {
      adminPin: "1234",
      leaderboard: true,
      rates: { ...FX },
    },
    sellers: [
      { id: J, name: "Josh", pin: "1111", buyPct: 10, sellPct: 10, commMode: "pct", commCcy: null, targetEUR: 5000, active: true, joinedAt: d(0, 10), salaryEnabled: false, salaryAmount: 0, salaryCcy: "EUR" },
      { id: U, name: "Ummay", pin: "2222", buyPct: 10, sellPct: 10, commMode: "pct", commCcy: null, targetEUR: 7000, active: true, joinedAt: d(1, 2), salaryEnabled: true, salaryAmount: 2000, salaryCcy: "EUR" },
      { id: K, name: "Kashan", pin: "3333", buyPct: 12, sellPct: 10, commMode: "pct", commCcy: null, targetEUR: 4000, active: true, joinedAt: d(2, 15), salaryEnabled: false, salaryAmount: 0, salaryCcy: "EUR" },
      { id: A, name: "Alina", pin: "4444", buyPct: 10, sellPct: 10, commMode: "manual", commCcy: "PKR", targetEUR: 4000, active: true, joinedAt: d(4, 1), salaryEnabled: false, salaryAmount: 0, salaryCcy: "EUR" },
    ],
    accountants: [
      { id: AC, name: "Accounting", pin: "9999", active: true },
    ],
    clients: [
      { id: C1, name: "Andrea Bellini", phone: "+39 348 220 1144", email: "", address: "Via Monte Napoleone 12, Milano, IT", bankAccount: "IT60 X054 2811 1010 0000 0123 456", notes: "Private collector, repeat supplier", sourceType: "own", sourceChannel: null, createdBy: J, createdAt: d(3, 2) },
      { id: C2, name: "Thomas Weber", phone: "", email: "t.weber@bluewin.ch", address: "Bahnhofstrasse 41, Zürich, CH", bankAccount: "", notes: "Buys steel sports Rolex", sourceType: "company", sourceChannel: "Instagram", createdBy: J, createdAt: d(3, 20) },
      { id: C3, name: "Karim Haddad", phone: "+971 50 882 7741", email: "karim.h@gmail.com", address: "Marina Plaza, Dubai Marina, AE", bankAccount: "", notes: "Dealer contact, fast mover", sourceType: "own", sourceChannel: null, createdBy: U, createdAt: d(2, 12) },
      { id: C4, name: "Élodie Marchand", phone: "+33 6 44 21 98 30", email: "", address: "18 Rue de la Paix, Paris, FR", bankAccount: "FR76 3000 6000 0112 3456 7890 189", notes: "", sourceType: "company", sourceChannel: "TikTok", createdBy: K, createdAt: d(4, 1) },
      { id: C5, name: "James Whitfield", phone: "", email: "jw@whitfieldcap.co.uk", address: "22 Mount Street, Mayfair, London, UK", bankAccount: "", notes: "Pays by wire same day", sourceType: "company", sourceChannel: "Website", createdBy: U, createdAt: d(3, 28) },
      { id: C7, name: "Matteo Ricci", phone: "+39 333 514 6620", email: "", address: "Via del Corso 88, Roma, IT", bankAccount: "", notes: "Supplier, vintage pieces too", sourceType: "own", sourceChannel: null, createdBy: K, createdAt: d(4, 14) },
      { id: C8, name: "Niklas Berg", phone: "+46 70 412 8830", email: "", address: "Strandvägen 7, Stockholm, SE", bankAccount: "", notes: "Supplier, Tudor & Omega", sourceType: "own", sourceChannel: null, createdBy: A, createdAt: d(5, 5) },
    ],
    deals: [
      { id: D1, ref: "D-1001", brand: "Rolex", model: "Daytona", refNo: "116500LN", serial: "R7D43821", stockNo: "ST-0001", dial: "White panda", bracelet: "Oyster steel", year: 2022, cond: "Full set", notes: "White dial", ...NOMAN, fxAtSale: { ...FX },
        sourcedBy: J, soldBy: J, buyPrice: 28500, sellPrice: 33500, ccy: "EUR",
        buyClientId: C1, buyMethod: "Bank transfer", buyMethodRef: "SEPA #4471", sellClientId: C2, sellMethod: "Bank transfer", sellMethodRef: "Inbound wire CH", photoIds: [],
        acctApprovedBy: AC, acctApprovedAt: d(4, 4),
        status: "SOLD", createdBy: J, createdAt: d(4, 3), approvedAt: d(4, 4), soldAt: d(4, 21) },
      { id: uid(), ref: "D-1002", brand: "Patek Philippe", model: "Nautilus", refNo: "5711/1A-010", serial: "6.342.118", stockNo: "ST-0002", dial: "Blue", bracelet: "Steel integrated", year: 2019, cond: "Full set", notes: "", ...NOMAN, fxAtSale: { ...FX },
        sourcedBy: U, soldBy: J, buyPrice: 95000, sellPrice: 104000, ccy: "EUR",
        buyClientId: C3, buyMethod: "Crypto / USDT", buyMethodRef: "TRC20 0x8a4…f21", sellClientId: C2, sellMethod: "Bank transfer", sellMethodRef: "", photoIds: [],
        acctApprovedBy: AC, acctApprovedAt: d(4, 12),
        status: "SOLD", createdBy: U, createdAt: d(4, 12), approvedAt: d(4, 12), soldAt: d(5, 2) },
      { id: uid(), ref: "D-1003", brand: "Audemars Piguet", model: "Royal Oak", refNo: "15500ST", serial: "H 92744", stockNo: "ST-0003", dial: "Blue", bracelet: "Steel", year: 2021, cond: "Watch only", notes: "Blue dial", ...NOMAN, fxAtSale: null,
        sourcedBy: K, soldBy: null, buyPrice: 38000, sellPrice: null, ccy: "EUR",
        buyClientId: C7, buyMethod: "Cash", buyMethodRef: "", sellClientId: null, sellMethod: null, sellMethodRef: null, photoIds: [],
        acctApprovedBy: AC, acctApprovedAt: d(5, 1),
        status: "STOCK", createdBy: K, createdAt: d(5, 1), approvedAt: d(5, 1), soldAt: null },
      { id: uid(), ref: "D-1004", brand: "Richard Mille", model: "RM 011", refNo: "RM011 FM", serial: null, stockNo: "ST-0004", dial: "Skeleton", bracelet: "Rubber", year: 2017, cond: "Full set", notes: "Ti case — serial to be recorded at handover", ...NOMAN, fxAtSale: { ...FX },
        sourcedBy: U, soldBy: null, buyPrice: 145000, sellPrice: 162000, ccy: "USD",
        buyClientId: C3, buyMethod: "Bank transfer", buyMethodRef: "SWIFT AE-2291", sellClientId: null, sellMethod: null, sellMethodRef: null, photoIds: [],
        acctApprovedBy: AC, acctApprovedAt: d(3, 21),
        status: "SOLD", createdBy: U, createdAt: d(3, 20), approvedAt: d(3, 21), soldAt: d(4, 28) },
      { id: D5, ref: "D-1005", brand: "Rolex", model: "GMT-Master II Pepsi", refNo: "126710BLRO", serial: "M2K88410", stockNo: "ST-0005", dial: "Black", bracelet: "Jubilee", year: 2023, cond: "Full set", notes: "", ...NOMAN, fxAtSale: { ...FX },
        sourcedBy: null, soldBy: K, buyPrice: 19500, sellPrice: 22800, ccy: "EUR",
        buyClientId: null, buyMethod: null, buyMethodRef: null, sellClientId: C4, sellMethod: "Bank transfer", sellMethodRef: "FR wire", photoIds: [],
        acctApprovedBy: AC, acctApprovedAt: d(4, 6),
        status: "SOLD", createdBy: K, createdAt: d(4, 6), approvedAt: d(4, 6), soldAt: d(4, 18) },
      { id: uid(), ref: "D-1006", brand: "Cartier", model: "Santos Large", refNo: "WSSA0018", serial: "CRW 71093", stockNo: null, dial: "Silver", bracelet: "Steel QuickSwitch", year: 2024, cond: "Full set", notes: "Sourced from private client", ...NOMAN, fxAtSale: null,
        sourcedBy: J, soldBy: null, buyPrice: 6800, sellPrice: null, ccy: "EUR",
        buyClientId: C1, buyMethod: "Cash", buyMethodRef: "", sellClientId: null, sellMethod: null, sellMethodRef: null, photoIds: [],
        acctApprovedBy: null, acctApprovedAt: null,
        status: "PENDING", createdBy: J, createdAt: d(5, 8), approvedAt: null, soldAt: null },
      { id: uid(), ref: "D-1007", brand: "Omega", model: "Speedmaster Pro", refNo: "310.30.42.50.01.002", serial: "88 552 197", stockNo: "ST-0007", dial: "Black", bracelet: "Steel", year: 2023, cond: "Full set", notes: "Flip, buyer ready", ...NOMAN, fxAtSale: null,
        sourcedBy: K, soldBy: K, buyPrice: 5900, sellPrice: 7200, ccy: "EUR",
        buyClientId: C7, buyMethod: "Cash", buyMethodRef: "", sellClientId: C4, sellMethod: "Bank transfer", sellMethodRef: "", photoIds: [],
        acctApprovedBy: AC, acctApprovedAt: d(5, 9),
        status: "REVIEWED", createdBy: K, createdAt: d(5, 9), approvedAt: null, soldAt: null },
      { id: uid(), ref: "D-1008", brand: "Rolex", model: "Submariner Starbucks", refNo: "126610LV", serial: "T4V90218", stockNo: "ST-0008", dial: "Black", bracelet: "Oyster", year: 2022, cond: "Full set", notes: "", ...NOMAN, fxAtSale: null,
        sourcedBy: J, soldBy: null, buyPrice: 14200, sellPrice: null, ccy: "EUR",
        buyClientId: C1, buyMethod: "Bank transfer", buyMethodRef: "SEPA #4502", sellClientId: null, sellMethod: null, sellMethodRef: null, photoIds: [],
        acctApprovedBy: AC, acctApprovedAt: d(5, 5),
        status: "STOCK", createdBy: J, createdAt: d(5, 4), approvedAt: d(5, 5), soldAt: null },
      { id: uid(), ref: "D-1009", brand: "Vacheron Constantin", model: "Overseas", refNo: "4500V/110A-B128", serial: "1389552", stockNo: "ST-0009", dial: "Blue", bracelet: "Steel integrated", year: 2020, cond: "Full set", notes: "", ...NOMAN, fxAtSale: { ...FX },
        sourcedBy: U, soldBy: U, buyPrice: 24000, sellPrice: 27500, ccy: "CHF",
        buyClientId: C3, buyMethod: "Crypto / USDT", buyMethodRef: "", sellClientId: C5, sellMethod: "Bank transfer", sellMethodRef: "UK CHAPS", photoIds: [],
        acctApprovedBy: AC, acctApprovedAt: d(4, 25),
        status: "SOLD", createdBy: U, createdAt: d(4, 25), approvedAt: d(4, 25), soldAt: d(5, 6) },
      { id: uid(), ref: "D-1010", brand: "Audemars Piguet", model: "Royal Oak Chrono", refNo: "26331ST", serial: null, stockNo: null, dial: "Panda", bracelet: "Steel", year: 2018, cond: "Watch only", notes: "Price too high", ...NOMAN, fxAtSale: null,
        sourcedBy: U, soldBy: null, buyPrice: 41000, sellPrice: null, ccy: "EUR",
        buyClientId: null, buyMethod: null, buyMethodRef: null, sellClientId: null, sellMethod: null, sellMethodRef: null, photoIds: [],
        acctApprovedBy: null, acctApprovedAt: null,
        status: "REJECTED", createdBy: U, createdAt: d(4, 30), approvedAt: null, soldAt: null },
      { id: uid(), ref: "D-1011", brand: "Tudor", model: "Black Bay 58", refNo: "M79030N-0001", serial: "BB58 71422", stockNo: null, dial: "Black", bracelet: "Steel rivet", year: 2023, cond: "Full set", notes: "First deal — sourced in Stockholm", ...NOMAN, fxAtSale: null,
        sourcedBy: A, soldBy: null, buyPrice: 3400, sellPrice: null, ccy: "EUR",
        buyClientId: C8, buyMethod: "Cash", buyMethodRef: "", sellClientId: null, sellMethod: null, sellMethodRef: null, photoIds: [],
        acctApprovedBy: null, acctApprovedAt: null,
        status: "PENDING", createdBy: A, createdAt: d(5, 9), approvedAt: null, soldAt: null },
    ],
    payments: [
      { id: uid(), sellerId: J, type: "COMMISSION", amount: 537.63, ccy: "USD", date: d(4, 23),
        note: "D-1001 · sourcing commission · €500 @ locked FX", allocations: [{ dealId: D1, side: "buy" }], createdAt: d(4, 23) },
      { id: uid(), sellerId: K, type: "COMMISSION", amount: 354.84, ccy: "USD", date: d(4, 20),
        note: "D-1005 · sale commission · €330 @ locked FX", allocations: [{ dealId: D5, side: "sell" }], createdAt: d(4, 20) },
      { id: uid(), sellerId: U, type: "SALARY", amount: 2000, ccy: "EUR", date: d(4, 31),
        salaryMonth: "2026-05", note: "May salary", createdAt: d(4, 31) },
      { id: uid(), sellerId: J, type: "ADVANCE", amount: 1000, ccy: "USD", date: d(5, 1),
        note: "Cash advance ahead of June payouts", createdAt: d(5, 1) },
    ],
  };
}

/* ---------------------------- atoms ---------------------------- */
function useCountUp(target, dur = 1100) {
  const [v, setV] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current, to = target || 0, t0 = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(from + (to - from) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}

const STATUS_META = {
  PENDING: { label: "With accountancy", color: "var(--amber)", bg: "rgba(242,163,60,.12)" },
  REVIEWED: { label: "Acct approved", color: "var(--blue)", bg: "rgba(94,168,255,.12)" },
  STOCK: { label: "In stock", color: "var(--blue)", bg: "rgba(94,168,255,.12)" },
  SOLD: { label: "Sold", color: "var(--green)", bg: "rgba(52,229,155,.12)" },
  REJECTED: { label: "Rejected", color: "var(--red)", bg: "rgba(255,94,108,.12)" },
};

function Badge({ status }) {
  const m = STATUS_META[status] || STATUS_META.PENDING;
  return (
    <span className="mono up" style={{
      fontSize: 10, padding: "4px 9px", borderRadius: 6, fontWeight: 600,
      color: m.color, background: m.bg, border: `1px solid ${m.color}33`, whiteSpace: "nowrap"
    }}>{m.label}</span>
  );
}

function Tile({ label, value, sub, accent, icon: Icon }) {
  return (
    <div className="rise" style={{
      background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12,
      padding: "16px 18px", flex: "1 1 150px", minWidth: 150
    }}>
      <div className="up" style={{ fontSize: 10, color: "var(--mut)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
        {Icon && <Icon size={12} />}{label}
      </div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 700, marginTop: 8, color: accent || "var(--ink)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function CcyLines({ map, dec = 0, color }) {
  const entries = Object.entries(map || {}).filter(([, v]) => Math.abs(v) > 0.004);
  if (!entries.length) return <span className="mono" style={{ color: "var(--dim)" }}>—</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {entries.map(([ccy, v]) => (
        <span key={ccy} className="mono" style={{ color: color || "var(--ink)", fontWeight: 600 }}>{fmtM(v, ccy, dec)}</span>
      ))}
    </div>
  );
}

function PctSlider({ value, onChange, label, max = 30 }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span className="up" style={{ fontSize: 10, color: "var(--mut)", fontWeight: 700 }}>{label}</span>
        <span className="mono" style={{ fontSize: 13, color: "var(--gold)", fontWeight: 700 }}>{value}%</span>
      </div>
      <input type="range" min={0} max={max} step={0.5} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ background: `linear-gradient(90deg, var(--gold) ${pct}%, var(--line) ${pct}%)` }} />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block" }}>
      <div className="up" style={{ fontSize: 10, color: "var(--mut)", fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}

function Btn({ children, onClick, kind = "ghost", small, disabled, style }) {
  const base = {
    ghost: { background: "var(--panel2)", border: "1px solid var(--line2)", color: "var(--ink)" },
    gold: { background: "var(--gold)", border: "1px solid var(--gold)", color: "#0B0C10", fontWeight: 700 },
    green: { background: "rgba(52,229,155,.14)", border: "1px solid rgba(52,229,155,.4)", color: "var(--green)", fontWeight: 600 },
    red: { background: "rgba(255,94,108,.12)", border: "1px solid rgba(255,94,108,.35)", color: "var(--red)", fontWeight: 600 },
  }[kind];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...base, borderRadius: 8, padding: small ? "7px 12px" : "11px 18px",
      fontSize: small ? 12 : 14, display: "inline-flex", alignItems: "center", gap: 7,
      opacity: disabled ? 0.45 : 1, cursor: disabled ? "not-allowed" : "pointer", ...style
    }}>{children}</button>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(4,5,8,.78)", zIndex: 60,
      display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "6vh 14px", overflowY: "auto"
    }} onClick={onClose}>
      <div className="rise" onClick={e => e.stopPropagation()} style={{
        background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 14,
        width: "100%", maxWidth: wide ? 720 : 480, padding: 22
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 className="up" style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".16em" }}>{title}</h3>
          <button onClick={onClose} style={{ color: "var(--mut)" }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

class TabBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.err) this.setState({ err: null }); }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 30, textAlign: "center", color: "var(--red)" }}>
          <div className="up" style={{ fontWeight: 800, marginBottom: 8 }}>Something broke in this tab</div>
          <div className="mono" style={{ fontSize: 12, color: "var(--mut)" }}>{String(this.state.err?.message || this.state.err)}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ---------------------------- login ---------------------------- */
function Login({ store, onLogin }) {
  const [pick, setPick] = useState(null); // {role, sellerId?}
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);

  const tryPin = (full) => {
    const ok = pick.role === "admin"
      ? full === store.settings.adminPin
      : pick.role === "acct"
        ? full === (store.accountants || []).find(a => a.id === pick.acctId)?.pin
        : full === store.sellers.find(s => s.id === pick.sellerId)?.pin;
    if (ok) onLogin(pick);
    else { setErr(true); setPin(""); setTimeout(() => setErr(false), 900); }
  };
  const push = (d) => {
    if (pin.length >= 4) return;
    const next = pin + d; setPin(next);
    if (next.length === 4) setTimeout(() => tryPin(next), 120);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="rise" style={{ textAlign: "center", marginBottom: 34 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <Crown size={26} color="var(--gold)" />
          <h1 className="up" style={{ fontSize: 26, fontWeight: 800, letterSpacing: ".22em" }}>Sales<span style={{ color: "var(--gold)" }}>Desk</span></h1>
        </div>
        <div className="up mono" style={{ fontSize: 10, color: "var(--mut)", marginTop: 8, letterSpacing: ".3em" }}>Close deals · Stack commissions</div>
        <div className="sweepWrap" style={{ width: 180, margin: "16px auto 0" }}><div className="sweepBar" /></div>
      </div>

      {!pick ? (
        <div className="rise" style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center", maxWidth: 640 }}>
          <button onClick={() => setPick({ role: "admin" })} style={{
            background: "var(--panel)", border: "1px solid var(--gold)", borderRadius: 14, padding: "22px 26px",
            width: 170, textAlign: "center"
          }}>
            <Shield size={26} color="var(--gold)" style={{ margin: "0 auto 10px" }} />
            <div className="up" style={{ fontWeight: 800, fontSize: 13 }}>Admin</div>
            <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 4 }}>Full control</div>
          </button>
          {(store.accountants || []).filter(a => a.active !== false).map(a => (
            <button key={a.id} onClick={() => setPick({ role: "acct", acctId: a.id })} style={{
              background: "var(--panel)", border: "1px solid var(--blue)", borderRadius: 14, padding: "22px 26px",
              width: 170, textAlign: "center"
            }}>
              <Calculator size={26} color="var(--blue)" style={{ margin: "0 auto 10px" }} />
              <div className="up" style={{ fontWeight: 800, fontSize: 13 }}>{a.name}</div>
              <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 4 }}>Accountancy</div>
            </button>
          ))}
          {store.sellers.filter(s => s.active).map(s => (
            <button key={s.id} onClick={() => setPick({ role: "seller", sellerId: s.id })} style={{
              background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 14, padding: "22px 26px",
              width: 170, textAlign: "center"
            }}>
              <div className="mono" style={{
                width: 44, height: 44, borderRadius: "50%", background: "var(--panel2)", border: "1px solid var(--line2)",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px",
                color: "var(--gold)", fontWeight: 700
              }}>{s.name.split(" ").map(w => w[0]).join("").slice(0, 2)}</div>
              <div className="up" style={{ fontWeight: 800, fontSize: 13 }}>{s.name}</div>
              <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 4 }}>Seller</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rise" style={{ textAlign: "center" }}>
          <div className="up" style={{ fontSize: 12, color: "var(--mut)", fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
            <Lock size={13} /> PIN — {pick.role === "admin" ? "Admin" : pick.role === "acct" ? (store.accountants || []).find(a => a.id === pick.acctId)?.name : store.sellers.find(s => s.id === pick.sellerId)?.name}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 20 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                width: 14, height: 14, borderRadius: "50%",
                background: i < pin.length ? (err ? "var(--red)" : "var(--gold)") : "var(--line2)",
                transition: "background .15s"
              }} />
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 64px)", gap: 10, justifyContent: "center" }}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k, i) => k === "" ? <div key={i} /> : (
              <button key={i} onClick={() => k === "⌫" ? setPin(pin.slice(0, -1)) : push(k)} className="mono" style={{
                height: 56, borderRadius: 12, background: "var(--panel)", border: "1px solid var(--line2)",
                fontSize: 18, fontWeight: 600
              }}>{k}</button>
            ))}
          </div>
          <button onClick={() => { setPick(null); setPin(""); }} style={{ marginTop: 18, color: "var(--mut)", fontSize: 12 }}>← Back</button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------- clients & photos: shared ---------------------------- */
const METHODS = ["Bank transfer", "Cash", "Crypto / USDT", "Other"];
const EMPTY_CLIENT = { name: "", phone: "", email: "", address: "", bankAccount: "", notes: "", sourceType: "", sourceChannel: "" };
const COMPANY_CHANNELS = ["Instagram", "TikTok", "Website", "Other"];
const trimClient = (c) => {
  const sourceType = (c.sourceType || "").trim();
  return {
    name: (c.name || "").trim(), phone: (c.phone || "").trim(), email: (c.email || "").trim(),
    address: (c.address || "").trim(), bankAccount: (c.bankAccount || "").trim(), notes: (c.notes || "").trim(),
    sourceType: sourceType || null,
    sourceChannel: sourceType === "company" ? ((c.sourceChannel || "").trim() || null) : null
  };
};

function compressImage(file, maxDim = 1400, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(cv.toDataURL("image/jpeg", quality));
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}

function ClientForm({ value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <div style={{ gridColumn: "1 / -1" }}>
        <Field label="Full name *"><input value={value.name} onChange={e => set("name", e.target.value)} placeholder="Client full name" /></Field>
      </div>
      <Field label="Phone"><input className="mono" value={value.phone} onChange={e => set("phone", e.target.value)} placeholder="+39 …" inputMode="tel" /></Field>
      <Field label="Email"><input className="mono" value={value.email} onChange={e => set("email", e.target.value)} placeholder="name@mail.com" inputMode="email" /></Field>
      <div style={{ gridColumn: "1 / -1" }}>
        <Field label="Address *"><input value={value.address} onChange={e => set("address", e.target.value)} placeholder="Street, city, country" /></Field>
      </div>
      <Field label="Lead source *">
        <select value={value.sourceType || ""} onChange={e => onChange({ ...value, sourceType: e.target.value, sourceChannel: e.target.value === "company" ? (value.sourceChannel || "") : "" })}>
          <option value="">Select…</option>
          <option value="company">Our lead — company network</option>
          <option value="own">Seller's own network</option>
        </select>
      </Field>
      {value.sourceType === "company" ? (
        <Field label="Channel *">
          <select value={value.sourceChannel || ""} onChange={e => set("sourceChannel", e.target.value)}>
            <option value="">Select…</option>
            {COMPANY_CHANNELS.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
      ) : <div />}
      <div style={{ gridColumn: "1 / -1" }}>
        <Field label="Bank account (optional)"><input className="mono" value={value.bankAccount} onChange={e => set("bankAccount", e.target.value)} placeholder="IBAN / account details" /></Field>
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <Field label="Notes"><input value={value.notes} onChange={e => set("notes", e.target.value)} placeholder="Anything useful" /></Field>
      </div>
      <div className="mono" style={{ gridColumn: "1 / -1", fontSize: 10, color: "var(--dim)" }}>
        Required: name, address, phone <b>or</b> email, and lead source.
      </div>
    </div>
  );
}

function SideClientSection({ label, hint, clients, clientsById, sel, setSel, form, setForm, method, setMethod, mref, setMref, allowNone, byName }) {
  const picked = sel && sel !== "__new" ? clientsById[sel] : null;
  return (
    <div style={{ background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div className="up" style={{ fontSize: 10, color: "var(--gold)", fontWeight: 800, letterSpacing: ".14em" }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 3 }}>{hint}</div>
      </div>
      <Field label="Client *">
        <select value={sel} onChange={e => setSel(e.target.value)}>
          <option value="">{allowNone ? "House — no client" : "Select client…"}</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}{!clientComplete(c) ? " · incomplete" : ""}{byName ? ` — ${byName(c.createdBy)}` : ""}
            </option>
          ))}
          <option value="__new">＋ New client</option>
        </select>
      </Field>
      {sel === "__new" && <ClientForm value={form} onChange={setForm} />}
      {picked && !clientComplete(picked) && (
        <div className="mono" style={{ fontSize: 11, color: "var(--amber)" }}>
          This client is missing required info — complete it in the Clients tab or fill a new one.
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Payment method *">
          <select value={method} onChange={e => setMethod(e.target.value)}>
            <option value="">Select…</option>
            {METHODS.map(m => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Reference">
          <input className="mono" value={mref} onChange={e => setMref(e.target.value)} placeholder="Wire ref / tx hash / —" />
        </Field>
      </div>
    </div>
  );
}

function PhotoPicker({ photos, setPhotos, max = 6 }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const onPick = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    const next = [...photos];
    for (const file of files) {
      if (next.length >= max) { window.alert(`Max ${max} photos per deal.`); break; }
      try {
        const dataUrl = await compressImage(file);
        next.push({ key: uid(), name: file.name, dataUrl });
      } catch { window.alert(`Couldn't read ${file.name}.`); }
    }
    setPhotos(next);
    setBusy(false);
    if (ref.current) ref.current.value = "";
  };
  return (
    <div>
      <div className="up" style={{ fontSize: 10, color: "var(--mut)", fontWeight: 700, marginBottom: 8 }}>
        Watch photos <span style={{ color: "var(--dim)", textTransform: "none", letterSpacing: 0 }}>({photos.length}/{max}, auto-compressed)</span>
      </div>
      <input ref={ref} type="file" accept="image/*" multiple onChange={onPick} style={{ display: "none" }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {photos.map(p => (
          <div key={p.key} style={{ position: "relative", width: 72, height: 72 }}>
            <img src={p.dataUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8, border: "1px solid var(--line2)" }} />
            <button onClick={() => setPhotos(photos.filter(x => x.key !== p.key))} style={{
              position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%",
              background: "var(--red)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center"
            }}><X size={12} /></button>
          </div>
        ))}
        {photos.length < max && (
          <button onClick={() => ref.current && ref.current.click()} disabled={busy} style={{
            width: 72, height: 72, borderRadius: 8, border: "1px dashed var(--line2)", background: "var(--panel2)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: "var(--mut)"
          }}>
            <Camera size={18} />
            <span className="mono" style={{ fontSize: 9 }}>{busy ? "…" : "Add"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function PhotoStrip({ photoIds }) {
  const [imgs, setImgs] = useState({});
  const [view, setView] = useState(null);
  const loadedRef = useRef({});
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const id of (photoIds || [])) {
        if (loadedRef.current[id]) continue;
        loadedRef.current[id] = true;
        const d = await getPaymentFile(id);
        if (alive && d) setImgs(p => ({ ...p, [id]: d }));
      }
    })();
    return () => { alive = false; };
  }, [photoIds]);
  if (!photoIds || photoIds.length === 0) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {photoIds.map(id => imgs[id] ? (
          <button key={id} onClick={() => setView(imgs[id])} style={{ padding: 0, lineHeight: 0 }}>
            <img src={imgs[id]} alt="watch" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line2)" }} />
          </button>
        ) : (
          <div key={id} className="pulse" style={{ width: 72, height: 72, borderRadius: 8, background: "var(--line)" }} />
        ))}
      </div>
      {view && (
        <div onClick={() => setView(null)} style={{
          position: "fixed", inset: 0, zIndex: 80, background: "rgba(4,5,8,.9)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16
        }}>
          <img src={view} alt="watch" style={{ maxWidth: "94vw", maxHeight: "88vh", borderRadius: 12, border: "1px solid var(--line2)" }} />
        </div>
      )}
    </div>
  );
}

function BlockChip({ line, label }) {
  return (
    <span className="up mono" style={{
      fontSize: 9, fontWeight: 700, padding: "6px 10px", borderRadius: 7, color: "var(--amber)",
      background: "rgba(242,163,60,.1)", border: "1px solid rgba(242,163,60,.3)"
    }}>{label} blocked · missing {line.blockers.join(", ")}</span>
  );
}

/* ---------------------------- deal card ---------------------------- */
function DealCard({ deal, sellersById, clients, payments, rates, viewerSellerId, isAdmin, actions }) {
  const [open, setOpen] = useState(false);
  const involved = isAdmin || deal.sourcedBy === viewerSellerId || deal.soldBy === viewerSellerId;
  const profit = dealProfit(deal);
  const comms = dealCommissions(deal, sellersById, payments, clients, rates);
  const mine = viewerSellerId ? comms.filter(c => c.sellerId === viewerSellerId) : comms;
  const canSeeSide = (side) => isAdmin || (side === "buy" ? deal.sourcedBy === viewerSellerId : deal.soldBy === viewerSellerId);

  return (
    <div className="rise" style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, textAlign: "left"
      }}>
        <Watch size={18} color="var(--gold)" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {deal.brand} {deal.model}
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--mut)", marginTop: 2 }}>
            {deal.refNo || "—"} · {deal.ref}{deal.photoIds && deal.photoIds.length > 0 ? ` · ${deal.photoIds.length} 📷` : ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {involved && mine.length > 0 && (
            <span className="mono" style={{ color: "var(--green)", fontWeight: 700, fontSize: 13 }}>
              +{fmtM(mine.reduce((a, c) => a + (c.usd ?? 0), 0), "USD")}
            </span>
          )}
          <Badge status={deal.status} />
          {open ? <ChevronUp size={16} color="var(--mut)" /> : <ChevronDown size={16} color="var(--mut)" />}
        </div>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid var(--line)", padding: "14px 16px", background: "var(--panel2)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 26px", fontSize: 12, marginBottom: 12 }}>
            <Info k="Serial" v={deal.serial || "— missing"} mono color={deal.serial ? undefined : "var(--amber)"} />
            <Info k="Stock #" v={deal.stockNo || "—"} mono color={deal.stockNo ? undefined : "var(--amber)"} />
            <Info k="Year" v={deal.year || "—"} />
            <Info k="Condition" v={deal.cond || "—"} />
            {deal.dial && <Info k="Dial" v={deal.dial} />}
            {deal.bracelet && <Info k="Bracelet" v={deal.bracelet} />}
            <Info k="Sourced by" v={deal.sourcedBy ? (sellersById[deal.sourcedBy]?.name || "—") : "House"} />
            <Info k="Sold by" v={deal.soldBy ? (sellersById[deal.soldBy]?.name || "—") : (deal.status === "SOLD" ? "House" : "—")} />
            <Info k="Submitted" v={fmtDate(deal.createdAt)} />
            {deal.acctApprovedAt && <Info k="Acct approved" v={fmtDate(deal.acctApprovedAt)} />}
            {deal.soldAt && <Info k="Sold on" v={fmtDate(deal.soldAt)} />}
          </div>

          {involved ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 26px", fontSize: 12, paddingTop: 10, borderTop: "1px dashed var(--line2)" }}>
              <Info k="Buy price" v={fmtM(deal.buyPrice, deal.ccy)} mono />
              <Info k="Sell price" v={fmtM(deal.sellPrice, deal.ccy)} mono />
              <Info k="Profit" v={profit == null ? "—" : fmtM(profit, deal.ccy)} mono
                color={profit == null ? undefined : profit >= 0 ? "var(--green)" : "var(--red)"} />
            </div>
          ) : (
            <div className="mono" style={{ fontSize: 11, color: "var(--dim)", paddingTop: 10, borderTop: "1px dashed var(--line2)" }}>
              Prices hidden — you're not on this deal.
            </div>
          )}

          {/* client blocks per side */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
            {["buy", "sell"].map(side => {
              const cid = side === "buy" ? deal.buyClientId : deal.sellClientId;
              const sid = side === "buy" ? deal.sourcedBy : deal.soldBy;
              if (!cid && !sid) return null;
              if (!canSeeSide(side)) return null;
              const c = clients ? clients[cid] : null;
              const method = side === "buy" ? deal.buyMethod : deal.sellMethod;
              const mref = side === "buy" ? deal.buyMethodRef : deal.sellMethodRef;
              return (
                <div key={side} style={{
                  flex: "1 1 230px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 9, padding: "10px 12px"
                }}>
                  <div className="up" style={{ fontSize: 9, fontWeight: 800, color: "var(--gold)", letterSpacing: ".14em", marginBottom: 6 }}>
                    {side === "buy" ? "Supplier · money out" : "Buyer · money in"}
                  </div>
                  {c ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                      <span style={{ fontWeight: 700 }}>{c.name}{!clientComplete(c) && <span className="mono" style={{ color: "var(--amber)", fontSize: 10 }}> · incomplete</span>}</span>
                      {(c.phone || c.email) && (
                        <span className="mono" style={{ fontSize: 11, color: "var(--mut)" }}>
                          {[c.phone, c.email].filter(Boolean).join(" · ")}
                        </span>
                      )}
                      {c.address && <span style={{ fontSize: 11, color: "var(--mut)" }}>{c.address}</span>}
                      {c.bankAccount && <span className="mono" style={{ fontSize: 10, color: "var(--dim)" }}>{c.bankAccount}</span>}
                    </div>
                  ) : (
                    <div className="mono" style={{ fontSize: 11, color: "var(--amber)" }}>Client missing</div>
                  )}
                  <div className="mono" style={{ fontSize: 10, color: method ? "var(--mut)" : "var(--amber)", marginTop: 6, paddingTop: 6, borderTop: "1px dashed var(--line2)" }}>
                    {method ? `${method}${mref ? ` · ${mref}` : ""}` : "Payment method missing"}
                  </div>
                </div>
              );
            })}
          </div>

          {involved && <PhotoStrip photoIds={deal.photoIds} />}

          {involved && comms.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {comms.filter(c => isAdmin || c.sellerId === viewerSellerId).map((c, i) => (
                <div key={i} style={{
                  background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 12px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 12 }}>
                      {c.side === "buy" ? <ArrowDownRight size={13} color="var(--blue)" style={{ verticalAlign: -2 }} /> : <ArrowUpRight size={13} color="var(--gold)" style={{ verticalAlign: -2 }} />}
                      {" "}{sellersById[c.sellerId]?.name} · {c.side === "buy" ? "Sourcing" : "Sale"} <span className="mono" style={{ color: "var(--gold)" }}>{c.manual ? "fixed" : `${c.pct}%`}</span>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="mono" style={{ fontWeight: 700, color: "var(--green)" }}>
                        {fmtM(c.amount, c.ccy)}
                        {c.usd != null && c.ccy !== "USD" && <span style={{ color: "var(--mut)", fontWeight: 400, fontSize: 11 }}> ≈ {fmtM(c.usd, "USD")}</span>}
                      </span>
                      <span className="up mono" style={{
                        fontSize: 9, fontWeight: 700,
                        color: c.paid ? "var(--green)" : (c.payable ? "var(--amber)" : "var(--red)")
                      }}>
                        {c.paid ? "Paid" : (c.payable ? "Due" : "Blocked")}
                      </span>
                    </span>
                  </div>
                  {!c.paid && !c.payable && (
                    <div className="mono" style={{ fontSize: 10, color: "var(--amber)", marginTop: 5 }}>
                      To unlock payout, add: {c.blockers.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {deal.notes && <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 10 }}>{deal.notes}</div>}
          {actions && <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>{actions}</div>}
        </div>
      )}
    </div>
  );
}
function Info({ k, v, mono, color }) {
  return (
    <div>
      <div className="up" style={{ fontSize: 9, color: "var(--dim)", fontWeight: 700, marginBottom: 2 }}>{k}</div>
      <div className={mono ? "mono" : ""} style={{ fontWeight: 600, color: color || "var(--ink)" }}>{v}</div>
    </div>
  );
}

/* ---------------------------- seller: dashboard ---------------------------- */
function SellerDashboard({ store, seller }) {
  const sellersById = useMemo(() => Object.fromEntries(store.sellers.map(s => [s.id, s])), [store.sellers]);
  const clientsById = useMemo(() => Object.fromEntries((store.clients || []).map(c => [c.id, c])), [store.clients]);
  const rates = store.settings.rates;
  const { earned, unpaid, paid, blocked } = useMemo(
    () => sellerEarnings(seller.id, store.deals, sellersById, store.payments, clientsById, rates), [store.deals, sellersById, seller.id, store.payments, clientsById, rates]);
  const earnedEUR = approxEUR(earned, rates);
  const heroVal = useCountUp(earnedEUR);

  const thisMonth = monthKey(nowISO());
  const monthEUR = sellerMonthEUR(seller.id, thisMonth, store.deals, sellersById, rates, store.payments, clientsById);
  const target = seller.targetEUR || 0;
  const targetPct = target > 0 ? Math.min(100, (monthEUR / target) * 100) : 0;

  const myDeals = store.deals.filter(d => d.sourcedBy === seller.id || d.soldBy === seller.id);
  const soldCount = myDeals.filter(d => d.status === "SOLD").length;
  const flips = myDeals.filter(d => d.status === "SOLD" && d.sourcedBy === seller.id && d.soldBy === seller.id).length;
  const pendingCount = myDeals.filter(d => d.status === "PENDING").length;

  const months = lastMonths(6);
  const monthVals = months.map(m => sellerMonthEUR(seller.id, m, store.deals, sellersById, rates, store.payments, clientsById));
  const maxM = Math.max(1, ...monthVals);


  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* HERO */}
      <div className="rise" style={{
        background: "linear-gradient(160deg, #14110A 0%, var(--panel) 55%)",
        border: "1px solid rgba(233,180,76,.35)", borderRadius: 16, padding: "26px 22px", textAlign: "center",
        boxShadow: "0 0 50px rgba(233,180,76,.07) inset"
      }}>
        <div className="up mono" style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, letterSpacing: ".3em" }}>
          Total commissions earned
        </div>
        <div className="mono heroNum" style={{ fontSize: 46, fontWeight: 700, color: "var(--gold2)", marginTop: 10 }}>
          €{fmtN(heroVal)}
        </div>
        <div className="mono" style={{ fontSize: 10, color: "var(--dim)", marginTop: 6 }}>≈ EUR · manual rates · all time</div>
        <div className="sweepWrap" style={{ width: 220, margin: "16px auto 0" }}><div className="sweepBar" /></div>
        <div style={{ display: "flex", justifyContent: "center", gap: 22, marginTop: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--mut)", display: "flex", gap: 6, alignItems: "center" }}>
            <Flame size={13} color="var(--red)" /> Flips <b className="mono" style={{ color: "var(--ink)" }}>{flips}</b>
          </span>
          <span style={{ fontSize: 12, color: "var(--mut)", display: "flex", gap: 6, alignItems: "center" }}>
            <Zap size={13} color="var(--green)" /> Deals closed <b className="mono" style={{ color: "var(--ink)" }}>{soldCount}</b>
          </span>
        </div>
      </div>

      {/* TARGET */}
      <div className="rise" style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <span className="up" style={{ fontSize: 10, color: "var(--mut)", fontWeight: 700, display: "flex", gap: 6, alignItems: "center" }}>
            <Target size={12} /> Monthly target
          </span>
          <span className="mono" style={{ fontSize: 13 }}>
            <b style={{ color: targetPct >= 100 ? "var(--green)" : "var(--gold)" }}>€{fmtN(monthEUR)}</b>
            <span style={{ color: "var(--dim)" }}> / €{fmtN(target)}</span>
          </span>
        </div>
        <div style={{ height: 10, background: "var(--line)", borderRadius: 5, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${targetPct}%`, borderRadius: 5, transition: "width .8s ease",
            background: targetPct >= 100 ? "var(--green)" : "linear-gradient(90deg, var(--gold), var(--gold2))",
            boxShadow: "0 0 12px rgba(233,180,76,.5)"
          }} />
        </div>
        <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 8 }}>
          {targetPct >= 100 ? "Target smashed. Keep stacking." : `${Math.round(targetPct)}% there — €${fmtN(Math.max(0, target - monthEUR))} to go.`}
        </div>
      </div>

      {/* TILES */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Tile label="Owed to you" value={<CcyLines map={unpaid} color="var(--amber)" />} icon={Clock}
          sub={Object.values(blocked || {}).some(v => v > 0) ? "Part blocked — complete deal data to unlock" : "Sold, not yet paid out"} />
        <Tile label="Paid out" value={<CcyLines map={paid} color="var(--green)" />} icon={Wallet} sub="Already in your pocket" />
        <Tile label="Pending review" value={pendingCount} icon={ListChecks} sub="Waiting for approval" accent="var(--blue)" />
      </div>

      {/* MONTHLY CHART */}
      <div className="rise" style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 18px" }}>
        <div className="up" style={{ fontSize: 10, color: "var(--mut)", fontWeight: 700, marginBottom: 14 }}>
          Commissions — last 6 months <span style={{ color: "var(--dim)", letterSpacing: 0, textTransform: "none" }}>(≈ EUR)</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 110 }}>
          {months.map((m, i) => (
            <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%" }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--mut)" }}>{monthVals[i] > 0 ? `€${fmtN(monthVals[i] / 1000, 1)}k` : ""}</div>
              <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                <div style={{
                  width: "100%", borderRadius: "4px 4px 0 0",
                  height: `${Math.max(monthVals[i] > 0 ? 6 : 2, (monthVals[i] / maxM) * 100)}%`,
                  background: m === thisMonth ? "linear-gradient(180deg, var(--gold2), var(--gold))" : "var(--line2)",
                  boxShadow: m === thisMonth ? "0 0 14px rgba(233,180,76,.4)" : "none",
                  transition: "height .8s ease"
                }} />
              </div>
              <div className="up mono" style={{ fontSize: 9, color: m === thisMonth ? "var(--gold)" : "var(--dim)", fontWeight: 700 }}>{monthLabel(m)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- seller: my deals ---------------------------- */
function MyDeals({ store, seller }) {
  const [filter, setFilter] = useState("ALL");
  const sellersById = useMemo(() => Object.fromEntries(store.sellers.map(s => [s.id, s])), [store.sellers]);
  const clientsById = useMemo(() => Object.fromEntries((store.clients || []).map(c => [c.id, c])), [store.clients]);
  const mine = store.deals
    .filter(d => d.sourcedBy === seller.id || d.soldBy === seller.id || d.createdBy === seller.id)
    .filter(d => filter === "ALL" || d.status === filter)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["ALL", "PENDING", "REVIEWED", "STOCK", "SOLD", "REJECTED"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className="up mono" style={{
            fontSize: 10, fontWeight: 700, padding: "7px 12px", borderRadius: 8,
            background: filter === f ? "var(--gold)" : "var(--panel)",
            color: filter === f ? "#0B0C10" : "var(--mut)",
            border: `1px solid ${filter === f ? "var(--gold)" : "var(--line)"}`
          }}>{f === "ALL" ? "All" : STATUS_META[f].label}</button>
        ))}
      </div>
      {mine.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--dim)", fontSize: 13 }}>
          No deals here yet. Hit <b style={{ color: "var(--gold)" }}>New deal</b> and start earning.
        </div>
      )}
      {mine.map(d => (
        <DealCard key={d.id} deal={d} sellersById={sellersById} clients={clientsById} payments={store.payments} rates={store.settings.rates} viewerSellerId={seller.id} isAdmin={false} />
      ))}
    </div>
  );
}

/* ---------------------------- seller: new deal ---------------------------- */
function NewDeal({ store, seller, save, goMyDeals }) {
  const clientsById = useMemo(() => Object.fromEntries((store.clients || []).map(c => [c.id, c])), [store.clients]);
  const myClients = useMemo(
    () => (store.clients || []).filter(c => c.createdBy === seller.id).sort((a, b) => a.name.localeCompare(b.name)),
    [store.clients, seller.id]);

  const [f, setF] = useState({
    brand: "", model: "", refNo: "", serial: "", stockNo: "", dial: "", bracelet: "", year: "", cond: "Full set", notes: "",
    sourced: true, sold: false, buyPrice: "", sellPrice: "", ccy: "EUR",
    buyClientSel: "", buyClientNew: { ...EMPTY_CLIENT }, buyMethod: "", buyRef: "",
    sellClientSel: "", sellClientNew: { ...EMPTY_CLIENT }, sellMethod: "", sellRef: ""
  });
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const clientOk = (side) => {
    const sel = f[side + "ClientSel"];
    if (sel === "__new") return clientComplete(f[side + "ClientNew"]);
    return !!sel && clientComplete(clientsById[sel]);
  };
  const sideOk = (side) => {
    const active = side === "buy" ? f.sourced : f.sold;
    if (!active) return true;
    return clientOk(side) && !!f[side + "Method"];
  };
  const baseOk = f.brand.trim() && f.model.trim() && (f.sourced || f.sold) &&
    f.buyPrice !== "" && !isNaN(parseFloat(f.buyPrice)) &&
    (!f.sold || (f.sellPrice !== "" && !isNaN(parseFloat(f.sellPrice)))) &&
    (!(f.sold && !f.sourced) || !!f.stockNo.trim());
  const valid = baseOk && sideOk("buy") && sideOk("sell");

  const missing = [];
  if (!baseOk) missing.push("watch & price basics");
  if (f.sold && !f.sourced && !f.stockNo.trim()) missing.push("stock number");
  if (f.sourced && !clientOk("buy")) missing.push("supplier client (name, phone/email, address)");
  if (f.sourced && !f.buyMethod) missing.push("how we paid the supplier");
  if (f.sold && !clientOk("sell")) missing.push("buyer client (name, phone/email, address)");
  if (f.sold && !f.sellMethod) missing.push("how the buyer paid us");

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    let clients = store.clients || [];
    const resolveClient = (side) => {
      const active = side === "buy" ? f.sourced : f.sold;
      if (!active) return null;
      const sel = f[side + "ClientSel"];
      if (sel === "__new") {
        const nc = { id: "c_" + uid(), ...trimClient(f[side + "ClientNew"]), createdBy: seller.id, createdAt: nowISO() };
        clients = [...clients, nc];
        return nc.id;
      }
      return sel;
    };
    const buyClientId = resolveClient("buy");
    const sellClientId = resolveClient("sell");
    const photoIds = [];
    for (const st of photos) {
      const fid = uid();
      if (await savePaymentFile(fid, st.dataUrl)) photoIds.push(fid);
    }
    const nextNum = 1000 + (store.deals.length + 1);
    const deal = {
      id: uid(), ref: `D-${nextNum}`,
      brand: f.brand.trim(), model: f.model.trim(), refNo: f.refNo.trim(),
      serial: f.serial.trim() || null,
      stockNo: f.sold && !f.sourced ? (f.stockNo.trim() || null) : null,
      manualBuyAmt: null, manualBuyCcy: null, manualSellAmt: null, manualSellCcy: null, fxAtSale: null,
      dial: f.dial.trim() || null, bracelet: f.bracelet.trim() || null,
      year: f.year ? parseInt(f.year, 10) : null, cond: f.cond, notes: f.notes.trim(),
      sourcedBy: f.sourced ? seller.id : null,
      soldBy: f.sold ? seller.id : null,
      buyPrice: parseFloat(f.buyPrice),
      sellPrice: f.sold && f.sellPrice !== "" ? parseFloat(f.sellPrice) : null,
      ccy: f.ccy,
      buyClientId, sellClientId,
      buyMethod: f.sourced ? f.buyMethod : null, buyMethodRef: f.sourced ? f.buyRef.trim() : null,
      sellMethod: f.sold ? f.sellMethod : null, sellMethodRef: f.sold ? f.sellRef.trim() : null,
      photoIds,
      status: "PENDING", createdBy: seller.id, createdAt: nowISO(), approvedAt: null, soldAt: null
    };
    save({ ...store, clients, deals: [deal, ...store.deals] });
    setSaving(false);
    setDone(true);
    setTimeout(() => { setDone(false); goMyDeals(); }, 1400);
  };

  if (done) {
    return (
      <div className="rise" style={{ textAlign: "center", padding: "60px 20px" }}>
        <BadgeCheck size={46} color="var(--green)" style={{ margin: "0 auto 14px" }} />
        <div className="up" style={{ fontWeight: 800, fontSize: 16 }}>Deal submitted</div>
        <div style={{ color: "var(--mut)", fontSize: 13, marginTop: 6 }}>Sent to accountancy for first approval — then final sign-off by admin. You'll see it in My Deals.</div>
      </div>
    );
  }

  return (
    <div className="rise" style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="up" style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".16em", display: "flex", gap: 8, alignItems: "center" }}>
        <Plus size={15} color="var(--gold)" /> Submit a deal
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Brand *"><input value={f.brand} onChange={e => set("brand", e.target.value)} placeholder="Rolex" /></Field>
        <Field label="Model *"><input value={f.model} onChange={e => set("model", e.target.value)} placeholder="Daytona" /></Field>
        <Field label="Reference"><input className="mono" value={f.refNo} onChange={e => set("refNo", e.target.value)} placeholder="116500LN" /></Field>
        <Field label="Serial — required for payout">
          <input className="mono" value={f.serial} onChange={e => set("serial", e.target.value)} placeholder="R7D43821" />
        </Field>
        {f.sold && !f.sourced ? (
          <Field label="Stock number *">
            <input className="mono" value={f.stockNo} onChange={e => set("stockNo", e.target.value)} placeholder="ST-0012" />
          </Field>
        ) : f.sourced ? (
          <Field label="Stock number">
            <input className="mono" value="" disabled placeholder="Assigned by accountancy" style={{ opacity: 0.5 }} />
          </Field>
        ) : null}
        <Field label="Dial"><input value={f.dial} onChange={e => set("dial", e.target.value)} placeholder="White panda" /></Field>
        <Field label="Bracelet"><input value={f.bracelet} onChange={e => set("bracelet", e.target.value)} placeholder="Oyster steel" /></Field>
        <Field label="Year"><input className="mono" value={f.year} onChange={e => set("year", e.target.value.replace(/[^0-9]/g, ""))} placeholder="2022" inputMode="numeric" /></Field>
        <Field label="Condition">
          <select value={f.cond} onChange={e => set("cond", e.target.value)}>
            {["Full set", "Box only", "Papers only", "Watch only"].map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      <PhotoPicker photos={photos} setPhotos={setPhotos} />

      <div>
        <div className="up" style={{ fontSize: 10, color: "var(--mut)", fontWeight: 700, marginBottom: 8 }}>Your role on this deal *</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <RoleChip active={f.sourced} onClick={() => set("sourced", !f.sourced)} icon={ArrowDownRight} label="I sourced it" sub="Bought for the company" />
          <RoleChip active={f.sold} onClick={() => set("sold", !f.sold)} icon={ArrowUpRight} label="I sold it" sub="Found the buyer" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Currency">
          <select value={f.ccy} onChange={e => set("ccy", e.target.value)}>
            {CCYS.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <div />
        <Field label={`Buy price (${f.ccy}) *`}>
          <input className="mono" value={f.buyPrice} onChange={e => set("buyPrice", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="28500" inputMode="decimal" />
        </Field>
        <Field label={`Sell price (${f.ccy})${f.sold ? " *" : ""}`}>
          <input className="mono" value={f.sellPrice} onChange={e => set("sellPrice", e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder={f.sold ? "33500" : "If already sold"} inputMode="decimal" disabled={!f.sold} style={{ opacity: f.sold ? 1 : 0.4 }} />
        </Field>
      </div>

      {f.sourced && (
        <SideClientSection
          label="Supplier — who we bought from" hint="Where the money went. Required to submit."
          clients={myClients} clientsById={clientsById}
          sel={f.buyClientSel} setSel={v => set("buyClientSel", v)}
          form={f.buyClientNew} setForm={v => set("buyClientNew", v)}
          method={f.buyMethod} setMethod={v => set("buyMethod", v)}
          mref={f.buyRef} setMref={v => set("buyRef", v)} />
      )}
      {f.sold && (
        <SideClientSection
          label="Buyer — who paid us" hint="Where the money came from. Required to submit."
          clients={myClients} clientsById={clientsById}
          sel={f.sellClientSel} setSel={v => set("sellClientSel", v)}
          form={f.sellClientNew} setForm={v => set("sellClientNew", v)}
          method={f.sellMethod} setMethod={v => set("sellMethod", v)}
          mref={f.sellRef} setMref={v => set("sellRef", v)} />
      )}

      <Field label="Notes"><textarea rows={2} value={f.notes} onChange={e => set("notes", e.target.value)} placeholder="Provenance, buyer info, anything useful…" /></Field>

      <Btn kind="gold" onClick={submit} disabled={!valid || saving} style={{ justifyContent: "center" }}>
        <Check size={16} /> {saving ? "Submitting…" : "Submit for approval"}
      </Btn>
      {!valid && missing.length > 0 && (
        <div className="mono" style={{ fontSize: 11, color: "var(--amber)", textAlign: "center" }}>
          Still needed: {missing.join(" · ")}
        </div>
      )}
      <div style={{ fontSize: 11, color: "var(--dim)", textAlign: "center" }}>
        Commission is calculated on deal profit once the watch is sold. Payout unlocks when serial and client data are complete.
      </div>
    </div>
  );
}
function RoleChip({ active, onClick, icon: Icon, label, sub }) {
  return (
    <button onClick={onClick} style={{
      flex: "1 1 160px", textAlign: "left", padding: "12px 14px", borderRadius: 10,
      background: active ? "rgba(233,180,76,.1)" : "var(--panel2)",
      border: `1px solid ${active ? "var(--gold)" : "var(--line)"}`
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13, color: active ? "var(--gold)" : "var(--ink)" }}>
        <Icon size={14} /> {label}
        {active && <Check size={13} style={{ marginLeft: "auto" }} />}
      </div>
      <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 3 }}>{sub}</div>
    </button>
  );
}

/* ---------------------------- seller: ranking ---------------------------- */
function Ranking({ store, viewerSellerId }) {
  const [scope, setScope] = useState("MONTH");
  const sellersById = useMemo(() => Object.fromEntries(store.sellers.map(s => [s.id, s])), [store.sellers]);
  const clientsById = useMemo(() => Object.fromEntries((store.clients || []).map(c => [c.id, c])), [store.clients]);
  const rates = store.settings.rates;
  const thisMonth = monthKey(nowISO());

  const rows = store.sellers.filter(s => s.active).map(s => {
    const eur = scope === "MONTH"
      ? sellerMonthEUR(s.id, thisMonth, store.deals, sellersById, rates, store.payments, clientsById)
      : approxEUR(sellerEarnings(s.id, store.deals, sellersById, store.payments, clientsById, rates).earned, rates);
    const closed = store.deals.filter(d => d.status === "SOLD" &&
      (d.sourcedBy === s.id || d.soldBy === s.id) &&
      (scope !== "MONTH" || monthKey(d.soldAt) === thisMonth)).length;
    return { s, eur, closed };
  }).sort((a, b) => b.eur - a.eur);
  const max = Math.max(1, ...rows.map(r => r.eur));
  const medal = ["var(--gold)", "#C0C8D6", "#C08A52"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {[["MONTH", "This month"], ["ALL", "All time"]].map(([k, l]) => (
          <button key={k} onClick={() => setScope(k)} className="up mono" style={{
            fontSize: 10, fontWeight: 700, padding: "7px 14px", borderRadius: 8,
            background: scope === k ? "var(--gold)" : "var(--panel)",
            color: scope === k ? "#0B0C10" : "var(--mut)",
            border: `1px solid ${scope === k ? "var(--gold)" : "var(--line)"}`
          }}>{l}</button>
        ))}
      </div>

      <div className="rise" style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: 18 }}>
        <div className="up" style={{ fontSize: 10, color: "var(--mut)", fontWeight: 700, marginBottom: 16, display: "flex", gap: 6, alignItems: "center" }}>
          <Trophy size={13} color="var(--gold)" /> Leaderboard <span style={{ color: "var(--dim)", textTransform: "none", letterSpacing: 0 }}>(≈ EUR, manual rates)</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((r, i) => {
            const me = r.s.id === viewerSellerId;
            return (
              <div key={r.s.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10,
                background: me ? "rgba(233,180,76,.08)" : "var(--panel2)",
                border: `1px solid ${me ? "rgba(233,180,76,.4)" : "var(--line)"}`
              }}>
                <div className="mono" style={{
                  width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13,
                  color: i < 3 ? "#0B0C10" : "var(--mut)",
                  background: i < 3 ? medal[i] : "var(--line)",
                  boxShadow: i === 0 ? "0 0 14px rgba(233,180,76,.5)" : "none"
                }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>
                      {r.s.name} {me && <span className="mono" style={{ fontSize: 10, color: "var(--gold)" }}>· you</span>}
                      {i === 0 && r.eur > 0 && <Flame size={13} color="var(--red)" style={{ verticalAlign: -2, marginLeft: 4 }} />}
                    </span>
                    <span className="mono" style={{ fontWeight: 700, color: i === 0 ? "var(--gold2)" : "var(--ink)", fontSize: 14 }}>€{fmtN(r.eur)}</span>
                  </div>
                  <div style={{ height: 5, background: "var(--line)", borderRadius: 3, marginTop: 7, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${(r.eur / max) * 100}%`, borderRadius: 3, transition: "width .8s ease",
                      background: i === 0 ? "linear-gradient(90deg, var(--gold), var(--gold2))" : i < 3 ? medal[i] : "var(--line2)"
                    }} />
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--dim)", marginTop: 5 }}>{r.closed} deals closed</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- admin: overview ---------------------------- */
function AdminOverview({ store }) {
  const sellersById = useMemo(() => Object.fromEntries(store.sellers.map(s => [s.id, s])), [store.sellers]);
  const clientsById = useMemo(() => Object.fromEntries((store.clients || []).map(c => [c.id, c])), [store.clients]);
  const sold = store.deals.filter(d => d.status === "SOLD");
  const add = (m, c, v) => { m[c] = (m[c] || 0) + v; };
  const volume = {}, profit = {}, owed = {}, paidOut = {};
  for (const d of sold) {
    add(volume, d.ccy, d.sellPrice || 0);
    const p = dealProfit(d); if (p != null) add(profit, d.ccy, p);
    for (const c of dealCommissions(d, sellersById, store.payments, clientsById, store.settings.rates)) add(c.paid ? paidOut : owed, "USD", c.usd ?? 0);
  }
  const pending = store.deals.filter(d => d.status === "PENDING").length;
  const reviewed = store.deals.filter(d => d.status === "REVIEWED").length;
  const stock = store.deals.filter(d => d.status === "STOCK");
  const stockVal = {}; for (const d of stock) add(stockVal, d.ccy, d.buyPrice || 0);
  const thisMonth = monthKey(nowISO());
  const salDue = {};
  let salDueCount = 0;
  for (const s of store.sellers) {
    if (s.active && s.salaryEnabled && !salaryMonthPaid(s.id, thisMonth, store.payments)) {
      add(salDue, s.salaryCcy || "EUR", s.salaryAmount || 0);
      salDueCount++;
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Tile label="Sales volume" value={<CcyLines map={volume} />} icon={TrendingUp} sub={`${sold.length} deals sold`} />
        <Tile label="Gross profit" value={<CcyLines map={profit} color="var(--green)" />} icon={Wallet} />
        <Tile label="Commissions owed" value={<CcyLines map={owed} color="var(--amber)" />} icon={Clock} sub="Unpaid to sellers" />
        <Tile label="Commissions paid" value={<CcyLines map={paidOut} color="var(--green)" />} icon={BadgeCheck} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Tile label="Your final approval" value={reviewed} accent={reviewed > 0 ? "var(--gold)" : "var(--ink)"} icon={ListChecks}
          sub={reviewed > 0 ? "Approved by accountancy" : "All clear"} />
        <Tile label="With accountancy" value={pending} accent={pending > 0 ? "var(--amber)" : "var(--ink)"} icon={Clock}
          sub={pending > 0 ? "Waiting first approval" : "Queue empty"} />
        <Tile label="Salaries due" value={<CcyLines map={salDue} color={salDueCount > 0 ? "var(--amber)" : "var(--green)"} />} icon={Banknote}
          sub={salDueCount > 0 ? `${salDueCount} seller${salDueCount > 1 ? "s" : ""} this month` : "All paid this month"} />
        <Tile label="In stock" value={<CcyLines map={stockVal} color="var(--blue)" />} icon={Watch} sub={`${stock.length} pieces at cost`} />
        <Tile label="Active sellers" value={store.sellers.filter(s => s.active).length} icon={Users} />
      </div>
    </div>
  );
}

/* ---------------------------- admin: deal editor modal ---------------------------- */
function DealEditor({ store, deal, save, onClose, mode, role = "admin", actor }) {
  const clientsAll = useMemo(() => (store.clients || []).slice().sort((a, b) => a.name.localeCompare(b.name)), [store.clients]);
  const clientsById = useMemo(() => Object.fromEntries((store.clients || []).map(c => [c.id, c])), [store.clients]);
  const sellersById = useMemo(() => Object.fromEntries(store.sellers.map(s => [s.id, s])), [store.sellers]);
  const byName = (id) => id === "admin" ? "Admin" : (sellersById[id]?.name || "—");

  const [f, setF] = useState({
    brand: deal.brand, model: deal.model, refNo: deal.refNo || "", year: deal.year || "",
    serial: deal.serial || "", stockNo: deal.stockNo || "", dial: deal.dial || "", bracelet: deal.bracelet || "",
    cond: deal.cond || "Full set", notes: deal.notes || "", ccy: deal.ccy,
    buyPrice: deal.buyPrice == null ? "" : String(deal.buyPrice),
    sellPrice: deal.sellPrice == null ? "" : String(deal.sellPrice),
    sourcedBy: deal.sourcedBy || "", soldBy: deal.soldBy || "",
    ovBuy: deal.overrideBuyPct, ovSell: deal.overrideSellPct,
    buyClientSel: deal.buyClientId || "", buyClientNew: { ...EMPTY_CLIENT },
    sellClientSel: deal.sellClientId || "", sellClientNew: { ...EMPTY_CLIENT },
    buyMethod: deal.buyMethod || "", buyRef: deal.buyMethodRef || "",
    sellMethod: deal.sellMethod || "", sellRef: deal.sellMethodRef || "",
    manualBuyAmt: deal.manualBuyAmt ?? null, manualSellAmt: deal.manualSellAmt ?? null
  });
  const [keepIds, setKeepIds] = useState(deal.photoIds || []);
  const [existingImgs, setExistingImgs] = useState({});
  const [staged, setStaged] = useState([]);
  const [busy, setBusy] = useState(false);
  const loadedRef = useRef({});
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  useEffect(() => {
    let alive = true;
    (async () => {
      for (const id of (deal.photoIds || [])) {
        if (loadedRef.current[id]) continue;
        loadedRef.current[id] = true;
        const d = await getPaymentFile(id);
        if (alive && d) setExistingImgs(p => ({ ...p, [id]: d }));
      }
    })();
    return () => { alive = false; };
  }, [deal.photoIds]);

  const buyP = f.buyPrice === "" ? null : parseFloat(f.buyPrice);
  const sellP = f.sellPrice === "" ? null : parseFloat(f.sellPrice);

  // live preview (incl. inline new clients via temp ids)
  const previewClients = {
    ...clientsById,
    __previewBuy: f.buyClientNew,
    __previewSell: f.sellClientNew
  };
  const previewCid = (sel, tmp) => sel === "__new" ? tmp : (sel || null);
  const preview = {
    ...deal, buyPrice: buyP, sellPrice: sellP,
    sourcedBy: f.sourcedBy || null, soldBy: f.soldBy || null,
    overrideBuyPct: f.ovBuy, overrideSellPct: f.ovSell, ccy: f.ccy, status: "SOLD",
    serial: f.serial.trim() || null,
    manualBuyAmt: f.manualBuyAmt ?? null, manualSellAmt: f.manualSellAmt ?? null,
    manualBuyCcy: f.manualBuyAmt != null ? ((sellersById[f.sourcedBy || ""] || {}).commCcy || "PKR") : null,
    manualSellCcy: f.manualSellAmt != null ? ((sellersById[f.soldBy || ""] || {}).commCcy || "PKR") : null,
    buyClientId: previewCid(f.buyClientSel, "__previewBuy"),
    sellClientId: previewCid(f.sellClientSel, "__previewSell"),
    buyMethod: f.buyMethod || null, sellMethod: f.sellMethod || null
  };
  const previewComms = (buyP != null && sellP != null) ? dealCommissions(preview, sellersById, [], previewClients, store.settings.rates) : [];
  const profit = (buyP != null && sellP != null) ? sellP - buyP : null;

  const finalize = async (statusPatch) => {
    if (busy) return;
    setBusy(true);
    let clients = store.clients || [];
    const resolveClient = (sel, form) => {
      if (sel === "__new") {
        if (!clientComplete(form)) return null;
        const nc = { id: "c_" + uid(), ...trimClient(form), createdBy: "admin", createdAt: nowISO() };
        clients = [...clients, nc];
        return nc.id;
      }
      return sel || null;
    };
    const buyClientId = resolveClient(f.buyClientSel, f.buyClientNew);
    const sellClientId = resolveClient(f.sellClientSel, f.sellClientNew);
    const photoIds = [...keepIds];
    for (const st of staged) {
      const fid = uid();
      if (await savePaymentFile(fid, st.dataUrl)) photoIds.push(fid);
    }
    for (const rid of (deal.photoIds || []).filter(x => !keepIds.includes(x))) deletePaymentFile(rid);
    const d2 = {
      ...deal,
      brand: f.brand.trim(), model: f.model.trim(), refNo: f.refNo.trim(),
      serial: f.serial.trim() || null, stockNo: f.stockNo.trim() || null,
      manualBuyAmt: f.manualBuyAmt ?? null,
      manualBuyCcy: f.manualBuyAmt != null ? ((sellersById[f.sourcedBy || ""] || {}).commCcy || "PKR") : null,
      manualSellAmt: f.manualSellAmt ?? null,
      manualSellCcy: f.manualSellAmt != null ? ((sellersById[f.soldBy || ""] || {}).commCcy || "PKR") : null,
      dial: f.dial.trim() || null, bracelet: f.bracelet.trim() || null,
      year: f.year ? parseInt(f.year, 10) : null, cond: f.cond, notes: f.notes.trim(), ccy: f.ccy,
      buyPrice: buyP, sellPrice: sellP,
      sourcedBy: f.sourcedBy || null, soldBy: f.soldBy || null,
      overrideBuyPct: f.ovBuy ?? null, overrideSellPct: f.ovSell ?? null,
      buyClientId, sellClientId,
      buyMethod: f.buyMethod || null, buyMethodRef: f.buyRef.trim() || null,
      sellMethod: f.sellMethod || null, sellMethodRef: f.sellRef.trim() || null,
      photoIds,
      ...(statusPatch || {})
    };
    save({ ...store, clients, deals: store.deals.map(x => x.id === d2.id ? d2 : x) });
    onClose();
  };

  const canApprove = f.brand.trim() && buyP != null && !isNaN(buyP) && (role !== "acct" || !!f.stockNo.trim());
  const approve = () => {
    if (!canApprove) return;
    if (role === "acct") {
      finalize({ status: "REVIEWED", acctApprovedBy: actor || null, acctApprovedAt: nowISO() });
      return;
    }
    const willBeSold = sellP != null && !isNaN(sellP);
    finalize({
      status: willBeSold ? "SOLD" : "STOCK",
      approvedAt: nowISO(),
      soldAt: willBeSold ? (deal.soldAt || nowISO()) : null,
      fxAtSale: willBeSold ? (deal.fxAtSale || { ...store.settings.rates }) : null
    });
  };
  const reject = () => finalize({ status: "REJECTED" });
  const saveEdits = () => {
    if (role === "acct") { finalize({}); return; }
    const willBeSold = sellP != null && !isNaN(sellP) && deal.status !== "PENDING" && deal.status !== "REJECTED" && deal.status !== "REVIEWED";
    finalize(willBeSold
      ? { status: "SOLD", soldAt: deal.soldAt || nowISO(), fxAtSale: deal.fxAtSale || { ...store.settings.rates } }
      : (deal.status === "SOLD" && sellP == null ? { status: "STOCK", soldAt: null, fxAtSale: null } : {}));
  };

  return (
    <Modal title={mode === "approve" ? `Review ${deal.ref}` : `Edit ${deal.ref}`} onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Brand"><input value={f.brand} onChange={e => set("brand", e.target.value)} /></Field>
          <Field label="Model"><input value={f.model} onChange={e => set("model", e.target.value)} /></Field>
          <Field label="Reference"><input className="mono" value={f.refNo} onChange={e => set("refNo", e.target.value)} /></Field>
          <Field label="Serial — required for payout">
            <input className="mono" value={f.serial} onChange={e => set("serial", e.target.value)}
              style={{ borderColor: f.serial.trim() ? undefined : "rgba(242,163,60,.5)" }} />
          </Field>
          <Field label="Stock number — set by accountancy on purchase">
            <input className="mono" value={f.stockNo} onChange={e => set("stockNo", e.target.value)} placeholder="ST-0012"
              style={{ borderColor: f.stockNo.trim() ? undefined : "rgba(242,163,60,.5)" }} />
          </Field>
          <Field label="Dial"><input value={f.dial} onChange={e => set("dial", e.target.value)} /></Field>
          <Field label="Bracelet"><input value={f.bracelet} onChange={e => set("bracelet", e.target.value)} /></Field>
          <Field label="Year"><input className="mono" value={f.year} onChange={e => set("year", String(e.target.value).replace(/[^0-9]/g, ""))} inputMode="numeric" /></Field>
          <Field label="Condition">
            <select value={f.cond} onChange={e => set("cond", e.target.value)}>
              {["Full set", "Box only", "Papers only", "Watch only"].map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Currency">
            <select value={f.ccy} onChange={e => set("ccy", e.target.value)}>{CCYS.map(c => <option key={c}>{c}</option>)}</select>
          </Field>
          <Field label="Buy price">
            <input className="mono" value={f.buyPrice} onChange={e => set("buyPrice", e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" />
          </Field>
          <Field label="Sell price">
            <input className="mono" value={f.sellPrice} onChange={e => set("sellPrice", e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="Empty = not sold" />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Sourced by">
            <select value={f.sourcedBy} onChange={e => set("sourcedBy", e.target.value)}>
              <option value="">House (no seller)</option>
              {store.sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Sold by">
            <select value={f.soldBy} onChange={e => set("soldBy", e.target.value)}>
              <option value="">House (no seller)</option>
              {store.sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </div>

        <SideClientSection
          label="Supplier — money out" hint="Who we bought from and how we paid them."
          clients={clientsAll} clientsById={clientsById} byName={byName} allowNone
          sel={f.buyClientSel} setSel={v => set("buyClientSel", v)}
          form={f.buyClientNew} setForm={v => set("buyClientNew", v)}
          method={f.buyMethod} setMethod={v => set("buyMethod", v)}
          mref={f.buyRef} setMref={v => set("buyRef", v)} />
        <SideClientSection
          label="Buyer — money in" hint="Who bought it and how they paid us."
          clients={clientsAll} clientsById={clientsById} byName={byName} allowNone
          sel={f.sellClientSel} setSel={v => set("sellClientSel", v)}
          form={f.sellClientNew} setForm={v => set("sellClientNew", v)}
          method={f.sellMethod} setMethod={v => set("sellMethod", v)}
          mref={f.sellRef} setMref={v => set("sellRef", v)} />

        {/* photos */}
        <div style={{ background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
          {keepIds.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: staged.length || keepIds.length < 6 ? 10 : 0 }}>
              {keepIds.map(id => (
                <div key={id} style={{ position: "relative", width: 72, height: 72 }}>
                  {existingImgs[id]
                    ? <img src={existingImgs[id]} alt="watch" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8, border: "1px solid var(--line2)" }} />
                    : <div className="pulse" style={{ width: "100%", height: "100%", borderRadius: 8, background: "var(--line)" }} />}
                  <button onClick={() => setKeepIds(keepIds.filter(x => x !== id))} style={{
                    position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%",
                    background: "var(--red)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center"
                  }}><X size={12} /></button>
                </div>
              ))}
            </div>
          )}
          <PhotoPicker photos={staged} setPhotos={setStaged} max={Math.max(0, 6 - keepIds.length)} />
        </div>

        {/* overrides — admin only */}
        {role === "admin" && (
        <div style={{ background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
          <div className="up" style={{ fontSize: 10, color: "var(--mut)", fontWeight: 700, marginBottom: 12 }}>
            Commission overrides — this deal only
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {sellersById[f.sourcedBy]?.commMode === "manual" ? (
              <ManualCommRow label="Sourcing — fixed amount" seller={sellersById[f.sourcedBy]}
                amt={f.manualBuyAmt} setAmt={v => set("manualBuyAmt", v)} />
            ) : (
              <OverrideRow label="Sourcing %" enabled={f.ovBuy != null}
                defPct={f.sourcedBy ? (sellersById[f.sourcedBy]?.buyPct ?? 10) : null}
                value={f.ovBuy} onToggle={(on) => set("ovBuy", on ? (f.sourcedBy ? (sellersById[f.sourcedBy]?.buyPct ?? 10) : 10) : null)}
                onChange={v => set("ovBuy", v)} />
            )}
            {sellersById[f.soldBy]?.commMode === "manual" ? (
              <ManualCommRow label="Sale — fixed amount" seller={sellersById[f.soldBy]}
                amt={f.manualSellAmt} setAmt={v => set("manualSellAmt", v)} />
            ) : (
              <OverrideRow label="Sale %" enabled={f.ovSell != null}
                defPct={f.soldBy ? (sellersById[f.soldBy]?.sellPct ?? 10) : null}
                value={f.ovSell} onToggle={(on) => set("ovSell", on ? (f.soldBy ? (sellersById[f.soldBy]?.sellPct ?? 10) : 10) : null)}
                onChange={v => set("ovSell", v)} />
            )}
          </div>
        </div>
        )}

        {/* live preview */}
        <div style={{ background: "rgba(233,180,76,.06)", border: "1px solid rgba(233,180,76,.25)", borderRadius: 10, padding: 14 }}>
          <div className="up" style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, marginBottom: 8 }}>Live preview</div>
          {profit == null ? (
            <div style={{ fontSize: 12, color: "var(--mut)" }}>Enter both prices to preview profit and commissions.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--mut)" }}>Profit</span>
                <span className="mono" style={{ fontWeight: 700, color: profit >= 0 ? "var(--green)" : "var(--red)" }}>{fmtM(profit, f.ccy)}</span>
              </div>
              {previewComms.map((c, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--mut)" }}>{sellersById[c.sellerId]?.name} · {c.side === "buy" ? "sourcing" : "sale"} {c.manual ? "fixed" : `${c.pct}%`}</span>
                    <span className="mono" style={{ fontWeight: 700, color: c.payable ? "var(--gold)" : "var(--amber)" }}>
                      {fmtM(c.amount, c.ccy)}{c.usd != null && c.ccy !== "USD" ? ` ≈ ${fmtM(c.usd, "USD")}` : ""}
                    </span>
                  </div>
                  {!c.payable && (
                    <div className="mono" style={{ fontSize: 10, color: "var(--amber)", marginTop: 2 }}>
                      Payout blocked — missing {c.blockers.join(", ")}
                    </div>
                  )}
                </div>
              ))}
              {previewComms.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed rgba(233,180,76,.3)", paddingTop: 6 }}>
                  <span style={{ color: "var(--mut)" }}>Net to house · USD at locked FX</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{(() => {
                    const R = deal.fxAtSale || store.settings.rates || {};
                    const pUsd = (R[f.ccy] != null && R.USD) ? profit * R[f.ccy] / R.USD : 0;
                    return fmtM(pUsd - previewComms.reduce((a, c) => a + (c.usd ?? 0), 0), "USD");
                  })()}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <Field label="Notes"><textarea rows={2} value={f.notes} onChange={e => set("notes", e.target.value)} /></Field>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {mode === "approve" ? (
            <>
              <Btn kind="green" onClick={approve} disabled={!canApprove || busy} style={{ flex: 1, justifyContent: "center" }}><Check size={15} /> {busy ? "Saving…" : (role === "acct" ? "Approve — accountancy" : "Final approve")}</Btn>
              <Btn kind="red" onClick={reject} disabled={busy} style={{ flex: 1, justifyContent: "center" }}><Ban size={15} /> Reject</Btn>
            </>
          ) : (
            <Btn kind="gold" onClick={saveEdits} disabled={busy} style={{ flex: 1, justifyContent: "center" }}><Check size={15} /> {busy ? "Saving…" : "Save changes"}</Btn>
          )}
        </div>
      </div>
    </Modal>
  );
}
function OverrideRow({ label, enabled, value, defPct, onToggle, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <button onClick={() => onToggle(!enabled)} className="up mono" style={{
        fontSize: 9, fontWeight: 700, padding: "6px 10px", borderRadius: 7, flexShrink: 0, width: 96,
        background: enabled ? "var(--gold)" : "var(--panel)",
        color: enabled ? "#0B0C10" : "var(--mut)",
        border: `1px solid ${enabled ? "var(--gold)" : "var(--line2)"}`
      }}>{enabled ? "Override on" : "Default"}</button>
      {enabled ? (
        <PctSlider label={label} value={value ?? 10} onChange={onChange} />
      ) : (
        <div style={{ flex: 1, fontSize: 12, color: "var(--dim)" }}>
          {label} — seller default{defPct != null ? <span className="mono" style={{ color: "var(--mut)" }}> ({defPct}%)</span> : ""}
        </div>
      )}
    </div>
  );
}

/* ---------------------------- admin: approvals + deals ---------------------------- */
function AdminApprovals({ store, save }) {
  const [edit, setEdit] = useState(null);
  const sellersById = useMemo(() => Object.fromEntries(store.sellers.map(s => [s.id, s])), [store.sellers]);
  const clientsById = useMemo(() => Object.fromEntries((store.clients || []).map(c => [c.id, c])), [store.clients]);
  const acctsById = useMemo(() => Object.fromEntries((store.accountants || []).map(a => [a.id, a])), [store.accountants]);
  const reviewed = store.deals.filter(d => d.status === "REVIEWED")
    .sort((a, b) => (a.acctApprovedAt || "").localeCompare(b.acctApprovedAt || ""));
  const pending = store.deals.filter(d => d.status === "PENDING")
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {reviewed.length === 0 && pending.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--dim)", fontSize: 13 }}>
          <BadgeCheck size={30} color="var(--green)" style={{ margin: "0 auto 10px" }} />
          Queue is clear. Nothing to approve.
        </div>
      )}

      {reviewed.length > 0 && (
        <>
          <div className="up" style={{ fontSize: 10, color: "var(--gold)", fontWeight: 800, letterSpacing: ".14em", display: "flex", gap: 6, alignItems: "center" }}>
            <BadgeCheck size={13} /> Approved by accountancy — your final sign-off
          </div>
          {reviewed.map(d => (
            <DealCard key={d.id} deal={d} sellersById={sellersById} clients={clientsById} payments={store.payments} rates={store.settings.rates} viewerSellerId={null} isAdmin
              actions={<>
                <span className="up mono" style={{
                  fontSize: 9, fontWeight: 700, padding: "6px 10px", borderRadius: 7, color: "var(--blue)",
                  background: "rgba(94,168,255,.1)", border: "1px solid rgba(94,168,255,.3)"
                }}>Acct approved · {acctsById[d.acctApprovedBy]?.name || "Accounting"} · {fmtDate(d.acctApprovedAt)}</span>
                <Btn kind="green" small onClick={() => setEdit(d)}><Check size={13} /> Final review & approve</Btn>
              </>} />
          ))}
        </>
      )}

      {pending.length > 0 && (
        <>
          <div className="up" style={{ fontSize: 10, color: "var(--mut)", fontWeight: 800, letterSpacing: ".14em", marginTop: reviewed.length > 0 ? 10 : 0, display: "flex", gap: 6, alignItems: "center" }}>
            <Clock size={13} /> With accountancy — waiting first approval
          </div>
          {pending.map(d => (
            <DealCard key={d.id} deal={d} sellersById={sellersById} clients={clientsById} payments={store.payments} rates={store.settings.rates} viewerSellerId={null} isAdmin
              actions={<Btn small onClick={() => setEdit(d)}><Check size={13} /> Review anyway</Btn>} />
          ))}
        </>
      )}

      {edit && <DealEditor store={store} deal={edit} save={save} onClose={() => setEdit(null)} mode="approve" role="admin" />}
    </div>
  );
}

function AdminDeals({ store, save }) {
  const [filter, setFilter] = useState("ALL");
  const [edit, setEdit] = useState(null);
  const sellersById = useMemo(() => Object.fromEntries(store.sellers.map(s => [s.id, s])), [store.sellers]);
  const clientsById = useMemo(() => Object.fromEntries((store.clients || []).map(c => [c.id, c])), [store.clients]);
  const deals = store.deals
    .filter(d => filter === "ALL" || d.status === filter)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const remove = (id) => {
    if (!window.confirm("Delete this deal permanently?")) return;
    const dd = store.deals.find(x => x.id === id);
    if (dd) for (const pid of (dd.photoIds || [])) deletePaymentFile(pid);
    save({
      ...store,
      deals: store.deals.filter(x => x.id !== id),
      payments: store.payments.map(p => ({ ...p, allocations: (p.allocations || []).filter(a => a.dealId !== id) }))
    });
  };
  const paySide = (d, c) => {
    const pay = {
      id: uid(), sellerId: c.sellerId, type: "COMMISSION", amount: c.usd ?? 0, ccy: "USD",
      date: nowISO(), note: `${d.ref} · ${c.side === "buy" ? "sourcing" : "sale"} commission · ${fmtM(c.amount, c.ccy)} @ locked FX`,
      allocations: [{ dealId: d.id, side: c.side }], createdAt: nowISO()
    };
    save({ ...store, payments: [pay, ...store.payments] });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["ALL", "PENDING", "REVIEWED", "STOCK", "SOLD", "REJECTED"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className="up mono" style={{
            fontSize: 10, fontWeight: 700, padding: "7px 12px", borderRadius: 8,
            background: filter === f ? "var(--gold)" : "var(--panel)",
            color: filter === f ? "#0B0C10" : "var(--mut)",
            border: `1px solid ${filter === f ? "var(--gold)" : "var(--line)"}`
          }}>{f === "ALL" ? "All" : STATUS_META[f].label}</button>
        ))}
      </div>
      {deals.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "var(--dim)", fontSize: 13 }}>No deals in this filter.</div>}
      {deals.map(d => {
        const comms = dealCommissions(d, sellersById, store.payments, clientsById, store.settings.rates);
        const unpaidBuy = comms.find(c => c.side === "buy" && !c.paid);
        const unpaidSell = comms.find(c => c.side === "sell" && !c.paid);
        return (
          <DealCard key={d.id} deal={d} sellersById={sellersById} clients={clientsById} payments={store.payments} rates={store.settings.rates} viewerSellerId={null} isAdmin
            actions={<>
              <Btn small onClick={() => setEdit(d)}><Pencil size={13} /> Edit{d.status === "STOCK" ? " / mark sold" : ""}</Btn>
              {unpaidBuy && (unpaidBuy.payable
                ? <Btn kind="green" small onClick={() => paySide(d, unpaidBuy)}>
                    <Wallet size={13} /> Pay sourcing {fmtM(unpaidBuy.usd ?? 0, "USD")} → {sellersById[unpaidBuy.sellerId]?.name?.split(" ")[0]}
                  </Btn>
                : <BlockChip line={unpaidBuy} label="Sourcing" />)}
              {unpaidSell && (unpaidSell.payable
                ? <Btn kind="green" small onClick={() => paySide(d, unpaidSell)}>
                    <Wallet size={13} /> Pay sale {fmtM(unpaidSell.usd ?? 0, "USD")} → {sellersById[unpaidSell.sellerId]?.name?.split(" ")[0]}
                  </Btn>
                : <BlockChip line={unpaidSell} label="Sale" />)}
              <Btn kind="red" small onClick={() => remove(d.id)}><Trash2 size={13} /> Delete</Btn>
            </>} />
        );
      })}
      {edit && <DealEditor store={store} deal={edit} save={save} onClose={() => setEdit(null)} mode="edit" />}
    </div>
  );
}

/* ---------------------------- admin: team ---------------------------- */
function AdminTeam({ store, save }) {
  const [adding, setAdding] = useState(false);
  const [nf, setNf] = useState({ name: "", pin: "" });
  const [af, setAf] = useState({ name: "", pin: "" });
  const sellersById = useMemo(() => Object.fromEntries(store.sellers.map(s => [s.id, s])), [store.sellers]);
  const clientsById = useMemo(() => Object.fromEntries((store.clients || []).map(c => [c.id, c])), [store.clients]);
  const rates = store.settings.rates;

  const updateSeller = (id, patch) =>
    save({ ...store, sellers: store.sellers.map(s => s.id === id ? { ...s, ...patch } : s) });
  const addSeller = () => {
    if (!nf.name.trim() || nf.pin.length !== 4) return;
    save({
      ...store, sellers: [...store.sellers, {
        id: "s_" + uid(), name: nf.name.trim(), pin: nf.pin,
        buyPct: 10, sellPct: 10, commMode: "pct", commCcy: null, targetEUR: 5000, active: true, joinedAt: nowISO()
      }]
    });
    setNf({ name: "", pin: "" }); setAdding(false);
  };
  const updateAcct = (id, patch) =>
    save({ ...store, accountants: (store.accountants || []).map(a => a.id === id ? { ...a, ...patch } : a) });
  const addAcct = () => {
    if (!af.name.trim() || af.pin.length !== 4) return;
    save({ ...store, accountants: [...(store.accountants || []), { id: "ac_" + uid(), name: af.name.trim(), pin: af.pin, active: true }] });
    setAf({ name: "", pin: "" });
  };
  const delAcct = (a) => {
    if (!window.confirm(`Remove accountant ${a.name}?`)) return;
    save({ ...store, accountants: store.accountants.filter(x => x.id !== a.id) });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Btn kind="gold" onClick={() => setAdding(true)} style={{ alignSelf: "flex-start" }}><Plus size={15} /> Add seller</Btn>

      {store.sellers.map(s => {
        const e = sellerEarnings(s.id, store.deals, sellersById, store.payments, clientsById, rates);
        return (
          <div key={s.id} className="rise" style={{
            background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: 18,
            opacity: s.active ? 1 : 0.55
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{s.name} {!s.active && <span className="up mono" style={{ fontSize: 9, color: "var(--red)" }}>· inactive</span>}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>
                  Earned ≈ €{fmtN(approxEUR(e.earned, rates))} · owed ≈ €{fmtN(approxEUR(e.unpaid, rates))}
                </div>
              </div>
              <Btn small kind={s.active ? "red" : "green"} onClick={() => updateSeller(s.id, { active: !s.active })}>
                {s.active ? <><Ban size={12} /> Deactivate</> : <><Check size={12} /> Reactivate</>}
              </Btn>
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 220px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["pct", "% of profit"], ["manual", "Fixed amounts"]].map(([k, lbl]) => (
                    <button key={k} onClick={() => updateSeller(s.id, { commMode: k })} className="up mono" style={{
                      flex: 1, fontSize: 9, fontWeight: 700, padding: "8px 10px", borderRadius: 7,
                      background: (s.commMode || "pct") === k ? "rgba(233,180,76,.12)" : "var(--panel2)",
                      color: (s.commMode || "pct") === k ? "var(--gold)" : "var(--mut)",
                      border: `1px solid ${(s.commMode || "pct") === k ? "var(--gold)" : "var(--line)"}`
                    }}>{lbl}</button>
                  ))}
                </div>
                {(s.commMode || "pct") === "manual" ? (
                  <>
                    <Field label="Commission currency">
                      <select value={s.commCcy || "PKR"} onChange={e2 => updateSeller(s.id, { commCcy: e2.target.value })}>
                        {CCYS.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </Field>
                    <div className="mono" style={{ fontSize: 10, color: "var(--dim)" }}>
                      No percentages — you set the exact amount in {s.commCcy || "PKR"} on each deal (Deals → Edit). Paid out in USD at the FX locked at sale.
                    </div>
                  </>
                ) : (
                  <>
                    <PctSlider label="Sourcing commission" value={s.buyPct} onChange={v => updateSeller(s.id, { buyPct: v })} />
                    <PctSlider label="Sale commission" value={s.sellPct} onChange={v => updateSeller(s.id, { sellPct: v })} />
                    <div className="mono" style={{ fontSize: 10, color: "var(--dim)" }}>
                      Flip (both sides) pays {s.buyPct + s.sellPct}% of profit · paid in USD at locked FX
                    </div>
                  </>
                )}
              </div>
              <div style={{ flex: "1 1 180px", display: "flex", flexDirection: "column", gap: 12 }}>
                <Field label="Monthly target (≈ EUR)">
                  <input className="mono" value={s.targetEUR} onChange={e2 => updateSeller(s.id, { targetEUR: parseFloat(e2.target.value.replace(/[^0-9.]/g, "")) || 0 })} inputMode="decimal" />
                </Field>
                <Field label="PIN">
                  <input className="mono" maxLength={4} value={s.pin}
                    onChange={e2 => updateSeller(s.id, { pin: e2.target.value.replace(/[^0-9]/g, "").slice(0, 4) })} />
                </Field>
                <div>
                  <div className="up" style={{ fontSize: 10, color: "var(--mut)", fontWeight: 700, marginBottom: 6 }}>Fixed salary</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button onClick={() => updateSeller(s.id, { salaryEnabled: !s.salaryEnabled })} className="up mono" style={{
                      fontSize: 9, fontWeight: 700, padding: "9px 12px", borderRadius: 7, flexShrink: 0,
                      background: s.salaryEnabled ? "var(--gold)" : "var(--panel2)",
                      color: s.salaryEnabled ? "#0B0C10" : "var(--mut)",
                      border: `1px solid ${s.salaryEnabled ? "var(--gold)" : "var(--line2)"}`
                    }}>{s.salaryEnabled ? "On" : "Off"}</button>
                    {s.salaryEnabled && (
                      <>
                        <input className="mono" value={s.salaryAmount ?? 0} inputMode="decimal" style={{ flex: 1, minWidth: 70 }}
                          onChange={e2 => updateSeller(s.id, { salaryAmount: parseFloat(e2.target.value.replace(/[^0-9.]/g, "")) || 0 })} />
                        <select value={s.salaryCcy || "EUR"} style={{ width: 86 }}
                          onChange={e2 => updateSeller(s.id, { salaryCcy: e2.target.value })}>
                          {CCYS.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </>
                    )}
                  </div>
                  {s.salaryEnabled && <div className="mono" style={{ fontSize: 10, color: "var(--dim)", marginTop: 6 }}>per month · record payouts in the Payments tab</div>}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="rise" style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: 18 }}>
        <div className="up" style={{ fontSize: 10, color: "var(--mut)", fontWeight: 700, marginBottom: 4, display: "flex", gap: 6, alignItems: "center" }}>
          <Calculator size={13} color="var(--blue)" /> Accountancy team
        </div>
        <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 12 }}>
          They give the first approval on submitted deals — final sign-off stays with you, and only fully approved deals can be paid.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(store.accountants || []).map(a => (
            <div key={a.id} style={{
              display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 12px",
              background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 9,
              opacity: a.active !== false ? 1 : 0.55
            }}>
              <input value={a.name} onChange={e => updateAcct(a.id, { name: e.target.value })} style={{ flex: "1 1 140px" }} />
              <input className="mono" maxLength={4} value={a.pin} style={{ width: 80 }}
                onChange={e => updateAcct(a.id, { pin: e.target.value.replace(/[^0-9]/g, "").slice(0, 4) })} />
              <Btn small onClick={() => updateAcct(a.id, { active: a.active === false })}>{a.active !== false ? "Active" : "Off"}</Btn>
              <button onClick={() => delAcct(a)} style={{ color: "var(--red)" }} aria-label="Remove accountant"><Trash2 size={14} /></button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input value={af.name} onChange={e => setAf({ ...af, name: e.target.value })} placeholder="Name" style={{ flex: "1 1 140px" }} />
            <input className="mono" maxLength={4} value={af.pin} placeholder="PIN" style={{ width: 80 }}
              onChange={e => setAf({ ...af, pin: e.target.value.replace(/[^0-9]/g, "").slice(0, 4) })} inputMode="numeric" />
            <Btn kind="gold" small onClick={addAcct} disabled={!af.name.trim() || af.pin.length !== 4}><Plus size={12} /> Add</Btn>
          </div>
        </div>
      </div>

      {adding && (
        <Modal title="Add seller" onClose={() => setAdding(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Name"><input value={nf.name} onChange={e => setNf({ ...nf, name: e.target.value })} placeholder="Full name" /></Field>
            <Field label="PIN (4 digits)">
              <input className="mono" maxLength={4} value={nf.pin}
                onChange={e => setNf({ ...nf, pin: e.target.value.replace(/[^0-9]/g, "").slice(0, 4) })} placeholder="0000" inputMode="numeric" />
            </Field>
            <Btn kind="gold" onClick={addSeller} disabled={!nf.name.trim() || nf.pin.length !== 4} style={{ justifyContent: "center" }}>
              <Check size={15} /> Create seller
            </Btn>
            <div style={{ fontSize: 11, color: "var(--dim)" }}>New sellers start at 10% / 10%. Tune the sliders after creation.</div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------------------------- admin: settings ---------------------------- */
function AdminSettings({ store, save }) {
  const [pin, setPin] = useState(store.settings.adminPin);
  const [rates, setRates] = useState(store.settings.rates);
  const setRate = (ccy, v) => setRates(p => ({ ...p, [ccy]: v }));
  const commit = () => {
    const clean = {};
    for (const c of CCYS) clean[c] = Math.max(0, parseFloat(rates[c]) || 0);
    clean.EUR = 1;
    save({ ...store, settings: { ...store.settings, adminPin: pin.length === 4 ? pin : store.settings.adminPin, rates: clean } });
  };
  const resetData = async () => {
    if (!window.confirm("Reset ALL data to demo seed? This cannot be undone.")) return;
    const fresh = seedStore();
    await saveStore(fresh);
    window.location.reload();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
      <div className="rise" style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: 18 }}>
        <div className="up" style={{ fontSize: 11, fontWeight: 800, marginBottom: 14 }}>Security & visibility</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 140px" }}>
            <Field label="Admin PIN">
              <input className="mono" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} />
            </Field>
          </div>
          <div className="mono" style={{ fontSize: 10, color: "var(--dim)", flex: "1 1 160px" }}>
            Ranking is admin-only — sellers never see each other's numbers or deals.
          </div>
        </div>
      </div>

      <div className="rise" style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: 18 }}>
        <div className="up" style={{ fontSize: 11, fontWeight: 800, marginBottom: 6 }}>FX rates → EUR (manual)</div>
        <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 14 }}>
          Targets and charts use ≈EUR. Commissions are always paid in USD at the FX locked when each deal is sold.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
          {CCYS.map(c => (
            <Field key={c} label={`1 ${c} =`}>
              <input className="mono" value={rates[c]} disabled={c === "EUR"}
                onChange={e => setRate(c, e.target.value.replace(/[^0-9.]/g, ""))}
                style={{ opacity: c === "EUR" ? 0.5 : 1 }} />
            </Field>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Btn kind="gold" onClick={commit} style={{ flex: 1, justifyContent: "center" }}><Check size={15} /> Save settings</Btn>
        <Btn kind="red" onClick={resetData}><Database size={14} /> Reset demo data</Btn>
      </div>
    </div>
  );
}

/* ---------------------------- payments ---------------------------- */
function ManualCommRow({ label, seller, amt, setAmt }) {
  const ccy = (seller && seller.commCcy) || "PKR";
  return (
    <div>
      <div className="up" style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, marginBottom: 6 }}>
        {label} · {seller?.name} · {ccy}
      </div>
      <input className="mono" inputMode="decimal" value={amt == null ? "" : String(amt)} placeholder={`Amount in ${ccy} — you decide`}
        onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ""); setAmt(v === "" ? null : parseFloat(v)); }} />
      <div className="mono" style={{ fontSize: 10, color: "var(--dim)", marginTop: 4 }}>Paid in USD at the FX locked at sale.</div>
    </div>
  );
}

const TYPE_META = {
  COMMISSION: { label: "Commission", color: "var(--gold)", bg: "rgba(233,180,76,.12)" },
  SALARY: { label: "Salary", color: "var(--blue)", bg: "rgba(94,168,255,.12)" },
  BONUS: { label: "Bonus", color: "var(--green)", bg: "rgba(52,229,155,.12)" },
  ADVANCE: { label: "Advance", color: "var(--amber)", bg: "rgba(242,163,60,.12)" },
  ADVANCE_RECOVERY: { label: "Advance settled", color: "var(--mut)", bg: "rgba(154,160,176,.1)" },
};
const monthFull = (key) => {
  const [y, m] = (key || "").split("-").map(Number);
  if (!y || !m) return key || "—";
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
};
function TypeChip({ type }) {
  const m = TYPE_META[type] || TYPE_META.BONUS;
  return (
    <span className="up mono" style={{
      fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
      color: m.color, background: m.bg, border: `1px solid ${m.color}33`, whiteSpace: "nowrap"
    }}>{m.label}</span>
  );
}

function ProofLink({ payment }) {
  const [busy, setBusy] = useState(false);
  if (!payment.fileId) return null;
  const open = async () => {
    if (busy) return;
    setBusy(true);
    const data = await getPaymentFile(payment.fileId);
    setBusy(false);
    if (!data) { window.alert("Proof file not found in storage."); return; }
    const a = document.createElement("a");
    a.href = data;
    a.download = payment.fileName || "payment-proof";
    document.body.appendChild(a); a.click(); a.remove();
  };
  return (
    <button onClick={open} className="up mono" style={{
      display: "inline-flex", alignItems: "center", gap: 5, fontSize: 9, fontWeight: 700,
      padding: "5px 9px", borderRadius: 6, color: "var(--gold)",
      background: "rgba(233,180,76,.1)", border: "1px solid rgba(233,180,76,.3)"
    }}><Paperclip size={11} /> {busy ? "…" : "Proof"}</button>
  );
}

function FilePick({ file, setFile }) {
  const ref = useRef(null);
  const onPick = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 3.5 * 1024 * 1024) {
      window.alert("File too large — max 3.5 MB. Use a photo or a compressed PDF.");
      e.target.value = "";
      return;
    }
    const r = new FileReader();
    r.onload = () => setFile({ name: f.name, type: f.type, dataUrl: r.result });
    r.readAsDataURL(f);
  };
  return (
    <div>
      <div className="up" style={{ fontSize: 10, color: "var(--mut)", fontWeight: 700, marginBottom: 6 }}>Payment proof (optional)</div>
      <input ref={ref} type="file" accept="image/*,application/pdf" onChange={onPick} style={{ display: "none" }} />
      {file ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 12px" }}>
          <Paperclip size={14} color="var(--gold)" />
          <span className="mono" style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
          <button onClick={() => { setFile(null); if (ref.current) ref.current.value = ""; }} style={{ color: "var(--mut)" }}><X size={14} /></button>
        </div>
      ) : (
        <Btn small onClick={() => ref.current && ref.current.click()}><Upload size={13} /> Attach receipt (image / PDF)</Btn>
      )}
    </div>
  );
}

function PaymentRow({ p, sellersById, showSeller, onDelete }) {
  return (
    <div className="rise" style={{
      background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10,
      padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap"
    }}>
      <div style={{ flex: "1 1 200px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {showSeller && <span style={{ fontWeight: 700, fontSize: 13 }}>{sellersById[p.sellerId]?.name || "—"}</span>}
          <TypeChip type={p.type} />
          {p.salaryMonth && <span className="mono" style={{ fontSize: 10, color: "var(--mut)" }}>{monthFull(p.salaryMonth)}</span>}
          {(p.allocations || []).length > 0 && (
            <span className="mono" style={{ fontSize: 10, color: "var(--dim)" }}>
              {p.allocations.length} deal side{p.allocations.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--dim)", marginTop: 4 }}>
          {fmtDate(p.date)}{p.note ? ` · ${p.note}` : ""}
        </div>
      </div>
      <span className="mono" style={{ fontWeight: 700, fontSize: 15, color: p.type === "ADVANCE_RECOVERY" ? "var(--mut)" : p.type === "ADVANCE" ? "var(--amber)" : "var(--green)" }}>{p.type === "ADVANCE_RECOVERY" ? "−" : ""}{fmtM(p.amount, p.ccy, 2)}</span>
      <ProofLink payment={p} />
      {onDelete && <button onClick={() => onDelete(p)} style={{ color: "var(--red)" }} aria-label="Delete payment"><Trash2 size={14} /></button>}
    </div>
  );
}

function PaymentModal({ store, save, onClose, preset }) {
  const sellersById = useMemo(() => Object.fromEntries(store.sellers.map(s => [s.id, s])), [store.sellers]);
  const firstSeller = store.sellers.find(s => s.active) || store.sellers[0];
  const [f, setF] = useState(() => {
    const sellerId = preset?.sellerId || firstSeller?.id || "";
    const s = store.sellers.find(x => x.id === sellerId);
    const type = preset?.type || "COMMISSION";
    return {
      sellerId, type,
      amount: preset?.amount != null ? String(preset.amount) : (type === "SALARY" && s ? String(s.salaryAmount || "") : ""),
      ccy: preset?.ccy || (type === "SALARY" && s ? (s.salaryCcy || "EUR") : "EUR"),
      date: new Date().toISOString().slice(0, 10),
      note: "", salaryMonth: preset?.salaryMonth || monthKey(nowISO()), sel: {}, settleAdv: false
    };
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const clientsById = useMemo(() => Object.fromEntries((store.clients || []).map(c => [c.id, c])), [store.clients]);
  const advBal = useMemo(() => advanceBalance(f.sellerId, store.payments), [f.sellerId, store.payments]);
  const advLine = Object.entries(advBal).filter(([, v]) => v > 0.005).map(([c, v]) => fmtM(v, c)).join(" · ");
  const seller = sellersById[f.sellerId];
  const unpaid = useMemo(
    () => f.sellerId ? unpaidSides(f.sellerId, store.deals, sellersById, store.payments, clientsById, store.settings.rates) : [],
    [f.sellerId, store.deals, store.payments, sellersById, clientsById, store.settings.rates]);
  const skey = (u) => u.deal.id + "|" + u.side;
  const selected = unpaid.filter(u => f.sel[skey(u)]);
  const commTotal = selected.reduce((a, u) => a + (u.usd ?? 0), 0);

  const switchType = (t) => setF(p => ({
    ...p, type: t, sel: {}, settleAdv: false,
    amount: t === "SALARY" && seller ? String(seller.salaryAmount || "") : "",
    ccy: t === "SALARY" && seller ? (seller.salaryCcy || "EUR") : p.ccy
  }));
  const switchSeller = (id) => {
    const s = sellersById[id];
    setF(p => ({
      ...p, sellerId: id, sel: {}, settleAdv: false,
      amount: p.type === "SALARY" && s ? String(s.salaryAmount || "") : p.amount,
      ccy: p.type === "SALARY" && s ? (s.salaryCcy || "EUR") : p.ccy
    }));
  };
  const toggleSide = (u) => {
    const k = skey(u);
    set("sel", { ...f.sel, [k]: !f.sel[k] });
  };

  const monthOptions = useMemo(() => {
    const out = []; const d0 = new Date();
    for (let i = 1; i >= -12; i--) {
      const t = new Date(d0.getFullYear(), d0.getMonth() + i, 1);
      out.push(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`);
    }
    return out;
  }, []);

  const amt = f.type === "COMMISSION" ? commTotal : parseFloat(f.amount);
  const ccy = f.type === "COMMISSION" ? "USD" : f.ccy;
  const balCcy = advBal[ccy] || 0;
  const settleOk = !(f.type === "COMMISSION" && f.settleAdv) || commTotal <= balCcy + 1e-9;
  const recoveryOk = f.type !== "ADVANCE_RECOVERY" || (balCcy > 0 && !isNaN(amt) && amt <= balCcy + 1e-9);
  const valid = f.sellerId && (f.type === "COMMISSION" ? selected.length > 0 : (!isNaN(amt) && amt > 0)) && settleOk && recoveryOk;

  const submit = async () => {
    if (!valid || saving) return;
    if (f.type === "SALARY" && salaryMonthPaid(f.sellerId, f.salaryMonth, store.payments)) {
      if (!window.confirm(`${monthFull(f.salaryMonth)} salary is already recorded for ${seller?.name}. Record another payment for the same month?`)) return;
    }
    setSaving(true);
    const finalType = (f.type === "COMMISSION" && f.settleAdv) ? "ADVANCE_RECOVERY" : f.type;
    const pay = {
      id: uid(), sellerId: f.sellerId, type: finalType, amount: amt, ccy,
      date: new Date(f.date + "T12:00:00").toISOString(), note: f.note.trim(), createdAt: nowISO(),
      ...(f.type === "SALARY" ? { salaryMonth: f.salaryMonth } : {}),
      ...(f.type === "COMMISSION" ? { allocations: selected.map(u => ({ dealId: u.deal.id, side: u.side })) } : {}),
    };
    if (file) {
      const ok = await savePaymentFile(pay.id, file.dataUrl);
      if (ok) { pay.fileId = pay.id; pay.fileName = file.name; pay.fileType = file.type; }
      else window.alert("Receipt upload failed — the payment will be saved without proof.");
    }
    save({ ...store, payments: [pay, ...store.payments] });
    onClose();
  };

  return (
    <Modal title="Record payment" onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Seller">
            <select value={f.sellerId} onChange={e => switchSeller(e.target.value)}>
              {store.sellers.map(s => <option key={s.id} value={s.id}>{s.name}{s.active ? "" : " (inactive)"}</option>)}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" value={f.date} onChange={e => set("date", e.target.value)} />
          </Field>
        </div>

        <div>
          <div className="up" style={{ fontSize: 10, color: "var(--mut)", fontWeight: 700, marginBottom: 8 }}>Payment type</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.keys(TYPE_META).map(t => (
              <button key={t} onClick={() => switchType(t)} className="up mono" style={{
                flex: "1 1 100px", fontSize: 10, fontWeight: 700, padding: "10px 8px", borderRadius: 8,
                background: f.type === t ? TYPE_META[t].bg : "var(--panel2)",
                color: f.type === t ? TYPE_META[t].color : "var(--mut)",
                border: `1px solid ${f.type === t ? TYPE_META[t].color : "var(--line)"}`
              }}>{TYPE_META[t].label}</button>
            ))}
          </div>
        </div>

        {f.type === "COMMISSION" && (
          <div style={{ background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
            <div className="up" style={{ fontSize: 10, color: "var(--mut)", fontWeight: 700, marginBottom: 10 }}>
              Unpaid commissions — select what you're paying
            </div>
            {unpaid.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--dim)" }}>Nothing owed to {seller?.name || "this seller"} right now.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {unpaid.map(u => {
                  const on = !!f.sel[skey(u)];
                  const lock = !u.payable;
                  return (
                    <button key={skey(u)} disabled={lock} onClick={() => !lock && toggleSide(u)} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, textAlign: "left",
                      background: on ? "rgba(233,180,76,.08)" : "var(--panel)",
                      border: `1px solid ${on ? "var(--gold)" : "var(--line)"}`,
                      opacity: lock ? 0.6 : 1, cursor: lock ? "not-allowed" : "pointer"
                    }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        background: on ? "var(--gold)" : "transparent", border: `1px solid ${on ? "var(--gold)" : "var(--line2)"}`
                      }}>{on && <Check size={12} color="#0B0C10" />}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {u.deal.brand} {u.deal.model} <span className="mono" style={{ color: "var(--dim)", fontSize: 11 }}>{u.deal.ref}</span>
                        </div>
                        <div className="mono" style={{ fontSize: 10, color: u.payable ? "var(--mut)" : "var(--amber)", marginTop: 2 }}>
                          {u.side === "buy" ? "Sourcing" : "Sale"}{u.pct != null ? ` · ${u.pct}%` : " · fixed"}{u.ccy !== "USD" ? ` · ${fmtM(u.amount, u.ccy)} @ locked FX` : ""}{u.payable ? "" : ` · blocked — missing ${u.blockers.join(", ")}`}
                        </div>
                      </div>
                      <span className="mono" style={{ fontWeight: 700, color: u.payable ? "var(--gold)" : "var(--dim)" }}>{fmtM(u.usd ?? 0, "USD", 2)}</span>
                    </button>
                  );
                })}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px dashed var(--line2)", fontSize: 13 }}>
                  <span style={{ color: "var(--mut)" }}>Payment total</span>
                  <span className="mono" style={{ fontWeight: 700, color: "var(--green)" }}>{selected.length ? fmtM(commTotal, "USD", 2) : "—"}</span>
                </div>
                {selected.length > 0 && (advBal.USD || 0) > 0.005 && (
                  <button onClick={() => set("settleAdv", !f.settleAdv)} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, textAlign: "left",
                    background: f.settleAdv ? "rgba(242,163,60,.08)" : "var(--panel)",
                    border: `1px solid ${f.settleAdv ? "var(--amber)" : "var(--line)"}`
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      background: f.settleAdv ? "var(--amber)" : "transparent", border: `1px solid ${f.settleAdv ? "var(--amber)" : "var(--line2)"}`
                    }}>{f.settleAdv && <Check size={12} color="#0B0C10" />}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Settle against advance — no cash out</div>
                      <div className="mono" style={{ fontSize: 10, color: commTotal > (advBal.USD || 0) + 1e-9 && f.settleAdv ? "var(--red)" : "var(--mut)", marginTop: 2 }}>
                        Advance outstanding: {fmtM(advBal.USD || 0, "USD")}{commTotal > (advBal.USD || 0) + 1e-9 ? " · selection exceeds balance" : ""}
                      </div>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {f.type === "SALARY" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Salary month">
              <select value={f.salaryMonth} onChange={e => set("salaryMonth", e.target.value)}>
                {monthOptions.map(m => (
                  <option key={m} value={m}>
                    {monthFull(m)}{salaryMonthPaid(f.sellerId, m, store.payments) ? " · paid" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Amount">
              <input className="mono" value={f.amount} inputMode="decimal"
                onChange={e => set("amount", e.target.value.replace(/[^0-9.]/g, ""))} />
            </Field>
            <Field label="Currency">
              <select value={f.ccy} onChange={e => set("ccy", e.target.value)}>{CCYS.map(c => <option key={c}>{c}</option>)}</select>
            </Field>
          </div>
        )}

        {f.type === "BONUS" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Amount">
              <input className="mono" value={f.amount} inputMode="decimal"
                onChange={e => set("amount", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="500" />
            </Field>
            <Field label="Currency">
              <select value={f.ccy} onChange={e => set("ccy", e.target.value)}>{CCYS.map(c => <option key={c}>{c}</option>)}</select>
            </Field>
          </div>
        )}

        {f.type === "ADVANCE" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Amount">
                <input className="mono" value={f.amount} inputMode="decimal"
                  onChange={e => set("amount", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="1000" />
              </Field>
              <Field label="Currency">
                <select value={f.ccy} onChange={e => set("ccy", e.target.value)}>{CCYS.map(c => <option key={c}>{c}</option>)}</select>
              </Field>
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--mut)" }}>
              Money given before it's earned — settle it later from commissions or a repayment.
              {advLine ? ` Currently outstanding: ${advLine}.` : ""}
            </div>
          </div>
        )}

        {f.type === "ADVANCE_RECOVERY" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Amount">
                <input className="mono" value={f.amount} inputMode="decimal"
                  onChange={e => set("amount", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="500" />
              </Field>
              <Field label="Currency">
                <select value={f.ccy} onChange={e => set("ccy", e.target.value)}>{CCYS.map(c => <option key={c}>{c}</option>)}</select>
              </Field>
            </div>
            <div className="mono" style={{ fontSize: 11, color: recoveryOk || !f.amount ? "var(--mut)" : "var(--red)" }}>
              {advLine ? `Outstanding: ${advLine}. ` : "No advance outstanding for this seller. "}
              Use this when the seller gives money back directly — to settle from commissions, use the Commission type with "Settle against advance".
            </div>
          </div>
        )}

        <Field label="Note">
          <input value={f.note} onChange={e => set("note", e.target.value)} placeholder="Bank transfer ref, cash, USDT tx hash…" />
        </Field>

        <FilePick file={file} setFile={setFile} />

        <Btn kind="gold" onClick={submit} disabled={!valid || saving} style={{ justifyContent: "center" }}>
          <Check size={16} /> {saving ? "Saving…" : `${f.type === "COMMISSION" && f.settleAdv ? "Settle against advance" : f.type === "ADVANCE_RECOVERY" ? "Record repayment" : f.type === "ADVANCE" ? "Record advance" : "Record payment"}${valid ? ` · ${fmtM(amt, ccy, 2)}` : ""}`}
        </Btn>
      </div>
    </Modal>
  );
}

function AdminPayments({ store, save }) {
  const [modal, setModal] = useState(null); // false | preset object
  const [filter, setFilter] = useState("ALL");
  const sellersById = useMemo(() => Object.fromEntries(store.sellers.map(s => [s.id, s])), [store.sellers]);
  const clientsById = useMemo(() => Object.fromEntries((store.clients || []).map(c => [c.id, c])), [store.clients]);
  const thisMonth = monthKey(nowISO());
  const add = (m, c, v) => { m[c] = (m[c] || 0) + v; };

  const owed = {};
  for (const d of store.deals) {
    for (const c of dealCommissions(d, sellersById, store.payments, clientsById, store.settings.rates)) {
      if (!c.paid) add(owed, "USD", c.usd ?? 0);
    }
  }
  const paidMonth = {};
  for (const p of store.payments) if (monthKey(p.date) === thisMonth && p.type !== "ADVANCE_RECOVERY") add(paidMonth, p.ccy, p.amount);

  const advOut = {};
  const advRows = [];
  for (const s of store.sellers) {
    const b = advanceBalance(s.id, store.payments);
    const entries = Object.entries(b).filter(([, v]) => v > 0.005);
    if (entries.length) {
      advRows.push({ s, line: entries.map(([c, v]) => fmtM(v, c)).join(" · ") });
      for (const [c, v] of entries) add(advOut, c, v);
    }
  }

  const salaryRows = store.sellers.filter(s => s.active && s.salaryEnabled);

  const delPayment = async (p) => {
    if (!window.confirm("Delete this payment? Any linked commissions go back to unpaid.")) return;
    if (p.fileId) await deletePaymentFile(p.fileId);
    save({ ...store, payments: store.payments.filter(x => x.id !== p.id) });
  };

  const list = store.payments
    .filter(p => filter === "ALL" || p.type === filter)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Tile label="Commissions owed" value={<CcyLines map={owed} color="var(--amber)" />} icon={Clock} sub="Unpaid deal sides" />
        <Tile label="Paid this month" value={<CcyLines map={paidMonth} color="var(--green)" />} icon={Banknote} sub="All payment types" />
        {Object.keys(advOut).length > 0 && (
          <Tile label="Advances outstanding" value={<CcyLines map={advOut} color="var(--amber)" />} icon={Clock} sub="To recover from sellers" accent="var(--amber)" />
        )}
      </div>

      {salaryRows.length > 0 && (
        <div className="rise" style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
          <div className="up" style={{ fontSize: 10, color: "var(--mut)", fontWeight: 700, marginBottom: 12, display: "flex", gap: 6, alignItems: "center" }}>
            <Banknote size={13} color="var(--blue)" /> Fixed salaries — {monthFull(thisMonth)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {salaryRows.map(s => {
              const paid = salaryMonthPaid(s.id, thisMonth, store.payments);
              return (
                <div key={s.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                  background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 9, flexWrap: "wrap"
                }}>
                  <span style={{ fontWeight: 700, fontSize: 13, flex: "1 1 120px" }}>{s.name}</span>
                  <span className="mono" style={{ fontSize: 12, color: "var(--mut)" }}>{fmtM(s.salaryAmount, s.salaryCcy)}/mo</span>
                  <span className={`up mono${paid ? "" : " pulse"}`} style={{
                    fontSize: 9, fontWeight: 700, padding: "4px 9px", borderRadius: 6,
                    color: paid ? "var(--green)" : "var(--amber)",
                    background: paid ? "rgba(52,229,155,.12)" : "rgba(242,163,60,.12)",
                    border: `1px solid ${paid ? "rgba(52,229,155,.35)" : "rgba(242,163,60,.35)"}`
                  }}>{paid ? "Paid" : "Due"}</span>
                  {!paid && (
                    <Btn kind="green" small onClick={() => setModal({
                      sellerId: s.id, type: "SALARY", amount: s.salaryAmount, ccy: s.salaryCcy, salaryMonth: thisMonth
                    })}><Wallet size={12} /> Pay now</Btn>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {advRows.length > 0 && (
        <div className="rise" style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
          <div className="up" style={{ fontSize: 10, color: "var(--mut)", fontWeight: 700, marginBottom: 12, display: "flex", gap: 6, alignItems: "center" }}>
            <Wallet size={13} color="var(--amber)" /> Advances outstanding
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {advRows.map(({ s, line }) => (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                background: "var(--panel2)", border: "1px solid var(--line)", borderRadius: 9, flexWrap: "wrap"
              }}>
                <span style={{ fontWeight: 700, fontSize: 13, flex: "1 1 120px" }}>{s.name}</span>
                <span className="mono" style={{ fontSize: 12, color: "var(--amber)", fontWeight: 700 }}>{line}</span>
                <Btn small onClick={() => setModal({ sellerId: s.id, type: "ADVANCE_RECOVERY" })}><Wallet size={12} /> Recover</Btn>
                <Btn small onClick={() => setModal({ sellerId: s.id, type: "ADVANCE" })}><Plus size={12} /> Advance</Btn>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["ALL", "COMMISSION", "SALARY", "BONUS", "ADVANCE", "ADVANCE_RECOVERY"].map(t => (
            <button key={t} onClick={() => setFilter(t)} className="up mono" style={{
              fontSize: 10, fontWeight: 700, padding: "7px 12px", borderRadius: 8,
              background: filter === t ? "var(--gold)" : "var(--panel)",
              color: filter === t ? "#0B0C10" : "var(--mut)",
              border: `1px solid ${filter === t ? "var(--gold)" : "var(--line)"}`
            }}>{t === "ALL" ? "All" : TYPE_META[t].label}</button>
          ))}
        </div>
        <Btn kind="gold" small onClick={() => setModal({})}><Plus size={13} /> Record payment</Btn>
      </div>

      {list.length === 0 && (
        <div style={{ textAlign: "center", padding: 36, color: "var(--dim)", fontSize: 13 }}>No payments recorded in this filter yet.</div>
      )}
      {list.map(p => (
        <PaymentRow key={p.id} p={p} sellersById={sellersById} showSeller onDelete={delPayment} />
      ))}

      {modal && <PaymentModal store={store} save={save} onClose={() => setModal(null)} preset={modal} />}
    </div>
  );
}

function SellerPayments({ store, seller }) {
  const sellersById = useMemo(() => Object.fromEntries(store.sellers.map(s => [s.id, s])), [store.sellers]);
  const thisMonth = monthKey(nowISO());
  const tot = paymentsTotals(seller.id, store.payments);
  const monthMap = {};
  const mine = store.payments
    .filter(p => p.sellerId === seller.id)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  for (const p of mine) if (monthKey(p.date) === thisMonth && p.type !== "ADVANCE_RECOVERY") monthMap[p.ccy] = (monthMap[p.ccy] || 0) + p.amount;
  const advBal = advanceBalance(seller.id, store.payments);
  const advMap = Object.fromEntries(Object.entries(advBal).filter(([, v]) => v > 0.005));
  const salPaid = seller.salaryEnabled ? salaryMonthPaid(seller.id, thisMonth, store.payments) : false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Tile label="Total received" value={<CcyLines map={tot.all} color="var(--green)" />} icon={Wallet} sub="Commissions, salary, bonuses & advances" />
        <Tile label="This month" value={<CcyLines map={monthMap} color="var(--gold)" />} icon={Banknote} />
        {Object.keys(advMap).length > 0 && (
          <Tile label="Advance balance" value={<CcyLines map={advMap} color="var(--amber)" />} icon={Clock}
            sub="Settled from your next commissions" accent="var(--amber)" />
        )}
        {seller.salaryEnabled && (
          <Tile label="Fixed salary" icon={Clock}
            value={<span className="mono">{fmtM(seller.salaryAmount, seller.salaryCcy)}<span style={{ color: "var(--dim)", fontSize: 13 }}>/mo</span></span>}
            sub={`${monthFull(thisMonth)}: ${salPaid ? "paid ✓" : "due"}`}
            accent={salPaid ? "var(--green)" : "var(--amber)"} />
        )}
      </div>

      {mine.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--dim)", fontSize: 13 }}>
          No payments yet. Once a payout is recorded, it shows up here with its receipt.
        </div>
      ) : (
        mine.map(p => <PaymentRow key={p.id} p={p} sellersById={sellersById} showSeller={false} />)
      )}
    </div>
  );
}

/* ---------------------------- clients tabs ---------------------------- */
function ClientModal({ store, save, client, onClose, ownerId }) {
  const [form, setForm] = useState(client
    ? { name: client.name || "", phone: client.phone || "", email: client.email || "", address: client.address || "", bankAccount: client.bankAccount || "", notes: client.notes || "", sourceType: client.sourceType || "", sourceChannel: client.sourceChannel || "" }
    : { ...EMPTY_CLIENT });
  const ok = clientComplete(form);
  const submit = () => {
    if (!ok) return;
    const data = trimClient(form);
    if (client) {
      save({ ...store, clients: store.clients.map(c => c.id === client.id ? { ...c, ...data } : c) });
    } else {
      save({ ...store, clients: [...(store.clients || []), { id: "c_" + uid(), ...data, createdBy: ownerId, createdAt: nowISO() }] });
    }
    onClose();
  };
  return (
    <Modal title={client ? "Edit client" : "New client"} onClose={onClose}>
      <ClientForm value={form} onChange={setForm} />
      <Btn kind="gold" disabled={!ok} onClick={submit} style={{ marginTop: 14, width: "100%", justifyContent: "center" }}>
        <Check size={15} /> Save client
      </Btn>
    </Modal>
  );
}

function ClientCard({ c, deals, creatorName, onEdit, onDelete }) {
  const refs = deals.filter(d => d.buyClientId === c.id || d.sellClientId === c.id);
  const complete = clientComplete(c);
  return (
    <div className="rise" style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</span>
            {c.sourceType && (
              <span className="up mono" style={{
                fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                color: c.sourceType === "company" ? "var(--gold)" : "var(--mut)",
                background: c.sourceType === "company" ? "rgba(233,180,76,.1)" : "var(--panel2)",
                border: `1px solid ${c.sourceType === "company" ? "rgba(233,180,76,.3)" : "var(--line2)"}`
              }}>{c.sourceType === "company" ? `Our lead${c.sourceChannel ? " · " + c.sourceChannel : ""}` : "Own network"}</span>
            )}
            {!complete && (
              <span className="up mono" style={{
                fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 6, color: "var(--amber)",
                background: "rgba(242,163,60,.12)", border: "1px solid rgba(242,163,60,.3)"
              }}>Incomplete</span>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 7, fontSize: 12, color: "var(--mut)" }}>
            {(c.phone || c.email) && (
              <span className="mono" style={{ fontSize: 11 }}>
                {c.phone && <><Phone size={11} style={{ verticalAlign: -1 }} /> {c.phone}</>}
                {c.phone && c.email && " · "}
                {c.email && <><Mail size={11} style={{ verticalAlign: -1 }} /> {c.email}</>}
              </span>
            )}
            {c.address ? <span><MapPin size={11} style={{ verticalAlign: -1 }} /> {c.address}</span>
              : <span className="mono" style={{ color: "var(--amber)", fontSize: 11 }}>Address missing</span>}
            {c.bankAccount && <span className="mono" style={{ fontSize: 10, color: "var(--dim)" }}>{c.bankAccount}</span>}
            {c.notes && <span style={{ fontSize: 11, color: "var(--dim)" }}>{c.notes}</span>}
          </div>
          <div className="mono" style={{ fontSize: 10, color: "var(--dim)", marginTop: 7 }}>
            {refs.length} deal{refs.length === 1 ? "" : "s"}{creatorName ? ` · added by ${creatorName}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn small onClick={onEdit}><Pencil size={12} /> Edit</Btn>
          {onDelete && refs.length === 0 && <Btn small kind="red" onClick={onDelete}><Trash2 size={12} /></Btn>}
        </div>
      </div>
    </div>
  );
}

function SellerClients({ store, save, seller }) {
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState(null);
  const mine = (store.clients || [])
    .filter(c => c.createdBy === seller.id)
    .sort((a, b) => a.name.localeCompare(b.name));
  const del = (c) => {
    if (!window.confirm(`Delete client ${c.name}?`)) return;
    save({ ...store, clients: store.clients.filter(x => x.id !== c.id) });
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Btn kind="gold" onClick={() => setModal(true)} style={{ alignSelf: "flex-start" }}><Plus size={15} /> New client</Btn>
      {mine.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--dim)", fontSize: 13 }}>
          No clients yet. You'll add them while submitting deals, or create one now — complete data unlocks your payouts.
        </div>
      )}
      {mine.map(c => (
        <ClientCard key={c.id} c={c} deals={store.deals} onEdit={() => setEdit(c)} onDelete={() => del(c)} />
      ))}
      {modal && <ClientModal store={store} save={save} client={null} onClose={() => setModal(false)} ownerId={seller.id} />}
      {edit && <ClientModal store={store} save={save} client={edit} onClose={() => setEdit(null)} ownerId={seller.id} />}
    </div>
  );
}

function AdminClients({ store, save, ownerId = "admin" }) {
  const [q, setQ] = useState("");
  const [src, setSrc] = useState("ALL");
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState(null);
  const sellersById = useMemo(() => Object.fromEntries(store.sellers.map(s => [s.id, s])), [store.sellers]);
  const acctsById = useMemo(() => Object.fromEntries((store.accountants || []).map(a => [a.id, a])), [store.accountants]);
  const creatorName = (id) => id === "admin" ? "Admin" : (sellersById[id]?.name || acctsById[id]?.name || "—");
  const needle = q.trim().toLowerCase();
  const list = (store.clients || [])
    .filter(c => !needle || [c.name, c.phone, c.email, c.address].some(v => (v || "").toLowerCase().includes(needle)))
    .filter(c => src === "ALL" || (src === "company" ? c.sourceType === "company" : c.sourceType !== "company"))
    .sort((a, b) => a.name.localeCompare(b.name));
  const del = (c) => {
    if (!window.confirm(`Delete client ${c.name}?`)) return;
    save({ ...store, clients: store.clients.filter(x => x.id !== c.id) });
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
          <Search size={14} color="var(--dim)" style={{ position: "absolute", left: 12, top: 13 }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, phone, email, address…" style={{ paddingLeft: 34 }} />
        </div>
        <Btn kind="gold" onClick={() => setModal(true)}><Plus size={15} /> New client</Btn>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[["ALL", "All"], ["company", "Our leads"], ["own", "Own network"]].map(([k, lbl]) => (
          <button key={k} onClick={() => setSrc(k)} className="up mono" style={{
            fontSize: 10, fontWeight: 700, padding: "7px 12px", borderRadius: 8,
            color: src === k ? "var(--gold)" : "var(--mut)",
            background: src === k ? "rgba(233,180,76,.1)" : "var(--panel)",
            border: `1px solid ${src === k ? "rgba(233,180,76,.4)" : "var(--line)"}`
          }}>{lbl}</button>
        ))}
      </div>
      {list.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--dim)", fontSize: 13 }}>No clients match.</div>
      )}
      {list.map(c => (
        <ClientCard key={c.id} c={c} deals={store.deals} creatorName={creatorName(c.createdBy)}
          onEdit={() => setEdit(c)} onDelete={() => del(c)} />
      ))}
      {modal && <ClientModal store={store} save={save} client={null} onClose={() => setModal(false)} ownerId={ownerId} />}
      {edit && <ClientModal store={store} save={save} client={edit} onClose={() => setEdit(null)} ownerId={ownerId} />}
    </div>
  );
}

/* ---------------------------- accountancy portal ---------------------------- */
function AcctApprovals({ store, save, acct }) {
  const [edit, setEdit] = useState(null);
  const sellersById = useMemo(() => Object.fromEntries(store.sellers.map(s => [s.id, s])), [store.sellers]);
  const clientsById = useMemo(() => Object.fromEntries((store.clients || []).map(c => [c.id, c])), [store.clients]);
  const pending = store.deals.filter(d => d.status === "PENDING")
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {pending.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--dim)", fontSize: 13 }}>
          <BadgeCheck size={30} color="var(--green)" style={{ margin: "0 auto 10px" }} />
          Queue is clear. Nothing waiting for accountancy.
        </div>
      )}
      {pending.map(d => (
        <DealCard key={d.id} deal={d} sellersById={sellersById} clients={clientsById} payments={store.payments} rates={store.settings.rates} viewerSellerId={null} isAdmin
          actions={<Btn kind="green" small onClick={() => setEdit(d)}><Check size={13} /> Review & approve</Btn>} />
      ))}
      {edit && <DealEditor store={store} deal={edit} save={save} onClose={() => setEdit(null)} mode="approve" role="acct" actor={acct.id} />}
    </div>
  );
}

function AcctDeals({ store, save, acct }) {
  const [filter, setFilter] = useState("ALL");
  const [edit, setEdit] = useState(null);
  const sellersById = useMemo(() => Object.fromEntries(store.sellers.map(s => [s.id, s])), [store.sellers]);
  const clientsById = useMemo(() => Object.fromEntries((store.clients || []).map(c => [c.id, c])), [store.clients]);
  const deals = store.deals
    .filter(d => filter === "ALL" || d.status === filter)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["ALL", "PENDING", "REVIEWED", "STOCK", "SOLD", "REJECTED"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className="up mono" style={{
            fontSize: 10, fontWeight: 700, padding: "7px 12px", borderRadius: 8,
            background: filter === f ? "var(--gold)" : "var(--panel)",
            color: filter === f ? "#0B0C10" : "var(--mut)",
            border: `1px solid ${filter === f ? "var(--gold)" : "var(--line)"}`
          }}>{f === "ALL" ? "All" : STATUS_META[f].label}</button>
        ))}
      </div>
      {deals.length === 0 && (
        <div style={{ textAlign: "center", padding: 36, color: "var(--dim)", fontSize: 13 }}>No deals in this filter.</div>
      )}
      {deals.map(d => (
        <DealCard key={d.id} deal={d} sellersById={sellersById} clients={clientsById} payments={store.payments} rates={store.settings.rates} viewerSellerId={null} isAdmin
          actions={(d.status === "PENDING" || d.status === "REVIEWED")
            ? <Btn small onClick={() => setEdit(d)}><Pencil size={13} /> Edit data</Btn>
            : null} />
      ))}
      {edit && <DealEditor store={store} deal={edit} save={save} onClose={() => setEdit(null)} mode="edit" role="acct" actor={acct.id} />}
    </div>
  );
}

function AcctApp({ store, acct, save, onLogout }) {
  const [tab, setTab] = useState("appr");
  const pending = store.deals.filter(d => d.status === "PENDING").length;
  const tabs = [
    ["appr", "Approvals", ListChecks],
    ["deals", "Deals", Watch],
    ["clients", "Clients", Contact],
  ];
  return (
    <Shell title={acct.name} subtitle="Accountancy" tabs={tabs} tab={tab} setTab={setTab} onLogout={onLogout}
      badgeCounts={{ appr: pending }}>
      {tab === "appr" && <AcctApprovals store={store} save={save} acct={acct} />}
      {tab === "deals" && <AcctDeals store={store} save={save} acct={acct} />}
      {tab === "clients" && <AdminClients store={store} save={save} ownerId={acct.id} />}
    </Shell>
  );
}

/* ---------------------------- shells ---------------------------- */
function Shell({ title, subtitle, tabs, tab, setTab, onLogout, badgeCounts = {}, children }) {
  return (
    <div style={{ minHeight: "100vh", maxWidth: 920, margin: "0 auto", padding: "18px 14px 60px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Crown size={18} color="var(--gold)" />
            <span className="up" style={{ fontWeight: 800, fontSize: 16, letterSpacing: ".18em" }}>Sales<span style={{ color: "var(--gold)" }}>Desk</span></span>
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--mut)", marginTop: 3 }}>{title}{subtitle ? ` · ${subtitle}` : ""}</div>
        </div>
        <button onClick={onLogout} style={{ color: "var(--mut)", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <LogOut size={14} /> Exit
        </button>
      </header>

      <nav style={{ display: "flex", gap: 6, marginBottom: 18, overflowX: "auto", paddingBottom: 4 }}>
        {tabs.map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className="up" style={{
            display: "flex", alignItems: "center", gap: 7, padding: "10px 14px", borderRadius: 10,
            fontSize: 11, fontWeight: 800, letterSpacing: ".1em", whiteSpace: "nowrap",
            background: tab === key ? "var(--gold)" : "var(--panel)",
            color: tab === key ? "#0B0C10" : "var(--mut)",
            border: `1px solid ${tab === key ? "var(--gold)" : "var(--line)"}`
          }}>
            <Icon size={13} /> {label}
            {badgeCounts[key] > 0 && (
              <span className="mono pulse" style={{
                background: tab === key ? "#0B0C10" : "var(--red)", color: tab === key ? "var(--gold)" : "#fff",
                borderRadius: 9, fontSize: 9, fontWeight: 700, padding: "2px 6px"
              }}>{badgeCounts[key]}</span>
            )}
          </button>
        ))}
      </nav>

      <TabBoundary resetKey={tab}>{children}</TabBoundary>
    </div>
  );
}

function SellerApp({ store, seller, save, onLogout }) {
  const [tab, setTab] = useState("dash");
  const tabs = [
    ["dash", "Dashboard", LayoutDashboard],
    ["deals", "My deals", Watch],
    ["new", "New deal", Plus],
    ["pay", "Payments", Banknote],
    ["clients", "Clients", Contact],
  ];
  return (
    <Shell title={seller.name} subtitle="Seller" tabs={tabs} tab={tab} setTab={setTab} onLogout={onLogout}>
      {tab === "dash" && <SellerDashboard store={store} seller={seller} />}
      {tab === "deals" && <MyDeals store={store} seller={seller} />}
      {tab === "new" && <NewDeal store={store} seller={seller} save={save} goMyDeals={() => setTab("deals")} />}
      {tab === "pay" && <SellerPayments store={store} seller={seller} />}
      {tab === "clients" && <SellerClients store={store} save={save} seller={seller} />}
    </Shell>
  );
}

/* ---------------------------- admin: monthly reports ---------------------------- */
const csvCell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvRows = (rows) => rows.map(r => r.map(csvCell).join(",")).join("\n");
function downloadText(filename, text, mime) {
  const blob = new Blob(["\ufeff" + text], { type: mime || "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function buildReportCSV(rep, sellersById) {
  const n2 = (v) => (Math.round((v ?? 0) * 100) / 100).toFixed(2);
  const rows = [];
  rows.push(["SalesDesk monthly report", monthLabel(rep.mKey)]);
  rows.push([]);
  rows.push(["SUMMARY"]);
  rows.push(["Deals sold", rep.dealsSold.length]);
  rows.push(["Revenue (USD at locked FX)", n2(rep.revenueUSD)]);
  rows.push(["Profit (USD at locked FX)", n2(rep.profitUSD)]);
  rows.push(["Commissions accrued (USD)", n2(rep.commEarnedUSD)]);
  rows.push(["  of which already paid (USD)", n2(rep.commPaidFlagUSD)]);
  rows.push(["  of which blocked (USD)", n2(rep.commBlockedUSD)]);
  rows.push(["Net to house (USD)", n2(rep.netUSD)]);
  for (const [t, label] of [["COMMISSION", "Commission payouts"], ["SALARY", "Salaries"], ["BONUS", "Bonuses"], ["ADVANCE", "Advances given"], ["ADVANCE_RECOVERY", "Advances recovered"]]) {
    const m = rep.paysByType[t] || {};
    for (const ccy of Object.keys(m)) rows.push([`${label} (${ccy})`, n2(m[ccy])]);
  }
  rows.push([]);
  rows.push(["DEALS SOLD"]);
  rows.push(["Ref", "Brand", "Model", "Stock no", "Serial", "Ccy", "Buy", "Sell", "Profit", "Profit USD", "Sourced by", "Sold by", "Sold at"]);
  for (const r of rep.dealsSold) {
    const d = r.d;
    rows.push([d.ref, d.brand, d.model, d.stockNo || "", d.serial || "", d.ccy, d.buyPrice, d.sellPrice, r.profit, n2(r.profitUSD),
      sellersById[d.sourcedBy]?.name || "", sellersById[d.soldBy]?.name || "", fmtDate(d.soldAt)]);
  }
  rows.push([]);
  rows.push(["COMMISSIONS (deals sold this month)"]);
  rows.push(["Deal", "Seller", "Side", "Mode", "Native amount", "Ccy", "USD locked", "Status"]);
  for (const c of rep.commRows) {
    rows.push([c.deal.ref, sellersById[c.sellerId]?.name || "", c.side === "buy" ? "Sourcing" : "Sale",
      c.manual ? "Fixed" : `${c.pct}%`, n2(c.amount), c.ccy, n2(c.usd ?? 0),
      c.paid ? "Paid" : (c.payable ? "Due" : `Blocked: ${c.blockers.join(" / ")}`)]);
  }
  rows.push([]);
  rows.push(["PAYMENTS (recorded this month)"]);
  rows.push(["Date", "Seller", "Type", "Amount", "Ccy", "Note"]);
  for (const p of rep.pays) {
    rows.push([fmtDate(p.date), sellersById[p.sellerId]?.name || "", p.type, n2(p.amount), p.ccy, p.note || ""]);
  }
  rows.push([]);
  rows.push(["PER SELLER"]);
  rows.push(["Seller", "Deals involved", "Commissions accrued USD", "Commission payouts received USD"]);
  for (const r of rep.perSeller) {
    rows.push([r.seller.name, r.dealsCount, n2(r.earnedUSD), n2(r.paidUSD)]);
  }
  return csvRows(rows);
}
function AdminReports({ store }) {
  const sellersById = useMemo(() => Object.fromEntries(store.sellers.map(s => [s.id, s])), [store.sellers]);
  const months = useMemo(() => {
    const set = new Set();
    for (const d of store.deals) if (d.soldAt) set.add(monthKey(d.soldAt));
    for (const p of store.payments) if (p.date) set.add(monthKey(p.date));
    set.add(monthKey(nowISO()));
    return [...set].filter(Boolean).sort().reverse();
  }, [store.deals, store.payments]);
  const [mKey, setMKey] = useState(months[0]);
  const rep = useMemo(() => monthlyReport(store, mKey, store.settings.rates), [store, mKey]);
  const dl = () => downloadText(`salesdesk-report-${mKey}.csv`, buildReportCSV(rep, sellersById));
  const Tile = ({ label, value, sub, color }) => (
    <div style={{ flex: "1 1 150px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px" }}>
      <div className="up" style={{ fontSize: 9, color: "var(--mut)", fontWeight: 700 }}>{label}</div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: color || "var(--ink)", marginTop: 6 }}>{value}</div>
      {sub && <div className="mono" style={{ fontSize: 10, color: "var(--dim)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
  return (
    <div id="reportPrint" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="noPrint" style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ width: 200 }}>
          <Field label="Month">
            <select value={mKey} onChange={e => setMKey(e.target.value)}>
              {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </Field>
        </div>
        <Btn kind="gold" onClick={dl}><Download size={14} /> Download CSV</Btn>
        <Btn kind="ghost" onClick={() => window.print()}><Printer size={14} /> Print / PDF</Btn>
      </div>

      <div className="up mono" style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".2em", color: "var(--gold)" }}>
        Monthly report · {monthLabel(rep.mKey)}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Tile label="Deals sold" value={rep.dealsSold.length} />
        <Tile label="Revenue" value={fmtM(rep.revenueUSD, "USD")} sub="USD at locked FX" />
        <Tile label="Profit" value={fmtM(rep.profitUSD, "USD")} sub="USD at locked FX" color="var(--green)" />
        <Tile label="Commissions accrued" value={fmtM(rep.commEarnedUSD, "USD")} sub={`paid ${fmtM(rep.commPaidFlagUSD, "USD")} · blocked ${fmtM(rep.commBlockedUSD, "USD")}`} color="var(--gold)" />
        <Tile label="Net to house" value={fmtM(rep.netUSD, "USD")} sub="profit − commissions" color="var(--green)" />
      </div>

      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
        <div className="up" style={{ fontSize: 10, fontWeight: 800, marginBottom: 10 }}>Deals sold</div>
        {rep.dealsSold.length === 0 ? <div style={{ fontSize: 12, color: "var(--dim)" }}>No deals sold this month.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table className="repTable">
              <thead><tr><th>Ref</th><th>Watch</th><th>Stock #</th><th className="num">Buy</th><th className="num">Sell</th><th className="num">Profit</th><th className="num">Profit USD</th><th>Sourced</th><th>Sold</th></tr></thead>
              <tbody>
                {rep.dealsSold.map(r => (
                  <tr key={r.d.id}>
                    <td className="mono">{r.d.ref}</td>
                    <td>{r.d.brand} {r.d.model}</td>
                    <td className="mono">{r.d.stockNo || "—"}</td>
                    <td className="num">{fmtM(r.d.buyPrice, r.d.ccy)}</td>
                    <td className="num">{fmtM(r.d.sellPrice, r.d.ccy)}</td>
                    <td className="num">{fmtM(r.profit, r.d.ccy)}</td>
                    <td className="num" style={{ color: "var(--green)" }}>{fmtM(r.profitUSD, "USD")}</td>
                    <td>{sellersById[r.d.sourcedBy]?.name || "—"}</td>
                    <td>{sellersById[r.d.soldBy]?.name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
        <div className="up" style={{ fontSize: 10, fontWeight: 800, marginBottom: 10 }}>Commissions on this month's sales</div>
        {rep.commRows.length === 0 ? <div style={{ fontSize: 12, color: "var(--dim)" }}>None.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table className="repTable">
              <thead><tr><th>Deal</th><th>Seller</th><th>Side</th><th>Mode</th><th className="num">Native</th><th className="num">USD locked</th><th>Status</th></tr></thead>
              <tbody>
                {rep.commRows.map((c, i) => (
                  <tr key={i}>
                    <td className="mono">{c.deal.ref}</td>
                    <td>{sellersById[c.sellerId]?.name}</td>
                    <td>{c.side === "buy" ? "Sourcing" : "Sale"}</td>
                    <td className="mono">{c.manual ? "Fixed" : `${c.pct}%`}</td>
                    <td className="num">{fmtM(c.amount, c.ccy)}</td>
                    <td className="num" style={{ color: "var(--gold)" }}>{fmtM(c.usd ?? 0, "USD")}</td>
                    <td style={{ color: c.paid ? "var(--green)" : (c.payable ? "var(--amber)" : "var(--red)") }}>
                      {c.paid ? "Paid" : (c.payable ? "Due" : "Blocked")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
        <div className="up" style={{ fontSize: 10, fontWeight: 800, marginBottom: 10 }}>Payments recorded this month</div>
        {rep.pays.length === 0 ? <div style={{ fontSize: 12, color: "var(--dim)" }}>None.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table className="repTable">
              <thead><tr><th>Date</th><th>Seller</th><th>Type</th><th className="num">Amount</th><th>Note</th></tr></thead>
              <tbody>
                {rep.pays.map(p => (
                  <tr key={p.id}>
                    <td className="mono">{fmtDate(p.date)}</td>
                    <td>{sellersById[p.sellerId]?.name || "—"}</td>
                    <td className="mono" style={{ fontSize: 10 }}>{p.type.replace("_", " ")}</td>
                    <td className="num">{fmtM(p.amount, p.ccy, 2)}</td>
                    <td style={{ color: "var(--dim)" }}>{p.note || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
        <div className="up" style={{ fontSize: 10, fontWeight: 800, marginBottom: 10 }}>Per seller</div>
        {rep.perSeller.length === 0 ? <div style={{ fontSize: 12, color: "var(--dim)" }}>No seller activity this month.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table className="repTable">
              <thead><tr><th>Seller</th><th className="num">Deals</th><th className="num">Commissions accrued USD</th><th className="num">Payouts received USD</th></tr></thead>
              <tbody>
                {rep.perSeller.map(r => (
                  <tr key={r.seller.id}>
                    <td>{r.seller.name}</td>
                    <td className="num">{r.dealsCount}</td>
                    <td className="num" style={{ color: "var(--gold)" }}>{fmtM(r.earnedUSD, "USD")}</td>
                    <td className="num" style={{ color: "var(--green)" }}>{fmtM(r.paidUSD, "USD")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminApp({ store, save, onLogout }) {
  const [tab, setTab] = useState("over");
  const reviewedCount = store.deals.filter(d => d.status === "REVIEWED").length;
  const thisMonth = monthKey(nowISO());
  const salDue = store.sellers.filter(s => s.active && s.salaryEnabled && !salaryMonthPaid(s.id, thisMonth, store.payments)).length;
  const tabs = [
    ["over", "Overview", LayoutDashboard],
    ["appr", "Approvals", ListChecks],
    ["deals", "Deals", Watch],
    ["pay", "Payments", Banknote],
    ["clients", "Clients", Contact],
    ["team", "Team", Users],
    ["rank", "Ranking", Trophy],
    ["reports", "Reports", FileText],
    ["set", "Settings", Settings],
  ];
  return (
    <Shell title="Admin" subtitle="Full control" tabs={tabs} tab={tab} setTab={setTab} onLogout={onLogout}
      badgeCounts={{ appr: reviewedCount, pay: salDue }}>
      {tab === "over" && <AdminOverview store={store} />}
      {tab === "appr" && <AdminApprovals store={store} save={save} />}
      {tab === "deals" && <AdminDeals store={store} save={save} />}
      {tab === "pay" && <AdminPayments store={store} save={save} />}
      {tab === "clients" && <AdminClients store={store} save={save} />}
      {tab === "team" && <AdminTeam store={store} save={save} />}
      {tab === "rank" && <Ranking store={store} viewerSellerId={null} />}
      {tab === "reports" && <AdminReports store={store} />}
      {tab === "set" && <AdminSettings store={store} save={save} />}
    </Shell>
  );
}

/* ---------------------------- root ---------------------------- */
export default function App() {
  const [store, setStore] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!document.getElementById("sd-css")) {
      const el = document.createElement("style");
      el.id = "sd-css"; el.textContent = CSS;
      document.head.appendChild(el);
    }
    (async () => {
      let s = await loadStore();
      if (!s) { s = seedStore(); await saveStore(s); }
      if (!Array.isArray(s.payments)) { s = { ...s, payments: [] }; }
      if (!Array.isArray(s.clients)) { s = { ...s, clients: [] }; }
      if (!Array.isArray(s.accountants)) { s = { ...s, accountants: [] }; }
      setStore(s);
      setLoading(false);
    })();
  }, []);

  const save = (next) => { setStore(next); saveStore(next); };

  if (loading || !store) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="up mono pulse" style={{ color: "var(--gold)", letterSpacing: ".3em", fontSize: 12 }}>Loading SalesDesk…</div>
      </div>
    );
  }

  if (!session) return <Login store={store} onLogin={setSession} />;

  if (session.role === "admin") {
    return <AdminApp store={store} save={save} onLogout={() => setSession(null)} />;
  }
  if (session.role === "acct") {
    const acct = (store.accountants || []).find(a => a.id === session.acctId);
    if (!acct) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <div style={{ color: "var(--mut)", fontSize: 13 }}>This profile no longer exists.</div>
          <Btn kind="gold" onClick={() => setSession(null)}>Back to login</Btn>
        </div>
      );
    }
    return <AcctApp store={store} acct={acct} save={save} onLogout={() => setSession(null)} />;
  }
  const seller = store.sellers.find(s => s.id === session.sellerId);
  if (!seller) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <div style={{ color: "var(--mut)", fontSize: 13 }}>This profile no longer exists.</div>
        <Btn kind="gold" onClick={() => setSession(null)}>Back to login</Btn>
      </div>
    );
  }
  return <SellerApp store={store} seller={seller} save={save} onLogout={() => setSession(null)} />;
}
