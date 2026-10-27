const fs = require('fs');
const path = require('path');
const { Ed25519KeyIdentity } = require('@dfinity/identity');

const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, '../.icp-bridge-identity.json');

const identity = Ed25519KeyIdentity.generate();
const serializedIdentity = JSON.stringify(identity.toJSON(), null, 2);

fs.writeFileSync(outputPath, serializedIdentity);

console.log(`Bridge identity written to: ${outputPath}`);
console.log(`Bridge principal: ${identity.getPrincipal().toText()}`);
