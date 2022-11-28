import { encode } from "@msgpack/msgpack";
import "dotenv/config";
import { ethers } from "ethers";
import path from "path";
import { Template_CheckerResult } from "./types/wrap";
import client from "./utils/client";

jest.setTimeout(600000);

describe("GLP strategy resolver test", () => {
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

    // latest hash ""
    const userArgs = {
      execAddress: "0x7E05363E225c1c8096b1cd233B59457104B84908",
      zeroExApiBaseUrl: "https://api.0x.org",
      intervalInSeconds: "86400",
      rewardSwappingSlippageInBips: "100",
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
