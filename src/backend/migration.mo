import Map "mo:core/Map";
import List "mo:core/List";

module {
  type NodeId = Text;

  type OldActor = {};

  type NewActor = {
    sublocationLawTokenRelations : Map.Map<NodeId, List.List<NodeId>>;
  };

  public func run(old : OldActor) : NewActor {
    // Initialize your new state variables with empty data structures
    let sublocationLawTokenRelations = Map.empty<NodeId, List.List<NodeId>>();
    { old with sublocationLawTokenRelations };
  };
};
