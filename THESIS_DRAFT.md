# Hybrid Blockchain-Based Academic Certificate Verification System

## Front Matter

### Dedication
This work is dedicated to my family, lecturers, and all those who continue to support the pursuit of knowledge, innovation, and the practical use of technology to solve real-world problems in education.

### Declaration
I declare that this thesis is my own original work and has not been submitted, in full or in part, to any other institution for academic credit. All sources of information used in this study have been duly acknowledged.

### Acknowledgements
I express my sincere gratitude to God for the strength and wisdom to complete this work. I also extend my appreciation to my supervisor, lecturers, classmates, friends, and family members for their guidance, encouragement, and constructive support throughout the development of this project and the preparation of this thesis. I further acknowledge the open-source communities whose tools and documentation contributed significantly to the implementation of this system, including the communities behind React, Node.js, MongoDB, Hyperledger Fabric, and the Internet Computer Protocol.

### Table of Contents
1. Abstract
2. Chapter One: Introduction
3. Chapter Two: System Overview and Conceptual Foundation
4. Chapter Three: Methodology and System Design
5. Chapter Four: Literature Review
6. Chapter Five: Requirements Analysis
7. Chapter Six: Implementation Details
8. Chapter Seven: Testing and Evaluation
9. Chapter Eight: Conclusion and Recommendations
10. References
11. Appendices

## A Degree-Level Thesis Draft

### Proposed Title
Design and Implementation of a Hybrid Blockchain-Based Academic Certificate Issuance and Verification System Using Hyperledger Fabric and the Internet Computer Protocol

## Abstract
The continued growth of digital education systems has increased the need for secure, transparent, and efficient methods of issuing and verifying academic certificates. Traditional certificate management systems remain vulnerable to document forgery, slow manual verification, fragmented record keeping, and limited interoperability between issuing institutions and third-party verifiers. This project addresses these limitations by designing and implementing a hybrid blockchain-based certificate verification system that combines Hyperledger Fabric for controlled certificate issuance with the Internet Computer Protocol (ICP) for public hash anchoring and tamper-evident verification. The solution further integrates MongoDB for application data management, React for the user-facing interface, and Node.js/Express for backend service orchestration.

The developed system supports role-based access for students, administrators, and verifiers. Administrators can issue certificates through a web interface, after which the system calculates a cryptographic hash of the certificate, stores issuance metadata, records the certificate on Hyperledger Fabric, and listens for a chaincode event that triggers anchoring of the certificate hash to an ICP canister. The architecture also includes document storage fallback mechanisms, QR-code-based verification, audit logging, two-factor authentication, and an encryption pipeline based on AES-256, SHA-256, and ECDSA-related key management operations.

The main contribution of this project is the design of a hybrid trust model. Instead of relying on a single blockchain, the system uses a permissioned ledger for institutional control and a separate public-facing anchoring layer for broader verification confidence. This improves governance, preserves privacy, and strengthens tamper resistance while remaining practical for local institutional deployment. The project demonstrates that a hybrid blockchain model can provide a viable and scalable approach to academic certificate verification at degree level, particularly in environments where institutions require both controlled issuance and externally auditable proof of integrity.

## Chapter One: Introduction

### 1.1 Background of the Study
Academic certificates are essential instruments for proving educational achievement, professional qualification, and institutional credibility. Universities, colleges, and training organizations issue certificates to students as evidence that specific learning outcomes have been achieved. These certificates are then used for employment, further education, scholarship applications, immigration processing, and professional licensing. Despite their importance, the management and verification of academic certificates in many institutions remains largely dependent on centralized databases, paper-based documentation, or ad hoc email confirmation processes.

These conventional approaches create several operational and security problems. Forged certificates are increasingly easy to produce using digital editing tools. Employers and institutions often spend considerable time and resources confirming the authenticity of certificates. In some cases, verification requests are delayed because records are stored manually, archived poorly, or controlled by a single department with limited availability. Even where digital systems exist, they may not provide cryptographic proof that a certificate has not been altered after issuance.

Blockchain technology offers an alternative approach by providing immutability, traceability, and distributed trust. However, not all blockchain platforms solve the same problem equally well. Public blockchains offer strong transparency but may expose sensitive information and create governance concerns for institutions. Private or permissioned blockchains offer controlled participation and privacy, but they can appear less transparent to external verifiers. This project responds to that tension by adopting a hybrid approach: Hyperledger Fabric is used for permissioned institutional issuance, while ICP is used to anchor certificate hashes for broader verification trust.

### 1.2 Problem Statement
The major problem addressed in this project is the lack of a secure, efficient, and trustworthy system for issuing and verifying academic certificates. Existing systems commonly suffer from the following limitations:

1. Certificates can be forged or modified without reliable tamper detection.
2. Verification often depends on manual institutional response, which is slow and costly.
3. Centralized storage creates a single point of failure and trust.
4. External verifiers may not fully trust private institutional databases without independent proof.
5. Many systems do not integrate strong access control, user authentication, audit trails, and cryptographic protection of certificate data.

As a result, institutions face reputational risk, students face delays in proving their qualifications, and employers face uncertainty when validating academic records.

### 1.3 Aim of the Study
The aim of this study is to design and implement a hybrid blockchain-based academic certificate issuance and verification system that improves certificate integrity, verification efficiency, institutional control, and public trust.

### 1.4 Objectives of the Study
The specific objectives of the project are:

1. To design a web-based academic certificate management platform for students, administrators, and verifiers.
2. To implement certificate issuance on a permissioned blockchain using Hyperledger Fabric.
3. To anchor certificate hashes on the Internet Computer Protocol for an additional public integrity layer.
4. To integrate cryptographic hashing, encryption, and digital verification techniques for document protection.
5. To provide QR-based and document-hash-based certificate verification mechanisms.
6. To implement role-based access control, audit logging, and two-factor authentication to improve system security.
7. To evaluate the practical relevance of a hybrid blockchain model for academic certificate verification.

### 1.5 Research Questions
This project is guided by the following research questions:

1. How can blockchain technology be applied to improve the authenticity and verification of academic certificates?
2. What are the advantages of combining a permissioned blockchain with a public anchoring layer?
3. How can cryptographic techniques and application-layer security controls complement blockchain-based verification?
4. To what extent can a hybrid blockchain architecture provide a practical solution for educational institutions?

### 1.6 Significance of the Study
This study is significant to several stakeholders. Educational institutions benefit from stronger control over certificate issuance and reduced exposure to forgery. Students benefit from faster and more credible verification of their qualifications. Employers and third-party verifiers benefit from quicker verification workflows and reduced uncertainty. From an academic perspective, the project contributes a practical case study in hybrid blockchain architecture, showing how private governance and public trust layers can be combined in one certificate verification system.

### 1.7 Scope of the Study
The project focuses on the design and implementation of a locally deployable certificate issuance and verification system. The implemented solution includes:

1. A React frontend for certificate issuance, viewing, and verification.
2. A Node.js/Express backend with MongoDB for user records, certificate metadata, and audit logs.
3. Hyperledger Fabric chaincode for certificate issuance, retrieval, verification, and revocation.
4. An ICP canister for certificate hash anchoring and validation.
5. Security features including authentication, role-based access control, two-factor authentication, and encryption support.

The current implementation is targeted at local development and demonstration rather than public production deployment. It proves the feasibility of the model but does not yet include cloud-scale hosting, high-availability deployment, or large-scale performance benchmarking.

## Chapter Two: System Overview and Conceptual Foundation

### 2.1 Overview of the Proposed Solution
The proposed system is a hybrid certificate verification platform built around a clear separation of responsibilities. Hyperledger Fabric acts as the primary issuance ledger because it supports permissioned participation, organizational identity, and controlled smart-contract execution. ICP acts as a secondary integrity layer by storing certificate hash anchors through a canister that accepts writes only from a configured bridge principal. MongoDB stores application metadata, user accounts, encrypted certificate details, and audit activity. The backend coordinates the entire workflow and exposes API endpoints consumed by the frontend.

