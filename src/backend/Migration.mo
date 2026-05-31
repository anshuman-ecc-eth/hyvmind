import Array "mo:core/Array";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

type ExtensionEntry = {
  extendedAt : Time.Time;
  extendedBy : Principal;
  extendedByName : Text;
  addedNodes : Nat;
  addedEdges : Nat;
  addedHierarchyEdges : Nat;
  addedAttributes : Nat;
  addedSources : ?Nat;
};

type OldMeta = {
  id : Text;
  name : Text;
  creator : Principal;
  creatorName : Text;
  publishedAt : Time.Time;
  nodeCount : Nat;
  edgeCount : Nat;
  hierarchyEdgeCount : Nat;
  attributeCount : Nat;
  sourcesCount : ?Nat;
  extensionLog : [ExtensionEntry];
  artworkDataUrl : ?Text;
  terrainParams : ?Text;
};

type NewMeta = {
  id : Text;
  name : Text;
  creator : Principal;
  creatorName : Text;
  publishedAt : Time.Time;
  nodeCount : Nat;
  edgeCount : Nat;
  hierarchyEdgeCount : Nat;
  attributeCount : Nat;
  sourcesCount : ?Nat;
  extensionLog : [ExtensionEntry];
  artworkDataUrl : ?Text;
  terrainParams : ?Text;
  authors : [Text];
};

func migration(old : { var publishedSourceGraphs : Map.Map<Text, OldMeta> }) : { var publishedSourceGraphs : Map.Map<Text, NewMeta> } {
  var migrated = Map.empty<Text, NewMeta>();
  for ((id, meta) in old.publishedSourceGraphs.entries()) {
    let names = Array.tabulate(meta.extensionLog.size() + 1, func (j) {
      if (j == 0) { meta.creatorName } else { meta.extensionLog[j - 1].extendedByName }
    });
    var authors : [Text] = [];
    for (name in names.vals()) {
      var found = false;
      label w for (a in authors.vals()) {
        if (a == name) { found := true; break w };
      };
      if (not found) {
        authors := Array.tabulate<Text>(authors.size() + 1, func (k) {
          if (k < authors.size()) { authors[k] } else { name }
        });
      };
    };
    migrated.add(id, {
      id = meta.id; name = meta.name; creator = meta.creator; creatorName = meta.creatorName;
      publishedAt = meta.publishedAt; nodeCount = meta.nodeCount; edgeCount = meta.edgeCount;
      hierarchyEdgeCount = meta.hierarchyEdgeCount; attributeCount = meta.attributeCount;
      sourcesCount = meta.sourcesCount; extensionLog = meta.extensionLog;
      artworkDataUrl = meta.artworkDataUrl; terrainParams = meta.terrainParams; authors;
    });
  };
  { var publishedSourceGraphs = migrated };
};
