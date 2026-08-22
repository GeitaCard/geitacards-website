import { MongoClient } from "mongodb";
import crypto from "crypto";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not configured");
}

let clientPromise;

if (!globalThis._mongoClientPromise) {
  const client = new MongoClient(uri);
  globalThis._mongoClientPromise = client.connect();
}

clientPromise = globalThis._mongoClientPromise;

export default async function handler(req, res) {
  // Ruhusu POST tu
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  try {
    const { name, phone, event } = req.body || {};

    // Hakikisha taarifa muhimu zipo
    if (!name || !phone || !event) {
      return res.status(400).json({
        success: false,
        message: "Jina, namba ya simu na tukio vinahitajika"
      });
    }

    const client = await clientPromise;

    const db = client.db("GeitaCard");
    const guests = db.collection("guests");

    /*
     * Tengeneza TOKEN ya kipekee kabisa.
     * Hii ndiyo itawekwa ndani ya QR Code.
     */
    let token;
    let existingGuest;

    do {
      token = crypto.randomBytes(16).toString("hex");

      existingGuest = await guests.findOne({
        token: token
      });
    } while (existingGuest);

    // Tengeneza mgeni mpya
    const guest = {
      name: String(name).trim(),
      phone: String(phone).trim(),
      event: String(event).trim(),

      token: token,

      attended: false,
      checkedInAt: null,

      createdAt: new Date()
    };

    // Hifadhi MongoDB
    const result = await guests.insertOne(guest);

    if (!result.acknowledged) {
      return res.status(500).json({
        success: false,
        message: "Mgeni hakuhifadhiwa kwenye database"
      });
    }

    // Rudisha taarifa kwa create-card.html
    return res.status(201).json({
      success: true,
      message: "Mgeni ameongezwa na QR imetengenezwa",

      guest: {
        id: result.insertedId,
        name: guest.name,
        phone: guest.phone,
        event: guest.event,
        token: guest.token,
        attended: guest.attended,
        checkedInAt: guest.checkedInAt
      }
    });

  } catch (error) {
    console.error("CREATE GUEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Unable to create guest"
    });
  }
}
