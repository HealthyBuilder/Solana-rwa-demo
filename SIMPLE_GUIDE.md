# Labubu NFT Project Tutorial - Simplified Version

## Tutorial Outline (70 minutes)

**Time Allocation:**
- Part 1: lib.rs Smart Contract Explanation (20 minutes)
- Part 2: Code Generation Process (15 minutes)
- Part 3: Frontend Integration - labubu-card.tsx (25 minutes)
- Part 4: Deployment Initialization Script - tests/initialize.ts (10 minutes)

---

## Part 1: lib.rs Smart Contract Explanation (20 minutes)

### 1.1 Overall Structure Overview (5 minutes)

```
lib.rs File Structure:
├── Imports and Configuration (lines 1-22)
├── #[program] Instruction Module (lines 24-167)
│   ├── initialize_collection     - Initialize contract
│   ├── create_labubu_mint        - Create 11 Mints
│   └── mint_random               - User mints NFT
├── Data Structures (lines 169-175)
│   └── LabubuCollection          - Store inventory data
├── Account Validation (lines 177-272)
│   ├── InitializeCollection      - Accounts for initialization
│   ├── CreateLabubuMint          - Accounts for creating Mint
│   └── MintRandom                - Accounts for minting
└── Error Definitions (lines 274-281)
    └── LabubuError               - Custom errors
```


---

### 1.2 Three Core Instructions (10 minutes)

#### Instruction 1: `initialize_collection` (lines 34-53)

**Purpose:** Create and initialize the entire Labubu collection system

```rust
pub fn initialize_collection(ctx: Context<InitializeCollection>) -> Result<()> {
    let collection = &mut ctx.accounts.collection;

    // Set inventory: first 10 types get 120, 11th type gets 6
    for i in 0..11 {
        collection.remaining_supply[i] = if i < 10 { 120 } else { 6 };
    }

    collection.total_minted = 0;
    collection.authority = ctx.accounts.authority.key();

    Ok(())
}
```

**Key Points:**
- Creates `collection` PDA account
- Initializes inventory array: `[120, 120, ..., 120, 6]`


---

#### Instruction 2: `create_labubu_mint` (lines 57-110)

**Purpose:** Create a Token-2022 Mint for each Labubu ID

```rust
pub fn create_labubu_mint(ctx: Context<CreateLabubuMint>, labubu_id: u8) -> Result<()> {
    // 1. Validate ID
    require!(labubu_id >= 1 && labubu_id <= 11, ...);

    // 2. Calculate rent
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(82);

    // 3. Create Mint account (System Program)
    system_program::create_account(...);

    // 4. Initialize Mint (Token Program)
    token_interface::initialize_mint2(
        decimals: 0,                      // NFT is indivisible
        mint_authority: collection_pda,   // Only program can mint
        freeze_authority: None,           // Cannot freeze
    );

    Ok(())
}
```

**Key Points:**
- Mint authority is collection PDA (important!)


---

#### Instruction 3: `mint_random` (lines 114-166)

**Purpose:** User mints a Labubu NFT

```rust
pub fn mint_random(ctx: Context<MintRandom>, labubu_id: u8) -> Result<()> {
    let collection = &mut ctx.accounts.collection;
    let index = (labubu_id - 1) as usize;

    // 1. Validate ID and inventory
    require!(labubu_id >= 1 && labubu_id <= 11, ...);
    require!(collection.remaining_supply[index] > 0, LabubuError::SoldOut);

    // 2. Decrement inventory
    collection.remaining_supply[index] -= 1;

    // 3. PDA signing
    let seeds = &[b"collection", &[ctx.bumps.collection]];
    let signer_seeds = &[&seeds[..]];

    // 4. Mint token via CPI
    token_interface::mint_to(..., 1)?;

    // 5. Update stats
    collection.total_minted += 1;

    Ok(())
}
```

---

#### Concept 2: CPI (Cross-Program Invocation)

**Like smart contracts calling each other:**

```
Our Program (Vault)
    │
    │ CPI
    ▼
System Program ──> create_account(mint)
    │
    │ CPI
    ▼
Token Program ──> initialize_mint2(mint)
                  mint_to(user_ata)
```

---

## Part 2: Code Generation Process (15 minutes)

### 2.1 Anchor Build Process (5 minutes)

```bash
# Execute in anchor/ directory
anchor build
```

