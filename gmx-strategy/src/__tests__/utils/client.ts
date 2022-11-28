import "dotenv/config";
import { PolywrapClient } from "@polywrap/client-js";
import { ethereumPlugin } from "@polywrap/ethereum-plugin-js";

const chain = "10";
const provider = "https://mainnet.optimism.io";

const polywrapClient = new PolywrapClient({
  plugins: [
    {
      uri: "ens/ethereum.polywrap.eth",
      plugin: ethereumPlugin({
        networks: {
          [chain]: { provider },
        },
        defaultNetwork: chain,
      }),
    },
  ],
});

export default polywrapClient;
