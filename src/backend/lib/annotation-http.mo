import Text "mo:core/Text";
import Blob "mo:core/Blob";
import Nat64 "mo:core/Nat64";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Error "mo:core/Error";


import Types "../types/annotation-http";

module {
  // IC management canister actor for HTTP outcalls.
  let IC : actor {
    http_request : shared (Types.CanisterHttpRequestArgs) -> async Types.IcHttpRequestResult;
  } = actor "aaaaa-aa";

  // Maximum response size: 2 MB
  let MAX_RESPONSE_BYTES : Nat64 = 2_000_000;

  // Cycles attached to each HTTP outcall (230 billion)
  let HTTP_OUTCALL_CYCLES : Nat = 230_949_972_000;

  // Makes an HTTPS GET outcall to `url` and returns the raw HTML body and
  // a best-effort title extracted from the <title> tag.
  // Validates that the URL starts with "https://".
  public func fetchURL(
    url : Text,
    transformFunc : shared query ({ context : Blob; response : Types.IcHttpRequestResult }) -> async Types.IcHttpRequestResult,
  ) : async { #ok : Types.FetchURLResult; #err : Text } {
    if (not url.startsWith(#text "https://")) {
      return #err("URL must start with https://");
    };

    let request : Types.CanisterHttpRequestArgs = {
      url;
      max_response_bytes = ?MAX_RESPONSE_BYTES;
      method = #get;
      headers = [];
      body = null;
      transform = ?{
        function = transformFunc;
        context = Blob.fromArray([]);
      };
    };

    let response = try {
      await (with cycles = HTTP_OUTCALL_CYCLES) IC.http_request(request);
    } catch (e) {
      return #err("HTTP outcall failed: " # e.message());
    };

    let html = switch (response.body.decodeUtf8()) {
      case (?text) { text };
      case (null) { return #err("Response body is not valid UTF-8") };
    };

    let title = extractTitle(html);
    #ok({ title; html });
  };

  // Extracts all unique curation/swarm/location combinations from the provided
  // maps and returns them annotated with the corresponding published graph ID.
  public func getPublishedPaths(
    curationToPublishedGraphId : Map.Map<Text, Text>,
    curationMap : Map.Map<Text, Types.CurationShape>,
    swarmMap : Map.Map<Text, Types.SwarmShape>,
    locationMap : Map.Map<Text, Types.LocationShape>,
  ) : [Types.PublishedPath] {
    let result = List.empty<Types.PublishedPath>();
    let seen = Map.empty<Text, ()>();

    for ((_locId, loc) in locationMap.entries()) {
      switch (swarmMap.get(loc.parentSwarmId)) {
        case (null) {};
        case (?swarm) {
          switch (curationMap.get(swarm.parentCurationId)) {
            case (null) {};
            case (?curation) {
              let graphId = switch (curationToPublishedGraphId.get(curation.id)) {
                case (?gid) { gid };
                case (null) { "" };
              };
              let key = curation.name # "@" # swarm.name # "@" # loc.title;
              if (not seen.containsKey(key)) {
                seen.add(key, ());
                result.add({
                  curation = curation.name;
                  swarm = swarm.name;
                  location = loc.title;
                  graphId;
                });
              };
            };
          };
        };
      };
    };

    result.toArray();
  };

  // Helper: extracts text between open-tag and close-tag delimiters.
  // Tries the given openTag/closeTag pair. Returns null if not found.
  func extractBetween(text : Text, openTag : Text, closeTag : Text) : ?Text {
    let afterOpenIter = text.split(#text openTag);
    // Discard the first part (before the open tag)
    switch (afterOpenIter.next()) {
      case (null) { return null };
      case (_) {};
    };
    // Second part starts right after openTag
    let afterOpen = switch (afterOpenIter.next()) {
      case (null) { return null };
      case (?s) { s };
    };
    // Split on closeTag — first segment is the content we want
    let contentIter = afterOpen.split(#text closeTag);
    switch (contentIter.next()) {
      case (null) { null };
      case (?content) { ?content };
    };
  };

  // Extracts the best-effort page title from raw HTML text.
  // Tries lowercase, uppercase, and mixed-case title tag variants.
  // Returns "Untitled" if no <title> tag is found.
  public func extractTitle(html : Text) : Text {
    // Try common variants of the <title> tag
    let variants : [(Text, Text)] = [
      ("<title>", "</title>"),
      ("<Title>", "</Title>"),
      ("<TITLE>", "</TITLE>"),
      ("<title>", "</Title>"),
      ("<title>", "</TITLE>"),
    ];

    for ((openTag, closeTag) in variants.values()) {
      switch (extractBetween(html, openTag, closeTag)) {
        case (?content) {
          let trimmed = content.trim(#char ' ');
          if (trimmed.size() > 0) { return trimmed };
        };
        case (null) {};
      };
    };

    "Untitled";
  };
};
