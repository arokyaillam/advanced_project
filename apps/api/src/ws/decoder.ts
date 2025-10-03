import { getRoot } from "./protoLoader";

export function decodeProtobuf(buffer: Buffer) {
  const root = getRoot();
  const FeedResponse = root.lookupType(
    "com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse",
  );
  return FeedResponse.decode(buffer);
}
