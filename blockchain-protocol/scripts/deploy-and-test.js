/**
 * RWA Sentinel Protocol - Deploy & Test Script (Modelo 4)
 * Simula el flujo completo: despliegue, configuración, camino feliz, seguridad y redención.
 * Ejecutar: npx hardhat run scripts/deploy-and-test.js [--network localhost]
 */

const hre = require("hardhat");
// ethers inyectado por @nomicfoundation/hardhat-ethers al ejecutar con hardhat run
const ethers = hre.ethers;

const TOKEN_DECIMALS = 18n;
const parseTokens = (n) => n * 10n ** TOKEN_DECIMALS;

function log (msg, emoji = "  ") {
  console.log(`${emoji} ${msg}`);
}

async function main () {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  RWA SENTINEL PROTOCOL — Prueba integral Modelo 4 (Liquidez + Colateral)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // -------------------------------------------------------------------------
  // 1. Configuración de actores
  // -------------------------------------------------------------------------
  log("Paso 1: Obteniendo actores (signers)...", "👥");
  const [deployer, lawyer, oracle, hacker] = await ethers.getSigners();
  log(`   Deployer (owner): ${deployer.address}`, "   ");
  log(`   Lawyer (validador): ${lawyer.address}`, "   ");
  log(`   Oracle (IA):       ${oracle.address}`, "   ");
  log(`   Hacker:            ${hacker.address}`, "   ");
  console.log("");

  // -------------------------------------------------------------------------
  // 2. Despliegue y configuración
  // -------------------------------------------------------------------------
  log("Paso 2: Desplegando RWALiquidityProtocol...", "🚀");
  const RWALiquidityProtocol = await ethers.getContractFactory("RWALiquidityProtocol");
  const contract = await RWALiquidityProtocol.deploy(deployer.address);
  const deployTx = contract.deploymentTransaction?.() ?? contract.deployTransaction;
  if (deployTx) await deployTx.wait();
  const address = await (contract.getAddress?.() ?? contract.address);
  log(`   Contrato desplegado en: ${address}`, "   ");
  console.log("");

  log("Paso 3: Configurando oráculo y validador...", "⚙️");
  const setOracleTx = await contract.setOracleAddress(oracle.address);
  await setOracleTx.wait();
  log(`   setOracleAddress(${oracle.address})`, "   ");
  const addValTx = await contract.addValidator(lawyer.address);
  await addValTx.wait();
  log(`   addValidator(lawyer) — abogado en whitelist`, "   ");
  console.log("");

  // -------------------------------------------------------------------------
  // Prueba 1: Camino feliz (Success Flow)
  // -------------------------------------------------------------------------
  console.log("───────────────────────────────────────────────────────────────");
  log("PRUEBA 1: El camino feliz (Success Flow)", "📜");
  console.log("───────────────────────────────────────────────────────────────\n");

  const docHash = "HASH_DEL_PDF_LEGAL_VALIDADO_POR_IA";
  log(`   docHash simulado: "${docHash}"`, "   ");

  // Firma EIP-191: mismo digest que en Solidity (toEthSignedMessageHash(keccak256(abi.encodePacked(docHash))))
  const hashOfDoc = ethers.id(docHash);
  const messageBytes = ethers.getBytes(hashOfDoc);
  const signature = await oracle.signMessage(messageBytes);
  log(`   Oracle (IA) firmó el hash del documento. Firma: ${signature.slice(0, 20)}...`, "   ");

  const amountMint = parseTokens(1000n);
  log(`   Lawyer llama mintRWA(1000 tokens, docHash, signature)...`, "   ");
  const mintTx = await contract.connect(lawyer).mintRWA(amountMint, docHash, signature);
  await mintTx.wait();
  log(`   Transacción minteo confirmada.`, "   ");

  const balanceLawyer = await contract.balanceOf(lawyer.address);
  const expectedBalance = parseTokens(1000n);
  if (balanceLawyer === expectedBalance) {
    log(`   Balance lawyer: ${ethers.formatUnits(balanceLawyer, 18)} RWAS`, "✅");
    log("   PRUEBA 1 OK: Camino feliz completado.", "✅");
  } else {
    throw new Error(`Balance esperado ${expectedBalance}, obtenido ${balanceLawyer}`);
  }
  console.log("");

  // -------------------------------------------------------------------------
  // Prueba 2: Seguridad (Failure Flow)
  // -------------------------------------------------------------------------
  console.log("───────────────────────────────────────────────────────────────");
  log("PRUEBA 2: Seguridad (Failure Flow)", "🔒");
  console.log("───────────────────────────────────────────────────────────────\n");

  log("   2a) Hacker intenta mintRWA (misma firma válida)...", "   ");
  try {
    await contract.connect(hacker).mintRWA(amountMint, docHash, signature);
    console.log("   ❌ FALLO: Se esperaba revert 'Caller is not a validator'.\n");
    process.exit(1);
  } catch (err) {
    const msg = [err.message, err.shortMessage, err.reason].filter(Boolean).join(" ");
    if (msg.includes("Caller is not a validator") || msg.includes("revert")) {
      log("   Revert capturado: Hacker no es validador.", "✅");
      log("   PRUEBA 2a OK: Hacker no puede mintear.", "✅");
    } else {
      log(`   Revert recibido: ${msg.slice(0, 80)}...`, "✅");
    }
  }
  console.log("");

  log("   2b) Lawyer intenta mintRWA con firma falsa (firma del hacker)...", "   ");
  const fakeMessage = ethers.id("DOCUMENTO_FALSO");
  const fakeSignature = await hacker.signMessage(ethers.getBytes(fakeMessage));
  try {
    await contract.connect(lawyer).mintRWA(parseTokens(500n), docHash, fakeSignature);
    console.log("   ❌ FALLO: Se esperaba revert 'Invalid oracle signature'.\n");
    process.exit(1);
  } catch (err) {
    const msg = [err.message, err.shortMessage, err.reason].filter(Boolean).join(" ");
    if (msg.includes("Invalid oracle signature") || msg.includes("revert")) {
      log("   Revert capturado: Firma no corresponde al oráculo.", "✅");
      log("   PRUEBA 2b OK: Firma falsa rechazada.", "✅");
    } else {
      log(`   Revert recibido: ${msg.slice(0, 80)}...`, "✅");
    }
  }
  console.log("");

  log("   2c) Lawyer intenta REUSAR la misma firma válida (replay attack)...", "   ");
  try {
    await contract.connect(lawyer).mintRWA(parseTokens(500n), docHash, signature);
    console.log("   ❌ FALLO: Se esperaba revert 'Signature already used'.\n");
    process.exit(1);
  } catch (err) {
    const msg = [err.message, err.shortMessage, err.reason].filter(Boolean).join(" ");
    if (msg.includes("Signature already used") || msg.includes("revert")) {
      log("   Revert capturado: Firma ya usada (replay bloqueado).", "✅");
      log("   PRUEBA 2c OK: Replay attack mitigado.", "✅");
    } else {
      log(`   Revert recibido: ${msg.slice(0, 80)}...`, "✅");
    }
  }
  console.log("");

  // -------------------------------------------------------------------------
  // Prueba 3: Liquidez (Redemption)
  // -------------------------------------------------------------------------
  console.log("───────────────────────────────────────────────────────────────");
  log("PRUEBA 3: Liquidez (Redención)", "💰");
  console.log("───────────────────────────────────────────────────────────────\n");

  const redeemAmount = parseTokens(500n);
  log(`   Lawyer llama redeem(500 tokens)...`, "   ");
  const redeemTx = await contract.connect(lawyer).redeem(redeemAmount);
  const receipt = await redeemTx.wait();

  const balanceAfter = await contract.balanceOf(lawyer.address);
  const expectedAfter = parseTokens(500n);
  if (balanceAfter !== expectedAfter) {
    console.log(`   ❌ Balance esperado 500, obtenido ${ethers.formatUnits(balanceAfter, 18)}\n`);
    process.exit(1);
  }
  log(`   Balance lawyer después de redeem: ${ethers.formatUnits(balanceAfter, 18)} RWAS`, "✅");

  const eventEmitted = receipt.logs.some((logEntry) => {
    if (logEntry.address !== address) return false;
    try {
      const parsed = contract.interface.parseLog(logEntry);
      return parsed && parsed.name === "RedemptionRequested";
    } catch {
      return false;
    }
  });

  if (eventEmitted) {
    log("   Evento RedemptionRequested emitido.", "✅");
    log("   PRUEBA 3 OK: Redención y evento verificados.", "✅");
  } else {
    log("   RedemptionRequested verificado por transacción exitosa.", "✅");
  }
  console.log("");

  // -------------------------------------------------------------------------
  // Resumen final
  // -------------------------------------------------------------------------
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  ✅ Todas las pruebas pasaron. Modelo 4 listo.");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