**What happens:**
1. Compiles Rust code → Binary program
2. Generates IDL file → `anchor/target/idl/vault.json`
3. Generates TypeScript types → `anchor/target/types/vault.ts`

**IDL file structure:**
```json
{
  "version": "0.1.0",
  "name": "vault",
  "instructions": [
    {
      "name": "initializeCollection",
      "accounts": [...],
      "args": []
    },
    {
      "name": "createLabubuMint",
      "accounts": [...],
      "args": [{"name": "labubu_id", "type": "u8"}]
    },
    {
      "name": "mintRandom",
      "accounts": [...],
      "args": [{"name": "labubu_id", "type": "u8"}]
    }
  ],
  "accounts": [...],
  "errors": [...]
}
```

---

### 2.2 Using Codama to Generate TypeScript Client (10 minutes)

#### Step 1: Check Codama Configuration

This project uses **Codama CLI** tool, with configuration in root directory's `codama.json`:

```json
{
  "idl": "./anchor/target/idl/vault.json",  // IDL file path
  "scripts": {
    "js": [
      {
        "from": "@codama/renderers-js",     // Use JS renderer
        "args": ["./app/generated/vault"]   // Output directory
      }
    ]
  }
}
```

**Configuration explanation:**
- `idl`: Points to Anchor-generated IDL file
- `scripts.js`: Defines JavaScript/TypeScript code generator
- `args[0]`: Output directory for generated code

#### Step 2: Run Generation Command

```bash
# Execute in project root directory
npm run codama:js

```


#### Step 3: Generated File Structure

```
app/generated/vault/
├── index.ts                    # Main export file
├── programs/
│   └── vault.ts               # Program ID and basic info
├── instructions/
│   ├── initializeCollection.ts
│   ├── createLabubuMint.ts
│   └── mintRandom.ts          # Contains getMintRandomInstructionAsync()
├── accounts/
│   └── labubuCollection.ts    # Account types
├── errors/
│   └── vault.ts               # Error types
└── shared/
    └── index.ts               # Shared types
```

---


## Part 3: Frontend Integration - labubu-card.tsx (25 minutes)

### 3.1 Frontend Project Structure (5 minutes)

```
app/
├── components/
│   └── labubu-card.tsx        # NFT minting card component
├── generated/vault/           # Auto-generated code
├── page.tsx                   # Main page
└── ...
```

**Tech Stack:**
- Next.js + React
- `@solana/web3.js` - Solana connection
- `@solana/wallet-adapter` - Wallet integration
- Generated TypeScript client

---

### 3.2 labubu-card.tsx Core Code Explanation (15 minutes)

#### File Structure Overview

---

#### Core Part 1: Import Generated Code (line 5)

```typescript
import { getMintRandomInstructionAsync } from "../generated/vault/instructions/mintRandom";
```

**Where does this function come from?**
- ✅ From `lib.rs` compiled to IDL
- ✅ Codama generates TypeScript from IDL


---

#### Core Part 2: Mint Address Configuration (lines 12-24)

```typescript
const MINT_ADDRESSES = [
  "HumC...",  // Labubu #1 Mint PDA address
  "2ELU...",  // Labubu #2 Mint PDA address
  // ...
  "3Mvu...",  // Labubu #11 Mint PDA address (hidden edition)
];
```

**Where do these addresses come from?**
1. Admin calls `create_labubu_mint(1..11)`
2. Each call creates a PDA
3. Addresses are deterministic and can be pre-calculated


---

#### Core Part 3: handleMint Function Explained (lines 33-108)

**Step 1: Check wallet connection (lines 34-37)**

```typescript
if (!wallet || status !== "connected") {
  alert("Please connect your wallet first!");
  return;
}
```

---

**Step 2: Frontend randomly selects Labubu (lines 40-54)**

```typescript
// Weighted random by inventory
const totalWeight = labubuMetadata.labubus.reduce((sum, l) => sum + l.supply, 0);
// Total weight = 120*10 + 6 = 1206

const random = Math.floor(Math.random() * 1206);
// Generate random number 0-1205

let selectedId = 1;


```

---

**Step 3: Prepare accounts (lines 58-66)**

```typescript
// Get corresponding Mint address
const mintAddress = MINT_ADDRESSES[selectedId - 1];
// Example: selectedId=3 → MINT_ADDRESSES[2]

// Create Signer object
const userSigner = {
  address: wallet.account.address,       // User wallet address
  signTransactions: wallet.signTransactions,  // Signing function
  signMessages: wallet.signMessages,     // Message signing
};
```

