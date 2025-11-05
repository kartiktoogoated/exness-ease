# exness-ease

**exness-ease** is a modern backend and infrastructure project inspired by **Exness**, designed to simulate or replicate the core systems behind a trading platform.  
It focuses on providing a developer-friendly foundation for **multi-asset trading, order execution, account management, and live price streaming** — built in **TypeScript** with a scalable **Turborepo** architecture.

---

##  Overview

This project aims to make it easier to build trading systems similar to Exness by offering:
- **Account creation and balance management**
- **Trade placement and order tracking**
- **Live market data feed (streaming / WebSocket)**
- **Transaction and position history**
- **Future integrations with broker APIs and exchanges**

It is structured for high scalability and modularity — perfect for simulating a brokerage backend, building trading bots, or testing strategy automation.

---

##  Tech Stack

- **Language:** TypeScript  
- **Framework:** Express (backend API)  
- **Monorepo:** Turborepo + pnpm  
- **Database:** PostgreSQL (planned)  
- **Queue :** Kafka 
- **Containerization:** Docker  
- **API Style:** REST + WebSocket

---

##  Features

| Feature | Description |
|----------|-------------|
| Account Management | Create and manage trading accounts, deposits, and balances |
| Order Execution | Place, update, and cancel simulated orders |
| Market Feed | Subscribe to price updates using WebSocket |
| Positions & History | Track open positions and closed trades |
| Secure Environment | Environment variable setup for all keys and credentials |
| Modular Packages | Shared utilities and configs for easy scaling |

---

