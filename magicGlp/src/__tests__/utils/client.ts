import "dotenv/config";
import { PolywrapClient } from "@polywrap/client-js";
import { ethereumPlugin } from "@polywrap/ethereum-plugin-js";

const chain = "42161";
const provider = "https://1rpc.io/arb";

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
