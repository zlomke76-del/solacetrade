# SolaceTrade

**Real offer in seconds. No games.**

SolaceTrade is not a trade form.

It is a **live intake and valuation engine** that replaces guesswork with real vehicle data — captured directly from the customer, in real time.

---

## 🚗 What This Is

Traditional dealership trade flows look like this:

Customer fills out form → dealership guesses → back and forth → friction


SolaceTrade replaces that with:

Customer scans vehicle → real data captured → instant valuation → dealer-ready deal


---

## ⚡ Core Experience

1. Customer lands on dealer website  
2. Launches TradeDesk  
3. Takes 5 guided photos:
   - Front
   - Side
   - Rear
   - Odometer
   - VIN  
4. Each photo uploads instantly (no form submission delay)  
5. System builds real vehicle profile  
6. Customer receives an **actual offer in seconds**

---

## 🧠 What Makes It Different

### 1. Evidence-Based Intake
No forms. No estimates.

- Photos replace manual input  
- VIN + odometer extracted directly  
- Condition inferred from real vehicle data  

---

### 2. Live Capture (Not Batch Upload)
Photos are uploaded **as they are taken**, not all at once.

Why this matters:
- Eliminates payload failures
- Faster user experience
- Higher completion rate
- Scales cleanly on serverless infrastructure

---

### 3. Dealer-Ready Output

Every submission produces:

- VIN
- Mileage
- Photo set
- Condition signals
- Valuation range
- Confidence + admissibility

Delivered as a **manager-ready review packet**

---

### 4. Real Valuation — Not a Guess

Offers are generated using:

- Actual vehicle identity (VIN)
- Mileage normalization (mi / km)
- Market context (dealer location)
- Condition signals from photos

---

## 🌎 Market-Aware by Design

SolaceTrade does not assume one market.

### Dealer controls pricing context:
- US dealer → USD + miles + US market
- Canadian dealer → CAD + kilometers + Canadian market

### Cross-border intelligence:
- KM detected at US dealer → treated as Canadian-market signal
- Automatic valuation adjustment applied (resale friction)
- No user input required

---

## 🔧 System Architecture

### Frontend
- Next.js (App Router)
- Mobile-first camera flow
- Step-based capture UI

### Backend
- Vercel serverless functions
- Supabase (Postgres + storage)

### Flow
Create intake → Upload photos (streamed) → Store evidence → Run valuation → Return offer


---

## 📦 Key API Routes

### Create Intake

POST /api/solacetrade/[dealerSlug]/intake


### Upload Photo (streaming)

POST /api/solacetrade/[dealerSlug]/intake/[intakeId]/photo


### Generate Value

POST /api/solacetrade/[dealerSlug]/value


---

## 🚨 Important Constraints

### Image Handling
- Photos are uploaded **one at a time**
- Prevents serverless payload limits
- Avoids `FUNCTION_PAYLOAD_TOO_LARGE` errors

### AI Input
- Only essential images used for valuation:
  - Front
  - Odometer
  - VIN

---

## 💰 Pricing Model


$595 USD / month
≈ CAD equivalent (exchange-based estimate)


- Billed in USD
- International cards supported
- Currency conversion handled by issuing bank

---

## 🧩 What This Replaces

SolaceTrade does **not** remove dealer control.

It enhances:

- Trade forms
- Lead quality
- Appraisal speed
- Desk efficiency

---

## 🎯 Outcome

For the customer:
> Real offer. Instantly. No games.

For the dealer:
> Complete, usable deal — before first contact.

---

## 🔥 Positioning

SolaceTrade is not:
- a lead form
- a pricing widget
- an estimate tool

It is:

> **A real intake system that produces real offers from real vehicle data.**
