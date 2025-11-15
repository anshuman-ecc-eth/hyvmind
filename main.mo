import AccessControl "authorization/access-control";
import Principal "mo:base/Principal";
import OrderedMap "mo:base/OrderedMap";
import Debug "mo:base/Debug";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Text "mo:base/Text";



// Apply migration

actor {
  // Initialize the user system state
  let accessControlState = AccessControl.initState();

  // Initialize auth (first caller becomes admin, others become users)
  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    // Admin-only check happens inside assignRole
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public type LegalDomain = {
    #constitutional;
    #criminal;
    #corporate;
    #civil;
    #taxation;
    #environmental;
    #intellectualProperty;
    #labour;
    #family;
    #property;
    #administrative;
    #other : Text;
  };

  public type SourceTextType = {
    #statute;
    #caselaw;
  };

  public type NoteType = {
    #positiveLaw;
    #interpretation;
  };

  public type UserProfile = {
    name : Text;
    legalDomains : [LegalDomain];
    swarms : [Text];
  };

  public type Note = {
    id : Nat;
    title : Text;
    content : Text;
    creator : Principal;
    createdAt : Int;
    tags : [Text];
    legalDomains : [LegalDomain];
    category : LegalDomain;
    noteType : NoteType;
    sourceType : ?SourceTextType;
    isPublic : Bool;
    linkedType1NoteId : ?Nat;
    metadata : [(Text, Text)];
    jurisdiction : Text;
  };

  public type LiveGraphNode = {
    id : Nat;
    title : Text;
    category : LegalDomain;
    sourceType : SourceTextType;
    createdAt : Int;
  };

  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
  transient let natMap = OrderedMap.Make<Nat>(Nat.compare);

  var userProfiles = principalMap.empty<UserProfile>();
  var notes = natMap.empty<Note>();
  var nextNoteId = 0;

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view profiles");
    };
    principalMap.get(userProfiles, caller);
  };

  public shared ({ caller }) func getOrCreateCallerUserProfile() : async UserProfile {
    // Reject anonymous principals
    if (Principal.isAnonymous(caller)) {
      Debug.trap("Unauthorized: Anonymous principals cannot create profiles");
    };

    // Initialize access control for authenticated users
    // This ensures authenticated non-anonymous users get proper roles
    AccessControl.initialize(accessControlState, caller);

    // After initialization, verify they have at least #user permission
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can access profiles");
    };

    switch (principalMap.get(userProfiles, caller)) {
      case (?profile) { profile };
      case null {
        let defaultProfile : UserProfile = {
          name = "";
          legalDomains = [];
          swarms = [];
        };
        userProfiles := principalMap.put(userProfiles, caller, defaultProfile);
        defaultProfile;
      };
    };
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Can only view your own profile");
    };
    principalMap.get(userProfiles, user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles := principalMap.put(userProfiles, caller, profile);
  };

  public shared ({ caller }) func createNote(
    title : Text,
    content : Text,
    tags : [Text],
    legalDomains : [LegalDomain],
    category : LegalDomain,
    noteType : NoteType,
    sourceType : ?SourceTextType,
    isPublic : Bool,
    linkedType1NoteId : ?Nat,
    metadata : [(Text, Text)],
    jurisdiction : Text,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create notes");
    };

    if (not isValidTitleCode(title)) {
      Debug.trap("Invalid title code format. Must be 6 characters: first 3 numeric, last 3 alphabetic");
    };

    switch (noteType) {
      case (#positiveLaw) {
        switch (sourceType) {
          case null {
            Debug.trap("Source type is required for positive law notes");
          };
          case (?_st) {};
        };
      };
      case (#interpretation) {
        switch (linkedType1NoteId) {
          case null {
            Debug.trap("Linked Type 1 note ID is required for interpretation notes");
          };
          case (?type1Id) {
            let type1NoteOpt = natMap.get(notes, type1Id);
            switch (type1NoteOpt) {
              case null {
                Debug.trap("Linked Type 1 note not found");
              };
              case (?type1Note) {
                switch (type1Note.noteType) {
                  case (#positiveLaw) {};
                  case (#interpretation) {
                    Debug.trap("Linked note must be a Type 1 positive law note");
                  };
                };
              };
            };
          };
        };
      };
    };

    let note : Note = {
      id = nextNoteId;
      title;
      content;
      creator = caller;
      createdAt = Time.now();
      tags;
      legalDomains;
      category;
      noteType;
      sourceType;
      isPublic;
      linkedType1NoteId;
      metadata;
      jurisdiction;
    };

    notes := natMap.put(notes, nextNoteId, note);
    nextNoteId += 1;
    note.id;
  };

  public shared ({ caller }) func editNote(
    id : Nat,
    title : Text,
    content : Text,
    tags : [Text],
    legalDomains : [LegalDomain],
    category : LegalDomain,
    noteType : NoteType,
    sourceType : ?SourceTextType,
    isPublic : Bool,
    linkedType1NoteId : ?Nat,
    metadata : [(Text, Text)],
    jurisdiction : Text,
  ) : async () {
    let noteOpt = natMap.get(notes, id);
    switch (noteOpt) {
      case null {
        Debug.trap("Note not found");
      };
      case (?note) {
        // Authorization: Only note creator or admin can edit
        if (caller != note.creator and not AccessControl.isAdmin(accessControlState, caller)) {
          Debug.trap("Unauthorized: Can only edit your own notes");
        };

        if (not isValidTitleCode(title)) {
          Debug.trap("Invalid title code format. Must be 6 characters: first 3 numeric, last 3 alphabetic");
        };

        switch (noteType) {
          case (#positiveLaw) {
            switch (sourceType) {
              case null {
                Debug.trap("Source type is required for positive law notes");
              };
              case (?_st) {};
            };
          };
          case (#interpretation) {
            switch (linkedType1NoteId) {
              case null {
                Debug.trap("Linked Type 1 note ID is required for interpretation notes");
              };
              case (?type1Id) {
                let type1NoteOpt = natMap.get(notes, type1Id);
                switch (type1NoteOpt) {
                  case null {
                    Debug.trap("Linked Type 1 note not found");
                  };
                  case (?type1Note) {
                    switch (type1Note.noteType) {
                      case (#positiveLaw) {};
                      case (#interpretation) {
                        Debug.trap("Linked note must be a Type 1 positive law note");
                      };
                    };
                  };
                };
              };
            };
          };
        };

        let updatedNote : Note = {
          id;
          title;
          content;
          creator = note.creator;
          createdAt = note.createdAt;
          tags;
          legalDomains;
          category;
          noteType;
          sourceType;
          isPublic;
          linkedType1NoteId;
          metadata;
          jurisdiction;
        };

        notes := natMap.put(notes, id, updatedNote);
      };
    };
  };

  public query ({ caller }) func getCallerNotes() : async [Note] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view notes");
    };

    let userNotes = Iter.toArray(
      Iter.filter(
        natMap.vals(notes),
        func(n : Note) : Bool {
          n.creator == caller;
        },
      )
    );
    userNotes;
  };

  public query ({ caller }) func getNote(id : Nat) : async ?Note {
    let noteOpt = natMap.get(notes, id);
    switch (noteOpt) {
      case null { null };
      case (?note) {
        // Authorization: Allow access if:
        // 1. Note is public (anyone can view including guests)
        // 2. Caller is the creator (owner can view their own)
        // 3. Caller is an admin (admin can view all)
        if (note.isPublic or caller == note.creator or AccessControl.isAdmin(accessControlState, caller)) {
          ?note;
        } else {
          Debug.trap("Unauthorized: Can only view public notes or your own notes");
        };
      };
    };
  };

  // Public query - accessible to anyone including guests
  // This is intentional as LiveGraph displays public Type 1 notes
  public query func getPublicLiveGraphNodes() : async [LiveGraphNode] {
    let publicNotes = Iter.filter(
      natMap.vals(notes),
      func(n : Note) : Bool {
        n.isPublic and n.noteType == #positiveLaw
      },
    );

    let publicNodes = Iter.toArray(
      Iter.map(
        publicNotes,
        func(n : Note) : LiveGraphNode {
          {
            id = n.id;
            title = n.title;
            category = n.category;
            sourceType = switch (n.sourceType) {
              case null { #statute };
              case (?st) { st };
            };
            createdAt = n.createdAt;
          };
        },
      )
    );
    publicNodes;
  };

  func isValidTitleCode(title : Text) : Bool {
    if (Text.size(title) != 6) {
      return false;
    };

    let chars = Text.toArray(title);
    // Check first 3 characters are digits
    for (i in Iter.range(0, 2)) {
      let c = chars[i];
      if (c < '0' or c > '9') {
        return false;
      };
    };

    // Check last 3 characters are alphabetic
    for (i in Iter.range(3, 5)) {
      let c = chars[i];
      if ((c < 'a' or c > 'z') and (c < 'A' or c > 'Z')) {
        return false;
      };
    };

    true;
  };
};

