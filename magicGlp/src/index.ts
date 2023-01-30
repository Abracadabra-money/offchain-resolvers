import { BigInt, JSON } from "@polywrap/wasm-as";
import {
  Ethereum_Module,
  Http_Module,
  Logger_Module,
  Logger_Logger_LogLevel,
} from "./wrap";
import { Args_checker, CheckerResult } from "./wrap";
import { GelatoArgs } from "./wrap/GelatoArgs";
import { UserArgs } from "./wrap/UserArgs";
export function checker(args: Args_checker): CheckerResult {
  let userArgs = UserArgs.fromBuffer(args.userArgsBuffer);
  let gelatoArgs = GelatoArgs.fromBuffer(args.gelatoArgsBuffer);
  let timeNowSec = gelatoArgs.timeStamp;

  const intervalInSeconds = userArgs.intervalInSeconds;
  const execAddress = userArgs.execAddress;
  const lensAddress = userArgs.lensAddress;
  const rewardToken = userArgs.rewardToken;
  const mintGlpSlippageInBips = userArgs.mintGlpSlippageInBips;

  const BIPS = 10_000;

  let lastExecuted = BigInt.fromString(
    Ethereum_Module.callContractView({
      address: execAddress,
      method: "function lastExecution() external view returns(uint256)",
      args: null,
      connection: args.connection,
    }).unwrap()
  );

  if (timeNowSec.lt(lastExecuted.add(intervalInSeconds))) {
    return { canExec: false, execData: "" };
  }

  let rewardTokenBalanceResponse = Ethereum_Module.callContractView({
    address: execAddress,
    args: [],
    connection: args.connection,
    method:
      "function totalRewardsBalanceAfterClaiming() external view returns(uint256)",
  }).unwrap();

  if (!rewardTokenBalanceResponse)
    throw Error(`failed to obtain ${rewardToken} balance after claiming`);

  let rewardTokenBalance = BigInt.fromString(rewardTokenBalanceResponse);

  if (rewardTokenBalance.gt(0)) {

    let mintGlpAmountResponse = Ethereum_Module.callContractView({
      address: lensAddress,
      args: [rewardToken, rewardTokenBalance.toString()],
      connection: args.connection,
      method:
        "function glpMintAmount(address,uint256) external view returns(uint256)",
    }).unwrap();

    if (!mintGlpAmountResponse)
      throw Error(`failed to obtain glpMintAmount`);

    let mintGlpAmount = BigInt.fromString(mintGlpAmountResponse);

    const minAmountOut = mintGlpAmount.sub(
      mintGlpAmount.mul(mintGlpSlippageInBips).div(BIPS)
    );

    let execData = Ethereum_Module.encodeFunction({
      method: "function run(uint256) external",
      args: [minAmountOut.toString()],
    }).unwrap();

    return { canExec: true, execData };
  }
  return { canExec: false, execData: "" };
}

function logInfo(msg: string): void {
  Logger_Module.log({ message: msg, level: Logger_Logger_LogLevel.INFO });
}
