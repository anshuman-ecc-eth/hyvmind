import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // Old actor stable state — textGameBuzz is consumed here and intentionally dropped.
  // The two maps (buzzScores and textGameBuzz) were separate broken maps that diverged;
  // there is no meaningful data to migrate from textGameBuzz into buzzScores.
  type OldActor = {
    var textGameBuzz : Map.Map<Principal, Int>;
  };

  // NewActor has no fields that need computing from the old state;
  // the migration exists solely to consume textGameBuzz so the compiler
  // does not reject the upgrade with M0169.
  type NewActor = {};

  public func run(_old : OldActor) : NewActor {
    {};
  };
};
