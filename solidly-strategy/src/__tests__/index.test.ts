import { encode } from "@msgpack/msgpack";
import "dotenv/config";
import { ethers } from "ethers";
import path from "path";
import { Template_CheckerResult } from "./types/wrap";
import client from "./utils/client";

jest.setTimeout(600000);

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
      timeStamp: "1666929002"
    };

    // latest hash QmbkPuZ9ikTQu4xg9YKYpgvFdvmanLVQ1tTuozexAw64uR
    const userArgs = {
      execAddress: "0xd69e75c1c2a0f2838a6bba8bdff9d08c8f137cd9",
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
      maxBentoBoxChangeAmountInBips: "1000"
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

    console.log("canExec", data.canExec);
    console.log("execData", data.execData);
  });

});