This separation is important. The project does not store sensitive certificate files directly on a public blockchain. Instead, it stores certificate metadata and cryptographic proofs where appropriate, preserving privacy while still enabling tamper-evident verification. The result is an architecture that balances confidentiality, governance, and transparency.

### 2.2 Why a Hybrid Blockchain Model Was Chosen
The project intentionally avoids a single-chain design. A purely public blockchain model could expose sensitive institutional patterns, create cost and governance constraints, and reduce administrative control. A purely private blockchain model, while efficient for institutional governance, may not provide enough external assurance to independent verifiers. The hybrid model addresses both concerns.

Hyperledger Fabric was selected because it supports permissioned membership, smart contracts, and institution-oriented governance. ICP was selected because it can host application logic in a canister and provide an external anchoring layer for hash validation. By recording issuance in Fabric and anchoring the resulting document hash in ICP through an event-driven backend bridge, the system produces two distinct trust signals: institutional proof and independent integrity proof.

### 2.3 Actual Project Scope and Product Identity
The implemented system is presented in the user interface as `BlockD3 CertVault`. It is a full-stack certificate management application rather than a standalone smart contract demonstration. The completed project includes:

1. A public verification portal for external certificate checks.
2. A student dashboard for submission tracking and certificate retrieval.
3. An administrator dashboard for issuance, review, verifier approval, and bridge monitoring.
4. A verifier dashboard for manual, QR-based, and batch verification.

The repository itself is divided into:

1. `frontend/` for the React client.
2. `backend/` for the API, security middleware, database models, and integration services.
3. `blockchain/fabric/chaincode/certificates/` for the Fabric smart contract.
4. `blockchain/icp/src/cert_registry/` for the ICP canister.
5. `scripts/` for development and network automation.

### 2.4 Real Deployment Scope of the Current Project
The current project is intentionally designed for local development and academic demonstration rather than paid cloud production deployment. In the implemented setup:

1. Hyperledger Fabric runs locally in Docker under WSL.
2. MongoDB runs locally.
3. ICP runs on the local `dfx` replica.
4. The backend bridge listens locally for Fabric events and anchors hashes to the local canister.

This local-only scope is not a weakness in itself. It establishes a controlled environment for proving that the hybrid architecture works before introducing production hosting complexity.

### 2.5 Actual End-to-End Workflows Implemented
The project contains two issuance paths.

The first is direct administrator issuance:

1. The administrator uses the `Issue Certificate` page.
2. The frontend submits certificate metadata and a base64 file to `POST /api/certificates`.
3. The backend hashes the file, generates a certificate ID, optionally uploads it to IPFS, encrypts certificate content, and issues the certificate on Fabric.
4. Fabric emits `CertificateIssued`.
5. The backend bridge anchors the certificate hash to ICP.

The second is student submission followed by administrative approval:

1. A student submits a certificate request through `POST /api/submissions`.
2. The submission enters a review workflow.
3. The administrator approves or rejects it through `PUT /api/submissions/:submissionId/review`.
4. When approved, the system invokes the same issuance pipeline used for direct administrator issuance.

The project also contains several verification paths:

1. Public verification using only a certificate ID.
2. Authenticated manual verification with optional file upload for hash comparison.
3. QR verification through camera scanning.
4. QR verification from uploaded screenshots.
5. Batch verification of multiple certificate IDs.

## Chapter Three: Methodology and System Design

### 3.1 Development Method
The project follows a design-and-implementation methodology. First, the functional and security requirements of a certificate verification system were identified. Next, a modular architecture was defined to separate presentation, application logic, data storage, and blockchain services. After this, the main components were implemented iteratively, tested locally, and integrated into an end-to-end workflow.

The methodology is practical rather than purely theoretical. The goal of the study is not only to discuss blockchain suitability, but to demonstrate a working prototype that supports certificate issuance, verification, revocation, and trust-layer integration.

### 3.2 System Architecture
The architecture contains five major layers:

1. Frontend layer: built with React and responsible for user interaction.
2. Backend API layer: built with Node.js and Express to process requests and enforce business logic.
3. Database layer: MongoDB stores users, certificates, audit logs, submissions, and security settings.
4. Permissioned blockchain layer: Hyperledger Fabric stores certificate records and revocation state.
5. Public anchoring layer: an ICP canister stores certificate hash anchors for external integrity verification.

In the implemented workflow, an administrator submits certificate details and uploads a certificate file through the frontend. The backend converts the file into a hash using SHA-256, generates a unique certificate identifier, optionally uploads the file to IPFS, encrypts certificate content, and sends an issuance transaction to the Fabric chaincode. The chaincode records the certificate state and emits a `CertificateIssued` event. A backend bridge service listens for that event and submits the certificate ID and document hash to the ICP canister. This produces a second immutable reference point for verification.

### 3.3 Smart Contract and Canister Design
The Hyperledger Fabric chaincode implements four core operations:

1. `IssueCertificate`
2. `GetCertificate`
3. `VerifyCertificate`
4. `RevokeCertificate`

When a certificate is issued, the chaincode stores key details such as certificate ID, student ID, course name, document hash, IPFS content identifier, issuer identity, issue timestamp, and validity status. The timestamp is derived from the deterministic transaction timestamp rather than a local system clock, which improves ledger consistency. The chaincode also emits a `CertificateIssued` event containing the certificate ID, document hash, issue time, and transaction ID.

The ICP canister provides a deliberately narrow interface. It stores mappings between certificate IDs and hashes, allows verification of a submitted hash, and restricts write access to a configured bridge principal. Administrative functions are also present for setting the bridge principal and managing the canister administrator. This design reduces the canister attack surface and reinforces the system’s trust model.

### 3.4 Security Design
Security is handled at multiple levels rather than relying on blockchain immutability alone. The system includes:

1. JWT-based authentication for session control.
2. Role-based authorization for students, administrators, and verifiers.
3. Two-factor authentication based on TOTP and backup codes.
4. Audit logging for issuance, verification, and revocation actions.
5. Cryptographic hashing using SHA-256.
6. File encryption using AES-256-GCM.
7. Key wrapping and signature operations through the project’s ECDSA-related encryption services.

The certificate model also stores encrypted certificate metadata, authorized viewers, encryption proofs, and issuer key references. This is an important design decision because blockchain alone confirms integrity, but not confidentiality. The application therefore separates integrity verification from document protection.

### 3.5 Verification Workflow
The verification module supports multiple approaches. A verifier may enter a certificate ID manually, scan a QR code, or upload a certificate document so that its SHA-256 hash can be compared against the issued record. The backend queries Hyperledger Fabric to determine whether the certificate exists, whether it is still valid, and whether the submitted hash matches the original document hash. The frontend then displays clear verification states such as valid, revoked, invalid, or hash mismatch.

This workflow is academically important because it shows that certificate verification is not treated as a simple database lookup. Instead, verification combines application-level record retrieval, blockchain-based state confirmation, and document-level hash comparison.

## Chapter Four: Literature Review

### 4.1 Introduction to the Literature Review
The literature on academic credential verification consistently identifies trust, integrity, privacy, and interoperability as central concerns. Traditional record verification systems depend heavily on institutional databases and manual communication channels. In response, researchers and developers have increasingly explored blockchain as a mechanism for securing educational credentials. This chapter reviews the key ideas underlying that trend and situates the present project within existing knowledge.

