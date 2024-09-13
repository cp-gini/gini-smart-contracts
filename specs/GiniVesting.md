## Documentation

### Documentation for [`GiniVesting`](../contracts/GiniVesting.sol) Contract

#### Overview

The [`GiniVesting`](../contracts/GiniVesting.sol) contract is a vesting contract for the Gini token. It allows for the distribution of tokens over a specified vesting schedule. The contract includes features such as setting the vesting schedule, claiming vested tokens, and setting the Gini token address.

#### Libraries

-   **SafeERC20**: Provides safe wrappers around ERC20 operations that throw on failure.

#### Structs

-   **Beneficiary**: Stores the information of a beneficiary.

    -   `uint256 totalAllocations`: The total amount that the beneficiary is allowed to claim.
    -   `uint256 claimedAmount`: The amount that the beneficiary has already claimed.

-   **VestingPeriod**: Stores the design of a vesting period.

    -   `uint256 totalSupply`: The total supply of tokens for the vesting period.
    -   `uint256 cliffStartTimestamp`: The start timestamp of the cliff period.
    -   `uint256 startTimestamp`: The start timestamp of the vesting period.
    -   `uint256 endTimestamp`: The end timestamp of the vesting period.
    -   `uint256 duration`: The duration of the vesting period.
    -   `uint256 tge`: The initial unlock percentage (10 = 10%).

-   **VestingType**: Enum representing the type of vesting.
    -   `Team`: Vesting for the team. (vesting ID = 0)
    -   `Foundation`: Vesting for the foundation. (vesting ID = 1)
    -   `Reserve`: Vesting for the reserve. (vesting ID = 2)
    -   `Airdrop`: Vesting for the airdrop. (vesting ID = 3)
    -   `Seed`: Vesting for the seed and private investors. (vesting ID = 4)

#### Storage Variables

-   **CLAIM_INTERVAL**: The interval for claiming tokens (30 days).

    -   `uint256 public constant CLAIM_INTERVAL = 30 days;`

-   **vestingPeriods**: Mapping of vesting types to vesting periods.

    -   `mapping(VestingType => VestingPeriod) public vestingPeriods;`

-   **totalClaims**: Mapping of vesting types to the total claims for all accounts.

    -   `mapping(VestingType => uint256) public totalClaims;`

-   **userVestings**: Mapping of users to their vesting IDs.

    -   `mapping(address => uint256[]) public userVestings;`

-   **beneficiaries**: Mapping of vesting types to beneficiaries and their information.

    -   `mapping(VestingType => mapping(address => Beneficiary)) public beneficiaries;`

-   **gini**: The vesting token.

    -   `IERC20 public gini;`

-   **totalClaimsForAll**: The total amount of claims from all users and vestings.
    -   `uint256 public totalClaimsForAll;`

#### Errors

-   **ZeroAddress()**: Reverted if a zero address is passed.
-   **ArraysLengthMismatch(uint256 length1, uint256 length2)**: Reverted if arrays lengths are not equal.
-   **NoBeneficiaries()**: Reverted if there are no beneficiaries.
-   **ZeroVestingAmount(address \_beneficiary)**: Reverted if zero vesting amount is passed.
-   **BeneficiaryAlreadyExists(address \_beneficiary)**: Reverted if beneficiary already exists.
-   **InvalidVestingParams(uint256 \_cliffStartTimestamp, uint256 \_startTimestamp, uint256 \_endTimestamp)**: Reverted if vesting params are invalid.
-   **AlreadyInitialized()**: Reverted if vesting is already initialized.
-   **CannotBeZero()**: Reverted if total supply is zero.
-   **TotalSupplyReached(VestingType vestingID)**: Reverted if total supply of vesting is reached.
-   **VestingTokenRescue(address token)**: Reverted if vesting token rescue failed.
-   **NothingToClaim()**: Reverted if nothing to claim.
-   **OnlyAfterVestingStart(VestingType vestingID)**: Reverted if vesting is not started yet.
-   **ClaimAmountExceedsVestingAmount(VestingType \_vestingID, address \_beneficiary, uint256 \_claimAmount, uint256 \_totalAllocations)**: Reverted if claim amount exceeds vesting amount.
-   **VestingNotInitialized(VestingType vestingID)**: Reverted if vesting is not initialized.
-   **OnlyBeforeVestingCliff()**: Reverted if action is only allowed before vesting cliff.
-   **TokenAlreadySet()**: Reverted if token is already set.
-   **OnlyForAirdrop(uint256 vestingID)**: Reverted if action is only allowed for airdrop vesting.
-   **OnlyForScheduled(uint256 vestingID)**: Reverted if action is only allowed for scheduled vesting.
-   **NotAllowedVesting(VestingType vestingID)**: Reverted if vesting type is not allowed.

