import { encode } from "@msgpack/msgpack";
import "dotenv/config";
import { ethers } from "ethers";
import path from "path";
import { Template_CheckerResult } from "./types/wrap";
import client from "./utils/client";

jest.setTimeout(600000);

describe("interest strategy resolver test", () => {
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

    gelatoArgsBuffer = encode(gelatoArgs);
  });

  it("withdraw fees directly", async () => {
    // latest hash QmbkPuZ9ikTQu4xg9YKYpgvFdvmanLVQ1tTuozexAw64uR
    const userArgs = {
      execAddress: "0x5d30dcd259651d44978f20cbd88aaed3b7eee9ca",
      zeroExApiBaseUrl: "https://api.0x.org",
      intervalInSeconds: "86400",
      strategy: "0x7386fdc44638c4443ceac3593c681d905ed8867c", // ftt interest strat
      rewardSwappingSlippageInBips: "",
      maxBentoBoxAmountIncreaseInBips: "10000",
      maxBentoBoxChangeAmountInBips: "10000",
      swapToToken: "",
    };

    userArgsBuffer = encode(userArgs);

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

  it("withdraw fees swapping to mim", async () => {
    // latest hash QmbkPuZ9ikTQu4xg9YKYpgvFdvmanLVQ1tTuozexAw64uR
    const userArgs = {
      execAddress: "0x5d30dcd259651d44978f20cbd88aaed3b7eee9ca",
      zeroExApiBaseUrl: "https://api.0x.org",
      intervalInSeconds: "86400",
      strategy: "0xcc0d7af1f809dd3a589756bba36be04d19e9c6c5", // weth interest strat
      rewardSwappingSlippageInBips: "100", // 1% max slippage
      maxBentoBoxAmountIncreaseInBips: "10000",
      maxBentoBoxChangeAmountInBips: "10000",
      swapToToken: "0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3",
    };

    userArgsBuffer = encode(userArgs);

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
