// Minimal, hand-typed ABIs for the Juicebox V6 functions the Funding tab calls.
// Signatures verified against Bananapus/nana-core-v6@89ac631 structs and
// deploy-all-v6@316e9d4 artifacts. Kept small (vs full artifacts) to keep the
// frontend bundle lean; full deployment artifacts live in src/data/juicebox.

const JBRULESET_COMPONENTS = [
  { name: "cycleNumber", type: "uint48" },
  { name: "id", type: "uint48" },
  { name: "basedOnId", type: "uint48" },
  { name: "start", type: "uint48" },
  { name: "duration", type: "uint32" },
  { name: "weight", type: "uint112" },
  { name: "weightCutPercent", type: "uint32" },
  { name: "approvalHook", type: "address" },
  { name: "metadata", type: "uint256" },
] as const;

const JBRULESET_METADATA_COMPONENTS = [
  { name: "reservedPercent", type: "uint16" },
  { name: "cashOutTaxRate", type: "uint16" },
  { name: "baseCurrency", type: "uint32" },
  { name: "pausePay", type: "bool" },
  { name: "pauseCreditTransfers", type: "bool" },
  { name: "allowOwnerMinting", type: "bool" },
  { name: "allowSetCustomToken", type: "bool" },
  { name: "allowTerminalMigration", type: "bool" },
  { name: "allowSetTerminals", type: "bool" },
  { name: "allowSetController", type: "bool" },
  { name: "allowAddAccountingContext", type: "bool" },
  { name: "allowAddPriceFeed", type: "bool" },
  { name: "ownerMustSendPayouts", type: "bool" },
  { name: "holdFees", type: "bool" },
  { name: "scopeCashOutsToLocalBalances", type: "bool" },
  { name: "useDataHookForPay", type: "bool" },
  { name: "useDataHookForCashOut", type: "bool" },
  { name: "dataHook", type: "address" },
  { name: "metadata", type: "uint16" },
] as const;

const ACCOUNTING_CONTEXT_COMPONENTS = [
  { name: "token", type: "address" },
  { name: "decimals", type: "uint8" },
  { name: "currency", type: "uint32" },
] as const;

const PAY_HOOK_SPEC_COMPONENTS = [
  { name: "hook", type: "address" },
  { name: "noop", type: "bool" },
  { name: "amount", type: "uint256" },
  { name: "metadata", type: "bytes" },
] as const;

const CASH_OUT_HOOK_SPEC_COMPONENTS = [
  { name: "hook", type: "address" },
  { name: "noop", type: "bool" },
  { name: "amount", type: "uint256" },
  { name: "metadata", type: "bytes" },
] as const;

