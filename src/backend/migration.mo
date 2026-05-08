import Map "mo:core/Map";
import List "mo:core/List";

module {
  // ─── Old types (from .old/src/backend/dist/backend.most) ─────────────────
  type OldNodeContribution = { buzzCost : Int; paidBy : Principal };

  type OldActor = {
    var publishedNodeContributions :
      Map.Map<Text, Map.Map<Text, OldNodeContribution>>;
  };

  // ─── New types ────────────────────────────────────────────────────────────
  type NewNodeContribution = { payers : List.List<(Principal, Int)> };

  type NewActor = {
    var publishedNodeContributions :
      Map.Map<Text, Map.Map<Text, NewNodeContribution>>;
    var trustTransactions :
      Map.Map<Principal, List.List<{ saver : Principal; savedAt : Int; saveNumber : Nat; totalBuzzCost : Int; earned : Int }>>;
  };

  public func run(old : OldActor) : NewActor {
    // Convert each inner NodeContribution from single-payer to multi-payer.
    // In practice publishedNodeContributions has no production data (feature
    // was added in recent commits), so this map is always empty at upgrade.
    let newContribs = old.publishedNodeContributions.map<Text, Map.Map<Text, OldNodeContribution>, Map.Map<Text, NewNodeContribution>>(
      func(_, innerMap) {
        innerMap.map<Text, OldNodeContribution, NewNodeContribution>(
          func(_, oldContrib) {
            let payers = List.singleton(
              (oldContrib.paidBy, oldContrib.buzzCost)
            );
            { payers }
          }
        )
      }
    );
    {
      var publishedNodeContributions = newContribs;
      var trustTransactions = Map.empty<Principal, List.List<{ saver : Principal; savedAt : Int; saveNumber : Nat; totalBuzzCost : Int; earned : Int }>>();
    }
  };
};