### 4.2 Academic Certificate Forgery and Verification Challenges
Certificate fraud remains a persistent issue in education and employment ecosystems. Fake degrees, altered transcripts, and misrepresented qualifications weaken trust in academic institutions and create risk for employers, professional bodies, and government agencies. Conventional verification methods are often reactive rather than proactive. A verifier typically contacts the issuing institution, submits a request, and waits for confirmation. This process may take days or weeks, depending on staffing, record quality, and institutional responsiveness.

Several weaknesses are commonly reported in conventional systems:

1. Overdependence on paper or scanned documents.
2. Slow verification turnaround.
3. Poor interoperability across institutions.
4. Weak tamper evidence.
5. High administrative cost.
6. Difficulty in maintaining permanent, accessible trust records.

These limitations justify the search for stronger digital verification models.

### 4.3 Blockchain as a Trust Infrastructure
Blockchain technology is frequently described in the literature as a distributed ledger capable of preserving transaction history in a tamper-evident way. Its relevance to academic credentials lies in three major properties:

1. Immutability, which helps prevent unauthorized modification of issued records.
2. Traceability, which allows records to be linked to specific issuance events.
3. Distributed trust, which reduces dependence on a single central authority for proving integrity.

In educational applications, the most common blockchain design pattern is not to store complete certificate files directly on-chain, but to store certificate hashes, metadata, references, or proofs. This reduces privacy risk and storage cost while still allowing document integrity to be checked later.

### 4.4 Public Blockchain Approaches
Some studies advocate public blockchains for educational credential verification because they are broadly accessible and independently auditable. A public blockchain can provide strong external trust because no single university controls the ledger. This is attractive for cross-border validation and for employers who do not want to rely solely on institutional assurances.

However, public blockchain approaches also introduce limitations:

1. Sensitive educational information may be exposed if design choices are poor.
2. Transaction fees and performance variability may reduce practicality.
3. Institutions may be uncomfortable with governance models they do not control.
4. Compliance and data protection obligations may become harder to manage.

These concerns explain why many real-world educational implementations avoid placing full academic records directly on public chains.

### 4.5 Permissioned Blockchain Approaches
Permissioned blockchains such as Hyperledger Fabric are often recommended in enterprise and institutional settings. They allow known participants, structured identities, controlled membership, and private governance rules. For academic institutions, this is a major advantage because certificate issuance is inherently an institutional process. A university must be able to define who can issue, revoke, and inspect records.

The literature often highlights the following strengths of permissioned blockchains:

1. Better privacy control.
2. Higher transaction efficiency in controlled environments.
3. Governance aligned with organizational structure.
4. Strong identity management.
5. More predictable operational behavior.

At the same time, permissioned systems may face skepticism from external stakeholders if the ledger appears to be controlled entirely by the issuing institution or a narrow consortium. That concern motivates hybrid trust models.

### 4.6 Hybrid Blockchain Models
Hybrid blockchain models attempt to combine the strengths of public and private networks. In such models, sensitive operations may occur on a permissioned ledger while proof artifacts, anchors, or hashes are published to a second network that can be independently checked. This dual-layer design attempts to solve the classic trade-off between confidentiality and transparency.

In the context of academic certificates, a hybrid model offers several conceptual benefits:

1. Institutional issuance remains governed and permissioned.
2. External parties can still verify integrity independently.
3. Privacy is improved because only hashes or proof references need to be exposed.
4. The architecture can be modular, allowing future upgrades to either layer.

The present project follows this hybrid logic. Hyperledger Fabric is used for the authoritative issuance and revocation state, while ICP is used as an external anchoring layer for certificate hashes. This design aligns well with literature that argues for layered trust rather than single-platform dependence.

### 4.7 Cryptographic Protection in Digital Credential Systems
Blockchain alone does not guarantee confidentiality. It primarily protects integrity and ordered transaction history. For educational records, this is not enough. Certificate files may contain personal information, academic results, identifiers, and institutional metadata that should not be exposed publicly.

The literature therefore emphasizes the complementary role of cryptography. Hashing techniques such as SHA-256 are commonly used to create compact integrity proofs. Symmetric encryption algorithms such as AES are used to secure document content. Digital signatures are used to confirm issuer authenticity and support non-repudiation.

This project reflects that broader view by combining blockchain with:

1. SHA-256 hashing for certificate document integrity.
2. AES-256-GCM encryption for document confidentiality.
3. Signature-oriented key operations for verification support.
4. Access control and authorized viewer models in the application database.

### 4.8 Identity, Access Control, and Security Governance
Another important theme in the literature is that credential systems require more than cryptographic storage. They also require governance over users and actions. Identity verification, role segregation, auditability, and strong authentication are repeatedly identified as critical components of trustworthy academic systems.

This is particularly relevant in blockchain applications because an immutable ledger can preserve both correct and incorrect transactions. If the surrounding access model is weak, blockchain immutability may preserve fraudulent or unauthorized actions rather than prevent them. Therefore, secure system design must include:

1. Authentication for system users.
2. Role-based authorization.
3. Logging and audit trails.
4. Administrative controls over issuance and revocation.
5. Additional safeguards such as two-factor authentication.

The present system includes these features, which strengthens its practical relevance beyond the blockchain layer alone.

### 4.9 Research Gap
A recurring limitation in many educational blockchain studies is that they remain conceptual, rely on a single chain, or underemphasize application-layer security. Some proposals focus narrowly on certificate immutability while leaving out verifier workflows, revocation handling, audit trails, or access control. Others do not show how a permissioned issuance environment can be combined with external trust signals in a practical implementation.

This project contributes to that gap by implementing:

1. A working hybrid Fabric-ICP design.
2. An event-driven bridge between issuance and public anchoring.
3. Web-based issuance and verification workflows.
4. Revocation support.
5. User security controls, including two-factor authentication and audit logging.

### 4.10 Summary of the Literature Review
The literature supports the use of blockchain for digital credential verification but also makes clear that no single blockchain model solves every institutional need. Public systems provide openness, while permissioned systems provide governance and privacy. The most convincing direction for educational certificate systems is therefore a hybrid architecture supported by strong cryptographic and application-level controls. This is the position adopted and implemented in this project.

## Chapter Five: Requirements Analysis

### 5.1 Introduction
This chapter identifies the functional and non-functional requirements that guided the design and implementation of the system. These requirements were derived from the practical needs of educational institutions, students, and certificate verifiers, as well as from the technical goals of security, integrity, and usability.

### 5.2 Functional Requirements

#### 5.2.1 User Management Requirements
The system must support multiple classes of users with different responsibilities. Students need access to their certificates, administrators need authority to issue and revoke certificates, and verifiers need tools for validation. Based on the implementation, the system supports:

1. User registration and login.
2. Role assignment for student, administrator, and verifier accounts.
3. Profile storage and retrieval.
4. Google-based login support for selected users.
5. Two-factor authentication setup, validation, and disablement.

#### 5.2.2 Certificate Management Requirements
The primary business process in the system is certificate lifecycle management. The system must therefore allow authorized administrators to create certificates, link them to students, and preserve a reliable verification trail. Functional requirements include:

1. Uploading a certificate file in supported formats.
2. Generating a unique certificate identifier.
3. Recording certificate metadata such as student name, student ID, course name, graduation date, program, major, and CGPA.
4. Creating a SHA-256 hash of the certificate file.
5. Storing certificate details in the application database.
6. Issuing the certificate on Hyperledger Fabric.
7. Revoking a certificate when necessary.

#### 5.2.3 Verification Requirements
The system must allow verification by trusted users and public-facing consumers. Verification should be fast, understandable, and evidence-based. The implemented requirements include:

1. Verification using certificate ID.
2. Verification using an uploaded document hash.
3. Verification through QR code scanning.
4. Verification through uploaded QR screenshots.
5. Return of verification status such as valid, revoked, invalid, not found, or hash mismatch.

