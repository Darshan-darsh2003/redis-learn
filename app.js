const express = require("express");
const axios = require("axios");
const redis = require("redis");

// Create a Redis client
const redisClient = redis.createClient();

// Log Redis errors to the console
redisClient.on("error", (err) => {
  console.error("Redis client error", err);
});

// Connect to the Redis server
redisClient.connect().catch(console.error);

const app = express();
const PORT = process.env.PORT || 3000;

// Default expiration time in seconds
const DEFAULT_EXPIRATION = 3600;

// Base URL for JSONPlaceholder API
const API_URL = "https://jsonplaceholder.typicode.com";

// Route to get all photos
app.get("/photos", async (req, res) => {
  try {
    const albumId = req.query.albumId; // Handle optional albumId query

    // set the key to the albumId if it exists, otherwise set it to "photos"
    const photosKey = `photos?albumId=${albumId}`;

    // Use the refactored getOrSetCache function
    const photos = await getOrSetCache(photosKey, async () => {
      const { data } = await axios.get(`${API_URL}/photos`, {
        params: { albumId },
      });
      return data;
    });

    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch photos: ${error.message}` });
  }
});

// Route to get a specific photo by ID
app.get("/photos/:id", async (req, res) => {
  const photoId = req.params.id;
  try {
    const photoKey = `photo_${photoId}`;

    // Use the refactored getOrSetCache function
    const photo = await getOrSetCache(photoKey, async () => {
      const { data } = await axios.get(`${API_URL}/photos/${photoId}`);
      return data;
    });

    res.json(photo);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch photo: ${error.message}` });
  }
});

// Generic function to get or set cache
async function getOrSetCache(key, cb) {
  try {
    const cachedData = await redisClient.get(key);

    // If cache exists, return the cached data
    if (cachedData) {
      console.log("Cache hit for", key);
      return JSON.parse(cachedData);
    }

    // If cache doesn't exist, fetch fresh data
    const freshData = await cb();
    await redisClient.setEx(key, DEFAULT_EXPIRATION, JSON.stringify(freshData));

    console.log("Cache set for", key);
    return freshData;
  } catch (error) {
    console.error("Error interacting with Redis:", error);
    throw error;
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
