import { encode } from "@msgpack/msgpack";
import "dotenv/config";
import { ethers } from "ethers";
import path from "path";
import { Template_CheckerResult } from "./types/wrap";
import client from "./utils/client";

jest.setTimeout(600000);

// Arbitrum Config
// latest hash QmUMm37WyfEfN4t37K1eHq2FzKt2igEHn4NgowtJCd6YeY
const userArgs = {
  execAddress: "0x588d402C868aDD9053f8F0098c2DC3443c991d17",
  lensAddress: "0x66499d9Faf67Dc1AC1B814E310e8ca97f1bc1f1a",
  rewardToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // wETH
  intervalInSeconds: "46200",
  mintGlpSlippageInBips: "100",
};

describe("magicGLP strategy resolver test", () => {
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
        `https://dashboard.tenderly.co/abracadabra/magic-internet-money/simulator/new?contractFunction=0x977b91d7&value=0&contractAddress=${userArgs.execAddress}&rawFunctionInput=${data.execData}&network=42161&from=0xfB3485c2e209A5cfBDC1447674256578f1A80eE3&block=&blockIndex=0&headerBlockNumber=&headerTimestamp=`
      );
      console.log(data.execData);
    }
  });
});