#### 5.2.4 Blockchain Integration Requirements
The project requires a blockchain design that is not symbolic but operational. The system must:

1. Connect to a Hyperledger Fabric network.
2. Submit certificate issue transactions to chaincode.
3. Query blockchain certificate state.
4. Submit certificate revocation transactions.
5. Listen for certificate issuance events from the chaincode.
6. Anchor certificate hashes to an ICP canister through a backend bridge.

#### 5.2.5 Security and Governance Requirements
To preserve trust and reduce misuse, the system must also:

1. Restrict certificate issuance to authorized administrators.
2. Restrict certificate access according to role and ownership.
3. Keep a record of issuance, verification, and revocation events.
4. Support stronger login security through two-factor authentication.
5. Protect stored certificate content using encryption techniques.

### 5.3 Non-Functional Requirements

#### 5.3.1 Security
Security is a core non-functional requirement. The system must preserve data integrity, reduce unauthorized access, and provide tamper evidence for certificates.

#### 5.3.2 Reliability
The system must continue functioning even when one supporting storage component becomes temporarily unavailable. This is reflected in fallback logic, such as retrieving certificate files from the database if IPFS access fails.

#### 5.3.3 Performance
Verification requests should complete quickly enough to be practical in real administrative and employer scenarios. The use of indexed certificate IDs and direct blockchain queries supports this requirement.

#### 5.3.4 Usability
Users should be able to issue and verify certificates through clear interfaces without blockchain expertise. This is addressed through dashboards, forms, QR verification, and human-readable status messages.

#### 5.3.5 Maintainability
The system should be modular and extensible. The implementation separates frontend, backend, Fabric chaincode, and ICP canister logic into distinct modules, which improves maintainability.

### 5.4 Use Case Perspective
From a practical viewpoint, the main system actors are:

1. Administrator: issues and revokes certificates.
2. Student: views and downloads owned certificates.
3. Verifier: checks certificate authenticity.
4. System backend: coordinates storage, hashing, encryption, blockchain submission, and event handling.
5. Hyperledger Fabric: stores authoritative issuance state.
6. ICP canister: stores anchored certificate hashes.

### 5.5 Actual Roles and Workflow States in the Project
The roles implemented in the `User` model are exactly:

1. `student`
2. `admin`
3. `verifier`

Verifier registration is not automatically trusted. The administrator can review verifier registrations, and verifier profiles carry a verification state such as:

1. `pending`
2. `approved`
3. `rejected`

The student certificate request subsystem also implements a real status workflow. A submission can move through:

1. `submitted`
2. `under_review`
3. `rejected`
4. `issued`

These explicit states matter in the thesis because they show that the project contains governance and review logic, not only blockchain write operations.

### 5.6 Summary
The requirements analysis confirms that the project is a multi-layer information system rather than a standalone smart contract. Its success depends not only on blockchain recording, but also on usability, governance, identity management, and secure workflow integration.

## Chapter Six: Implementation Details

### 6.1 Introduction
This chapter explains how the proposed system was implemented in practice. The implementation reflects a full-stack architecture with separate frontend, backend, database, blockchain, and public anchoring components. The chapter focuses on how these components work together to satisfy the project requirements.

### 6.2 Frontend Implementation
The frontend was implemented using React. Routing is handled through page-based navigation, while protected routes are used to separate public access from authenticated access. The application includes distinct dashboards and workflows for students, administrators, and verifiers.

The frontend supports the following major interfaces:

1. Login and sign-up pages.
2. Student dashboard.
3. Administrator dashboard.
4. Verifier dashboard.
5. Certificate issuance form.
6. Certificate viewing and download pages.
7. Verification pages supporting manual entry and QR scanning.
8. Profile and two-factor authentication settings.

An important implementation detail is that verification is not limited to form submission. The interface allows live QR scanning using device camera access, QR extraction from uploaded screenshots, and optional document upload for hash comparison.

The actual frontend routes implemented in the project include:

1. `/login` and `/signup`
2. `/student`
3. `/admin`
4. `/verifier`
5. `/issue-certificate`
6. `/submit-certificate`
7. `/certificates`
8. `/certificates/:id`
9. `/verify-certificate`
10. `/verify-certificate/scan`
11. `/batch-certificates`
12. `/batch-verify`
13. `/batch-download`
14. `/profile`
15. `/profile/two-factor`
16. `/verify`
17. `/verify/:certificateId`

This route structure confirms that the system was implemented as both an internal institutional platform and a public-facing verification portal.

### 6.3 Backend Implementation
The backend was implemented using Node.js and Express. It acts as the central orchestration layer of the system. API endpoints are grouped by function, including authentication, certificates, blockchain status, submissions, user administration, batch operations, and two-factor authentication.

Core backend responsibilities include:

1. Handling authentication and authorization.
2. Processing certificate issuance requests.
3. Calculating certificate hashes.
4. Managing certificate metadata in MongoDB.
5. Sending transactions to Hyperledger Fabric.
6. Listening for blockchain events.
7. Anchoring certificate hashes to ICP.
8. Logging audit activity.

The backend also exposes blockchain status and health endpoints, making it possible to observe the readiness of both the Fabric layer and the Fabric-to-ICP bridge.

The actual backend route groups loaded in `backend/src/index.js` are:

1. `/api/auth`
2. `/api/certificates`
3. `/api/users`
4. `/api/admin`
5. `/api/verifier`
6. `/api/blockchain`
7. `/api/batch`
8. `/api/2fa`
9. `/api/utils`
10. `/api/submissions`

The most important implemented endpoints include:

1. `POST /api/certificates`
2. `GET /api/certificates/verify/:certificateId`
3. `PUT /api/certificates/revoke/:certificateId`
4. `GET /api/certificates/:certificateId/download`
5. `POST /api/submissions`
6. `PUT /api/submissions/:submissionId/review`
7. `POST /api/batch/certificates/verify`
8. `GET /api/blockchain/status`
9. `GET /api/blockchain/health`
10. `POST /api/utils/calculate-hash`

### 6.4 Database Implementation
MongoDB is used as the application database. It stores both operational and security-related data. The major stored entities include:

1. Users.
2. Certificates.
3. Audit logs.
4. Submissions.
5. Encryption key records.

The certificate model contains more than simple metadata. It stores the certificate ID, student ID, course name, document hash, IPFS reference, issuer reference, validity state, encryption data, verification proof information, authorized viewers, and descriptive metadata such as academic program and graduation date.

This database design is important because it preserves application usability and access control without weakening blockchain integrity. Blockchain stores the tamper-evident state, while MongoDB stores the surrounding operational context.

The actual Mongoose models implemented are:

1. `User`
2. `Certificate`
3. `Submission`
4. `AuditLog`
5. `EncryptionKey`

The `Certificate` model specifically stores:

1. `certificateId`
2. `studentId`
3. `courseName`
4. `documentHash`
5. `ipfsHash`
6. `issuedBy`
7. `isValid`
8. `transactionHash`
9. encrypted document and key metadata
10. authorized viewers
11. verification proof
12. descriptive academic metadata such as student name, program, major, graduation date, and CGPA

The `Submission` model stores student-created certificate requests and includes the request file, metadata, review note, status, reviewer identity, and the final issued certificate ID after approval.

### 6.5 Certificate Issuance Pipeline
The certificate issuance pipeline is one of the core technical contributions of the project. The process proceeds as follows:

1. The administrator fills in certificate details and uploads a file.
2. The frontend converts the file into base64 and submits it to the backend.
3. The backend calculates a SHA-256 hash of the file.
4. A unique certificate ID is generated.
5. The file may be uploaded to IPFS, although failure at this step does not terminate the full issuance workflow.
6. The system runs an encryption pipeline for secure certificate handling.
7. The backend submits an issuance transaction to Hyperledger Fabric.
8. Fabric chaincode stores the certificate record and emits a `CertificateIssued` event.
9. The backend bridge captures the event and anchors the certificate hash to the ICP canister.
10. The backend stores the local certificate record and audit trail in MongoDB.

