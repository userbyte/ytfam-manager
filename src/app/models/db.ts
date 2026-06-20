export type Member = {
  [key: string]: string | number | boolean | undefined;
  name: string;
  balance: number;
  passcode: string;
  admin: boolean;
};

export type Payment = {
  [key: string]: string | number | boolean | undefined;
  id: number;
  timestamp: number;
  member: string;
  amount: number;
  approved: boolean;
  processed: boolean;
};

export type Charge = {
  id: number;
  timestamp: number;
  /** Total charge amount */
  amount: number;
  /** Member count as of this charge */
  memberCount: number;
  /** Calculated cost per member */
  memberCost: number;
};

export type BalanceAdjustment = {
  id: number;
  timestamp: number;
  /** Admin doing the adjusting */
  adjuster: string;
  /** Member who the adjustment is applying to */
  adjusted: string;
  /** Member balance before adjustment */
  balanceFrom: number;
  /** Member balance after adjustment */
  balanceTo: number;
};

export type Family = {
  [key: string]:
    | string
    | number
    | Array<Member>
    | Array<Payment>
    | Array<Charge>
    | Array<BalanceAdjustment>
    | undefined;
  name: string;
  family_code: string;
  plan_start: number;
  next_renewal: number;
  price: number;
  rounding: "up" | "down" | "none";
  members: Array<Member>;
  payments: Array<Payment>;
  charges: Array<Charge>;
  adjustments: Array<BalanceAdjustment>;
};

export type MemberStripped = {
  name: string;
  balance: number;
  admin: boolean;
};

export type FamilyStripped = {
  name: string;
  family_code: string;
  plan_start: number;
  next_renewal: number;
  price: number;
  members: Array<MemberStripped>;
  payments: Array<Payment>;
  charges: Array<Charge>;
  adjustments: Array<BalanceAdjustment>;
};
