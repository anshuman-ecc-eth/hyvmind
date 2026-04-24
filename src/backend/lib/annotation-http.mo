import Debug "mo:core/Debug";
import Result "mo:core/Result";
import Text "mo:core/Text";
import Blob "mo:core/Blob";
import Nat64 "mo:core/Nat64";
import List "mo:core/List";
import Map "mo:core/Map";

import Types "../types/annotation-http";

module {
  // Derives the IC management canister actor reference used for HTTP outcalls.
  // Callers must pass actor capability via the system context.
  public type IC = actor {
    http_request : shared (Types.CanisterHttpRequestArgs) -> async Types.IcHttpRequestResult;
  };

  // Makes an HTTPS GET outcall to `url` and returns the raw HTML body and
  // a best-effort title extracted from the <title> tag.
  // Validates that the URL starts with "https://".
  // Uses MAX_RESPONSE_BYTES = 2_000_000 and attaches 230_949_972_000 cycles.
  public func fetchURL(url : Text) : async Result.Result<Types.FetchURLResult, Text> {
    Debug.todo();
  };

  // Extracts all unique curation/swarm/location combinations from the provided
  // maps and returns them annotated with the corresponding published graph ID.
  // Published graphs that have no curation/swarm/location breakdown are skipped.
  public func getPublishedPaths<CurationT, SwarmT, LocationT>(
    publishedSourceGraphs : Map.Map<Text, { id : Text; name : Text }>,
    curationToPublishedGraphId : Map.Map<Text, Text>,
    curationMap : Map.Map<Text, { id : Text; name : Text }>,
    swarmMap : Map.Map<Text, { id : Text; name : Text; parentCurationId : Text }>,
    locationMap : Map.Map<Text, { id : Text; title : Text; parentSwarmId : Text }>,
  ) : [Types.PublishedPath] {
    Debug.todo();
  };

  // Extracts the best-effort page title from raw HTML text.
  // Returns an empty string if no <title> tag is found.
  public func extractTitle(html : Text) : Text {
    Debug.todo();
  };
};
