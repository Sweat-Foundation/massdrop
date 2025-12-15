// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Distributor is Ownable {
  event TokensSent(address indexed token, address indexed receiver, uint256 amount);

  constructor(address owner) Ownable(owner) {}

  function distribute(address _token, address[] calldata receivers, uint256[] calldata amounts) external onlyOwner {
    require(receivers.length == amounts.length, "Receivers and amounts must have the same length");
    require(receivers.length > 0, "Receivers must not be empty");
    require(amounts.length > 0, "Amounts must not be empty");

    IERC20 token = IERC20(_token);
    uint256 totalAmount = 0;

    for (uint256 i = 0; i < amounts.length; i++) {
      totalAmount += amounts[i];
    }
    uint256 allowance = token.allowance(msg.sender, address(this));
    require(allowance >= totalAmount, "Insufficient allowance granted to contract.");

    for (uint256 i = 0; i < receivers.length; i++) {
      address receiver = receivers[i];
      uint256 amount = amounts[i];

      token.transferFrom(msg.sender, receiver, amount);
      emit TokensSent(_token, receiver, amount);
    }
  }
}
