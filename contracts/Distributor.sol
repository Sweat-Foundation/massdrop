// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC-20 Token Distributor
/// @notice This contract allows for batch distribution of ERC-20 tokens.
/// @dev Inherits from Ownable to restrict access to the distribution function.
contract Distributor is Ownable {
  event TokensSent(address indexed token, address indexed receiver, uint256 amount);
  event NativeCoinsSent(address indexed receiver, uint256 amount);

  constructor(address owner) Ownable(owner) {}

  /// @notice Distributes a specific amount of tokens to a list of receivers.
  /// @dev The sender must have approved this contract to spend the total amount of tokens.
  /// @param _token The address of the ERC-20 token to distribute.
  /// @param _receivers An array of addresses to receive the tokens.
  /// @param _amounts An array of amounts to be sent to each corresponding receiver.
  function distributeERC20(
    address _token,
    address[] calldata _receivers,
    uint256[] calldata _amounts
  ) external onlyOwner validDistributionArgs(_receivers, _amounts) sufficientAllowance(_token, _amounts) {
    IERC20 token = IERC20(_token);

    for (uint256 i = 0; i < _receivers.length; i++) {
      address receiver = _receivers[i];
      uint256 amount = _amounts[i];

      token.transferFrom(msg.sender, receiver, amount);
      emit TokensSent(_token, receiver, amount);
    }
  }

  /// @notice Distributes a specific amount of native coins to a list of receivers.
  /// @dev The sender must have attached the exact amount of native coins.
  /// @param _receivers An array of addresses to receive the native coins.
  /// @param _amounts An array of amounts to be sent to each corresponding receiver.
  function distributeNative(
    address[] calldata _receivers,
    uint256[] calldata _amounts
  ) external payable onlyOwner validDistributionArgs(_receivers, _amounts) attachedValueMatch(_amounts) {
    for (uint256 i = 0; i < _receivers.length; i++) {
      address receiver = _receivers[i];
      uint256 amount = _amounts[i];

      require(receiver != address(0), "Receiver cannot be the zero address");
      require(amount > 0, "Amount must be greater than 0");

      (bool success, ) = payable(receiver).call{value: amount}("");
      require(success, "Native transfer failed");

      emit NativeCoinsSent(receiver, amount);
    }
  }

  modifier validDistributionArgs(address[] calldata _receivers, uint256[] calldata _amounts) {
    require(_receivers.length == _amounts.length, "Receivers and amounts must have the same length");
    require(_receivers.length > 0, "Receivers must not be empty");
    require(_amounts.length > 0, "Amounts must not be empty");

    _;
  }

  modifier sufficientAllowance(address _token, uint256[] calldata _amounts) {
    uint256 totalAmount = 0;
    for (uint256 i = 0; i < _amounts.length; i++) {
      totalAmount += _amounts[i];
    }
    uint256 allowance = IERC20(_token).allowance(msg.sender, address(this));
    require(allowance >= totalAmount, "Insufficient allowance granted to contract.");

    _;
  }

  modifier attachedValueMatch(uint256[] calldata _amounts) {
    uint256 totalAmount = 0;
    for (uint256 i = 0; i < _amounts.length; i++) {
      totalAmount += _amounts[i];
    }
    require(msg.value == totalAmount, "Attached value does not match the total amount.");

    _;
  }
}
