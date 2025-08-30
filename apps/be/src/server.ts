import express from "express";
import { router } from "./routes";
import "./ws/websocketServer"; // Start WebSocket server

const app = express();
const API_PORT = process.env.API_PORT || 3000;

app.use(express.json());

app.use("/api", router);

app.listen(API_PORT, () => {
  console.log(`Server running on http://localhost:${API_PORT}`);
});
