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
  const wrapper = userArgs.wrapper;
  const pair = userArgs.pair;
  const router = userArgs.router;
  const factory = userArgs.factory;
  const rewardToken = userArgs.rewardToken;
  const wrapperRewardQuoteSlippageBips =
    userArgs.wrapperRewardQuoteSlippageBips;
  const strategyRewardQuoteSlippageBips =
    userArgs.strategyRewardQuoteSlippageBips;

  const strategy = userArgs.strategy;
  const strategyLens = userArgs.strategyLens;
  const execAddress = userArgs.execAddress;
  const maxBentoBoxAmountIncreaseInBips =
    userArgs.maxBentoBoxAmountIncreaseInBips;
  const maxBentoBoxChangeAmountInBips = userArgs.maxBentoBoxChangeAmountInBips;
  const BIPS = 10_000;

  let actions = new Array<string>(2);
  for (let i = 0; i < actions.length; i++) {
    actions[i] = "";
  }

  let lastExecuted = BigInt.fromString(
    Ethereum_Module.callContractView({
      address: execAddress,
      method: "function lastExecution(address) external view returns(uint256)",
      args: [strategy],
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

  let fee = BigInt.from(3);

  if (factory) {
    let request = Ethereum_Module.callContractView({
      address: factory,
      args: [],
      connection: args.connection,
      method: "function volatileFee() external view returns(uint256)",
    }).unwrap();

    if (!request) throw Error("volatileFee call failed");

    fee = BigInt.fromString(request);
  }

  let request = Ethereum_Module.callContractView({
    address: strategyLens,
    args: [wrapper, router, fee.toString()],
    connection: args.connection,
    method:
      "function quoteSolidlyWrapperHarvestAmountOut(address,address,uint256) external view returns(uint256)",
  }).unwrap();

  if (!request) throw Error("volatileFee call failed");

  let minLpOutFromWrapperRewards = BigInt.fromString(request);

  minLpOutFromWrapperRewards = minLpOutFromWrapperRewards.sub(
    minLpOutFromWrapperRewards.mul(wrapperRewardQuoteSlippageBips).div(10_000)
  );

  logInfo(`minLpOutFromWrapperRewards: ${minLpOutFromWrapperRewards.toString()}`);
  /*
  //actions[0] = "";
  actions = actions.filter((f) => f != "");
  let execData = Ethereum_Module.encodeFunction({
    method: "function run(address,uint256,uint256,bytes[]) external",
    args: [
      strategy,
      maxBentoBoxAmountIncreaseInBips.toString(),
      maxBentoBoxChangeAmountInBips.toString(),
      swapData.length > 0 ? '["' + swapData.join('", "') + '"]' : "[]",
    ],
  }).unwrap();
*/
  let execData = "";
  return { canExec: false, execData };
}

function logInfo(msg: string): void {
  Logger_Module.log({ message: msg, level: Logger_Logger_LogLevel.INFO });
}
