// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract GiniVesting is AccessControl, ReentrancyGuard {
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
        bool areTotallyClaimed;
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
        uint256 cliffStartTimestamp;
        uint256 startTimestamp;
        uint256 endTimestamp;
        uint256 duration;
    }

    // _______________ Storage _______________

    uint256 public constant CLAIM_INTERVAL = 30 days;

    // _______________ Storage _______________

    /// @notice Vesting ID => Vesting Period.
    mapping(uint256 => VestingPeriod) public vestingPeriods;

    /// @notice Vesting ID => The total allocations for all accounts.
    mapping(uint256 => uint256) public commonAllocations;

    /// @notice Vesting ID => The total claims for all accounts.
    mapping(uint256 => uint256) public totalClaims;

    /// @notice User => All vesting IDs of the user.
    mapping(address => uint256[]) public userVestings;

    /// @notice Vesting ID => Beneficiary => Beneficiary info.
    mapping(uint256 => mapping(address => Beneficiary)) public beneficiaries;

    IERC20 public gini;

    uint256 public totalSupply;

    uint256 public remainingSupply;

    /// @notice The total amount of claims from all users and vestings.
    uint256 public totalClaimsForAll;

    // _______________ Errors _______________

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

    error CannotBeZero();

    error TotalSupplyReached();

    error VestingTokenRescue(address token);

    error NothingToClaim();

    /// @dev Revert if vesting is not started yet.
    error OnlyAfterVestingStart(uint256 vestingID);

    /// @dev Revert if claim amount exceeds vesting amount.
    error ClaimAmountExceedsVestingAmount(
        uint256 _vestingID,
        address _beneficiary,
        uint256 _claimAmount,
        uint256 _totalAllocations
    );

    // _______________ Events _______________

    /**
     * @dev Emitted when the claim is successful.
     *
     * @param _user   Address of the user.
     * @param _amount   Amount of the claim.
     */
    event Claim(address indexed _user, uint256 _vestingID, uint256 indexed _amount);

    /**
     * @dev Emitted when the vesting is initialized.
     */
    event VestingInitialized(
        uint256 indexed vestingID,
        uint256 cliffStartTimestamp,
        uint256 startTimestamp,
        uint256 endTimestamp
    );

    event SetGiniToken(address token);

    /**
     * @dev Emitted when ERC20 tokens are rescued.
     */
    event ERC20Rescued(address indexed _token, address indexed _to, uint256 indexed _amount);

    // _______________ Modifiers _______________

    modifier notZeroAddress(address _address) {
        if (_address == address(0)) revert ZeroAddress();
        _;
    }

    constructor(uint256 _totalSupply) {
        if (_totalSupply == 0) revert CannotBeZero();

        totalSupply = _totalSupply;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Initialize vesting.
     *
     * @param _vestingID   ID of the vesting.
     * @param _cliffStartTimestamp   Start timestamp of the cliff period.
     * @param _startTimestamp   Start timestamp of the vesting.
     * @param _endTimestamp   End timestamp of the vesting.
     * @param _beneficiaries   Array of the beneficiaries addresses.
     * @param _amounts   Array of the amounts, each amount corresponds to the beneficiary by index.
     *
     * Emits a VestingInitialized event.
     */
    function initVesting(
        uint256 _vestingID,
        uint256 _cliffStartTimestamp,
        uint256 _startTimestamp,
        uint256 _endTimestamp,
        address[] calldata _beneficiaries,
        uint256[] calldata _amounts
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 length = _beneficiaries.length;
        uint256 totalAllocations = 0;

        if (_beneficiaries.length == 0) revert NoBeneficiaries();
        if (_beneficiaries.length != _amounts.length)
            revert ArraysLengthMismatch(_beneficiaries.length, _amounts.length);

        _validateNSetVesting(_vestingID, _cliffStartTimestamp, _startTimestamp, _endTimestamp);

        // fill beneficiaries
        for (uint256 i = 0; i < length; i++) {
            _addBeneficiary(_vestingID, _beneficiaries[i], _amounts[i]);
            totalAllocations += _amounts[i];
        }

        if (totalSupply < totalAllocations) revert TotalSupplyReached();

        totalSupply -= totalAllocations;
        commonAllocations[_vestingID] = totalAllocations;

        emit VestingInitialized(_vestingID, _cliffStartTimestamp, _startTimestamp, _endTimestamp);
    }

    function claim(uint256 _vestingID) external nonReentrant {
        Beneficiary storage beneficiary = beneficiaries[_vestingID][msg.sender];
        VestingPeriod memory vesting = vestingPeriods[_vestingID];

        if (beneficiary.areTotallyClaimed == true) revert NothingToClaim();

        uint256 amountToClaim = calculateClaimAmount(msg.sender, _vestingID);
        if (amountToClaim == 0)
            if (vesting.startTimestamp > block.timestamp) {
                revert OnlyAfterVestingStart(_vestingID);
            } else {
                revert NothingToClaim();
            }

        if (amountToClaim == 0) revert NothingToClaim();

        beneficiary.claimedAmount += amountToClaim;
        totalClaims[_vestingID] += amountToClaim;
        totalClaimsForAll += amountToClaim;

        if (beneficiary.claimedAmount == beneficiary.totalAllocations) {
            beneficiary.areTotallyClaimed = true;
        }

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
            Beneficiary storage beneficiary = beneficiaries[vestingIDs[i]][msg.sender];

            uint256 amountToClaim = calculateClaimAmount(msg.sender, vestingIDs[i]);
            if (amountToClaim == 0) continue;

            beneficiary.claimedAmount += amountToClaim;
            totalClaims[vestingIDs[i]] += amountToClaim;
            totalClaimAmount += amountToClaim;

            if (beneficiary.claimedAmount == beneficiary.totalAllocations) {
                beneficiary.areTotallyClaimed = true;
            }

            emit Claim(msg.sender, vestingIDs[i], amountToClaim);
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

    function setGiniToken(address _token) external onlyRole(DEFAULT_ADMIN_ROLE) notZeroAddress(_token) {
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
    function calculateClaimAmount(address _beneficiary, uint256 _vestingID) public view returns (uint256 claimAmount) {
        Beneficiary memory beneficiary = beneficiaries[_vestingID][_beneficiary];
        VestingPeriod memory vesting = vestingPeriods[_vestingID];
        uint256 alreadyClaimed = beneficiary.claimedAmount;

        if (alreadyClaimed == beneficiary.totalAllocations) {
            return 0;
        }

        // calculate claimable amount
        uint256 claimableAmount = _calcClaimableAmount(
            block.timestamp,
            beneficiary.totalAllocations,
            vesting.startTimestamp,
            vesting.duration
        );

        claimAmount = claimableAmount - alreadyClaimed;

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
     * totalAllocations - total amount that the all beneficiaries is allowed to claim.
     *
     * claimedAmount - amount that the all beneficiaries has already claimed.
     */
    function getVestingData(
        uint256 _vestingID
    ) external view returns (VestingPeriod memory _vestingData, uint256 totalAllocations, uint256 claimedAmount) {
        _vestingData = vestingPeriods[_vestingID];
        totalAllocations = commonAllocations[_vestingID];
        claimedAmount = totalClaims[_vestingID];
        return (_vestingData, totalAllocations, claimedAmount);
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
            uint256 claimAmount = calculateClaimAmount(_beneficiary, userVestings[_beneficiary][i]);

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
            vestingsDuration[i] = vestingPeriods[allUserVestings[i]].duration;
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
            totalAllocations[i] = beneficiaries[allUserVestings[i]][_beneficiary].totalAllocations;
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
            totalClaimed[i] = beneficiaries[allUserVestings[i]][_beneficiary].claimedAmount;
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
        uint256 _vestingID,
        address _beneficiary,
        uint256 _amount
    ) internal notZeroAddress(_beneficiary) {
        if (_amount == 0) revert ZeroVestingAmount(_beneficiary);
        if (beneficiaries[_vestingID][_beneficiary].totalAllocations != 0)
            revert BeneficiaryAlreadyExists(_beneficiary);

        beneficiaries[_vestingID][_beneficiary] = Beneficiary({
            totalAllocations: _amount,
            claimedAmount: 0,
            areTotallyClaimed: false
        });

        userVestings[_beneficiary].push(_vestingID);
    }

    /**
     *
     * @param _vestingID The ID of the vesting.
     * @param _cliffStartTimestamp The timestamp of the cliff period.
     * @param _startTimestamp The timestamp of the vesting start.
     * @param _endTimestamp The timestamp of the vesting end.
     */
    function _validateNSetVesting(
        uint256 _vestingID,
        uint256 _cliffStartTimestamp,
        uint256 _startTimestamp,
        uint256 _endTimestamp
    ) internal {
        VestingPeriod memory vestingInfo = vestingPeriods[_vestingID];
        if (vestingInfo.cliffStartTimestamp != 0) revert AlreadyInitialized();

        if (
            _cliffStartTimestamp < block.timestamp ||
            _cliffStartTimestamp > _startTimestamp ||
            _startTimestamp > _endTimestamp
        ) revert InvalidVestingParams(_cliffStartTimestamp, _startTimestamp, _endTimestamp);

        vestingPeriods[_vestingID] = VestingPeriod({
            cliffStartTimestamp: _cliffStartTimestamp,
            startTimestamp: _startTimestamp,
            endTimestamp: _endTimestamp,
            duration: _endTimestamp - _startTimestamp
        });
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
        uint256 _duration
    ) internal pure returns (uint256 claimableAmount) {
        if (_timestamp < _startTimestamp) return 0;

        uint256 elapsedMonths = _timestamp - _startTimestamp / CLAIM_INTERVAL;

        if (elapsedMonths == 0) return 0;

        if (_timestamp > _startTimestamp + _duration) {
            return _totalAllocations;
        } else {
            claimableAmount = (_totalAllocations * elapsedMonths) / _duration;
        }
    }
}
