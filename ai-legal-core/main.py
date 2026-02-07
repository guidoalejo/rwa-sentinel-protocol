# RWA Sentinel Protocol - AI Legal Core
# Oráculo Legal: audita documentos y emite señales para tokenización RWA (Modelo 4)

import hashlib
import json
import os
from typing import Any

from dotenv import load_dotenv
from eth_account import Account
from eth_account.messages import encode_defunct
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Cargar variables de entorno desde .env
load_dotenv()

# -----------------------------------------------------------------------------
# Configuración FastAPI y CORS
# -----------------------------------------------------------------------------
app = FastAPI(
    title="RWA Sentinel Protocol - Legal Oracle",
    description="Oráculo que audita documentos legales para tokenización RWA (Modelo 4)",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Whitelist de validadores legales (solo estas wallets pueden solicitar auditoría)
# -----------------------------------------------------------------------------
LEGAL_VALIDATORS_WHITELIST: list[str] = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",  # Cuenta 0 por defecto de Hardhat
]

# -----------------------------------------------------------------------------
# Modelo de datos (Pydantic)
# -----------------------------------------------------------------------------


class TokenizationRequest(BaseModel):
    """Solicitud de auditoría para tokenización RWA."""

    wallet_address: str
    signature: str
    document_content: str


# -----------------------------------------------------------------------------
# Función auxiliar: verificación de firma criptográfica
# -----------------------------------------------------------------------------


def verify_signature(wallet_address: str, signature: str, message: str) -> bool:
    """
    Verifica que la firma fue producida por la wallet indicada sobre el mensaje.

    Usa EIP-191 (encode_defunct) y recupera la dirección firmante.
    Devuelve True si la dirección recuperada coincide con wallet_address.
    """
    try:
        encoded = encode_defunct(text=message)
        recovered_address = Account.recover_message(encoded, signature=signature)
        return recovered_address.lower() == wallet_address.lower()
    except Exception:
        return False


# -----------------------------------------------------------------------------
# Análisis de documento legal (IA o simulación)
# -----------------------------------------------------------------------------

# System prompt para el auditor RWA Modelo 4 (cuando hay API key real)
RWA_AUDITOR_SYSTEM_PROMPT = """Eres un auditor legal especializado en Activos del Mundo Real (RWA) bajo el Modelo 4 de liquidez.
Analiza el texto del contrato legal y responde ÚNICAMENTE con un JSON válido, sin markdown ni texto extra.
Formato obligatorio: {"approved": true|false, "risk_score": número del 1 al 10 si approved es true}
- approved: true solo si el documento es adecuado para tokenización (cláusulas de redención, colateral y cumplimiento normativo claros).
- risk_score: 1 = mínimo riesgo, 10 = máximo riesgo. Solo incluir si approved es true."""


async def analyze_legal_document(text: str) -> dict[str, Any]:
    """
    Analiza el documento legal con IA (OpenAI) o con lógica simulada si no hay API key.

    Caso real (OPENAI_API_KEY definida): llama a GPT-4 y devuelve JSON con approved y opcional risk_score.
    Caso simulado: aprueba solo si el texto contiene "REDENCIÓN" y "COLATERAL" (case insensitive).
    """
    api_key = os.getenv("OPENAI_API_KEY")

    if api_key and api_key.strip():
        # Caso real: llamada a OpenAI
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=api_key)
            response = await client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": RWA_AUDITOR_SYSTEM_PROMPT},
                    {"role": "user", "content": text[:12000]},  # límite razonable de contexto
                ],
                temperature=0.2,
            )
            content = response.choices[0].message.content or "{}"
            # Limpiar posible markdown (```json ... ```)
            content = content.strip()
            if content.startswith("```"):
                lines = content.split("\n")
                content = "\n".join(
                    l for l in lines if not l.strip().startswith("```")
                )
            return json.loads(content)
        except Exception as e:
            # Fallback a rechazo si falla la API
            return {"approved": False, "error": str(e)}
    else:
        # Caso simulado (sin API key): regla REDENCIÓN + COLATERAL
        text_lower = text.lower()
        if "redención" in text_lower and "colateral" in text_lower:
            return {"approved": True, "risk_score": 1}
        return {"approved": False}


# -----------------------------------------------------------------------------
# Endpoint principal: auditoría de contrato
# -----------------------------------------------------------------------------


@app.post("/audit-contract")
async def audit_contract(body: TokenizationRequest) -> dict[str, Any]:
    """
    Flujo del Oráculo Legal:
    1. Auth: wallet debe estar en whitelist (403 si no).
    2. Crypto: firma debe coincidir con document_content (401 si no).
    3. IA: análisis del documento.
    4. Respuesta: success (con hash y firma simulada) o rejected.
    """
    # Paso 1: Whitelist (comparación case-insensitive)
    allowed_wallets = {w.lower() for w in LEGAL_VALIDATORS_WHITELIST}
    if body.wallet_address.lower() not in allowed_wallets:
        raise HTTPException(
            status_code=403,
            detail="Wallet no autorizada en la whitelist de validadores legales",
        )

    # Paso 2: Verificación de firma
    if not verify_signature(
        body.wallet_address, body.signature, body.document_content
    ):
        raise HTTPException(
            status_code=401,
            detail="Firma inválida: no coincide con la wallet o el contenido del documento",
        )

    # Paso 3: Análisis IA
    ai_result = await analyze_legal_document(body.document_content)

    # Paso 4: Respuesta según aprobación
    if ai_result.get("approved") is True:
        document_hash = hashlib.sha256(
            body.document_content.encode("utf-8")
        ).hexdigest()
        return {
            "status": "success",
            "audit_result": ai_result,
            "document_hash": document_hash,
            "signature_from_oracle": "simulated_signature_0x123",
        }
    else:
        return {
            "status": "rejected",
            "audit_result": ai_result,
        }


# -----------------------------------------------------------------------------
# Health check (opcional, útil para despliegue)
# -----------------------------------------------------------------------------


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "legal-oracle"}
