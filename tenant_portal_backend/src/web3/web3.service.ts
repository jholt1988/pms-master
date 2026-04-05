import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class Web3Service implements OnModuleInit {
  private readonly logger = new Logger(Web3Service.name);
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract | null = null;
  
  private isConfigured = false;

  constructor() {
    // In production, these must be pulled strictly from ConfigModule/environment variables
    const rpcUrl = process.env.POLYGON_MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com';
    const privateKey = process.env.ESCROW_ADMIN_PRIVATE_KEY; // Oracle admin key
    
    if (privateKey) {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.isConfigured = true;
    } else {
      this.logger.warn('Web3Service: No ESCROW_ADMIN_PRIVATE_KEY found. Running in mock/simulation mode.');
      // Mock provider for local development without actual keys
      this.provider = new ethers.JsonRpcProvider(rpcUrl); 
    }
  }

  onModuleInit() {
    this.logger.log('Initializing Web3 Escrow Service...');
    try {
      const abiPath = path.join(__dirname, 'abi', 'LeaseEscrow.json');
      if (fs.existsSync(abiPath)) {
        const contractData = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        
        if (this.isConfigured) {
          this.contract = new ethers.Contract(contractData.address, contractData.abi, this.wallet);
          this.logger.log(`LeaseEscrow Contract securely bound at: ${contractData.address}`);
        } else {
          this.logger.warn(`ABI found, but no private key. Cannot sign transactions for escrow release.`);
          // Bind read-only or mock instance
          this.contract = new ethers.Contract(contractData.address, contractData.abi, this.provider);
        }
      } else {
        this.logger.warn('LeaseEscrow ABI not found. Run smart contract deployment first.');
      }
    } catch (e) {
      this.logger.error(`Error loading ABI or binding contract: ${e}`);
    }
  }

  /**
   * Programmatically release funds triggered by backend logic (e.g. Move-Out Inspection completion event)
   */
  async releaseEscrowDeposit(leaseId: string, tenantPayoutAmtEth: string, landlordPayoutAmtEth: string) {
    if (!this.contract || !this.isConfigured) {
      this.logger.warn(`[Mock Web3] Escrow Release Simulation for Lease ${leaseId}: Tenant (${tenantPayoutAmtEth} ETH), Landlord (${landlordPayoutAmtEth} ETH)`);
      return { status: 'simulated_success', transactionHash: '0xmockhash' };
    }

    try {
      this.logger.log(`Releasing escrow on-chain for lease ${leaseId}...`);
      
      const tenantPayoutWei = ethers.parseEther(tenantPayoutAmtEth);
      const landlordPayoutWei = ethers.parseEther(landlordPayoutAmtEth);
      
      // Execute the releaseDeposit function on the smart contract
      const tx = await this.contract.releaseDeposit(leaseId, tenantPayoutWei, landlordPayoutWei);
      this.logger.log(`Transaction broadcasted. Hash: ${tx.hash}. Awaiting confirmation...`);
      
      const receipt = await tx.wait();
      this.logger.log(`Transaction confirmed in block ${receipt.blockNumber}.`);
      
      return { status: 'success', transactionHash: receipt.hash, blockNumber: receipt.blockNumber };
    } catch (error) {
      this.logger.error(`Failed to release escrow on-chain: ${error}`);
      throw error;
    }
  }
}
