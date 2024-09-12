// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract GiniVesting is AccessControlUpgradeable, ReentrancyGuardUpgradeable {
    // _______________ Libraries _______________

    /*
     * Adding the methods from the OpenZeppelin's library which wraps around ERC20 operations that
     * throw on failure to implement their safety.
     */
    using SafeERC20 for IERC20;

    // _______________ Structs _______________
    /**
     * @notice The information of a beneficiary.
     * 1. `totalAllocations` is the total amount that the beneficiary is allowed to claim.
     * 2. `claimedAmount` is the amount that the beneficiary has already claimed.
     * 3. `areTotallyClaimed` is true if the beneficiary has already claimed all tokens.
     */
    struct Beneficiary {
        uint256 totalAllocations;
        uint256 claimedAmount;
    }

    /**
     * @notice The design of a vesting period:
     * 1. From `cliffStart` to `start` timestamps, there is an inactivity period during which no token transfers occur.
     *    All relevant vesting parameters are defined while vesting initialization.
     * 2. From `start` to `end` timestamps , there is a vesting period during or after which accounts, that are to be vested, can claim tokens using the function `claim()` or `claimAll()`.
     * 3. Describes whether vesting was created for counselors.
     * 4. Initial unlock percentage defines how much tokens will be available from the start of the vesting. (10000 = 100%)
     */
    struct VestingPeriod {
        uint256 totalSupply;
        uint256 cliffStartTimestamp;
        uint256 startTimestamp;
        uint256 endTimestamp;
        uint256 duration;
        uint256 tge;
    }

    /**
     * @notice The type of the vesting.
     *
     * 1. Team - Vesting for the team.
     * 2. Foundation - Vesting for the foundation.
     * 3. Reserve - Vesting for the reserve.
     * 4. Airdrop - Vesting for the airdrop.
     * 5. Seed - Vesting for the seed and private investors.
     */
    enum VestingType {
        Team,
        Foundation,
        Reserve,
        Airdrop,
        Seed
    }

    // _______________ Storage _______________

    uint256 public constant CLAIM_INTERVAL = 30 days;

    // _______________ Storage _______________

    /// @notice Vesting Type => Vesting Period.
    mapping(VestingType => VestingPeriod) public vestingPeriods;

    /// @notice Vesting Type => The total claims for all accounts.
    mapping(VestingType => uint256) public totalClaims;

    /// @notice User => All vesting IDS of the user.
    mapping(address => uint256[]) public userVestings;

    /// @notice Vesting Type => Beneficiary => Beneficiary info.
    mapping(VestingType => mapping(address => Beneficiary)) public beneficiaries;

    /// @notice The vesting token.
    IERC20 public gini;

    /// @notice The total amount of claims from all users and vestings.
    uint256 public totalClaimsForAll;

    // _______________ Errors _______________

    /// @dev Revert if zero address is passed.
    error ZeroAddress();

    /// @dev Revert if arrays lengths are not equal.
    error ArraysLengthMismatch(uint256 length1, uint256 length2);

    /// @dev Revert if there are no beneficiaries.
    error NoBeneficiaries();

    /// @dev Revert if zero vesting amount is passed.
    error ZeroVestingAmount(address _beneficiary);

    /// @dev Revert if beneficiary already exists.
    error BeneficiaryAlreadyExists(address _beneficiary);

    /// @dev Revert if vesting params are invalid.
    error InvalidVestingParams(uint256 _cliffStartTimestamp, uint256 _startTimestamp, uint256 _endTimestamp);

    /// @dev Revert if vesting is already initialized.
    error AlreadyInitialized();

    /// @dev Revert if total supply is zero.
    error CannotBeZero();

    /// @dev Revert if total supply of vesting is reached.
    error TotalSupplyReached(VestingType vestingID);

    /// @dev Revert if vesting token rescue failed.
    error VestingTokenRescue(address token);

    /// @dev Revert if nothing to claim.
    error NothingToClaim();

    /// @dev Revert if vesting is not started yet.
    error OnlyAfterVestingStart(VestingType vestingID);

    /// @dev Revert if claim amount exceeds vesting amount.
    error ClaimAmountExceedsVestingAmount(
        VestingType _vestingID,
        address _beneficiary,
        uint256 _claimAmount,
        uint256 _totalAllocations
    );

    error VestingNotInitialized(VestingType vestingID);

    error OnlyBeforeVestingCliff();

    error TokenAlreadySet();

    error OnlyForAirdrop(uint256 vestingID);

    error OnlyForScheduled(uint256 vestingID);

    error NotAllowedVesting(VestingType vestingID);

    // _______________ Events _______________

    /**
     * @dev Emitted when the claim is successful.
     *
     * @param _user   Address of the user.
     * @param _amount   Amount of the claim.
     */
    event Claim(address indexed _user, VestingType _vestingID, uint256 indexed _amount);

    /**
     * @dev Emitted when the vesting is initialized.
     */
    event VestingInitialized(
        VestingType indexed vestingID,
        uint256 cliffStartTimestamp,
        uint256 startTimestamp,
        uint256 endTimestamp,
        uint256 totalSupply,
        uint256 tge
    );

    /**
     * @dev Emitted when the token for the vesting is set.
     */
    event SetGiniToken(address token);

    /**
     * @dev Emitted when ERC20 tokens are rescued.
     */
    event ERC20Rescued(address indexed _token, address indexed _to, uint256 indexed _amount);

    /**
     * @dev Emitted when beneficiaries are added.
     */
    event BeneficiariesAdded(VestingType indexed vestingID, uint256 indexed totalAllocations);

    // _______________ Modifiers _______________

    modifier notZeroAddress(address _address) {
        if (_address == address(0)) revert ZeroAddress();
        _;
    }

    function initialize(uint256 _startTimestamp) public initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();

        if (_startTimestamp == 0) revert CannotBeZero();

        // Initalize Team vesting
        _validateNSetVesting(VestingType.Team, 30 days * 12, _startTimestamp, 30 days * 24, 300_000_000 * 1e18, 0);

        // Initialize Foundation vesting
        _validateNSetVesting(VestingType.Foundation, 0, _startTimestamp, 30 days * 12, 220_000_000 * 1e18, 0);

        // Initialize Reserve vesting
        _validateNSetVesting(VestingType.Reserve, 0, _startTimestamp, 30 days * 150, 800_000_000 * 1e18, 0);

        // Initialize Airdrop vesting
        _validateNSetVesting(VestingType.Airdrop, 30 days * 6, _startTimestamp, 30 days * 9, 80_000_000 * 1e18, 10);

        // Initialize Seed vesting
        _validateNSetVesting(VestingType.Seed, 30 days * 6, _startTimestamp, 30 days * 12, 300_000_000 * 1e18, 0);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function addBeneficiaries(
        VestingType _vestingID,
        address[] calldata _beneficiary,
        uint256[] calldata _amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_vestingID == VestingType.Airdrop || _vestingID == VestingType.Seed) revert NotAllowedVesting(_vestingID);

        VestingPeriod storage vesting = vestingPeriods[_vestingID];
        uint256 beneficiariesLength = _beneficiary.length;
        uint256 totalAllocations = 0;

        // Check that arrays are not empty and have the same length
        if (beneficiariesLength == 0) revert NoBeneficiaries();
        if (beneficiariesLength != _amount.length) revert ArraysLengthMismatch(beneficiariesLength, _amount.length);

        for (uint256 i = 0; i < beneficiariesLength; i++) {
            _addBeneficiary(_vestingID, _beneficiary[i], _amount[i]);
            totalAllocations += _amount[i];
        }

        if (vesting.totalSupply < totalAllocations) revert TotalSupplyReached(_vestingID);

        vesting.totalSupply -= totalAllocations;

        emit BeneficiariesAdded(_vestingID, totalAllocations);
    }

    function addAirdrop(
        address[] calldata _beneficiary,
        uint256[] calldata _amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        VestingPeriod storage vesting = vestingPeriods[VestingType.Airdrop];
        uint256 beneficiariesLength = _beneficiary.length;
        uint256 totalAllocations = 0;

        // Check that arrays are not empty and have the same length
        if (beneficiariesLength == 0) revert NoBeneficiaries();
        if (beneficiariesLength != _amount.length) revert ArraysLengthMismatch(beneficiariesLength, _amount.length);

        for (uint256 i = 0; i < beneficiariesLength; i++) {
            _addBeneficiary(VestingType.Airdrop, _beneficiary[i], _amount[i]);
            totalAllocations += _amount[i];
        }

        if (vesting.totalSupply < totalAllocations) revert TotalSupplyReached(VestingType.Airdrop);

        vesting.totalSupply -= totalAllocations;

        emit BeneficiariesAdded(VestingType.Airdrop, totalAllocations);
    }

    function addScheduled(
        address[] calldata _beneficiary,
        uint256[] calldata _amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        VestingPeriod storage vesting = vestingPeriods[VestingType.Seed];
        uint256 beneficiariesLength = _beneficiary.length;
        uint256 totalAllocations = 0;

        // Check that arrays are not empty and have the same length
        if (beneficiariesLength == 0) revert NoBeneficiaries();
        if (beneficiariesLength != _amount.length) revert ArraysLengthMismatch(beneficiariesLength, _amount.length);

        for (uint256 i = 0; i < beneficiariesLength; i++) {
            _addBeneficiary(VestingType.Seed, _beneficiary[i], _amount[i]);
            totalAllocations += _amount[i];
        }

        if (vesting.totalSupply < totalAllocations) revert TotalSupplyReached(VestingType.Seed);

        vesting.totalSupply -= totalAllocations;

        emit BeneficiariesAdded(VestingType.Seed, totalAllocations);
    }

    /**
     * @notice Claim tokens from the specified vesting.
     *         Emit a Claim event.
     *
     * @param _vestingID The ID of the vesting.
     */
    function claim(VestingType _vestingID) external nonReentrant {
        Beneficiary storage beneficiary = beneficiaries[_vestingID][msg.sender];
        VestingPeriod memory vesting = vestingPeriods[_vestingID];

        if (beneficiary.claimedAmount == beneficiary.totalAllocations) revert NothingToClaim();

        uint256 amountToClaim = calculateClaimAmount(msg.sender, _vestingID);
        if (amountToClaim == 0)
            if (vesting.startTimestamp > block.timestamp) {
                revert OnlyAfterVestingStart(_vestingID);
            } else {
                revert NothingToClaim();
            }

        beneficiary.claimedAmount += amountToClaim;
        totalClaims[_vestingID] += amountToClaim;
        totalClaimsForAll += amountToClaim;

        emit Claim(msg.sender, _vestingID, amountToClaim);

        gini.safeTransfer(msg.sender, amountToClaim);
    }

    /**
     * @notice Claim all available tokens from the all vestings of the caller.
     *
     * Emits a `Claim` event on each vesting if there are tokens to claim.
     */
    function claimAll() external nonReentrant {
        uint256[] memory vestingIDs = userVestings[msg.sender];
        uint256 length = vestingIDs.length;
        uint256 totalClaimAmount = 0;

        for (uint256 i = 0; i < length; i++) {
            Beneficiary storage beneficiary = beneficiaries[VestingType(vestingIDs[i])][msg.sender];

            uint256 amountToClaim = calculateClaimAmount(msg.sender, VestingType(vestingIDs[i]));
            if (amountToClaim == 0) continue;

            beneficiary.claimedAmount += amountToClaim;
            totalClaims[VestingType(vestingIDs[i])] += amountToClaim;
            totalClaimAmount += amountToClaim;

            emit Claim(msg.sender, VestingType(vestingIDs[i]), amountToClaim);
        }

        if (totalClaimAmount == 0) revert NothingToClaim();

        totalClaimsForAll += totalClaimAmount;

        gini.safeTransfer(msg.sender, totalClaimAmount);
    }

    /**
     * @dev Rescue ERC20 tokens from the contract. Token must be not vestingToken.
     * @param _token Address of the token to rescue.
     * @param _to Address to send tokens to.
     */
    function rescueERC20(
        IERC20 _token,
        address _to
    ) external onlyRole(DEFAULT_ADMIN_ROLE) notZeroAddress(address(_token)) notZeroAddress(_to) {
        if (address(gini) == address(_token)) {
            revert VestingTokenRescue(address(gini));
        }

        emit ERC20Rescued(address(_token), _to, _token.balanceOf(address(this)));

        _token.safeTransfer(_to, _token.balanceOf(address(this)));
    }

    /**
     * @notice Set Gini token that will be used for vesting.
     *
     * @param _token   Address of the token.
     */
    function setGiniToken(address _token) external onlyRole(DEFAULT_ADMIN_ROLE) notZeroAddress(_token) {
        if (address(gini) != address(0)) revert TokenAlreadySet();
        gini = IERC20(_token);

        emit SetGiniToken(_token);
    }

    // _______________ Public functions _______________

    /**
     * @dev Calculate claim amount for the beneficiary. It returns 0 if vesting is not active or beneficiary has already claimed all tokens.
     *
     * @param _beneficiary   Address of the beneficiary.
     * @param _vestingID   ID of the vesting.
     *
     * @notice If totalAllocations is 0, then reverts.
     *
     * @return claimAmount   Amount of tokens that can be claimed by the beneficiary.
     */
    function calculateClaimAmount(
        address _beneficiary,
        VestingType _vestingID
    ) public view returns (uint256 claimAmount) {
        Beneficiary memory beneficiary = beneficiaries[_vestingID][_beneficiary];
        VestingPeriod memory vesting = vestingPeriods[_vestingID];
        uint256 alreadyClaimed = beneficiary.claimedAmount;
        uint256 initialUnlock;

        if (alreadyClaimed == beneficiary.totalAllocations) {
            return 0;
        }

        // calculate initial unlock amount
        if (block.timestamp > vesting.cliffStartTimestamp) {
            initialUnlock = _calcInitialUnlock(beneficiary.totalAllocations, vesting.tge);
        }

        // calculate claimable amount
        uint256 claimableAmount = _calcClaimableAmount(
            block.timestamp,
            beneficiary.totalAllocations,
            vesting.startTimestamp,
            vesting.duration,
            initialUnlock
        );

        if (alreadyClaimed != 0 && initialUnlock > 0) {
            claimAmount = claimableAmount + initialUnlock - alreadyClaimed;
        } else if (alreadyClaimed == 0 && initialUnlock > 0) {
            claimAmount = claimableAmount + initialUnlock;
        } else {
            claimAmount = claimableAmount - alreadyClaimed;
        }

        // should never happen
        if (claimAmount + alreadyClaimed > beneficiary.totalAllocations)
            revert ClaimAmountExceedsVestingAmount(_vestingID, _beneficiary, claimAmount, beneficiary.totalAllocations);

        return claimAmount;
    }

    /**
     * @dev Returns all vesting data.
     *
     * cliffStartTimestamp - timestamp of the cliff period.
     * startTimestamp - timestamp of the vesting start.
     * endTimestamp - timestamp of the vesting end.
     * duration - duration of the vesting.
     * initialUnlockPercentage- initial unlock percentage.
     * isAdvisors - true if the vesting is for advisors.
     *
     * claimedAmount - amount that the all beneficiaries has already claimed.
     */
    function getVestingData(
        VestingType _vestingID
    ) external view returns (VestingPeriod memory _vestingData, uint256 claimedAmount) {
        _vestingData = vestingPeriods[_vestingID];
        claimedAmount = totalClaims[_vestingID];
        return (_vestingData, claimedAmount);
    }

    /**
     * @notice Return all info about available claim amount for all vestings of the user.
     *
     * totalAmount - The total amount of available tokens from all vestings of the beneficiary.
     * userVestings[_beneficiary] - The array of all vesting IDs user participate in.
     * amounts-  The array of available tokens of the vesting by index.
     *
     * @param _beneficiary The address of the beneficiary.
     */
    function getClaimsAmountForAllVestings(
        address _beneficiary
    ) external view returns (uint256, uint256[] memory, uint256[] memory) {
        uint256 totalAmount = 0;
        uint256 length = userVestings[_beneficiary].length;
        uint256[] memory amounts = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            uint256 claimAmount = calculateClaimAmount(_beneficiary, VestingType(userVestings[_beneficiary][i]));

            totalAmount += claimAmount;
            amounts[i] = claimAmount;
        }

        return (totalAmount, userVestings[_beneficiary], amounts);
    }

    /**
     * @notice Returns all vestings duration of the beneficiary.
     *
     * allUserVestings - The array of all user vestings.
     * vestingsDuration - The array of vestings duration for each vesting ID by index.
     *
     * @param _beneficiary The address of the beneficiary.
     */
    function getVestingsDuration(address _beneficiary) external view returns (uint256[] memory, uint256[] memory) {
        uint256 length = userVestings[_beneficiary].length;
        uint256[] memory allUserVestings = userVestings[_beneficiary];
        uint256[] memory vestingsDuration = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            vestingsDuration[i] = vestingPeriods[VestingType(allUserVestings[i])].duration;
        }

        return (allUserVestings, vestingsDuration);
    }

    /**
     * @notice Returns total allocations amount for each vesting ID of the beneficiary.
     *
     * allUserVestings - The array of all user vestings.
     * totalAllocations - The array of total allocations amount for each vesting ID by index.
     *
     * @param _beneficiary The address of the beneficiary.
     */
    function getAllocationsForAllVestings(
        address _beneficiary
    ) external view returns (uint256[] memory, uint256[] memory) {
        uint256 length = userVestings[_beneficiary].length;
        uint256[] memory allUserVestings = userVestings[_beneficiary];
        uint256[] memory totalAllocations = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            totalAllocations[i] = beneficiaries[VestingType(allUserVestings[i])][_beneficiary].totalAllocations;
        }

        return (allUserVestings, totalAllocations);
    }

    /**
     * @notice Returns total claims from all vestings of the beneficiary.
     *
     * allUserVestings - The array of all user vestings.
     * totalClaimed - The array of total claimed amount for each vesting by index.
     *
     * @param _beneficiary The address of the beneficiary.
     */
    function getTotalClaims(address _beneficiary) external view returns (uint256[] memory, uint256[] memory) {
        uint256 length = userVestings[_beneficiary].length;
        uint256[] memory allUserVestings = userVestings[_beneficiary];
        uint256[] memory totalClaimed = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            totalClaimed[i] = beneficiaries[VestingType(allUserVestings[i])][_beneficiary].claimedAmount;
        }

        return (allUserVestings, totalClaimed);
    }

    /**
     * @notice Returns array of all user vestings.
     *
     * @param _beneficiary The address of the beneficiary.
     */
    function getUserVestings(address _beneficiary) external view returns (uint256[] memory) {
        return userVestings[_beneficiary];
    }

    // _______________ Internal functions _______________

    /**
     * @dev Add beneficiary to the vesting.
     *
     * @param _beneficiary   Address of the beneficiary.
     * @param _amount   Amount of tokens to be vested.
     * @param _vestingID   ID of the vesting.
     */
    function _addBeneficiary(
        VestingType _vestingID,
        address _beneficiary,
        uint256 _amount
    ) internal notZeroAddress(_beneficiary) {
        if (_amount == 0) revert ZeroVestingAmount(_beneficiary);
        if (beneficiaries[_vestingID][_beneficiary].totalAllocations != 0)
            revert BeneficiaryAlreadyExists(_beneficiary);

        beneficiaries[_vestingID][_beneficiary] = Beneficiary({totalAllocations: _amount, claimedAmount: 0});

        userVestings[_beneficiary].push(uint256(_vestingID));
    }

    function _validateNSetVesting(
        VestingType _vestingID,
        uint256 _cliffDuration,
        uint256 _startTimestamp,
        uint256 _duration,
        uint256 _totalSupply,
        uint256 _tge
    ) internal {
        vestingPeriods[_vestingID] = VestingPeriod({
            totalSupply: _totalSupply,
            cliffStartTimestamp: _startTimestamp,
            startTimestamp: _startTimestamp + _cliffDuration,
            endTimestamp: _startTimestamp + _duration + _cliffDuration,
            duration: _duration,
            tge: _tge
        });

        emit VestingInitialized(
            _vestingID,
            _startTimestamp,
            _startTimestamp + _cliffDuration,
            _startTimestamp + _duration + _cliffDuration,
            _totalSupply,
            _tge
        );
    }

    /**
     * @dev Calculate the initial unlock amount of the total allocations.
     *
     * @dev The vesting formula is a linear vesting curve. Thi returns amount of initial unlock amount that the beneficiary is allowed to claim from the start of the vesting.
     *
     * @param _totalAllocations The total amount that the beneficiary is allowed to claim.
     * @param _initialUnlockPercentage The initial unlock percentage from total allocations.
     */
    function _calcInitialUnlock(
        uint256 _totalAllocations,
        uint256 _initialUnlockPercentage
    ) internal pure returns (uint256) {
        if (_initialUnlockPercentage == 0) return 0;

        return (_totalAllocations * (_initialUnlockPercentage)) / 100;
    }

    /**
     * @dev Calculate the amount that the beneficiary is allowed to claim.
     *
     * @dev The vesting formula is a linear vesting curve. Thi returns amount that the beneficiary is allowed to claim from the start of the vesting depending on the current timestamp and initial unlock amount.
     *
     * @param _timestamp The current timestamp.
     * @param _totalAllocations The total amount that the beneficiary is allowed to claim.
     * @param _startTimestamp The start timestamp of the vesting.
     * @param _duration The duration of the vesting.
     */
    function _calcClaimableAmount(
        uint256 _timestamp,
        uint256 _totalAllocations,
        uint256 _startTimestamp,
        uint256 _duration,
        uint256 _initialUnlock
    ) internal pure returns (uint256 claimableAmount) {
        if (_timestamp < _startTimestamp) {
            return 0;
        }

        uint256 elapsedMonths = (_timestamp - _startTimestamp) / CLAIM_INTERVAL;

        if (elapsedMonths == 0) return 0;

        if (_timestamp > _startTimestamp + _duration) {
            if (_initialUnlock == 0) {
                return _totalAllocations;
            } else {
                return _totalAllocations - _initialUnlock;
            }
        }

        uint256 amountPerMonth;
        if (_initialUnlock == 0) {
            amountPerMonth = _totalAllocations / (_duration / CLAIM_INTERVAL);
        } else {
            amountPerMonth = (_totalAllocations - _initialUnlock) / (_duration / CLAIM_INTERVAL);
        }

        claimableAmount = amountPerMonth * elapsedMonths;
    }
}
