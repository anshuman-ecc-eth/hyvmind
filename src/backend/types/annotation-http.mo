import Principal "mo:core/Principal";
import Time "mo:core/Time";

module {
  // WeightedValue/WeightedAttribute mirror the types in main.mo so that
  // CurationShape/SwarmShape/LocationShape are structurally compatible.
  public type WeightedValue = { value : Text; weight : Nat };
  public type WeightedAttribute = { key : Text; weightedValues : [WeightedValue] };
  public type Timestamps = { createdAt : Time.Time };

  // Exact structural matches for main.mo's Curation, Swarm, Location types
  // (Map is invariant in its value type — the shape must match exactly).
  public type CurationShape = {
    id : Text;
    name : Text;
    creator : Principal;
    customAttributes : [WeightedAttribute];
    timestamps : Timestamps;
  };

  public type SwarmShape = {
    id : Text;
    name : Text;
    tags : [Text];
    parentCurationId : Text;
    creator : Principal;
    customAttributes : [WeightedAttribute];
    timestamps : Timestamps;
    forkSource : ?Text;
    forkPrincipal : ?Principal;
  };

  public type LocationShape = {
    id : Text;
    title : Text;
    customAttributes : [WeightedAttribute];
    parentSwarmId : Text;
    creator : Principal;
    timestamps : Timestamps;
  };

  // IC management canister HTTP outcall result type (subset used by transform/fetchURL)
  public type HttpHeader = { name : Text; value : Text };

  public type HttpMethod = { #get; #post; #head };

  public type TransformContext = {
    function : shared query ({ context : Blob; response : IcHttpRequestResult }) -> async IcHttpRequestResult;
    context : Blob;
  };

  public type CanisterHttpRequestArgs = {
    url : Text;
    max_response_bytes : ?Nat64;
    headers : [HttpHeader];
    body : ?Blob;
    method : HttpMethod;
    transform : ?TransformContext;
  };

  public type IcHttpRequestResult = {
    status : Nat;
    headers : [HttpHeader];
    body : Blob;
  };

  // Return type for fetchURL
  public type FetchURLResult = {
    title : Text;
    html : Text;
  };

  // Return type for getPublishedPaths
  public type PublishedPath = {
    curation : Text;
    swarm : Text;
    location : Text;
    graphId : Text;
  };
};