---

**Step 4: Create instruction (lines 68-72)**

```typescript
const instruction = await getMintRandomInstructionAsync({
  user: userSigner,        // User signer
  mint: mintAddress,       // Mint PDA address
  labubu_id: selectedId,   // 1-11
});
```

---

**Step 5: Send transaction (lines 75-77)**

```typescript
const signature = await send({
  instructions: [instruction],
});
```


---

**Step 6: Update UI (lines 79-82)**

```typescript
setTxSignature(signature);        // Save transaction signature
setSelectedLabubu(selectedId);    // Display drawn Labubu

alert(`Successfully minted Labubu #${selectedId}!\nTransaction: ${signature}`);
```

---

#### Core Part 4: UI Display (lines 115-178)

**Before minting state (lines 125-129):**
```typescript
{!selectedLabubu ? (
  <div className="mystery-box">
    <div className="box-icon">?</div>
    <p>Mystery Box</p>
  </div>
) : (
  // Display drawn Labubu
)}
```

**After minting display (lines 131-159):**
```typescript
<div className="labubu-reveal">
  <img src={currentLabubu?.image} />
  <h3>{currentLabubu?.name}</h3>
  <p>{currentLabubu?.description}</p>

  {/* Attribute tags */}
  <div className="attributes">
    {currentLabubu?.attributes.map(attr => (
      <span className="badge">
        {attr.trait_type}: {attr.value}
      </span>
    ))}
  </div>

  {/* Hidden edition effects */}
  {currentLabubu?.rarity === "legendary" && (
    <div className="legendary-badge">🌟 LEGENDARY 🌟</div>
  )}

  {/* Link to blockchain explorer */}
  <a href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}>
    View Transaction on Explorer
  </a>
</div>
```


---

## Part 4: Deployment Initialization Script - tests/initialize.ts (10 minutes)

### 4.1 Why Do We Need This Test File? (2 minutes)

Although called a "test", this file is actually a **deployment initialization script**:

```
Deployment Flow:
1. anchor build          → Compile contract
2. anchor deploy         → Deploy contract to chain
3. anchor run initialize → Run this script!
   ├─ Initialize collection
   └─ Create 11 mints
