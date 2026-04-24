import Debug "mo:core/Debug";

module {
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
