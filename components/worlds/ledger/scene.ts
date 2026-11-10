// Scene content for the "ledger" world (CredWise): the lending desk, the applicant files the demo
// scores, and the extra copy each part of the world needs. Filled in data/projects/credwise.ts.

export type Band = "approved" | "review" | "declined";

/** What a statement line means for the borrower — colours its NLP flag on the tape. */
export type TagKind = "income" | "obligation" | "spend" | "risk";

export interface Txn {
  /** "01 OCT" */
  date: string;
  /** the narration exactly as the bank prints it */
  narration: string;
  /** rupees: + credit, − debit */
  amount: number;
  /** NLP category, "INVOICE" */
  tag: string;
  kind: TagKind;
  /** classifier confidence 0..1 */
  conf: number;
  /** the token the classifier keyed on — highlighted on the tape when the tag lands */
  hit?: string;
}

/**
 * What the engine reads from twelve-ish months of statements (components/worlds/ledger/engine.ts).
 * emi, incomeMonths, utilisation and bounces are the levers the what-if sliders move.
 */
export interface Profile {
  /** average monthly inflow, ₹ */
  income: number;
  /** months of statements read */
  months: number;
  /** lever — monthly EMIs, ₹, a multiple of 250 */
  emi: number;
  /** lever — months with income credited */
  incomeMonths: number;
  /** lever — % of the revolving limit in use */
  utilisation: number;
  line: "card" | "overdraft";
  /** lever — bounced / returned payments in the last 12 months */
  bounces: number;
  /** average balance, in days of spending */
  bufferDays: number;
  /** months of the last 12 the rent left by the 5th; null = pays no rent */
  rentOnTime: number | null;
  /** % of spending withdrawn as cash */
  cashShare: number;
}

export interface Borrower {
  id: string;
  /** file number on the desk, "CW-25-0417" */
  file: string;
  name: string;
  age: number;
  occupation: string;
  city: string;
  /** what the credit bureau has on them — the reason this is a thin file */
  bureau: string;
  ask: { amount: number; months: number; purpose: string };
  bank: { name: string; branch: string; account: string; period: string; lines: number };
  profile: Profile;
  /** an excerpt of the statement, printed on the tape */
  txns: Txn[];
}

export interface LedgerScene {
  /** the lending desk the demo runs at; date is the day the files are scored */
  desk: { lender: string; city: string; model: string; features: number; date: string };
  borrowers: Borrower[];
  /** stamps for challenge / solution / outcome, in that order */
  caseHistory: { band: Band; label: string; when: string }[];
  /** who signed the audit trail */
  actor: string;
  /** one per project.process step, same order. `tamper` is the edited title the visitor can swap in. */
  audit: { at: string; action: string; artefact: string; tamper: string }[];
  /** one voucher per project.decisions entry; lines[i] = what option i debits and credits */
  journal: { ref: string; date: string; lines: { dr: string; cr: string }[] }[];
  /** the machine that turns a statement line into a reason code; tech names match project.technologies */
  pipeline: { stage: string; techs: string[]; packet: string; sample: string }[];
  /** one ticker symbol per project.metrics entry; dir draws the arrow */
  ticker: { symbol: string; dir: "up" | "down" | "flat" }[];
}
