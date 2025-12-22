import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Debug "mo:base/Debug";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import AccessControl "authorization/access-control";

actor Buzz {
  let balances = HashMap.HashMap<Principal, Nat>(10, Principal.equal, Principal.hash);

  let accessControlState = AccessControl.initState();

  stable var mainCanisterPrincipal : ?Principal = null;
  stable var fleaMarketCanisterPrincipal : ?Principal = null;
  stable var initialized : Bool = false;

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    // AUTHORIZATION: Admin-only (checked inside AccessControl.assignRole)
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public shared ({ caller }) func initialize(mainCanister : Principal, fleaMarketCanister : Principal) : async () {
    // AUTHORIZATION: Admin-only
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can initialize Buzz canister");
    };

    if (initialized) {
      Debug.trap("Buzz canister already initialized");
    };

    mainCanisterPrincipal := ?mainCanister;
    fleaMarketCanisterPrincipal := ?fleaMarketCanister;
    initialized := true;
  };

  public shared ({ caller }) func mint(principal : Principal, amount : Nat) : async () {
    // AUTHORIZATION: Verify initialization first
    if (not initialized) {
      Debug.trap("Buzz canister not initialized");
    };

    // AUTHORIZATION: Only main canister can mint
    switch (mainCanisterPrincipal) {
      case (?mainCanister) {
        if (caller != mainCanister) {
          Debug.trap("Unauthorized: Only main canister can mint tokens");
        };
      };
      case (null) {
        Debug.trap("Main canister principal not set");
      };
    };

    if (amount == 0) {
      Debug.trap("Amount must be greater than zero");
    };

    if (Principal.isAnonymous(principal)) {
      Debug.trap("Cannot mint tokens for anonymous principal");
    };

    let currentBalance = switch (balances.get(principal)) {
      case (?balance) { balance };
      case (null) { 0 };
    };

    balances.put(principal, currentBalance + amount);
  };

  public shared ({ caller }) func transfer(from : Principal, to : Principal, amount : Nat) : async () {
    // AUTHORIZATION: Verify initialization first
    if (not initialized) {
      Debug.trap("Buzz canister not initialized");
    };

    // AUTHORIZATION: Only Flea Market canister can transfer
    switch (fleaMarketCanisterPrincipal) {
      case (?fleaMarket) {
        if (caller != fleaMarket) {
          Debug.trap("Unauthorized: Only Flea Market canister can transfer tokens");
        };
      };
      case (null) {
        Debug.trap("Flea Market canister principal not set");
      };
    };

    if (amount == 0) {
      Debug.trap("Amount must be greater than zero");
    };

    if (Principal.isAnonymous(from) or Principal.isAnonymous(to)) {
      Debug.trap("Cannot transfer tokens for anonymous principals");
    };

    if (from == to) {
      Debug.trap("Cannot transfer tokens to the same principal");
    };

    let fromBalance = switch (balances.get(from)) {
      case (?balance) { balance };
      case (null) { 0 };
    };

    if (fromBalance < amount) {
      Debug.trap("Insufficient balance for transfer");
    };

    let toBalance = switch (balances.get(to)) {
      case (?balance) { balance };
      case (null) { 0 };
    };

    balances.put(from, fromBalance - amount);
    balances.put(to, toBalance + amount);
  };

  // AUTHORIZATION: Allow trusted canisters (main, flea market) to query any balance
  // The calling canister has already verified the user's authorization
  public query ({ caller }) func balanceOf(principal : Principal) : async Nat {
    if (not initialized) {
      Debug.trap("Buzz canister not initialized");
    };

    let isMainCanister = switch (mainCanisterPrincipal) {
      case (?mainCanister) { caller == mainCanister };
      case (null) { false };
    };

    let isFleaMarketCanister = switch (fleaMarketCanisterPrincipal) {
      case (?fleaMarket) { caller == fleaMarket };
      case (null) { false };
    };

    // AUTHORIZATION: Trusted canisters can query any balance (they've already checked user auth)
    if (isMainCanister or isFleaMarketCanister) {
      switch (balances.get(principal)) {
        case (?balance) { balance };
        case (null) { 0 };
      };
    } else {
      // AUTHORIZATION: Direct user calls require user-level permission and can only query own balance
      if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
        Debug.trap("Unauthorized: Only authenticated users or authorized canisters can query balances");
      };
      if (caller != principal) {
        Debug.trap("Unauthorized: Users can only query their own balance");
      };
      switch (balances.get(principal)) {
        case (?balance) { balance };
        case (null) { 0 };
      };
    };
  };

  public query ({ caller }) func getCallerBalance() : async Nat {
    // AUTHORIZATION: User-level permission required
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can query balances");
    };

    switch (balances.get(caller)) {
      case (?balance) { balance };
      case (null) { 0 };
    };
  };
}
