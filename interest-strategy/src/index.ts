import { BigInt, JSON } from "@polywrap/wasm-as";
import {
  Ethereum_Module,
  Http_Module,
  Logger_Module,
  Logger_Logger_LogLevel,
} from "./wrap";
import { Args_checker, CheckerResult } from "./wrap";
import { GelatoArgs } from "./wrap/GelatoArgs";
import { PreviewAccrueResult } from "./wrap/PreviewAccrueResult";
import { UserArgs } from "./wrap/UserArgs";
export function checker(args: Args_checker): CheckerResult {
  let userArgs = UserArgs.fromBuffer(args.userArgsBuffer);
  let gelatoArgs = GelatoArgs.fromBuffer(args.gelatoArgsBuffer);
  let timeNowSec = gelatoArgs.timeStamp;

  const zeroExApiBaseUrl = userArgs.zeroExApiBaseUrl;
  const intervalInSeconds = userArgs.intervalInSeconds;
  const mim = userArgs.mim;
  const strategy = userArgs.strategy;
  const execAddress = userArgs.execAddress;
  const rewardSwappingSlippageInBips = userArgs.rewardSwappingSlippageInBips;
  const maxBentoBoxAmountIncreaseInBips =
    userArgs.maxBentoBoxAmountIncreaseInBips;
  const maxBentoBoxChangeAmountInBips = userArgs.maxBentoBoxChangeAmountInBips;
  const strategyLens = "0xfd2387105ee3ccb0d96b7de2d86d26344f17787b";
  const BIPS = 10_000;

  let swapData: string;
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

  let strategyTokenAmountToSwap: BigInt;

  let response = Ethereum_Module.callContractView({
    address: strategyLens,
    args: null,
    connection: args.connection,
    method: "function previewAccrue(address) external view returns(uint128)",
  }).unwrap();

  if (!response) throw Error(`failed to call previewAccrue`);
  strategyTokenAmountToSwap = BigInt.fromString(response);

  logInfo(`Pending accrued interest: ${strategyTokenAmountToSwap.toString()}`);

  response = Ethereum_Module.callContractView({
    address: strategy,
    args: null,
    connection: args.connection,
    method: "function pendingFeeEarned() external view returns(uint128)",
  }).unwrap();

  strategyTokenAmountToSwap = strategyTokenAmountToSwap.add(
    BigInt.fromString(response)
  );

  logInfo(
    `Total swappable pending fee: ${strategyTokenAmountToSwap.toString()}`
  );

  if (strategyTokenAmountToSwap.gt(0)) {
    let quoteApi = `${zeroExApiBaseUrl}/swap/v1/quote?buyToken=${mim}&sellToken=${strategyToken}&sellAmount=${strategyTokenAmountToSwap.toString()}`;
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

    swapData = Ethereum_Module.encodeFunction({
      method:
        "function swapAndwithdrawFees(uint256,address,bytes) external returns (uint256 amountOut)",
      args: [minAmountOut.toString(), mim, data],
    }).unwrap();

    let execData = Ethereum_Module.encodeFunction({
      method: "function run(address,uint256,uint256,bytes[],bool) external",
      args: [
        strategy,
        maxBentoBoxAmountIncreaseInBips.toString(),
        maxBentoBoxChangeAmountInBips.toString(),
        swapData,
        new Boolean(false).toString(),
      ],
    }).unwrap();

    return { canExec: true, execData };
  }

  return { canExec: false, execData: "" };
}

function logInfo(msg: string): void {
  Logger_Module.log({ message: msg, level: Logger_Logger_LogLevel.INFO });
}
