# Security Audit Report — RWALiquidityProtocol.sol

**Auditor:** Senior Smart Contract Security Auditor  
**Date:** February 2025  
**Scope:** `blockchain-protocol/contracts/RWALiquidityProtocol.sol` and signature logic  

---

## Executive Summary

A critical **Signature Replay Attack** vulnerability was identified. A whitelisted validator (lawyer) could reuse the same valid oracle signature indefinitely to mint unlimited tokens. Additionally, **Front-Running** between validators is possible. Access control on admin functions is correctly implemented.

---

## 1. Signature Replay Attack — CRITICAL (CVE-worthy)

### Description

The oracle signs only `docHash`. The contract verifies:
1. `msg.sender` is in `legalValidators`
2. `oracleSignature` recovers to `oracleAddress` for `keccak256(abi.encodePacked(docHash))`

**There is no tracking of used signatures.** A validator who receives a valid `(docHash, oracleSignature)` can call:

```
mintRWA(1000, docHash, signature);  // Success
mintRWA(1000, docHash, signature);  // Success again — same signature reused!
mintRWA(1_000_000, docHash, signature);  // Success — unlimited minting
```

### Impact

- **Severity:** CRITICAL  
- **Attack:** Whitelisted validator reuses one oracle signature to mint arbitrary amounts, unlimited times  
- **Result:** Unbounded inflation, protocol insolvency  

### Root Cause

The signed message does not include:
- `nonce` or `usedSignatures` mapping on-chain  
- `amount` (bound to a specific mint)  
- `msg.sender` / recipient (bound to a specific validator)  

### Remediation (Implemented)

Add `mapping(bytes32 => bool) public usedSignatures` and mark `keccak256(abi.encodePacked(docHash, oracleSignature))` as used after each successful mint. Revert if already used.

---

## 2. Front-Running — HIGH

### Description

The signature does **not** include `msg.sender` or recipient. Therefore:

1. Validator A broadcasts `mintRWA(1000, docHash, signature)`  
2. Validator B (also whitelisted) sees the tx in the mempool  
3. Validator B front-runs with `mintRWA(1000, docHash, signature)` from their own address  
4. Validator B mints to themselves, consuming the signature  
5. Validator A’s tx reverts with "Signature already used" (after replay fix) or succeeds again (before fix)

### Impact

- **Severity:** HIGH (after replay fix) / CRITICAL (before fix)  
- **Attack:** Another whitelisted validator can steal a mint by front-running  

### Remediation (Recommended for v2)

Have the oracle sign `keccak256(abi.encodePacked(docHash, amount, recipient))` so the signature is bound to:
- Specific amount  
- Specific recipient  

This requires backend changes. The replay fix limits damage; full protection needs binding in the signed message.

---

## 3. Access Control — SECURE

### Description

- `setOracleAddress`, `addValidator`, `removeValidator` use `onlyOwner`  
- `Ownable` from OpenZeppelin is correctly inherited  
- Constructor validates `initialOwner != address(0)`  

**No issues found.**

---

## 4. Other Observations

| Item | Status |
|------|--------|
| Reentrancy | N/A — no external calls before state changes |
| Integer overflow | Mitigated — Solidity ^0.8.x |
| Zero oracle address | Checked in `setOracleAddress` |
| Zero validator | Checked in `addValidator` |
| `redeem` amount > balance | Handled by `_burn` (ERC20 reverts) |

---

## Summary of Fixes Applied

1. **Replay protection:** `usedSignatures` mapping + revert on reuse  
2. **.gitignore:** `artifacts/` and `cache/` included (Hardhat build artifacts)  

---

*This report reflects the state of the contract as audited. A full external audit is recommended before mainnet deployment.*
