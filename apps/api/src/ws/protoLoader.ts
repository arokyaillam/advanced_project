import protobuf from "protobufjs";

let protobufRoot: protobuf.Root | null = null;

export async function initProtobuf() {
  if (!protobufRoot) {
    protobufRoot = await protobuf.load(__dirname + "/MarketDataFeedV3.proto");
    console.log("✅ Protobuf initialized");
  }
  return protobufRoot;
}

export function getRoot() {
  if (!protobufRoot) throw new Error("Protobuf not initialized!");
  return protobufRoot;
}
