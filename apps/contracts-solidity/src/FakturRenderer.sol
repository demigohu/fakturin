// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {FakturRegistry} from "./FakturRegistry.sol";

/// @notice Draws a Faktur Pajak as an onchain SVG, stamped with its live status.
/// @dev Reads everything from the registry, so the image exists for every invoice ever submitted,
///      including closed ones whose NFT was burned. Only public data is drawn: the Faktur Pajak
///      number, amount and dates already live onchain; the buyer appears as a hash, never by name.
contract FakturRenderer {
    using Strings for uint256;

    FakturRegistry public immutable registry;
    /// @dev One rupiah in token units (MockIDRX / IDRX: 2 decimals -> 100).
    uint256 public immutable unit;

    constructor(FakturRegistry registry_) {
        registry = registry_;
        unit = 10 ** IERC20Metadata(address(registry_.factory().asset())).decimals();
    }

    /// @notice ERC-721 metadata JSON (data URI) for the invoice NFT.
    function tokenURI(bytes32 invoiceId) external view returns (string memory) {
        FakturRegistry.Invoice memory inv = registry.getInvoice(invoiceId);
        string memory number = registry.fakturNumberOf(invoiceId);
        (string memory label,) = _stamp(inv.status);
        string memory json = string.concat(
            '{"name":"Faktur Pajak ',
            number,
            '","description":"A Faktur Pajak verified with the tax office by Chainlink CRE and financed on Fakturin. The NFT is locked in its funding vault and burned when the invoice closes.",',
            '"image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg(invoiceId))),
            '","attributes":[{"trait_type":"Status","value":"',
            label,
            '"},{"trait_type":"Amount (IDR)","display_type":"number","value":',
            (inv.nominal / unit).toString(),
            '},{"trait_type":"Due date","display_type":"date","value":',
            uint256(inv.dueDate).toString(),
            "}]}"
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    /// @notice The invoice as an SVG document.
    function svg(bytes32 invoiceId) public view returns (string memory) {
        FakturRegistry.Invoice memory inv = registry.getInvoice(invoiceId);
        (string memory label, string memory color) = _stamp(inv.status);
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" font-family="ui-monospace,Menlo,monospace">',
            '<rect width="400" height="520" fill="#f6f4ee"/>',
            '<rect x="16" y="16" width="368" height="488" fill="none" stroke="#0b1220" stroke-width="2"/>',
            '<rect x="16" y="16" width="368" height="64" fill="#0b1220"/>',
            '<text x="32" y="46" fill="#f6f4ee" font-size="20" font-family="Helvetica,Arial,sans-serif" font-weight="600">Faktur Pajak</text>',
            '<text x="32" y="66" fill="#9fb3c8" font-size="11">Fakturin / Arbitrum Sepolia</text>',
            _rows(invoiceId, inv),
            _stampSvg(label, color),
            '<text x="32" y="488" fill="#5b6472" font-size="10">Checked with the tax office by Chainlink CRE</text>',
            "</svg>"
        );
    }

    function _rows(bytes32 invoiceId, FakturRegistry.Invoice memory inv) private view returns (string memory) {
        return string.concat(
            _row(116, "Nomor faktur", registry.fakturNumberOf(invoiceId)),
            _row(166, "Nilai (MockIDRX)", string.concat("Rp", _thousands(inv.nominal / unit))),
            _row(216, "Tanggal faktur", _date(inv.issuedAt)),
            _row(266, "Jatuh tempo", _date(inv.dueDate)),
            _row(316, "NPWP pembeli (hash)", _short(inv.buyerNpwpHash)),
            _row(366, "Token ID", _short(invoiceId))
        );
    }

    function _row(uint256 y, string memory label, string memory value) private pure returns (string memory) {
        return string.concat(
            '<text x="32" y="',
            y.toString(),
            '" fill="#5b6472" font-size="11">',
            label,
            '</text><text x="32" y="',
            (y + 22).toString(),
            '" fill="#0b1220" font-size="17">',
            bytes(value).length == 0 ? "-" : value,
            "</text>"
        );
    }

    function _stampSvg(string memory label, string memory color) private pure returns (string memory) {
        return string.concat(
            '<g transform="rotate(-12 300 420)" opacity="0.9"><rect x="216" y="392" width="168" height="56" rx="6" fill="none" stroke="',
            color,
            '" stroke-width="4"/><text x="300" y="429" text-anchor="middle" fill="',
            color,
            '" font-size="22" font-weight="700" letter-spacing="2">',
            label,
            "</text></g>"
        );
    }

    function _stamp(FakturRegistry.Status s) private pure returns (string memory, string memory) {
        if (s == FakturRegistry.Status.Pending) return ("CHECKING", "#7c5cbf");
        if (s == FakturRegistry.Status.Rejected) return ("REJECTED", "#c0392b");
        if (s == FakturRegistry.Status.Funding) return ("VERIFIED", "#2563eb");
        if (s == FakturRegistry.Status.Financed) return ("FINANCED", "#15803d");
        if (s == FakturRegistry.Status.Repaid) return ("LUNAS", "#15803d");
        if (s == FakturRegistry.Status.Defaulted) return ("DEFAULT", "#c2410c");
        if (s == FakturRegistry.Status.FundingFailed) return ("UNFUNDED", "#5b6472");
        return ("UNKNOWN", "#5b6472");
    }

    /// @dev 0x1234abcd…ef56 style, as text.
    function _short(bytes32 value) private pure returns (string memory) {
        if (value == bytes32(0)) return "";
        string memory hex_ = uint256(value).toHexString(32);
        bytes memory b = bytes(hex_);
        bytes memory head = new bytes(10);
        bytes memory tail = new bytes(6);
        for (uint256 i; i < 10; ++i) head[i] = b[i];
        for (uint256 i; i < 6; ++i) tail[i] = b[b.length - 6 + i];
        return string.concat(string(head), unicode"…", string(tail));
    }

    /// @dev 1234567 -> "1,234,567".
    function _thousands(uint256 n) private pure returns (string memory out) {
        string memory digits = n.toString();
        bytes memory d = bytes(digits);
        uint256 len = d.length;
        bytes memory r = new bytes(len + (len - 1) / 3);
        uint256 j = r.length;
        for (uint256 i = len; i > 0; --i) {
            uint256 fromEnd = len - i;
            if (fromEnd > 0 && fromEnd % 3 == 0) r[--j] = ",";
            r[--j] = d[i - 1];
        }
        out = string(r);
    }

    /// @dev Unix seconds -> "26 Dec 2026" (UTC), civil-from-days by Howard Hinnant.
    function _date(uint64 ts) private pure returns (string memory) {
        if (ts == 0) return "";
        int256 z = int256(uint256(ts) / 86400) + 719468;
        int256 era = z / 146097;
        uint256 doe = uint256(z - era * 146097);
        uint256 yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
        uint256 doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
        uint256 mp = (5 * doy + 2) / 153;
        uint256 day = doy - (153 * mp + 2) / 5 + 1;
        uint256 month = mp < 10 ? mp + 3 : mp - 9;
        uint256 year = uint256(int256(yoe) + era * 400) + (month <= 2 ? 1 : 0);
        string[12] memory names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return string.concat(day.toString(), " ", names[month - 1], " ", year.toString());
    }
}
