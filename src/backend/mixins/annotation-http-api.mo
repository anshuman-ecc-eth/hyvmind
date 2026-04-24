import Debug "mo:core/Debug";
import Result "mo:core/Result";
import Blob "mo:core/Blob";

import Types "../types/annotation-http";

// Mixin exposing HTTP outcall and published-path query endpoints.
// State injected: curationMap, swarmMap, locationMap, curationToPublishedGraphId,
// publishedSourceGraphs (all passed from main.mo actor state).
//
// The transform function must be a public query on the actor (not in the mixin)
// so that the IC can call back the canister to strip response headers.
// It is declared here as a stand-alone type signature; main.mo adds the
// actual `public query func transform(...)` directly.
mixin () {
  // Validates HTTPS URL, makes an IC HTTPS outcall via the management canister,
  // and returns the page title and raw HTML body.
  public func fetchURL(url : Text) : async Result.Result<{ title : Text; html : Text }, Text> {
    Debug.todo();
  };

  // Returns all unique curation/swarm/location path combinations derived from
  // published source graphs. Graphs with no hierarchical breakdown are skipped.
  public query func getPublishedPaths() : async [{ curation : Text; swarm : Text; location : Text; graphId : Text }] {
    Debug.todo();
  };
};