export const JB_DIRECTORY_ABI = [
  {
    type: "function",
    name: "primaryTerminalOf",
    stateMutability: "view",
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "token", type: "address" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export const JB_PROJECTS_ABI = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "projectId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "event",
    name: "Create",
    inputs: [
      { name: "projectId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "caller", type: "address", indexed: true },
    ],
  },
] as const;

const JBRULESET_CONFIG_COMPONENTS = [
  { name: "mustStartAtOrAfter", type: "uint48" },
  { name: "duration", type: "uint32" },
  { name: "weight", type: "uint112" },
  { name: "weightCutPercent", type: "uint32" },
  { name: "approvalHook", type: "address" },
  {
    name: "metadata",
    type: "tuple",
    components: [...JBRULESET_METADATA_COMPONENTS],
  },
  {
    name: "splitGroups",
    type: "tuple[]",
    components: [
      { name: "groupId", type: "uint256" },
      {
        name: "splits",
        type: "tuple[]",
        components: [
          { name: "percent", type: "uint32" },
          { name: "projectId", type: "uint64" },
          { name: "beneficiary", type: "address" },
          { name: "preferAddToBalance", type: "bool" },
          { name: "lockedUntil", type: "uint48" },
          { name: "hook", type: "address" },
        ],
      },
    ],
  },
  {
    name: "fundAccessLimitGroups",
    type: "tuple[]",
    components: [
      { name: "terminal", type: "address" },
      { name: "token", type: "address" },
      {
        name: "payoutLimits",
        type: "tuple[]",
        components: [
          { name: "amount", type: "uint224" },
          { name: "currency", type: "uint32" },
        ],
      },
      {
        name: "surplusAllowances",
        type: "tuple[]",
        components: [
          { name: "amount", type: "uint224" },
          { name: "currency", type: "uint32" },
        ],
      },
    ],
  },
] as const;

const JBCONTROLLER_ACCOUNTING_CONTEXT_COMPONENTS = [
  { name: "token", type: "address" },
  { name: "decimals", type: "uint8" },
  { name: "currency", type: "uint32" },
] as const;

export const JB_CONTROLLER_ABI = [
  {
    type: "function",
    name: "launchProjectFor",
    stateMutability: "payable",
    inputs: [
      { name: "owner", type: "address" },
      { name: "projectUri", type: "string" },
      {
        name: "rulesetConfigurations",
        type: "tuple[]",
        components: [...JBRULESET_CONFIG_COMPONENTS],
      },
      {
        name: "terminalConfigurations",
        type: "tuple[]",
        components: [
          { name: "terminal", type: "address" },
          {
            name: "accountingContextsToAccept",
            type: "tuple[]",
            components: [...JBCONTROLLER_ACCOUNTING_CONTEXT_COMPONENTS],
          },
        ],
      },
      { name: "memo", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const JB_RULESETS_ABI = [
  {
    type: "function",
    name: "currentRulesetOf",
    stateMutability: "view",
    inputs: [{ name: "projectId", type: "uint256" }],
    outputs: [
      {
        name: "ruleset",
        type: "tuple",
        components: [...JBRULESET_COMPONENTS],
      },
      {
        name: "metadata",
        type: "tuple",
        components: [...JBRULESET_METADATA_COMPONENTS],
      },
    ],
  },
] as const;

export const JB_TOKENS_ABI = [
  {
    type: "function",
    name: "totalBalanceOf",
    stateMutability: "view",
    inputs: [
      { name: "holder", type: "address" },
      { name: "projectId", type: "uint256" },
    ],
    outputs: [{ name: "balance", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalSupplyOf",
    stateMutability: "view",
    inputs: [{ name: "projectId", type: "uint256" }],
    outputs: [{ name: "totalSupply", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalCreditSupplyOf",
    stateMutability: "view",
    inputs: [{ name: "projectId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const JB_MULTI_ABI = [
  {
    type: "function",
    name: "accountingContextsOf",
    stateMutability: "view",
    inputs: [{ name: "projectId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [...ACCOUNTING_CONTEXT_COMPONENTS],
      },
    ],
  },
  {
    type: "function",
    name: "currentSurplusOf",
    stateMutability: "view",
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "tokens", type: "address[]" },
      { name: "decimals", type: "uint256" },
      { name: "currency", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "pay",
    stateMutability: "payable",
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "minReturnedTokens", type: "uint256" },
      { name: "memo", type: "string" },
      { name: "metadata", type: "bytes" },
    ],
    outputs: [{ name: "beneficiaryTokenCount", type: "uint256" }],
  },
  {
    type: "function",
    name: "previewPayFor",
    stateMutability: "view",
    inputs: [
      { name: "projectId", type: "uint256" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "metadata", type: "bytes" },
    ],
    outputs: [
      {
        name: "ruleset",
        type: "tuple",
        components: [...JBRULESET_COMPONENTS],
      },
      { name: "beneficiaryTokenCount", type: "uint256" },
      { name: "reservedTokenCount", type: "uint256" },
      {
        name: "hookSpecifications",
        type: "tuple[]",
        components: [...PAY_HOOK_SPEC_COMPONENTS],
      },
    ],
  },
  {
    type: "function",
    name: "cashOutTokensOf",
    stateMutability: "nonpayable",
    inputs: [
      { name: "holder", type: "address" },
      { name: "projectId", type: "uint256" },
      { name: "cashOutCount", type: "uint256" },
      { name: "tokenToReclaim", type: "address" },
      { name: "minTokensReclaimed", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "metadata", type: "bytes" },
    ],
    outputs: [{ name: "reclaimAmount", type: "uint256" }],
  },
  {
    type: "function",
    name: "previewCashOutFrom",
    stateMutability: "view",
    inputs: [
      { name: "holder", type: "address" },
      { name: "projectId", type: "uint256" },
      { name: "cashOutCount", type: "uint256" },
      { name: "tokenToReclaim", type: "address" },
      { name: "beneficiary", type: "address" },
      { name: "metadata", type: "bytes" },
    ],
    outputs: [
      {
        name: "ruleset",
        type: "tuple",
        components: [...JBRULESET_COMPONENTS],
      },
      { name: "reclaimAmount", type: "uint256" },
      { name: "cashOutTaxRate", type: "uint256" },
      {
        name: "hookSpecifications",
        type: "tuple[]",
        components: [...CASH_OUT_HOOK_SPEC_COMPONENTS],
      },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
