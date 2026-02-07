// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title RWALiquidityProtocol
 * @notice ERC20 que representa un RWA (Real World Asset) validado bajo el Modelo 4
 *         (Liquidación + Colateral). Solo validadores legales autorizados pueden
 *         mintear, y únicamente con firma del oráculo de IA sobre el hash del documento.
 */
contract RWALiquidityProtocol is ERC20, Ownable {
    using MessageHashUtils for bytes32;

    // -------------------------------------------------------------------------
    // Estado
    // -------------------------------------------------------------------------

    /// @dev Lista blanca de abogados/validadores autorizados para mintear
    mapping(address => bool) public legalValidators;

    /// @dev Dirección del oráculo de IA (servidor que firma las auditorías)
    address public oracleAddress;

    /// @dev Previene replay: cada firma solo puede usarse una vez
    mapping(bytes32 => bool) public usedSignatures;

    // -------------------------------------------------------------------------
    // Eventos
    // -------------------------------------------------------------------------

    event AssetTokenized(
        address indexed validator,
        uint256 amount,
        string legalDocHash
    );

    event RedemptionRequested(address indexed holder, uint256 amount);

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(
        address initialOwner
    ) ERC20("RWA Sentinel Token", "RWAS") Ownable(initialOwner) {
        require(initialOwner != address(0), "Invalid owner");
    }

    // -------------------------------------------------------------------------
    // Funciones administrativas (solo owner)
    // -------------------------------------------------------------------------

    /// @notice Define la dirección del oráculo de IA que firma las auditorías
    function setOracleAddress(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle");
        oracleAddress = _oracle;
    }

    /// @notice Añade un validador legal (abogado) a la whitelist
    function addValidator(address _validator) external onlyOwner {
        require(_validator != address(0), "Invalid validator");
        legalValidators[_validator] = true;
    }

    /// @notice Elimina un validador de la whitelist
    function removeValidator(address _validator) external onlyOwner {
        legalValidators[_validator] = false;
    }

    // -------------------------------------------------------------------------
    // Función core: minteo con doble validación (humana + IA)
    // -------------------------------------------------------------------------

    /**
     * @notice Mintea tokens RWA tras validar que el caller es validador y que
     *         el oráculo de IA firmó el hash del documento legal.
     * @param amount Cantidad de tokens a mintear (en unidades base del ERC20).
     * @param docHash Hash del documento legal (ej. SHA256 en hex) auditado por la IA.
     * @param oracleSignature Firma EIP-191 del oráculo sobre el docHash.
     */
    function mintRWA(
        uint256 amount,
        string memory docHash,
        bytes memory oracleSignature
    ) external {
        // Validación 1 (Humana): solo validadores en whitelist
        if (!legalValidators[msg.sender]) {
            revert("Caller is not a validator");
        }

        // Validación 2 (IA): firma del oráculo sobre docHash
        bytes32 hashOfDoc = keccak256(abi.encodePacked(docHash));
        bytes32 ethSignedHash = hashOfDoc.toEthSignedMessageHash();
        address signer = ECDSA.recover(ethSignedHash, oracleSignature);
        if (signer != oracleAddress) {
            revert("Invalid oracle signature");
        }

        // Validación 3 (Replay): firma usada solo una vez
        bytes32 replayId = keccak256(abi.encodePacked(docHash, oracleSignature));
        if (usedSignatures[replayId]) {
            revert("Signature already used");
        }
        usedSignatures[replayId] = true;

        _mint(msg.sender, amount);
        emit AssetTokenized(msg.sender, amount, docHash);
    }

    // -------------------------------------------------------------------------
    // Redención (Modelo 4: liquidez por quema)
    // -------------------------------------------------------------------------

    /**
     * @notice El titular quema tokens para solicitar la redención del activo real.
     * @param amount Cantidad de tokens a quemar.
     */
    function redeem(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        _burn(msg.sender, amount);
        emit RedemptionRequested(msg.sender, amount);
    }
}
