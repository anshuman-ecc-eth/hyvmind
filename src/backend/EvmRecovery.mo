import Array "mo:core/Array";
import Char "mo:core/Char";
import Nat32 "mo:core/Nat32";
import Nat8 "mo:core/Nat8";
import Text "mo:core/Text";
import Ecdsa "mo:libsecp256k1/Ecdsa";
import Message "mo:libsecp256k1/Message";
import Signature "mo:libsecp256k1/Signature";
import RecoveryId "mo:libsecp256k1/RecoveryId";
import ECMult "mo:libsecp256k1/core/ecmult";
import Sha3 "mo:sha3/lib";

// EIP-191 personal_sign signer recovery, implemented on-canister with the
// pure-Motoko libsecp256k1 + keccak packages. Verifies that an EVM wallet
// signed a given message and returns the recovered signer address.
module {

/// Builds the ECMult context used for public-key recovery. Constructing it
/// precomputes a 16K-entry generator table (~1-2s, most of the call's cost),
/// so callers may cache it at the actor level if they prefer.
public func newContext() : ECMult.ECMultContext {
  ECMult.ECMultContext(null);
};

func keccak256(data : [Nat8]) : [Nat8] {
  let k = Sha3.Keccak(256);
  k.update(data);
  k.finalize();
};

func hexDigit(c : Char) : ?Nat8 {
  if (c >= '0' and c <= '9') {
    ?Nat8.fromNat((c.toNat32() -% '0'.toNat32()).toNat());
  } else if (c >= 'a' and c <= 'f') {
    ?Nat8.fromNat((c.toNat32() -% 'a'.toNat32()).toNat() + 10);
  } else if (c >= 'A' and c <= 'F') {
    ?Nat8.fromNat((c.toNat32() -% 'A'.toNat32()).toNat() + 10);
  } else {
    null;
  };
};

func decodeHex(hex : Text) : ?[Nat8] {
  let hasPrefix = hex.size() >= 2 and hex.startsWith(#text "0x");
  var digitCount : Nat = 0;
  var idx : Nat = 0;
  for (c in hex.toIter()) {
    let i = idx;
    idx += 1;
    if (hasPrefix and i < 2) { continue };
    if (hexDigit(c) == null) { return null };
    digitCount += 1;
  };
  if (digitCount % 2 != 0) { return null };
  let nibbles = Array.tabulate(digitCount, func (j : Nat) : Nat8 {
    var ix : Nat = 0;
    var digit : Nat = 0;
    var res : Nat8 = 0;
    for (c in hex.toIter()) {
      let i = ix;
      ix += 1;
      if (hasPrefix and i < 2) { continue };
      if (digit == j) {
        res := switch (hexDigit(c)) {
          case (?v) { v };
          case (null) { 0 };
        };
        break;
      };
      digit += 1;
    };
    res;
  });
  let out = Array.tabulate(digitCount / 2, func (j : Nat) : Nat8 {
    nibbles[2 * j] * 16 + nibbles[2 * j + 1];
  });
  ?out;
};

func hexDigitText(n : Nat) : Text {
  if (n < 10) {
    Char.fromNat32(Nat32.fromNat(n) +% '0'.toNat32()).toText();
  } else {
    Char.fromNat32(Nat32.fromNat(n - 10) +% 'a'.toNat32()).toText();
  };
};

func byteToHex(b : Nat8) : Text {
  hexDigitText(b.toNat() / 16) # hexDigitText(b.toNat() % 16);
};

func bytesToLowerHex(arr : [Nat8]) : Text {
  var out = "";
  for (b in arr.vals()) {
    out := out # byteToHex(b);
  };
  out;
};

// EIP-191 personal_sign preimage: keccak256("\x19Ethereum Signed Message:\n"
// ++ decimalByteLength ++ message).
func eip191Prehash(messageText : Text) : [Nat8] {
  let messageBytes = messageText.encodeUtf8().toArray();
  let prefix = "\19Ethereum Signed Message:\n".encodeUtf8().toArray();
  let lenBytes = messageBytes.size().toText().encodeUtf8().toArray();
  keccak256(prefix.concat(lenBytes).concat(messageBytes));
};

/// Recovers the EIP-191 signer address for a message and a 65-byte
/// (r || s || v) signature in hex. Returns `null` on any malformed input or
/// failed recovery.
public func recoverAddress(
  messageText : Text,
  signatureHex : Text,
  context : ECMult.ECMultContext,
) : ?Text {
  let sig = switch (decodeHex(signatureHex)) {
    case (?s) { s };
    case (null) { return null };
  };
  if (sig.size() != 65) { return null };

  let r = Array.tabulate(32, func i = sig[i]);
  let s = Array.tabulate(32, func i = sig[32 + i]);
  let v : Nat8 = sig[64];

  let signature = switch (Signature.parse_standard(r.concat(s))) {
    case (#ok(obj)) { obj };
    case (#err(_)) { return null };
  };

  // Wallets return v as 27/28 (EIP-155 style) or 0/1; normalize to 0..3.
  let recId : Nat8 = if (v >= 27) { v - 27 } else { v };
  let recoveryId = switch (RecoveryId.parse(recId)) {
    case (#ok(id)) { id };
    case (#err(_)) { return null };
  };

  let message = Message.parse(eip191Prehash(messageText));

  let pubkey = switch (Ecdsa.recover_with_context(message, signature, recoveryId, context)) {
    case (#ok(pk)) { pk };
    case (#err(_)) { return null };
  };

  // Ethereum address = last 20 bytes of keccak256(x || y) (no 0x04 prefix).
  let pub65 = pubkey.serialize();
  let pub64 = pub65.sliceToArray(1, 65);
  let hash = keccak256(pub64);
  let address = hash.sliceToArray(12, 32);
  ?bytesToLowerHex(address);
};

/// Lowercases ASCII hex (A-F -> a-f) so address comparisons are case-insensitive.
public func normalizeAddress(addr : Text) : Text {
  var out = "";
  for (c in addr.toIter()) {
    if (c >= 'A' and c <= 'F') {
      out := out # Char.fromNat32(c.toNat32() +% 32).toText();
    } else {
      out := out # c.toText();
    };
  };
  out;
};

};