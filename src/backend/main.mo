import Map "mo:core/Map";
import List "mo:core/List";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  type Document = {
    id : Text;
    title : Text;
    author : Principal;
    authorName : Text;
    lastModified : Int;
  };

  module Document {
    public func compare(doc1 : Document, doc2 : Document) : Order.Order {
      Text.compare(doc1.title, doc2.title);
    };
  };

  type Cell = {
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

  type UserProfile = {
    name : Text;
    color : Text;
  };

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let documents = Map.empty<Text, Document>();
  let cells = Map.empty<Text, List.List<Cell>>();
  let presences = Map.empty<Text, List.List<Presence>>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  public shared ({ caller }) func createDocument(title : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create documents");
    };
    let docId = title.concat(Time.now().toText());
    let document : Document = {
      id = docId;
      title;
      author = caller;
      authorName = getUserName(caller);
      lastModified = Time.now();
    };
    documents.add(docId, document);
    cells.add(docId, List.empty<Cell>());
    presences.add(docId, List.empty<Presence>());
    docId;
  };

  public query ({ caller }) func listDocuments() : async [Document] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list documents");
    };
    documents.values().toArray().sort();
  };

  public shared ({ caller }) func deleteDocument(docId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete documents");
    };
    switch (documents.get(docId)) {
      case (null) { Runtime.trap("Document not found") };
      case (?doc) {
        if (doc.author != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only document author or admin can delete this document");
        };
        documents.remove(docId);
        cells.remove(docId);
        presences.remove(docId);
      };
    };
  };

  public shared ({ caller }) func updateCell(docId : Text, row : Nat, col : Nat, value : Text, formula : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update cells");
    };
    let newCell : Cell = {
      row;
      col;
      value;
      formula;
      editedBy = getUserName(caller);
      timestamp = Time.now();
    };
    switch (cells.get(docId)) {
      case (null) { Runtime.trap("Document not found") };
      case (?cellList) {
        cellList.add(newCell);
        cells.add(docId, cellList);
      };
    };
  };

  public query ({ caller }) func getCells(docId : Text) : async [Cell] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get cells");
    };
    switch (cells.get(docId)) {
      case (null) { [] };
      case (?cellList) { cellList.toArray() };
    };
  };

  public shared ({ caller }) func joinDocument(docId : Text, color : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can join documents");
    };
    let presence : Presence = {
      userName = getUserName(caller);
      color;
      lastActive = Time.now();
    };
    let newPresences = List.fromArray<Presence>([presence]);
    presences.add(docId, newPresences);
    getUserName(caller);
  };

  public shared ({ caller }) func leaveDocument(docId : Text, sessionId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can leave documents");
    };
    switch (presences.get(docId)) {
      case (null) { Runtime.trap("Document not found") };
      case (?presenceList) {
        let filtered = presenceList.filter(func(p) { p.userName != sessionId });
        presences.add(docId, filtered);
      };
    };
  };

  public shared ({ caller }) func heartbeat(docId : Text, sessionId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send heartbeat");
    };
    switch (presences.get(docId)) {
      case (null) { Runtime.trap("Document not found") };
      case (?presenceList) {
        let updated = presenceList.map<Presence, Presence>(
          func(p) { if (p.userName == sessionId) { { p with lastActive = Time.now() } } else { p } }
        );
        presences.add(docId, updated);
      };
    };
  };

  public query ({ caller }) func getPresence(docId : Text) : async [Presence] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get presence");
    };
    switch (presences.get(docId)) {
      case (null) { [] };
      case (?presenceList) {
        let currentTime = Time.now();
        let active = presenceList.filter(func(p) { currentTime - p.lastActive <= 60_000_000_000 });
        active.toArray();
      };
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  func getUserName(caller : Principal) : Text {
    switch (userProfiles.get(caller)) {
      case (null) { "Anonymous" };
      case (?profile) { profile.name };
    };
  };
};
