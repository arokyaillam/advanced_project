import axios from "axios";

export async function getMarketFeedUrl(accessToken: string) {
  const url = "https://api.upstox.com/v3/feed/market-data-feed/authorize";
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
  const response = await axios.get(url, { headers });
  return response.data.data.authorizedRedirectUri as string;
}