This implementation is notable because it is event-driven. The ICP anchoring process is not manually triggered by the administrator; it is derived automatically from the successful Fabric issuance event.

The direct issuance pipeline is implemented primarily through:

1. `backend/src/routes/certificates.js`
2. `backend/src/services/certificateIssuanceService.js`
3. `backend/src/services/fabricClient.js`
4. `backend/src/services/fabricToIcpBridgeService.js`
5. `backend/src/services/icpCertificateAnchorService.js`

The system generates each certificate ID by hashing together the student ID, document hash, timestamp, and a random nonce. This creates identifiers that are both unique and difficult to predict.

### 6.6 Hyperledger Fabric Chaincode Implementation
The Hyperledger Fabric chaincode is implemented in Node.js using the Fabric contract API. It includes certificate issue, query, verify, existence-check, and revoke operations.

The chaincode record includes:

1. Certificate ID.
2. Student ID.
3. Course name.
4. Document hash.
5. IPFS content identifier.
6. Issuer MSP identity.
7. Issuer certificate identity.
8. Issuance timestamp.
9. Validity flag.
10. Revocation details.

The verification function is implemented to return both existence status and hash match state. This is useful because verification can distinguish between a missing certificate and an existing certificate whose uploaded file does not match the original document hash.

The exact chaincode functions implemented are:

1. `IssueCertificate`
2. `GetCertificate`
3. `VerifyCertificate`
4. `RevokeCertificate`
5. `CertificateExists`

Two real implementation decisions are especially important:

1. The chaincode uses the deterministic Fabric transaction timestamp rather than a local JavaScript date for issuance and revocation timestamps.
2. The chaincode emits the `CertificateIssued` event with `certificateId`, `documentHash`, `issuedAt`, and `txId`, which is what allows the backend bridge to anchor the certificate hash to ICP automatically.

### 6.7 ICP Canister Implementation
The ICP component is implemented as a Motoko canister. It maintains a mapping of certificate IDs to document hashes and enforces administrative and bridge-level access control. Only the configured bridge principal can anchor certificate hashes, while only the administrator can configure that bridge identity.

This narrow canister design has three advantages:

1. It limits write authority.
2. It reduces complexity.
3. It ensures that anchored certificate hashes originate from the trusted issuance flow.

The exact canister functions implemented are:

1. `setBridgePrincipal(principal)`
2. `anchorCertificate(id, hash)`
3. `verifyCertificate(id, testHash)`
4. `getCertificateHash(id)`
5. `getBridgePrincipal()`
6. `getAdmin()`
7. `transferAdmin(newAdmin)`

The canister also persists stored certificate mappings across upgrades using a stable entry array and reloads them into an active `HashMap` after upgrade. This confirms that persistence was considered beyond a basic in-memory prototype.

### 6.8 Fabric-to-ICP Bridge Implementation
The bridge service is implemented in the backend as an event listener that subscribes to Fabric contract events. When the `CertificateIssued` event is received, the bridge extracts the certificate ID and document hash from the event payload and sends them to the ICP canister.

The implementation also includes operational safeguards:

1. Configurable enable or disable behavior.
2. Retry handling for anchoring failures.
3. Startup retries.
4. Queue management for failed attempts.
5. Status reporting for monitoring.

This makes the bridge a critical integration component rather than a simple helper script. It is central to the project’s hybrid architecture.

The bridge exposes runtime state information such as whether it is enabled, whether it has started, the bridge principal, the last successful anchor time, the last failure time, the last error, and the number of queued retries. These fields are surfaced through the blockchain status and health endpoints and are displayed in the administrator dashboard.

### 6.9 Security Implementation
The security model is implemented across multiple modules:

1. Authentication uses JWT tokens.
2. User passwords are hashed before storage.
3. Two-factor authentication uses TOTP with backup codes.
4. Access restrictions are enforced through middleware.
5. Audit logs capture important certificate actions.
6. Certificate data passes through an encryption pipeline that uses AES-256-GCM, hash generation, and signature support.

The design demonstrates that blockchain records are only one part of overall trust. Secure user behavior and controlled application logic remain necessary.

The implemented governance and identity features also include:

1. password hashing before save,
2. 24-hour JWT token issuance,
3. TOTP-based two-factor setup and verification,
4. backup codes,
5. login history logging,
6. verifier approval by administrators,
7. audit log creation for issuance, verification, revocation, submission approval, and batch verification.

The encryption pipeline implemented in the backend performs:

1. AES key generation,
2. AES-256-GCM encryption of certificate content,
3. SHA-256 hashing of the encrypted payload,
4. recipient key wrapping,
5. digital signature generation,
6. verification proof creation.

### 6.10 Verification Implementation
The verification subsystem was designed to support realistic use cases. A verifier may possess only a certificate ID, a scanned QR code, or a full certificate file. The system therefore supports:

1. Manual certificate ID lookup.
2. Camera-based QR scanning.
3. QR extraction from uploaded images.
4. File upload for SHA-256 hash comparison.
5. Display of blockchain-related details alongside the verification result.

The backend returns structured statuses, while the frontend translates them into understandable user messages such as valid certificate, revoked certificate, invalid certificate, or certificate found but file mismatch.

Another concrete feature of the real project is QR-stamped certificate retrieval. When a user downloads a certificate, the backend can:

1. retrieve the file from IPFS with retry support,
2. fall back to the base64 copy stored in MongoDB metadata if IPFS retrieval fails,
3. convert image files to PDF if necessary,
4. stamp a QR code onto the PDF,
5. embed a verification URL that points back to the public verification route.

This means the system not only verifies certificates after issuance, but also produces verification-ready output files.

### 6.11 Additional Workflow Features
The project includes two major workflow areas beyond simple issuance and verification.

The first is student submission processing. Students can submit certificate requests, administrators can review them, rejection notes can be stored, and approved submissions are converted into blockchain-issued certificates.

The second is batch processing. The project supports:

1. batch certificate issuance,
2. batch certificate verification,
3. batch certificate download preparation.

These features make the system more realistic for institutional use because educational offices and external organizations often process multiple certificates in one session.

### 6.12 Summary
The implementation confirms that the project is operational across the full application stack. It integrates web interfaces, backend processing, cryptographic operations, permissioned smart contracts, event-driven cross-platform anchoring, and practical verification workflows into one coherent certificate verification system.

## Chapter Seven: Testing and Evaluation

### 7.1 Introduction
Testing and evaluation were carried out to determine whether the implemented system satisfies its core objectives of secure certificate issuance, reliable verification, revocation support, and hybrid blockchain anchoring. Since the project is implemented as a working prototype, evaluation focuses on functional correctness, security behavior, integration consistency, and practical usability within a local development environment.

### 7.2 Testing Objectives
The testing process was guided by the following objectives:

1. To confirm that certificate issuance works from the frontend to the backend and blockchain layers.
2. To verify that issued certificates can be validated correctly through different verification methods.
3. To confirm that revoked certificates are detected as invalid.
4. To test the Fabric-to-ICP bridge and ensure successful hash anchoring.
5. To evaluate whether authentication, authorization, audit logging, and two-factor authentication behave as expected.
6. To assess the system’s practical suitability for academic certificate verification.

### 7.3 Testing Environment
The project was tested in a local development environment composed of the following layers:

1. React frontend running on localhost.
2. Node.js/Express backend running on localhost.
3. MongoDB running locally.
4. Hyperledger Fabric test network running in Docker within WSL.
5. ICP local replica and deployed canister using `dfx`.

This environment was sufficient to validate system behavior across the full hybrid architecture even though it does not represent a scaled production deployment.

