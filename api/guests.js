import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not configured");
}

let client;
let clientPromise;

if (!globalThis._mongoClientPromise) {
  client = new MongoClient(uri);
  globalThis._mongoClientPromise = client.connect();
}

clientPromise = globalThis._mongoClientPromise;

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("GeitaCard");
    const guests = db.collection("guests");

    if (req.method === "POST") {
      const { name, phone, event } = req.body || {};

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Jina la mgeni linahitajika"
        });
      }

      const token =
        "GC-" +
        Date.now().toString(36).toUpperCase() +
        "-" +
        Math.random().toString(36).substring(2, 8).toUpperCase();

      const guest = {
        name,
        phone: phone || "",
        event: event || "Geita Cards",
        token,
        attended: false,
        createdAt: new Date(),
        checkedInAt: null
      };

      const result = await guests.insertOne(guest);

      return res.status(201).json({
        success: true,
        message: "Mgeni ameongezwa",
        guest: {
          id: result.insertedId,
          name: guest.name,
          phone: guest.phone,
          event: guest.event,
          token: guest.token,
          attended: guest.attended
        }
      });
    }

    if (req.method === "GET") {
      const list = await guests
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        count: list.length,
        guests: list
      });
    }

    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: "Unable to access database"
    });
  }
}
