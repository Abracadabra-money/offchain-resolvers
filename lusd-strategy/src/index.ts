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

  let canExec = false;
  let swapData = [];

  let lastExecuted = BigInt.fromString(
    Ethereum_Module.callContractView({
      address: execAddress,
      method: "function lastExecuted() external view returns(uint256)",
      args: null,
      connection: args.connection,
    }).unwrap()
  );

  if (timeNowSec.gte(lastExecuted.add(intervalInSeconds))) {
    return { canExec: false, execData: "" };
  }

  let strategyToken = Ethereum_Module.callContractView({
    address: strategy,
    args: [],
    connection: args.connection,
    method: "function strategyToken() external",
  }).unwrap();

  if (!strategyToken) throw Error("strategyToken call failed");

  for (let i = 0; i < rewardTokens.length; i++) {
    let rewardToken = rewardTokens[i];
    let rewardTokenBalance: BigInt;

    // Native ETH reward
    if (rewardToken === "ETH" || rewardToken == zeroAddress) {
      rewardToken = zeroAddress;
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
        method: "function balanceOf(address) external",
      }).unwrap();

      if (!response) throw Error(`failed to obtain ${rewardToken} balance`);
      rewardTokenBalance = BigInt.fromString(response);
    }

    const { toTokenAmount, data } = getQuote(
      zeroExApiBaseUrl,
      rewardToken,
      strategyToken,
      rewardTokenBalance
    );

    const minAmountOut = toTokenAmount.sub(
      toTokenAmount.mul(rewardSwappingSlippageInBips).div(BIPS)
    );

    swapData.push(
      Ethereum_Module.encodeFunction({
        method: "function swapRewards(uint256,address,bytes) external",
        args: [minAmountOut.toString(), rewardToken, data],
      }).unwrap()
    );
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

  return { canExec, execData };
}

function getQuote(
  zeroExApiBaseUrl: string,
  fromTokenAddress: string,
  toTokenAddress: string,
  fromTokenAmount: BigInt
): {
  toTokenAmount: BigInt;
  data: string;
} {
  let quoteApi = `${zeroExApiBaseUrl}/swap/v1/price?buyToken=${toTokenAddress}&sellToken=${fromTokenAddress}&sellAmount=${fromTokenAmount.toString()}`;
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

  return { toTokenAmount, data };
}

function logInfo(msg: string): void {
  Logger_Module.log({ message: msg, level: Logger_Logger_LogLevel.INFO });
}