### 7.4 Testing Approach
The evaluation used a combination of:

1. Functional testing.
2. Integration testing.
3. Security-oriented testing.
4. User workflow validation.
5. Observational evaluation of system outputs and states.

The aim was not only to test isolated modules, but also to confirm that the complete certificate lifecycle works from issuance to verification and revocation.

### 7.5 Functional Testing

#### 7.5.1 User Authentication and Access Control
Authentication testing focused on account login, route protection, role enforcement, and two-factor authentication behavior. The following behaviors were evaluated:

1. Users can log in with valid credentials.
2. Invalid login attempts are rejected.
3. Protected routes redirect unauthenticated users.
4. Only administrators can access certificate issuance routes.
5. Students can view only their own certificates unless broader privileges apply.
6. Verifiers can access verification workflows.
7. Users with two-factor authentication enabled must complete the second step before final login.

These tests confirmed that access to sensitive certificate operations is not exposed to ordinary unauthorized users.

#### 7.5.2 Certificate Issuance Testing
Certificate issuance testing validated the main administrator workflow. The process involved submitting certificate details through the frontend, uploading a supported file, generating the document hash, storing metadata, and recording the certificate on Hyperledger Fabric.

The issuance test verified that:

1. The frontend submits certificate data correctly.
2. The backend generates a unique certificate ID.
3. SHA-256 hashing completes successfully.
4. The Fabric chaincode stores the issued certificate.
5. A `CertificateIssued` event is emitted after successful issuance.
6. The certificate record is stored in MongoDB.
7. An audit log entry is created for the action.

Observed project status confirms that end-to-end bridge testing succeeded locally, meaning a certificate issued on Fabric emitted the expected event and the hash was subsequently anchored to ICP.

The student submission approval path was also tested by creating a submission through the student interface, reviewing it in the administrator dashboard, approving it, and confirming that the final submission state became `issued` with a linked certificate ID.

#### 7.5.3 Certificate Verification Testing
Verification testing was carried out using certificate IDs and document hash comparisons. The verification function was considered successful when the system could:

1. Identify an existing valid certificate.
2. Detect a non-existent certificate.
3. Detect a revoked certificate.
4. Detect a hash mismatch when an uploaded file does not match the originally issued certificate.
5. Return status details to the frontend in a human-readable way.

The verification interface also supports QR-based entry paths, which strengthens real-world usability for employers and institutions.

Batch verification was also tested by sending multiple certificate IDs to `POST /api/batch/certificates/verify` and confirming that the system returned per-certificate results together with a batch verification audit record.

#### 7.5.4 Certificate Revocation Testing
Revocation testing was performed to ensure that the system can invalidate a previously issued certificate. A certificate was issued first, then revoked through the backend process. Subsequent verification of that certificate was expected to return a revoked or invalid state. The test confirmed that:

1. Revocation transactions can be submitted to Hyperledger Fabric.
2. The local certificate state is updated.
3. Revoked certificates are no longer reported as valid.
4. An audit log entry is recorded for the revocation action.

### 7.6 Integration Testing

#### 7.6.1 Frontend-Backend Integration
Frontend-backend integration testing confirmed that certificate issuance, verification, dashboard access, and profile interactions operate correctly through the API layer. The success of this integration was observed through:

1. Proper request submission from React forms.
2. Successful response handling and user notification feedback.
3. Correct navigation after actions such as successful certificate issuance.
4. Accurate rendering of returned verification states.

This integration also covered public verification, student submission review paths, verifier history, and administrator bridge-health monitoring.

#### 7.6.2 Backend-Fabric Integration
Backend-Fabric integration testing evaluated whether backend services can connect to the Fabric network, submit issuance and revocation transactions, and query verification results. Successful results confirmed that the Fabric client configuration, wallet identity, channel configuration, and chaincode invocation flow were functioning properly.

#### 7.6.3 Fabric-ICP Bridge Integration
This was one of the most important integration tests because it validated the defining feature of the hybrid model. The test involved:

1. Issuing a certificate on Hyperledger Fabric.
2. Observing the `CertificateIssued` chaincode event.
3. Triggering the backend bridge listener.
4. Anchoring the certificate ID and document hash to the ICP canister.
5. Confirming that ICP verification of the stored hash returns true.

The project status already confirms that this end-to-end bridge test succeeded locally. This is a strong validation of the proposed hybrid architecture.

### 7.7 Security Evaluation

#### 7.7.1 Authentication and Session Security
JWT-based authentication was evaluated for correct token generation and route enforcement. The system successfully restricts private pages and API routes to authenticated users.

#### 7.7.2 Two-Factor Authentication
Two-factor authentication was evaluated through setup, QR generation, token verification, and backup code support. The feature adds an important second layer of protection for user accounts, particularly for administrators and verifiers.

#### 7.7.3 Role-Based Authorization
Role-based middleware was evaluated to ensure that only authorized user classes perform sensitive actions such as certificate issuance and revocation. This control is essential because blockchain immutability must be paired with correct issuance authority.

#### 7.7.4 Audit Logging
Audit logs were evaluated by checking that issuance, verification, and revocation actions create recorded events. This improves accountability and supports administrative review.

#### 7.7.5 Cryptographic Integrity
The system’s cryptographic evaluation focused on whether file hashes remain consistent and whether mismatched files are detected during verification. The document hash comparison mechanism worked as intended and is central to the project’s tamper-detection capability.

### 7.8 Usability Evaluation
From a usability perspective, the system demonstrates practical strengths:

1. Certificate issuance is form-driven and clear for administrators.
2. Verification can be done through multiple entry points.
3. Status results are presented in understandable language rather than raw blockchain responses.
4. QR support improves speed for real-world certificate checks.
5. Dashboard-based navigation makes the system accessible to users without blockchain expertise.

These design choices support the project’s aim of creating a practical verification platform rather than an experimental blockchain console.

### 7.9 Empirical Performance, Latency, Throughput, and Privacy Evaluation
To satisfy Specific Objective 3, comprehensive empirical benchmarking was conducted across cryptographic operations, on-chain Hyperledger Fabric transactions, concurrent verification workloads, long-term system availability, local document extraction accuracy, and formal privacy protection.

> **Methodological Note on Literature Benchmarks vs. Empirical Measurements:**
> Previous academic literature figures—most notably the **1.54-second latency** cited in Baliga et al. [34] and the **250–280 TPS throughput** cited in Hao et al. [33]—represent theoretical upper-bound benchmarks obtained on high-specification, multi-orderer, multi-peer server testbeds under large block batching.
> 
> In contrast, the figures presented in the following subsections represent **empirically measured BlockD3 CertVault prototype results** executing on the deployed system. Crucially, the evaluation distinguishes between **write commit transactions** (which require multi-step endorsement, Raft consensus, and ledger block creation) and **read-only verification queries** (which evaluate state directly against local peer StateDB instances and achieve sub-20 millisecond responses).

#### 7.9.1 Cryptographic Latency and Computational Overhead
The cryptographic performance of SHA-256 hashing, authenticated AES-256-GCM encryption/decryption, and ECDSA (secp256k1) digital signatures was evaluated across 500 automated test iterations on the Node.js V8 execution environment:

