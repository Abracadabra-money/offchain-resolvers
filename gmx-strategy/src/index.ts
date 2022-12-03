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

  const zeroExApiBaseUrl = userArgs.zeroExApiBaseUrl;
  const intervalInSeconds = userArgs.intervalInSeconds;
  const execAddress = userArgs.execAddress;
  const rewardSwappingSlippageInBips = userArgs.rewardSwappingSlippageInBips;

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

  let rewardToken = Ethereum_Module.callContractView({
    address: execAddress,
    args: [],
    connection: args.connection,
    method: "function rewardToken() external view returns(address)",
  }).unwrap();

  if (!rewardToken) throw Error("rewardToken call failed");

  let outputToken = Ethereum_Module.callContractView({
    address: execAddress,
    args: [],
    connection: args.connection,
    method: "function outputToken() external view returns(address)",
  }).unwrap();

  if (!outputToken) throw Error("outputToken call failed");

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
    let quoteApi = `${zeroExApiBaseUrl}/swap/v1/quote?buyToken=${outputToken}&sellToken=${rewardToken}&sellAmount=${rewardTokenBalance.toString()}`;
    logInfo(quoteApi);
    let quoteApiRes = Http_Module.get({
      request: null,
      url: quoteApi,
    }).unwrap();

    if (!quoteApiRes) throw Error("Get quote api failed");
    let quoteResObj = <JSON.Obj>JSON.parse(quoteApiRes.body);

    let value = quoteResObj.getValue("buyAmount");
    if (!value) throw Error("No buyAmount");
    let toTokenAmount = BigInt.fromString(value.toString());

    value = quoteResObj.getValue("data");
    if (!value) throw Error("No data");
    let data = value.toString();

    const minAmountOut = toTokenAmount.sub(
      toTokenAmount.mul(rewardSwappingSlippageInBips).div(BIPS)
    );

    let execData = Ethereum_Module.encodeFunction({
      method: "function run(uint256,bytes) external",
      args: [minAmountOut.toString(), data],
    }).unwrap();

    return { canExec: true, execData };
  }
  return { canExec: false, execData: "" };
}

function logInfo(msg: string): void {
  Logger_Module.log({ message: msg, level: Logger_Logger_LogLevel.INFO });
}