```

**If you don't run this script:**
- ❌ Collection account doesn't exist
- ❌ 11 Mint accounts don't exist
- ❌ Frontend cannot call `mint_random`

---

### 4.2 Test File Structure (3 minutes)

[anchor/tests/initialize.ts](anchor/tests/initialize.ts) contains two tests:

```typescript
describe("Initialize Labubu Collection", () => {
  // Configuration
  const provider = anchor.AnchorProvider.env();
  const program = anchor.workspace.Vault as Program<Vault>;

  // Derive collection PDA
  const [collectionPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("collection")],
    program.programId
  );

  // Test 1: Initialize Collection
  it("Initialize Collection", async () => { ... });

  // Test 2: Create 11 Mints
  it("Create Mints for 11 Labubu types", async () => { ... });
});
```

---

### 4.3 Test 1: Initialize Collection (2 minutes)

```typescript
it("Initialize Collection", async () => {
  // Call initialize_collection instruction
  const tx = await program.methods
    .initializeCollection()
    .accounts({
      authority: provider.wallet.publicKey,
      collection: collectionPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("✅ Collection initialized successfully!");
  console.log("Transaction signature:", tx);

  // Verify account data
  const collectionAccount = await program.account.labubuCollection.fetch(
    collectionPda
  );
  console.log("Total supply:", collectionAccount.remainingSupply);
  // Output: [120, 120, 120, ..., 120, 6]
});
```

**What this test does:**
1. Calls `initialize_collection()` instruction
2. Creates collection PDA account
3. Reads and verifies account data

---

### 4.4 Test 2: Create 11 Mints (3 minutes)

```typescript
it("Create Mints for 11 Labubu types", async () => {
  const labubuNames = [
    "Zone Out", "Ab Roller", "Confident", ..., "Secret Edition ⭐"
  ];

  // Loop to create 11 mints
  for (let i = 1; i <= 11; i++) {
    // 1. Derive Mint PDA
    const [mintPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("labubu_mint"), Buffer.from([i])],
      program.programId
    );

    // 2. Call create_labubu_mint instruction
    const tx = await program.methods
      .createLabubuMint(i)
      .accounts({
        authority: provider.wallet.publicKey,
        collection: collectionPda,
        mint: mintPda,
        tokenProgram: TOKEN_2022_PROGRAM_ID,  // ⚠️ Note: Token-2022
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log(`✅ Mint #${i} created successfully: ${mintPda.toString()}`);
    // Copy these addresses to frontend MINT_ADDRESSES!
  }
});
```

**Key Points:**
- Loop 11 times to create a Mint for each Labubu
- Print each Mint's address → **Copy these addresses to frontend**
- Uses Token-2022 program ID

---

### 4.5 How to Run This Script? (2 minutes)

**Configuration file:** [anchor/Anchor.toml](anchor/Anchor.toml:19)
```toml
[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
initialize = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/initialize.ts"
```

**Run commands:**
```bash
cd anchor

# Method 1: Run initialization script
anchor run initialize

# Method 2: Skip build and deploy (if already deployed)
anchor test --skip-build --skip-deploy
```

**Example output:**
```
🚀 Initializing Labubu Collection...
Program ID: B6HTnuN4RgoEnsxWFm74TVXdHEQb7fSjguzovQQjZseY
Collection PDA: 7xK...
✅ Collection initialized successfully!

🎨 Creating 11 Labubu Mints...
  Creating Labubu #1 (Zone Out)...
  ✅ Mint #1 created successfully: HumCJgnAS7kd3fvgeqw5dKHpbXu7VDPg6YteKnbpXJKA
  Creating Labubu #2 (Ab Roller)...
  ✅ Mint #2 created successfully: 2ELUipFLayimdwU29R3qvAXYYBEATpEusgjPt3dZYLFY
  ...
🎉 All Mints created successfully!
```

**⚠️ Important:** Copy these Mint addresses to frontend `labubu-card.tsx`'s `MINT_ADDRESSES` array!

---

## Summary: Relationship Between Three Parts

```
┌─────────────────────────────────────────────────────────┐
│                     lib.rs (Rust)                       │
│  Define: instructions, accounts, logic                  │
│  ├─ initialize_collection()                            │
│  ├─ create_labubu_mint()                               │
│  └─ mint_random()                                      │
└─────────────────┬───────────────────────────────────────┘
                  │ anchor build
                  ▼
┌─────────────────────────────────────────────────────────┐
│              IDL (vault.json)                           │
│  JSON description: instructions, accounts, parameters   │
└─────────────────┬───────────────────────────────────────┘
                  │ codama
                  ▼
┌─────────────────────────────────────────────────────────┐
│         Generated TypeScript Code                       │
│  app/generated/vault/                                   │
│  ├─ instructions/mintRandom.ts                         │
│  ├─ accounts/labubuCollection.ts                       │
│  └─ ...                                                │
└─────────────────┬───────────────────────────────────────┘
                  │ import & use
                  ▼
┌─────────────────────────────────────────────────────────┐
│        Frontend (labubu-card.tsx)                       │
│  Use: call generated functions                          │
│  └─ getMintRandomInstructionAsync()                    │
└─────────────────────────────────────────────────────────┘
```

---

## Demo Flow Suggestions

### 1. Preparation (Before Class)

```bash
# 1. Compile contract and generate TypeScript code
npm run setup
# This executes:
#   - cd anchor && anchor build  (Compile Rust → IDL)
#   - codama run js              (IDL → TypeScript)

# 2. Deploy contract to devnet
cd anchor
anchor deploy --provider.cluster devnet

# 3. Initialize collection and create all 11 mints
anchor run initialize
# This executes tests/initialize.ts script:
#   - Initialize collection PDA
#   - Create 11 Labubu Mint PDAs
#   - Print all Mint addresses (copy to frontend)

# 4. Start frontend
cd ..
npm run dev
```

### 2. Tutorial Flow Suggestions

1. **First explain lib.rs** (20 minutes)
   - Show code for three instructions
   - Explain PDA, CPI, ATA concepts

2. **Then explain code generation** (15 minutes)
   - Show IDL generated by `anchor build`
   - Run `npm run codama:js` to generate TypeScript
   - Show generated file structure

3. **Then explain frontend integration** (25 minutes)
   - Show how labubu-card.tsx uses generated code
   - Demonstrate complete mint flow

4. **Finally explain deployment initialization** (10 minutes)
   - Show tests/initialize.ts script
   - Run `anchor run initialize`
   - Explain why this step is needed

---

**Done!** 🎉