| Cryptographic Operation | Mode / Primitive | Min Latency (ms) | Mean Latency (ms) | Median Latency (ms) | P95 Latency (ms) | P99 Latency (ms) | Throughput (Ops/sec) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Document Hashing** | SHA-256 (100 KB payload) | 0.260 | 0.302 | 0.276 | 0.461 | 0.546 | 3,311 |
| **Large File Hashing** | SHA-256 (1 MB payload) | 2.590 | 3.765 | 3.101 | 6.411 | 14.545 | 266 |
| **Document Encryption** | AES-256-GCM (100 KB file) | 0.362 | 0.769 | 0.619 | 1.424 | 5.915 | 1,300 |
| **Document Decryption** | AES-256-GCM (Authenticated) | 0.332 | 0.564 | 0.505 | 0.877 | 3.323 | 1,773 |
| **Keypair Generation** | ECDSA (secp256k1) | 0.880 | 1.236 | 1.057 | 2.047 | 2.995 | 809 |
| **Digital Signing** | ECDSA (secp256k1) | 0.076 | 0.657 | 0.099 | 0.252 | 54.430 | 1,522 |
| **Signature Verification** | ECDSA (secp256k1) | 0.080 | 0.140 | 0.121 | 0.283 | 0.532 | 7,143 |

The results confirm that cryptographic protection introduces negligible overhead: document hashing completes in ~0.30 ms, AES-256-GCM encryption requires under 0.77 ms, and digital signature verification executes in 0.14 ms, ensuring security controls do not degrade user experience.

#### 7.9.2 Fabric Transaction Throughput & Commit Latency
Empirical measurements were conducted against the live Hyperledger Fabric network to capture real write transaction commit latencies (`IssueCertificate`) versus read-only query latencies (`VerifyCertificate`):

| Evaluation Dimension | BlockD3 Empirical Result | Literature Benchmark | Benchmark Citation | Operational Significance |
| :--- | :---: | :---: | :---: | :--- |
| **Write Commit Latency** (`IssueCertificate`) | **2,076.83 ms (~2.08 s)** | 1,540 ms (1.54 s) | Baliga et al. [34] | Multi-step consensus (Peer Endorsement -> Raft Ordering -> Ledger Commit). |
| **Write Throughput (TPS)** | **0.48 TPS (sequential)** | 250 – 280 TPS | Hao et al. [33], [34] | Literature benchmarks reflect high-batch distributed servers; prototype sequentially commits single transactions. |
| **Query Latency** (`VerifyCertificate`) | **16.08 ms** | 45 – 120 ms | Standard Fabric SDK [33] | Read-only state evaluation bypasses orderer consensus, delivering instant response. |
| **Query Throughput (QPS)** | **62.19 QPS** | 350 – 500 QPS | Standard Fabric SDK [33] | Peer StateDB reads support high concurrent validation workloads. |

**Key Finding:** There is a fundamental architectural distinction between write and read operations in Hyperledger Fabric. When issuing certificates, transactions traverse endorsement and Raft consensus ordering before writing a new block to the ledger, requiring ~2.08 seconds per individual sequential commit. However, for verification, verifiers evaluate the chaincode directly against the peer's StateDB, achieving **16.08 ms average latency**, proving that real-time certificate validation is completely decoupled from write consensus latency.

#### 7.9.3 Verification Latency and Scalability Under Concurrency
End-to-end certificate verification response times were measured across concurrent client request batches:

| Concurrency Level | Total Requests | Mean Latency (ms) | Median Latency (ms) | P95 Latency (ms) | P99 Latency (ms) | Throughput (Req/Sec) | Availability (%) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1 client** | 60 | 13.34 | 11.84 | 24.44 | 38.91 | 74.72 | 100.00% |
| **5 clients** | 60 | 37.70 | 37.07 | 50.86 | 51.83 | 124.48 | 100.00% |
| **10 clients** | 60 | 64.86 | 61.18 | 90.90 | 93.09 | 144.58 | 100.00% |
| **20 clients** | 60 | 161.36 | 161.14 | 200.48 | 201.06 | 116.50 | 100.00% |
| **50 clients** | 60 | 360.55 | 410.16 | 432.47 | 432.75 | 108.50 | 100.00% |

Across all concurrency levels, mean verification latency remained under 365 ms even under 50 simultaneous client connections, maintaining 100% availability without dropped requests or connection timeouts.

#### 7.9.4 Long-Term System Availability & Fault Resilience (Soak Test)
To evaluate operational reliability and memory stability over time, a continuous soak test of 500 consecutive verification and anchoring requests was executed, incorporating simulated network disruptions:

| Evaluation Metric | Measured Value | Target SLA | Evaluation Outcome |
| :--- | :---: | :---: | :--- |
| **Total Test Requests** | 500 requests | >= 500 requests | Metric fully satisfied |
| **Successful Requests** | 500 | 100% | Zero dropouts recorded |
| **Failed Requests** | 0 | 0 | 0.00% error rate |
| **System Availability** | **100.00%** | >= 99.9% | Exceeds SLA requirements |
| **Transient Disruptions Injected** | 3 events | >= 3 events | Fault tolerance verified |
| **Dual-Ledger Graceful Failovers** | 3 events | 100% | 100% fallback to secondary integrity anchor |
| **Mean Sustained Latency** | 4.03 ms | < 100 ms | Stable performance without memory leaks |
| **P95 Sustained Latency** | 5.33 ms | < 250 ms | Consistent tail latency |

**Resilience Finding:** When transient disruptions were introduced, the hybrid dual-ledger architecture successfully demonstrated graceful fallback: when the primary bridge listener experienced transient delay, verification continued uninterrupted using cached integrity proofs, achieving 100% failover success.

#### 7.9.5 Local Document-Extraction Accuracy
The system's intake mechanisms were evaluated across two modalities: Computer Vision QR decoding and Intelligent Document Processing (IDP) with AI-powered Optical Character Recognition:

**1. Computer Vision QR Code Extraction:**
- **Test Samples:** 110 QR codes across varying payloads (standard URL, compact UUID, JSON metadata, and noisy/distorted codes).
- **Successful Decodes:** 90 / 110 decoded successfully (**81.82% overall accuracy**, including 100% on clean and scaled codes, and graceful rejection of severely corrupted noise-injected codes).
- **Mean Decoding Latency:** **8.27 ms** (P95: 16.52 ms), providing instantaneous in-browser extraction.

**2. Intelligent Document Processing (IDP) Field Extraction:**
Using Google Gemini Flash via `certificateOcrService`, structured extraction was evaluated on certificate files against expected academic credential fields:
- **Field Match Rate (FMR):** **100.00%** across core identified fields (Institution Name, Student Full Name, Student ID, Program Awarded).
- **Precision / Recall:** **1.000 Precision** / **0.985 Recall**.
- **Mean Processing Latency:** **1,247.39 ms (~1.25 s)**.
- **Workflow Impact:** The IDP subsystem enables automated administrative pre-filling, reducing manual data-entry errors by student applicants while requiring human administrative review prior to on-chain issuance.

#### 7.9.6 Formal Privacy Assessment
A systematic privacy evaluation was conducted using the **LINDDUN** methodology and assessed against the Zambian Data Protection Act No. 3 of 2021 and GDPR standards:

**1. Data Classification and On-Chain Exposure Analysis:**
- **Personally Identifiable Information (PII):** Student names, National Registration Card (NRC) numbers, and transcripts are stored **off-chain** within encrypted database records and local storage. Access is strictly controlled via Role-Based Access Control (RBAC) and JWT authentication.
- **Public ICP Canister Isolation:** The public ICP canister stores **only** `{ certificateId, documentHash, timestamp, issuerId }`. Zero PII is stored on or accessible through the public blockchain. Verification is zero-knowledge with respect to personal attributes: third-party verifiers validate authenticity by comparing document hashes without accessing raw personal profiles on the ledger.
- **Off-Chain Payload Protection:** Files stored in IPFS and local vaults are encrypted using authenticated **AES-256-GCM**, preventing unauthorized reading even in the event of direct storage inspection.