#### Events

-   **Claim(address indexed \_user, VestingType \_vestingID, uint256 indexed \_amount)**: Emitted when the claim is successful.
-   **VestingInitialized(VestingType indexed vestingID, uint256 cliffStartTimestamp, uint256 startTimestamp, uint256 endTimestamp, uint256 totalSupply, uint256 tge)**: Emitted when the vesting is initialized.
-   **SetGiniToken(address token)**: Emitted when the token for the vesting is set.
-   **ERC20Rescued(address indexed \_token, address indexed \_to, uint256 indexed \_amount)**: Emitted when ERC20 tokens are rescued.
-   **BeneficiariesAdded(VestingType indexed vestingID, uint256 indexed totalAllocations)**: Emitted when beneficiaries are added.

#### Modifiers

-   **notZeroAddress(address \_address)**: Ensures the address is not zero.
    ```solidity
    modifier notZeroAddress(address _address) {
        if (_address == address(0)) revert ZeroAddress();
        _;
    }
    ```

#### Functions

-   **initialize(uint256 \_startTimestamp)**: Initializes the contract with the given start timestamp. During contract deployment it initializes all type of vestings regarding to the tokenomic of the GINI token.

    ```solidity
    function initialize(uint256 _startTimestamp) public initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();

        if (_startTimestamp == 0) revert CannotBeZero();

        // Initialize vestings
        _validateNSetVesting(VestingType.Team, 30 days * 12, _startTimestamp, 30 days * 24, 300_000_000 * 1e18, 0);
        _validateNSetVesting(VestingType.Foundation, 0, _startTimestamp, 30 days * 12, 220_000_000 * 1e18, 0);
        _validateNSetVesting(VestingType.Reserve, 0, _startTimestamp, 30 days * 150, 800_000_000 * 1e18, 0);
        _validateNSetVesting(VestingType.Airdrop, 30 days * 6, _startTimestamp, 30 days * 9, 80_000_000 * 1e18, 10);
        _validateNSetVesting(VestingType.Seed, 30 days * 6, _startTimestamp, 30 days * 12, 300_000_000 * 1e18, 0);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    ```

-   **addBeneficiaries(VestingType \_vestingID, address[] calldata \_beneficiary, uint256[] calldata \_amount)**: Adds beneficiaries to a vesting.

    ```solidity
    function addBeneficiaries(
        VestingType _vestingID,
        address[] calldata _beneficiary,
        uint256[] calldata _amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_vestingID == VestingType.Airdrop || _vestingID == VestingType.Seed) revert NotAllowedVesting(_vestingID);

        VestingPeriod storage vesting = vestingPeriods[_vestingID];
        uint256 beneficiariesLength = _beneficiary.length;
        uint256 totalAllocations = 0;

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
    ```

-   **addAirdrop(address[] calldata \_beneficiary, uint256[] calldata \_amount)**: Adds beneficiaries to the airdrop vesting.

    ```solidity
    function addAirdrop(
        address[] calldata _beneficiary,
        uint256[] calldata _amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        VestingPeriod storage vesting = vestingPeriods[VestingType.Airdrop];
        uint256 beneficiariesLength = _beneficiary.length;
        uint256 totalAllocations = 0;

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
    ```

