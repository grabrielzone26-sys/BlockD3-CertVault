const fs = require('fs');
const path = require('path');
const { Wallets } = require('fabric-network');

const resolvePath = (value) => path.resolve(value);

async function main() {
  const [walletPathArg, identityLabel, certPathArg, keyPathArg, mspIdArg] = process.argv.slice(2);

  if (!walletPathArg || !identityLabel || !certPathArg || !keyPathArg || !mspIdArg) {
    throw new Error(
      'Usage: node scripts/importFabricIdentity.js <walletPath> <identityLabel> <certPath> <keyPath> <mspId>',
    );
  }

  const walletPath = resolvePath(walletPathArg);
  const certPath = resolvePath(certPathArg);
  const keyPath = resolvePath(keyPathArg);

  const certificate = fs.readFileSync(certPath, 'utf8');
  const privateKey = fs.readFileSync(keyPath, 'utf8');

  fs.mkdirSync(walletPath, { recursive: true });

  const wallet = await Wallets.newFileSystemWallet(walletPath);
  await wallet.put(identityLabel, {
    credentials: {
      certificate,
      privateKey,
    },
    mspId: mspIdArg,
    type: 'X.509',
  });

  console.log(`Imported Fabric identity "${identityLabel}" into ${walletPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
