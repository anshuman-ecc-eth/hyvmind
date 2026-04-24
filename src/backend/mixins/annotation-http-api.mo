import Text "mo:core/Text";
import Blob "mo:core/Blob";
import Map "mo:core/Map";

import Types "../types/annotation-http";
import AnnotationHttp "../lib/annotation-http";

// Mixin exposing HTTP outcall and published-path query endpoints.
// State injected from main.mo actor:
//   - curationToPublishedGraphId : Map.Map<Text, Text>
//   - curationMap                : Map.Map<Text, Types.CurationShape>
//   - swarmMap                   : Map.Map<Text, Types.SwarmShape>
//   - locationMap                : Map.Map<Text, Types.LocationShape>
//   - transformFunc              : the actor's own `transform` query function
//
// IMPORTANT: The `transform` function must be a `public query func` declared directly
// on the actor (in main.mo). It is passed here so the IC management canister can call
// back the canister to strip response headers for consensus.
mixin (
  curationToPublishedGraphId : Map.Map<Text, Text>,
  curationMap : Map.Map<Text, Types.CurationShape>,
  swarmMap : Map.Map<Text, Types.SwarmShape>,
  locationMap : Map.Map<Text, Types.LocationShape>,
  transformFunc : shared query ({ context : Blob; response : Types.IcHttpRequestResult }) -> async Types.IcHttpRequestResult,
) {
  // Validates HTTPS URL, makes an IC HTTPS outcall via the management canister,
  // and returns the page title and raw HTML body.
  public func fetchURL(url : Text) : async { #ok : { title : Text; html : Text }; #err : Text } {
    await AnnotationHttp.fetchURL(url, transformFunc);
  };

  // Returns all unique curation/swarm/location path combinations derived from
  // published source graphs. Graphs with no hierarchical breakdown are skipped.
  public query func getPublishedPaths() : async [{ curation : Text; swarm : Text; location : Text; graphId : Text }] {
    AnnotationHttp.getPublishedPaths(
      curationToPublishedGraphId,
      curationMap,
      swarmMap,
      locationMap,
    );
  };
};
