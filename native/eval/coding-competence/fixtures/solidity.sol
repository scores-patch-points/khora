// AUTHORED fixture (model-written for the gold-extractor self-test; not natural data)
pragma solidity ^0.8.0;

import "./Base.sol";
import {Util} from "./Util.sol";

interface IDrawable {
    function draw(string memory ctx) external;
}

contract Shape is Base {
    uint256 public r;
    event Drawn(string ctx);
    function area() public view returns (uint256) { return r * r; }
}

contract Circle is Shape, IDrawable {
    function draw(string memory ctx) external override { emit Drawn(ctx); }
    function twice(uint256 x) internal pure returns (uint256) { return helper(x) + x; }
    function helper(uint256 x) internal pure returns (uint256) { return x * 2; }
}
