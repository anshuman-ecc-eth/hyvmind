import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Time "mo:core/Time";

module {
  public type Timestamps = {
    createdAt : Time.Time;
  };

  public type Curation = {
    id : Text;
    name : Text;
    creator : Principal;
    jurisdiction : Text;
    timestamps : Timestamps;
  };

  public type LegacySwarm = {
    id : Text;
    name : Text;
    tags : [Text];
    parentCurationId : Text;
    creator : Principal;
    timestamps : Timestamps;
  };

  public type NewSwarm = {
    id : Text;
    name : Text;
    tags : [Text];
    parentCurationId : Text;
    creator : Principal;
    timestamps : Timestamps;
    forkSource : ?Text;
    forkPrincipal : ?Principal;
  };

  public type OldActor = {
    curationMap : Map.Map<Text, Curation>;
    swarmMap : Map.Map<Text, LegacySwarm>;
  };

  public type NewActor = {
    curationMap : Map.Map<Text, Curation>;
    swarmMap : Map.Map<Text, NewSwarm>;
  };

  public func run(old : OldActor) : NewActor {
    let newSwarmMap = old.swarmMap.map<Text, LegacySwarm, NewSwarm>(
      func(_id, legacySwarm) {
        { legacySwarm with forkSource = null; forkPrincipal = null };
      }
    );
    { old with swarmMap = newSwarmMap };
  };
};
