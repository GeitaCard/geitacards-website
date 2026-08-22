import { MongoClient } from "mongodb";

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
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Method not allowed"
      });
    }

    const { token } = req.body || {};

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "QR token inahitajika"
      });
    }

    const client = await clientPromise;
    const db = client.db("GeitaCard");
    const guests = db.collection("guests");

    const guest = await guests.findOne({ token });

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: "QR Code haijatambuliwa"
      });
    }

    if (guest.attended === true) {
      return res.status(409).json({
        success: false,
        message: "Mgeni huyu tayari amehudhuria",
        guest: {
          name: guest.name,
          token: guest.token,
          checkedInAt: guest.checkedInAt
        }
      });
    }

    const checkedInAt = new Date();

    await guests.updateOne(
      { _id: guest._id },
      {
        $set: {
          attended: true,
          checkedInAt
        }
      }
    );

    return res.status(200).json({
      success: true,
      message: "Mahudhurio yamerekodiwa",
      guest: {
        name: guest.name,
        phone: guest.phone,
        event: guest.event,
        token: guest.token,
        attended: true,
        checkedInAt
      }
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: "Unable to process attendance"
    });
  }
}
