import { encode } from "@msgpack/msgpack";
import "dotenv/config";
import { ethers } from "ethers";
import path from "path";
import { Template_CheckerResult } from "./types/wrap";
import client from "./utils/client";

jest.setTimeout(600000);

const execAddress = "0xf9cE23237B25E81963b500781FA15d6D38A0DE62";

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
      execAddress,
      zeroExApiBaseUrl: "https://arbitrum.api.0x.org",
      //intervalInSeconds: "86400",
      intervalInSeconds: "0",
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

    if (data.canExec) {
      console.log(
        `https://dashboard.tenderly.co/abracadabra/magic-internet-money/simulator/new?contractFunction=0x977b91d7&value=0&contractAddress=${execAddress}&rawFunctionInput=${data.execData}&network=42161&from=0xfB3485c2e209A5cfBDC1447674256578f1A80eE3&block=&blockIndex=0&headerBlockNumber=&headerTimestamp=`
      );
      console.log(data.execData);
    }
  });
});
