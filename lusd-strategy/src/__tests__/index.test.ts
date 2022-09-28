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
    const userArgs = {
      execAddress: "0x762d06bB0E45f5ACaEEA716336142a39376E596E",
      zeroExApiBaseUrl: "https://api.0x.org",
      intervalInSeconds: "86400",
      strategy: "0x1EdC13C5FC1C6e0731AE4fC1Bc4Cd6570bBc755C", // LUSD Strat
      rewardSwappingSlippageInBips: "200",
      maxBentoBoxAmountIncreaseInBips: "1",
      maxBentoBoxChangeAmountInBips: "1000",
      rewardTokensCommaSeparated: "ETH,0x6DEA81C8171D0bA574754EF6F8b412F2Ed88c54D"
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
