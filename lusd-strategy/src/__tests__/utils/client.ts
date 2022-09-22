import "dotenv/config";
import { PolywrapClient } from "@polywrap/client-js";
import { ethereumPlugin } from "@polywrap/ethereum-plugin-js";

const chain = "1";
const provider = "https://rpc.ankr.com/eth";

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
