// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title LeaseEscrow
 * @dev Decentralized escrow for rental security deposits.
 */
contract LeaseEscrow is Ownable, ReentrancyGuard {

    enum LeaseStatus { ACTIVE, COMPLETED, DISPUTED }

    struct Lease {
        address tenant;
        address landlord;
        uint256 depositAmount;
        uint256 rentAmount;
        LeaseStatus status;
        bool exists;
    }

    // Mapping from an internal Lease ID (e.g. UUID hash) to the Lease mapping
    mapping(string => Lease) public leases;

    event LeaseCreated(string indexed leaseId, address indexed tenant, address indexed landlord, uint256 depositAmount);
    event RentPaid(string indexed leaseId, address indexed tenant, uint256 amount);
    event DepositReleased(string indexed leaseId, address receiver, uint256 amount);
    event DisputeRaised(string indexed leaseId);

    constructor() Ownable() {} // Initialize Ownable correctly in 0.8.20 if passing msg.sender explicitly isn't needed

    /**
     * @dev Initialize a new lease. Tenant must send exact deposit amount.
     */
    function createLease(string memory _leaseId, address _landlord, uint256 _rentAmount) external payable {
        require(!leases[_leaseId].exists, "Lease already exists");
        require(msg.value > 0, "Deposit must be greater than 0");

        leases[_leaseId] = Lease({
            tenant: msg.sender,
            landlord: _landlord,
            depositAmount: msg.value,
            rentAmount: _rentAmount,
            status: LeaseStatus.ACTIVE,
            exists: true
        });

        emit LeaseCreated(_leaseId, msg.sender, _landlord, msg.value);
    }

    /**
     * @dev Process monthly rent payment directly to the landlord.
     */
    function payRent(string memory _leaseId) external payable nonReentrant {
        require(leases[_leaseId].exists, "Lease does not exist");
        require(leases[_leaseId].status == LeaseStatus.ACTIVE, "Lease is not active");
        require(msg.sender == leases[_leaseId].tenant, "Only tenant can pay rent");
        require(msg.value == leases[_leaseId].rentAmount, "Incorrect rent amount");

        address payable landlord = payable(leases[_leaseId].landlord);
        (bool success, ) = landlord.call{value: msg.value}("");
        require(success, "Failed to send rent to landlord");

        emit RentPaid(_leaseId, msg.sender, msg.value);
    }

    /**
     * @dev Release deposit at the end of the lease. 
     * Landlord decides how much goes back to tenant and how much covers damages.
     */
    function releaseDeposit(string memory _leaseId, uint256 _tenantAmount, uint256 _landlordAmount) external nonReentrant {
        require(leases[_leaseId].exists, "Lease does not exist");
        require(leases[_leaseId].status == LeaseStatus.ACTIVE, "Lease not active");
        
        // Either landlord or the system admin (Property OS oracle) can execute this
        require(msg.sender == leases[_leaseId].landlord || msg.sender == owner(), "Unauthorized access");
        require(_tenantAmount + _landlordAmount == leases[_leaseId].depositAmount, "Invalid distribution amounts");

        leases[_leaseId].status = LeaseStatus.COMPLETED;

        if (_tenantAmount > 0) {
            (bool successT, ) = payable(leases[_leaseId].tenant).call{value: _tenantAmount}("");
            require(successT, "Failed to refund tenant");
            emit DepositReleased(_leaseId, leases[_leaseId].tenant, _tenantAmount);
        }

        if (_landlordAmount > 0) {
            (bool successL, ) = payable(leases[_leaseId].landlord).call{value: _landlordAmount}("");
            require(successL, "Failed to payout landlord");
            emit DepositReleased(_leaseId, leases[_leaseId].landlord, _landlordAmount);
        }
    }

    /**
     * @dev Flag a dispute, pausing payouts until resolution.
     */
    function raiseDispute(string memory _leaseId) external {
        require(leases[_leaseId].exists, "Lease does not exist");
        require(msg.sender == leases[_leaseId].tenant || msg.sender == leases[_leaseId].landlord, "Unauthorized");
        require(leases[_leaseId].status == LeaseStatus.ACTIVE, "Lease not active");

        leases[_leaseId].status = LeaseStatus.DISPUTED;
        emit DisputeRaised(_leaseId);
    }

    /**
     * @dev Admin resolves a disputed lease.
     */
    function resolveDispute(string memory _leaseId, uint256 _tenantAmount, uint256 _landlordAmount) external onlyOwner nonReentrant {
        require(leases[_leaseId].exists, "Lease does not exist");
        require(leases[_leaseId].status == LeaseStatus.DISPUTED, "Lease not disputed");
        require(_tenantAmount + _landlordAmount == leases[_leaseId].depositAmount, "Invalid distribution amounts");

        leases[_leaseId].status = LeaseStatus.COMPLETED;

        if (_tenantAmount > 0) {
            (bool successT, ) = payable(leases[_leaseId].tenant).call{value: _tenantAmount}("");
            require(successT, "Failed to refund tenant");
        }

        if (_landlordAmount > 0) {
            (bool successL, ) = payable(leases[_leaseId].landlord).call{value: _landlordAmount}("");
            require(successL, "Failed to payout landlord");
        }
    }
}
