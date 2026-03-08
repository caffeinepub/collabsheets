import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Int "mo:core/Int";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  type CellKey = Text;

  public type Document = {
    id : Text;
    title : Text;
    author : Principal;
    authorName : Text;
    lastModified : Int;
  };

  public type Cell = {
    row : Nat;
    col : Nat;
    value : Text;
    formula : Text;
    editedBy : Text;
    timestamp : Int;
  };

  type Presence = {
    userName : Text;
    color : Text;
    lastActive : Int;
  };

  public type UserProfile = {
    name : Text;
    color : Text;
  };

  public type Guest = {
    #guest;
  };

  public type SpreadsheetError = {
    #missingDocument;
  };

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let documents = Map.empty<Text, Document>();
  let cells = Map.empty<Text, Map.Map<CellKey, Cell>>();
  let presences = Map.empty<Text, Map.Map<Text, Presence>>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  func generateDocId(title : Text) : Text {
    title.concat(Time.now().toText());
  };

  func getUserNameInternal(p : Principal) : Text {
    switch (userProfiles.get(p)) {
      case (null) { "Anonymous" };
      case (?profile) { profile.name };
    };
  };

  func filterActivePresence(presenceMap : Map.Map<Text, Presence>) : Iter.Iter<Presence> {
    let currentTime = Time.now();
    let filtered = presenceMap.filter(
      func(_id, presence) {
        currentTime - presence.lastActive <= 60_000_000_000;
      }
    );
    filtered.values();
  };

  func compareDocumentsByLastModified(doc1 : Document, doc2 : Document) : Order.Order {
    Int.compare(doc2.lastModified, doc1.lastModified);
  };

  public shared ({ caller }) func createDocument(title : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Only guests can create documents");
    };

    let docId = generateDocId(title);
    let document : Document = {
      id = docId;
      title;
      author = caller;
      authorName = getUserNameInternal(caller);
      lastModified = Time.now();
    };

    documents.add(docId, document);
    cells.add(docId, Map.empty<CellKey, Cell>());
    presences.add(docId, Map.empty<Text, Presence>());
    docId;
  };

  public query ({ caller }) func listDocuments() : async [Document] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Only guests can list documents");
    };

    let docsArray = documents.values().toArray();
    docsArray.sort(compareDocumentsByLastModified);
  };

  public shared ({ caller }) func deleteDocument(docId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Only guests can delete documents");
    };

    let doc = documents.get(docId);
    switch (doc) {
      case (null) { Runtime.trap("Document not found") };
      case (_) {
        documents.remove(docId);
        cells.remove(docId);
        presences.remove(docId);
      };
    };
  };

  public shared ({ caller }) func updateCell(docId : Text, row : Nat, col : Nat, value : Text, formula : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Only guests can update cells");
    };

    switch (cells.get(docId)) {
      case (null) { Runtime.trap("Document not found") };
      case (?cellMap) {
        let cellKey = row.toText().concat(",").concat(col.toText());
        let newCell : Cell = {
          row;
          col;
          value;
          formula;
          editedBy = getUserNameInternal(caller);
          timestamp = Time.now();
        };
        cellMap.add(cellKey, newCell);
        cells.add(docId, cellMap);

        switch (documents.get(docId)) {
          case (null) { Runtime.trap("Document not found") };
          case (?doc) {
            let updatedDoc = { doc with lastModified = Time.now() };
            documents.add(docId, updatedDoc);
          };
        };
      };
    };
  };

  public query ({ caller }) func getCells(docId : Text) : async [Cell] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Only guests can get cells");
    };

    switch (cells.get(docId)) {
      case (null) { [] };
      case (?cellMap) { cellMap.values().toArray() };
    };
  };

  public shared ({ caller }) func joinDocument(docId : Text, color : Text, userName : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Only guests can join a document");
    };

    let sessionId = caller.toText().concat("-").concat(Time.now().toText());
    let presence : Presence = {
      userName = if (userName == "") { getUserNameInternal(caller) } else { userName };
      color;
      lastActive = Time.now();
    };
    switch (presences.get(docId)) {
      case (null) { Runtime.trap("Document not found") };
      case (?presenceMap) {
        presenceMap.add(sessionId, presence);
        presences.add(docId, presenceMap);
      };
    };
    sessionId;
  };

  public shared ({ caller }) func leaveDocument(docId : Text, sessionId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Only guests can leave a document");
    };

    switch (presences.get(docId)) {
      case (null) { Runtime.trap("Document not found") };
      case (?presenceMap) {
        presenceMap.remove(sessionId);
        presences.add(docId, presenceMap);
      };
    };
  };

  public shared ({ caller }) func heartbeat(docId : Text, sessionId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Only guests can use heartbeat");
    };

    switch (presences.get(docId)) {
      case (null) { Runtime.trap("Document not found") };
      case (?presenceMap) {
        switch (presenceMap.get(sessionId)) {
          case (null) {
            Runtime.trap("Presence not found");
          };
          case (?presence) {
            let updatedPresence = { presence with lastActive = Time.now() };
            presenceMap.add(sessionId, updatedPresence);
            presences.add(docId, presenceMap);
          };
        };
      };
    };
  };

  public query ({ caller }) func getPresence(docId : Text) : async [Presence] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Only guests can get presence");
    };

    switch (presences.get(docId)) {
      case (null) { [] };
      case (?presenceMap) { filterActivePresence(presenceMap).toArray() };
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Only guests can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Only guests can get user profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Only guests can get user profiles");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func checkPermission() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Only guests can access this operation");
    };
  };
};
