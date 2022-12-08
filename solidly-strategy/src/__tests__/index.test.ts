import { encode } from "@msgpack/msgpack";
import "dotenv/config";
import { ethers } from "ethers";
import path from "path";
import { Template_CheckerResult } from "./types/wrap";
import client from "./utils/client";

jest.setTimeout(600000);

const execAddress = "0x7E05363E225c1c8096b1cd233B59457104B84908";
describe("lusd strategy resolver test", () => {
  let wrapperUri: string;
  let userArgsBuffer: Uint8Array;
  let gelatoArgsBuffer: Uint8Array;

  beforeAll(async () => {
    const dirname: string = path.resolve(__dirname);
    const wrapperPath: string = path.join(dirname, "..", "..");
    wrapperUri = `fs/${wrapperPath}/build`;

    const gelatoArgs = {
      gasPrice: ethers.utils.parseUnits("100", "gwei").toString(),
      timeStamp: "1666929002",
    };

    // latest hash QmbkPuZ9ikTQu4xg9YKYpgvFdvmanLVQ1tTuozexAw64uR
    const userArgs = {
      execAddress,
      intervalInSeconds: "86400",
      strategy: "0xa3372cd2178c52fdcb1f6e4c4e93014b4db3b20d",
      strategyLens: "0x8BEE5Db2315Df7868295c531B36BaA53439cf528",
      wrapper: "0x6eb1709e0b562097bf1cc48bc6a378446c297c04",
      pair: "0x47029bc8f5cbe3b464004e87ef9c9419a48018cd",
      router: "0xa132DAB612dB5cB9fC9Ac426A0Cc215A3423F9c9",
      factory: "0x25CbdDb98b35ab1FF77413456B31EC81A6B6B746",
      rewardToken: "0x3c8B650257cFb5f272f799F5e2b4e65093a11a05",
      wrapperRewardQuoteSlippageBips: "100",
      strategyRewardQuoteSlippageBips: "100",
      maxBentoBoxAmountIncreaseInBips: "1",
      maxBentoBoxChangeAmountInBips: "1000",
    };

    userArgsBuffer = encode(userArgs);
    gelatoArgsBuffer = encode(gelatoArgs);
  });

  it("calls checker", async () => {
    const job = await client.invoke({
      uri: wrapperUri,
      method: "checker",
      args: {
        userArgsBuffer,
        gelatoArgsBuffer,
      },
    });

    const error = job.error;
    const data = <Template_CheckerResult>job.data;

    expect(error).toBeFalsy();

    if (data.canExec) {
      console.log(
        `https://dashboard.tenderly.co/abracadabra/magic-internet-money/simulator/new?contractFunction=0x8224cec9&value=0&contractAddress=${execAddress}&rawFunctionInput=${data.execData}&network=10&from=0xfB3485c2e209A5cfBDC1447674256578f1A80eE3&block=&blockIndex=0&headerBlockNumber=&headerTimestamp=`
      );
      console.log(data.execData);
    }
  });
});
