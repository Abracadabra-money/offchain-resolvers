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
  const strategy = userArgs.strategy;
  const execAddress = userArgs.execAddress;
  const rewardSwappingSlippageInBips = userArgs.rewardSwappingSlippageInBips;
  const maxBentoBoxAmountIncreaseInBips =
    userArgs.maxBentoBoxAmountIncreaseInBips;
  const maxBentoBoxChangeAmountInBips = userArgs.maxBentoBoxChangeAmountInBips;
  const rewardTokens = userArgs.rewardTokens;

  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const BIPS = 10_000;

  var swapData = new Array<string>(rewardTokens.length);

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

  let strategyToken = Ethereum_Module.callContractView({
    address: strategy,
    args: [],
    connection: args.connection,
    method: "function strategyToken() external view returns(address)",
  }).unwrap();

  if (!strategyToken) throw Error("strategyToken call failed");

  for (let i = 0; i < rewardTokens.length; i++) {
    let rewardToken = rewardTokens[i];
    let sellToken = rewardToken;
    let rewardTokenBalance: BigInt;

    // Native ETH reward
    if (rewardToken == "ETH" || rewardToken == zeroAddress) {
      rewardToken = zeroAddress;
      sellToken = "ETH";
      rewardTokenBalance = Ethereum_Module.getBalance({
        connection: args.connection,
        address: strategy,
        blockTag: null,
      }).unwrap();

      if (!rewardTokenBalance) throw Error(`ETH getBalance failed`);
    } else {
      let response = Ethereum_Module.callContractView({
        address: rewardToken,
        args: [strategy],
        connection: args.connection,
        method: "function balanceOf(address) external view returns(uint256)",
      }).unwrap();

      if (!response) throw Error(`failed to obtain ${rewardToken} balance`);
      rewardTokenBalance = BigInt.fromString(response);
    }

    let quoteApi = `${zeroExApiBaseUrl}/swap/v1/quote?buyToken=${strategyToken}&sellToken=${rewardToken}&sellAmount=${rewardTokenBalance.toString()}`;
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

    swapData[i] = Ethereum_Module.encodeFunction({
      method:
        "function swapRewards(uint256,address,bytes) external returns (uint256 amountOut)",
      args: [minAmountOut.toString(), rewardToken, data],
    }).unwrap();
  }

  let execData = Ethereum_Module.encodeFunction({
    method: "function run(address,uint256,uint256,bytes[]) external",
    args: [
      strategy,
      maxBentoBoxAmountIncreaseInBips.toString(),
      maxBentoBoxChangeAmountInBips.toString(),
      '["' + swapData.join('", "') + '"]',
    ],
  }).unwrap();

  return { canExec: true, execData };
}

function logInfo(msg: string): void {
  Logger_Module.log({ message: msg, level: Logger_Logger_LogLevel.INFO });
}