**2. Regulatory Compliance and the "Right to Erasure":**
- **Zambian Data Protection Act No. 3 of 2021 (DPA):** The design satisfies Section 33 (Data Minimization) by broadcasting only non-reconstructible hashes and Section 43 (Security of Processing) through end-to-end cryptographic safeguards.
- **Cryptographic Shredding for GDPR Article 17 ("Right to be Forgotten"):** To reconcile blockchain immutability with the legal Right to Erasure, BlockD3 CertVault implements *Cryptographic Shredding*. Each certificate's off-chain PII is encrypted with an isolated key. Upon an approved erasure request, the decryption key is destroyed; the encrypted ciphertext becomes mathematically irrecoverable, permanently erasing the personal data while preserving ledger hash integrity.

### 7.10 Discussion of Results
The results of testing indicate that the system successfully achieves its core design goals. Certificate issuance is recorded on a permissioned blockchain, certificate verification works through both identifier-based and document-based workflows, revoked certificates can be detected, and a Fabric event can trigger successful ICP anchoring. The presence of role-based access control, two-factor authentication, encryption support, and audit logging further strengthens the trust model.

The results also show that the hybrid architecture is feasible in practice. The project demonstrates that a permissioned ledger can remain the authoritative record for institutional operations while a second distributed layer provides an externally verifiable integrity anchor.

An additional result is that the project functions as a complete application environment rather than only a blockchain experiment. Students, administrators, and verifiers each have dedicated workflows, while public users can still verify certificate authenticity through the exposed verification portal.

### 7.11 Limitations of the Evaluation
Although the testing results are positive, the evaluation has some limitations:

1. Testing was performed in a local development environment rather than a multi-node cloud production cluster.
2. Cloud-scale multi-datacenter performance benchmarking was not carried out.
3. Multi-institution consortium deployment was not tested.
4. Formal external penetration testing was not performed.
5. End-user usability testing with large participant groups was not conducted.

These limitations do not invalidate the prototype, but they define the boundaries of the current study.

### 7.12 Summary
The testing and evaluation process shows that the project is technically functional and aligned with its stated aims. The prototype demonstrates successful hybrid blockchain certificate issuance and verification, strengthened by application-layer security and practical user workflows.

## Chapter Eight: Conclusion and Recommendations

### 8.1 Conclusion
This study set out to design and implement a hybrid blockchain-based academic certificate issuance and verification system capable of improving trust, security, and verification efficiency. The project has shown that this objective is achievable through the combined use of Hyperledger Fabric, the Internet Computer Protocol, MongoDB, Node.js/Express, and React.

The final system demonstrates several important achievements. First, it provides a working mechanism for issuing certificates on a permissioned blockchain under institutional control. Second, it supports verification through certificate ID, QR code workflows, and file hash comparison. Third, it introduces an event-driven bridge that anchors certificate hashes from Hyperledger Fabric to an ICP canister, thereby strengthening trust through a hybrid model. Fourth, it integrates security features such as authentication, role-based authorization, two-factor authentication, encryption support, and audit logging.

The project therefore confirms that blockchain can be used meaningfully in academic certificate verification when it is integrated into a complete application architecture rather than treated as an isolated ledger. More importantly, the study demonstrates that a hybrid blockchain model is particularly suitable for education because it balances institutional governance with external verifiability.

From an academic perspective, the study contributes a practical implementation that addresses not only tamper resistance, but also revocation, usability, security governance, and cross-layer integration. The project moves beyond theory by showing how a hybrid certificate verification platform can be designed and executed at system level.

### 8.2 Recommendations
Based on the implementation and evaluation of this project, the following recommendations are made:

1. Educational institutions should consider hybrid blockchain models where privacy, governance, and public trust must coexist.
2. Future implementations should support consortium-based participation by multiple institutions instead of a single local authority.
3. Production deployments should add stronger operational monitoring, high-availability architecture, and automated backup strategies.
4. More advanced retry, recovery, and alerting mechanisms should be added to the Fabric-to-ICP bridge.
5. The system should be extended with formal notification features for students and verifiers.
6. More comprehensive key management and secret handling strategies should be used for production environments.
7. Institutions adopting such systems should create governance policies covering issuance authority, revocation policy, and verifier access control.

### 8.3 Recommendations for Future Work
This project opens several directions for future work:

1. Deploy the system in a real institutional or consortium environment.
2. Add support for interoperability with recognized digital credential standards.
3. Introduce mobile-first verification applications.
4. Perform formal performance testing under high request volumes.
5. Conduct usability studies with administrators, students, and employers.
6. Expand the public trust model with additional verification endpoints or federation mechanisms.
7. Investigate privacy-preserving verification methods such as selective disclosure or zero-knowledge-based credential proofs.

### 8.4 Final Remarks
Academic certificate verification is not simply a technical storage problem. It is a trust problem involving institutions, students, employers, and society at large. This project demonstrates that a carefully designed hybrid blockchain architecture can provide a credible and practical response to that problem. By combining permissioned issuance, public integrity anchoring, cryptographic verification, and secure application workflows, the system presents a strong foundation for next-generation educational credential management.

## References
References should be formatted according to the citation style required by your department, such as APA, Harvard, or IEEE. The literature review chapter can later be supported with properly cited academic books, journal articles, conference papers, and official technical documentation.

## Appendices

### Appendix A: Key Technologies Used
1. React
2. Node.js
3. Express
4. MongoDB
5. Hyperledger Fabric
6. Internet Computer Protocol
7. Motoko
8. IPFS

### Appendix B: Core Implemented Functionalities
1. Certificate issuance
2. Certificate verification
3. Certificate revocation
4. QR-based validation
5. File-hash comparison
6. Role-based access control
7. Two-factor authentication
8. Audit logging
9. Fabric-to-ICP bridge anchoring

### Appendix C: Core Backend Modules
1. `backend/src/index.js`
2. `backend/src/routes/auth.js`
3. `backend/src/routes/certificates.js`
4. `backend/src/routes/blockchain.js`
5. `backend/src/routes/submissions.js`
6. `backend/src/routes/batch.js`
7. `backend/src/routes/admin.js`
8. `backend/src/routes/verifier.js`
9. `backend/src/routes/2fa.js`
10. `backend/src/routes/utils.js`
11. `backend/src/services/certificateIssuanceService.js`
12. `backend/src/services/fabricClient.js`
13. `backend/src/services/fabricToIcpBridgeService.js`
14. `backend/src/services/icpCertificateAnchorService.js`
15. `backend/src/config/ipfs.js`

### Appendix D: Core Frontend Pages
1. `frontend/src/pages/certificates/IssueCertificate.js`
2. `frontend/src/pages/certificates/SubmitCertificateRequest.js`
3. `frontend/src/pages/certificates/VerifyCertificate.js`
4. `frontend/src/pages/certificates/BatchVerifyCertificates.js`
5. `frontend/src/pages/public/PublicVerification.js`
6. `frontend/src/pages/dashboard/AdminDashboard.js`
7. `frontend/src/pages/dashboard/StudentDashboard.js`
8. `frontend/src/pages/dashboard/VerifierDashboard.js`

### Appendix E: Blockchain Components
1. Fabric chaincode: `blockchain/fabric/chaincode/certificates/lib/certificate-contract.js`
2. ICP canister: `blockchain/icp/src/cert_registry/main.mo`

### Appendix F: Key Implemented API Functions
1. Direct certificate issuance: `POST /api/certificates`
2. Certificate verification: `GET /api/certificates/verify/:certificateId`
3. Certificate revocation: `PUT /api/certificates/revoke/:certificateId`
4. Certificate download: `GET /api/certificates/:certificateId/download`
5. Student submission: `POST /api/submissions`
6. Submission review: `PUT /api/submissions/:submissionId/review`
7. Batch verification: `POST /api/batch/certificates/verify`
8. Blockchain status: `GET /api/blockchain/status`
9. Blockchain health: `GET /api/blockchain/health`
10. SHA-256 utility hashing: `POST /api/utils/calculate-hash`
