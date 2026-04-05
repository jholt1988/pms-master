const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment of LeaseEscrow...");

  const LeaseEscrow = await hre.ethers.getContractFactory("LeaseEscrow");
  const leaseEscrow = await LeaseEscrow.deploy();

  await leaseEscrow.waitForDeployment();

  const address = await leaseEscrow.getAddress();
  console.log(`LeaseEscrow successfully deployed to: ${address}`);

  // Save the address and ABI to the backend directory for integration
  const abiDir = path.join(__dirname, "..", "..", "tenant_portal_backend", "src", "web3", "abi");
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  const contractArtifact = artifacts.readArtifactSync("LeaseEscrow");
  
  fs.writeFileSync(
    path.join(abiDir, "LeaseEscrow.json"),
    JSON.stringify({
      address: address,
      abi: contractArtifact.abi
    }, null, 2)
  );
  
  console.log("ABI and Contract Address exported to backend.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
