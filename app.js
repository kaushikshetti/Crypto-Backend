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
app.get("/", limiter, async (req, res) => {
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

    // Send the extracted market cap data as a JSON response
    res.json(limitedMarketCaps);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
