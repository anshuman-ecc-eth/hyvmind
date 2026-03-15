import Map "mo:core/Map";
import Nat "mo:core/Nat";

module {
  type OldLawToken = {
    id : Text;
    tokenLabel : Text;
    meaning : Text;
    parentLocationId : Text;
    creator : Principal;
    timestamps : { createdAt : Int };
  };

  type OldActor = {
    lawTokenMap : Map.Map<Text, OldLawToken>;
  };

  type NewLawToken = {
    id : Text;
    tokenLabel : Text;
    parentLocationId : Text;
    creator : Principal;
    timestamps : { createdAt : Int };
  };

  type NewActor = {
    lawTokenMap : Map.Map<Text, NewLawToken>;
  };

  public func run(old : OldActor) : NewActor {
    let newLawTokenMap = old.lawTokenMap.map<Text, OldLawToken, NewLawToken>(
      func(_tokenId, oldLawToken) {
        {
          id = oldLawToken.id;
          tokenLabel = oldLawToken.tokenLabel;
          parentLocationId = oldLawToken.parentLocationId;
          creator = oldLawToken.creator;
          timestamps = oldLawToken.timestamps;
        };
      }
    );
    { lawTokenMap = newLawTokenMap };
  };
};
