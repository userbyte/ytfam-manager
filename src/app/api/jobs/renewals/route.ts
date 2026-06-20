// API Route:
// /api/jobs/renewal
// Supported methods: GET

import db from "@/app/drivers/db";
import { Charge, Family } from "@/app/models/db";
import { prettifyUnixTime, unixTimestampNow } from "@/app/utils/shared";
import { WithId, Document } from "mongodb";

// GET /api/jobs/renewal
export async function GET(req: Request) {
  // job to manage balances
  // triggered remotely once a day

  // the JOB_SECRET env var must be passed as a security measure, we dont want this job getting run all willy nilly!
  if (req.headers.get("psst") != process.env.JOB_SECRET) {
    return new Response(JSON.stringify({ status: "failed", error: "No." }), {
      status: 401,
    });
  }

  console.log('❰❰ running "renewals" job... ❱❱');
  console.log(`:: job start ${prettifyUnixTime(unixTimestampNow())} ::`);

  // do job
  if (db) {
    // get family collection
    const coll = db.collection("family");

    console.log(`${await coll.countDocuments()} families to process`);

    // iterate through families
    const cursor = coll.find();
    let family: WithId<Document> | null;
    while ((family = await cursor.next())) {
      console.log(
        `processing renewal for family "${family.name}" (${family.family_code})...`
      );

      // check to see if this family is due for renewal
      if (family.next_renewal > unixTimestampNow()) {
        console.log("family not due for renewal");
        continue;
      }

      const updated_family: Family = Object(family);
      let cost_per_member = family.price / family.members.length;
      // we round to the nearest tenth by default
      cost_per_member = Math.round(cost_per_member * 10) / 10;
      switch (updated_family.rounding) {
        case "up":
          // round up to the nearest dollar
          cost_per_member = Math.round(family.price / family.members.length);
          break;
        case "down":
          // round down to the nearest dollar
          cost_per_member = Math.floor(family.price / family.members.length);
          break;
        case "none":
          // rounding is disabled
          break;

        default:
          // rounding is disabled
          break;
      }

      while (updated_family.next_renewal < unixTimestampNow()) {
        // catch up to the modern day in the case of plan start date being a really long time ago
        // admin can retroactively add payments or edit balances to counter this

        // iterate through family members
        let index: number = 0;
        family.members.forEach(() => {
          // add to the members balance
          updated_family.members[index].balance += cost_per_member;
          index += 1;
        });

        // add a charge
        const newCharge: Charge = {
          id: updated_family.charges.length + 1,
          timestamp: unixTimestampNow(),
          amount: family.price,
          memberCount: family.members.length,
          memberCost: cost_per_member,
        };
        updated_family.charges = [...updated_family.charges, newCharge];

        // set next renewal
        const prevDate = new Date(updated_family.next_renewal * 1000);
        prevDate.setMonth(prevDate.getMonth() + 1);
        updated_family.next_renewal = prevDate.getTime() / 1000;
      }

      // update family in the database by replacing it with the updated family
      await coll.replaceOne(
        { family_code: family.family_code },
        updated_family
      );
      console.log(`renewal for family "${family.name}" has been processed`);
    }
  } else {
    console.error("renewals job failed to run: database is null");
    return new Response(
      JSON.stringify({ status: "failed", error: "Database error" }),
      {
        status: 500,
      }
    );
  }

  console.log(`:: job finish ${prettifyUnixTime(unixTimestampNow())} ::`);
  console.log('❰❰ "renewals" job complete! ❱❱');
  return new Response(JSON.stringify({ status: "success" }), {
    status: 200,
  });
}
