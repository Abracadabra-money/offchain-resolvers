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

  let callee = new Array<string>(2);
  let data = new Array<string>(2);
  for (let i = 0; i < data.length; i++) {
    data[i] = "";
    callee[i] = "";
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
  }).unwrapOr("0");

  if (!request) throw Error("quoteSolidlyWrapperHarvestAmountOut call failed");

  let minLpOutFromWrapperRewards = BigInt.fromString(request);

  if (minLpOutFromWrapperRewards.gt(0)) {
    minLpOutFromWrapperRewards = minLpOutFromWrapperRewards.sub(
      minLpOutFromWrapperRewards.mul(wrapperRewardQuoteSlippageBips).div(10_000)
    );

    callee[0] = wrapper;
    data[0] = Ethereum_Module.encodeFunction({
      method: "function harvest(uint256) external returns (uint256)",
      args: [minLpOutFromWrapperRewards.toString()],
    }).unwrap();

    logInfo(
      `minLpOutFromWrapperRewards: ${minLpOutFromWrapperRewards.toString()}`
    );
  }

  request = Ethereum_Module.callContractView({
    address: strategyLens,
    args: [strategy, pair, router, fee.toString()],
    connection: args.connection,
    method:
      "function quoteSolidlyGaugeVolatileStrategySwapToLPAmount(address,address,address,uint256) external view returns(uint256)",
  }).unwrapOr("0");

  if (!request)
    throw Error("quoteSolidlyGaugeVolatileStrategySwapToLPAmount call failed");

  let minLpOutFromStrategyRewards = BigInt.fromString(request);

  if (minLpOutFromStrategyRewards.gt(0)) {
    minLpOutFromStrategyRewards = minLpOutFromStrategyRewards.sub(
      minLpOutFromStrategyRewards
        .mul(strategyRewardQuoteSlippageBips)
        .div(10_000)
    );

    callee[1] = strategy;
    data[1] = Ethereum_Module.encodeFunction({
      method: "function swapToLP(uint256,uint256) external returns (uint256)",
      args: [minLpOutFromWrapperRewards.toString(), fee.toString()],
    }).unwrap();

    logInfo(
      `minLpOutFromStrategyRewards: ${minLpOutFromStrategyRewards.toString()}`
    );
  }

  data = data.filter((f) => f != "");
  callee = callee.filter((f) => f != "");

  if (data.length > 0) {
    let execData = Ethereum_Module.encodeFunction({
      method: "function run(address,uint256,uint256,address[],bytes[],bool) external",
      args: [
        strategy,
        maxBentoBoxAmountIncreaseInBips.toString(),
        maxBentoBoxChangeAmountInBips.toString(),
        callee.length > 0 ? '["' + callee.join('", "') + '"]' : "[]",
        data.length > 0 ? '["' + data.join('", "') + '"]' : "[]",
        true.toString(),
      ],
    }).unwrap();

    return { canExec: true, execData };
  }

  return { canExec: false, execData: "" };
}

function logInfo(msg: string): void {
  Logger_Module.log({ message: msg, level: Logger_Logger_LogLevel.INFO });
}
