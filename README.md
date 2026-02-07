# RWA Sentinel Protocol 🛡️

<p align="center">
  <img src="assets/banner.png" alt="RWA Sentinel Protocol Architecture" width="100%">
</p>

<p align="center">
  <b>AI-Powered Oracle for Model 4 Real World Asset Tokenization</b>
</p>

---

**AI-Powered Oracle for Model 4 Real World Asset Tokenization**

---

## The Problem

Real World Assets (RWAs) remain largely illiquid despite growing tokenization efforts. This stems from two distinct liquidity challenges:

- **Interface Liquidity** — The friction of moving assets on/off-chain (oracles, legal docs, compliance).
- **Structural Liquidity** — The lack of embedded collateral and redemption rights within the token design itself.

Most RWA protocols address only one of these. RWA Sentinel tackles both through a hybrid **Legal + AI + Blockchain** architecture.

---

## The Solution: Our Architecture

RWA Sentinel uses a dual-validation flow: a human legal validator and an AI oracle must both approve before tokens can be minted.

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  Legal Validator    │     │     AI Oracle       │     │     Blockchain      │
│  (Lawyer/Notary)    │────▶│  (Python Backend)   │────▶│  (Solidity ERC20)   │
│                     │     │                     │     │                     │
│  • Submits PDF      │     │  • GPT-4 audit      │     │  • Model 4 token    │
│  • Signs document   │     │  • Signs doc hash   │     │  • Redemption flow  │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
         │                              │                            │
         └──────────────────────────────┴────────────────────────────┘
                              EIP-191 Signatures
```

**Flow:** Legal Validator submits a PDF → AI Oracle audits and signs the document hash → Blockchain verifies both signatures before minting the Model 4 RWA token.

---

## Key Features

| | Feature | Description |
|---|---|---|
| 🤖 | **AI-Driven Audit** | GPT-4 verifies redemption rights and collateral clauses before minting. |
| ⚖️ | **Legal-Tech Gatekeeper** | Only whitelisted validators (lawyers/notaries) can initiate tokenization. |
| 💎 | **Model 4 Liquidity** | Embedding collateral and redemption rights directly into the smart contract. |
| 🔐 | **Cryptographic Proof** | EIP-191 signatures link off-chain audit to on-chain assets. |

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **AI / Backend** | Python, FastAPI, Web3.py, OpenAI API |
| **Smart Contracts** | Solidity ^0.8.20, Hardhat, OpenZeppelin |
| **Blockchain** | EVM-compatible (Hardhat localhost / mainnet) |

---

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- (Optional) OpenAI API key for live AI audits

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/rwa-sentinel-protocol.git
cd rwa-sentinel-protocol

# Install blockchain dependencies
cd blockchain-protocol && npm install

# Install AI backend dependencies
cd ../ai-legal-core && pip install -r requirements.txt
```

### Run Integration Test

```bash
cd blockchain-protocol
npx hardhat compile
npx hardhat run scripts/deploy-and-test.js
```

### Run AI Oracle (Optional)

```bash
cd ai-legal-core
cp .env.example .env   # Add your OPENAI_API_KEY
uvicorn main:app --reload
```

---

## Project Structure

```
rwa-sentinel-protocol/
├── ai-legal-core/          # Python FastAPI - Legal Oracle
│   ├── main.py             # Audit endpoint, signature verification
│   ├── services/
│   └── requirements.txt
├── blockchain-protocol/    # Solidity + Hardhat
│   ├── contracts/          # RWALiquidityProtocol.sol
│   └── scripts/            # deploy-and-test.js
├── docs/
│   └── architecture.md
└── README.md
```

---

## Disclaimer

> **This is a technical Proof of Concept (PoC) for architecture research. Not financial advice.**  
> The project is intended for educational and research purposes. Do not use in production without proper legal, compliance, and security audits.

---

## License

MIT