-   **addScheduled(address[] calldata \_beneficiary, uint256[] calldata \_amount)**: Adds beneficiaries to the scheduled vesting.

    ```solidity
    function addScheduled(
        address[] calldata _beneficiary,
        uint256[] calldata _amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        VestingPeriod storage vesting = vestingPeriods[VestingType.Seed];
        uint256 beneficiariesLength = _beneficiary.length;
        uint256 totalAllocations = 0;

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
    ```

-   **claim(VestingType \_vestingID)**: Claims tokens from the specified vesting.

    ```solidity
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
    ```

-   **claimAll()**: Claims all available tokens from all vestings of the caller.

    ```solidity
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
    ```

-   **rescueERC20(IERC20 \_token, address \_to)**: Rescues ERC20 tokens from the contract.

    ```solidity
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
    ```

-   **setGiniToken(address \_token)**: Sets the Gini token that will be used for vesting.

    ```solidity
    function setGiniToken(address _token) external onlyRole(DEFAULT_ADMIN_ROLE) notZeroAddress(_token) {
        if (address(gini) != address(0)) revert TokenAlreadySet();
        gini = IERC20(_token);

        emit SetGiniToken(_token);
    }
    ```

-   **calculateClaimAmount(address \_beneficiary, VestingType \_vestingID)**: Calculates the claim amount for the beneficiary.

    ```solidity
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
        if (block.timestamp < vesting.cliffStartTimestamp) return 0;

        initialUnlock = _calcInitialUnlock(beneficiary.totalAllocations, vesting.tge);

        uint256 claimableAmount = _calcClaimableAmount(
            block.timestamp,
            beneficiary.totalAllocations,
            vesting.startTimestamp,
            vesting.duration,
            initialUnlock
        );

        claimAmount = claimableAmount + initialUnlock - alreadyClaimed;

        if (claimAmount + alreadyClaimed > beneficiary.totalAllocations)
            revert ClaimAmountExceedsVestingAmount(_vestingID, _beneficiary, claimAmount, beneficiary.totalAllocations);

        return claimAmount;
    }
    ```

-   **getVestingData(VestingType \_vestingID)**: Returns all vesting data.

    ```solidity
    function getVestingData(
        VestingType _vestingID
    ) external view returns (VestingPeriod memory _vestingData, uint256 claimedAmount) {
        _vestingData = vestingPeriods[_vestingID];
        claimedAmount = totalClaims[_vestingID];
        return (_vestingData, claimedAmount);
    }
    ```

-   **getClaimsAmountForAllVestings(address \_beneficiary)**: Returns all info about available claim amount for all vestings of the user.

    ```solidity
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
    ```

-   **getVestingsDuration(address \_beneficiary)**: Returns all vestings duration of the beneficiary.

    ```solidity
    function getVestingsDuration(address _beneficiary) external view returns (uint256[] memory, uint256[] memory) {
        uint256 length = userVestings[_beneficiary].length;
        uint256[] memory allUserVestings = userVestings[_beneficiary];
        uint256[] memory vestingsDuration = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            vestingsDuration[i] = vestingPeriods[VestingType(allUserVestings[i])].duration;
        }

        return (allUserVestings, vestingsDuration);
    }
    ```

-   **getAllocationsForAllVestings(address \_beneficiary)**: Returns total allocations amount for each vesting ID of the beneficiary.

    ```solidity
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
    ```

-   **getTotalClaims(address \_beneficiary)**: Returns total claims from all vestings of the beneficiary.

    ```solidity
    function getTotalClaims(address _beneficiary) external view returns (uint256[] memory, uint256[] memory) {
        uint256 length = userVestings[_beneficiary].length;
        uint256[] memory allUserVestings = userVestings[_beneficiary];
        uint256[] memory totalClaimed = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            totalClaimed[i] = beneficiaries[VestingType(allUserVestings[i])][_beneficiary].claimedAmount;
        }

        return (allUserVestings, totalClaimed);
    }
    ```

-   **getUserVestings(address \_beneficiary)**: Returns array of all user vestings.

    ```solidity
    function getUserVestings(address _beneficiary) external view returns (uint256[] memory) {
        return userVestings[_beneficiary];
    }
    ```
