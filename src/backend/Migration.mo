import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";

// v1 migration types (without contributionIds → with contributionIds)
type OldTrustTransaction = {
  saver : Principal;
  savedAt : Int;
  saveNumber : Nat;
  totalBuzzCost : Int;
  earned : Int;
};

type NewTrustTransaction = {
  saver : Principal;
  savedAt : Int;
  saveNumber : Nat;
  totalBuzzCost : Int;
  earned : Int;
  contributionIds : [Text];
};

// v2 migration types (with contributionIds → + contributionDetails)
type OldTrustTransactionV2 = {
  saver : Principal;
  savedAt : Int;
  saveNumber : Nat;
  totalBuzzCost : Int;
  earned : Int;
  contributionIds : [Text];
};

type CreditedContribution = {
  contributionId : Text;
  description : Text;
  payer : Principal;
  buzzAmount : Int;
  earned : Int;
  saveCount : Nat;
};

type NewTrustTransactionV2 = {
  saver : Principal;
  savedAt : Int;
  saveNumber : Nat;
  totalBuzzCost : Int;
  earned : Int;
  contributionIds : [Text];
  contributionDetails : [CreditedContribution];
};

func migration(old : {
  var trustTransactions : Map.Map<Principal, List.List<OldTrustTransactionV2>>;
}) : {
  var trustTransactions : Map.Map<Principal, List.List<NewTrustTransactionV2>>;
} {
  // Migrate trustTransactions (add empty contributionDetails)
  var migratedTxs = Map.empty<Principal, List.List<NewTrustTransactionV2>>();
  for ((principal, txList) in old.trustTransactions.entries()) {
    let newList = List.empty<NewTrustTransactionV2>();
    for (tx in txList.values()) {
      newList.add({
        saver = tx.saver;
        savedAt = tx.savedAt;
        saveNumber = tx.saveNumber;
        totalBuzzCost = tx.totalBuzzCost;
        earned = tx.earned;
        contributionIds = tx.contributionIds;
        contributionDetails = [];
      });
    };
    migratedTxs.add(principal, newList);
  };

  { var trustTransactions = migratedTxs };
};
