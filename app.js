const express = require("express");
const axios = require("axios");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
});

app.use(cors());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", "http://localhost:5173/"],
    },
  })
);
// Define a route to fetch the cryptocurrency categories and extract the market cap
async function fetchCryptoData() {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/coins/categories"
    );
    const categories = response.data;

    // Extract the "market_cap" values from the categories
    const marketCaps = categories.map((category) => ({
      id: category.id,
      name: category.name,
      market_cap:
        category.market_cap !== null
          ? parseFloat(category.market_cap.toFixed(2))
          : null, // Format to 2 decimal places if not null
    }));

    const limitedMarketCaps = marketCaps.slice(0, 5);

    return {
      categories: limitedMarketCaps,
      maxMarketCap: Math.max(
        ...limitedMarketCaps.map((category) => category.market_cap)
      ),
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// Create an SSE endpoint
app.get("/sse", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendSSEData = async () => {
    try {
      const data = await fetchCryptoData();
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error(error);
    }
  };

  // Send initial data immediately
  await sendSSEData();

  // Send updates every 5 seconds (adjust the interval as needed)
  const interval = setInterval(sendSSEData, 5000);

  // Close the SSE connection if the client disconnects
  req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
