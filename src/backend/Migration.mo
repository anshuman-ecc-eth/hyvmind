import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";

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

func migration(old : {
  var trustTransactions : Map.Map<Principal, List.List<OldTrustTransaction>>;
}) : {
  var trustTransactions : Map.Map<Principal, List.List<NewTrustTransaction>>;
} {
  // Migrate trustTransactions (add empty contributionIds)
  var migratedTxs = Map.empty<Principal, List.List<NewTrustTransaction>>();
  for ((principal, txList) in old.trustTransactions.entries()) {
    let newList = List.empty<NewTrustTransaction>();
    for (tx in txList.values()) {
      newList.add({
        saver = tx.saver;
        savedAt = tx.savedAt;
        saveNumber = tx.saveNumber;
        totalBuzzCost = tx.totalBuzzCost;
        earned = tx.earned;
        contributionIds = [];
      });
    };
    migratedTxs.add(principal, newList);
  };

  { var trustTransactions = migratedTxs };
};
