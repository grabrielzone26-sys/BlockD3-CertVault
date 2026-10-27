import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Prim "mo:prim";
import Principal "mo:base/Principal";
import Text "mo:base/Text";

actor class CertificateRegistry(initAdmin : Principal) {
  var admin : Principal = initAdmin;
  var bridgePrincipal : ?Principal = null;
  var certificateEntries : [(Text, Text)] = [];

  let certificateStore = HashMap.HashMap<Text, Text>(32, Text.equal, Text.hash);

  system func preupgrade() {
    certificateEntries := Iter.toArray(certificateStore.entries());
  };

  system func postupgrade() {
    for ((certificateId, documentHash) in certificateEntries.vals()) {
      certificateStore.put(certificateId, documentHash);
    };
  };

  private func assertAdmin(caller : Principal) {
    if (caller != admin) {
      Prim.trap("Only the admin principal can perform this action");
    };
  };

  private func assertBridgePrincipal(caller : Principal) {
    switch (bridgePrincipal) {
      case (?configuredBridge) {
        if (caller != configuredBridge) {
          Prim.trap("Only the configured bridge principal can anchor certificates");
        };
      };
      case null {
        Prim.trap("Bridge principal has not been configured");
      };
    };
  };

  public shared ({ caller }) func setBridgePrincipal(principal : Principal) : async Bool {
    assertAdmin(caller);
    bridgePrincipal := ?principal;
    true
  };

  public shared ({ caller }) func anchorCertificate(id : Text, hash : Text) : async Bool {
    assertBridgePrincipal(caller);

    if (Text.size(id) == 0 or Text.size(hash) == 0) {
      Prim.trap("id and hash are required");
    };

    certificateStore.put(id, hash);
    true
  };

  public query func verifyCertificate(id : Text, testHash : Text) : async Bool {
    switch (certificateStore.get(id)) {
      case (?storedHash) { storedHash == testHash };
      case null { false };
    }
  };

  public query func getCertificateHash(id : Text) : async ?Text {
    certificateStore.get(id)
  };

  public query func getBridgePrincipal() : async ?Principal {
    bridgePrincipal
  };

  public query func getAdmin() : async Principal {
    admin
  };

  public shared ({ caller }) func transferAdmin(newAdmin : Principal) : async Bool {
    assertAdmin(caller);
    admin := newAdmin;
    true
  };
}
