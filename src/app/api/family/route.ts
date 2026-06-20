// API Route:
// /api/family
// Supported methods: POST, PATCH, DELETE

import db from "@/app/drivers/db";
import { Charge, Family, Member } from "@/app/models/db";
import { getFamily, isAdminCode } from "@/app/utils/db";
import { generateRandomString, unixTimestampNow } from "@/app/utils/shared";

// POST /api/family
// creates a new family
export async function POST(request: Request) {
  try {
    const body_json = await request.json();
    // validate the request body
    if (
      !body_json.name ||
      !body_json.plan_start ||
      !body_json.price ||
      !body_json.members ||
      !body_json.rounding ||
      !body_json.initial_charge
    ) {
      throw new Error("Invalid request");
    }

    // initial family values
    const family_initial: {
      name: string;
      plan_start: number;
      price: number;
      members: Array<string>;
    } = {
      name: body_json.name,
      plan_start: body_json.plan_start,
      price: body_json.price,
      members: body_json.members,
    };

    console.log(`creating family: ${body_json.name}`);

    // full family object to be put in the database
    const name: string = family_initial.name;
    const family_code: string = generateRandomString({ length: 6 });
    const plan_start: number = Number(family_initial.plan_start);
    const price: number = Number(family_initial.price);
    const members: Array<Member> = [];
    family_initial.members.forEach((member) => {
      // first member will always be the family administrator
      let admin: boolean;
      if (members.length === 0) admin = true;
      else admin = false;

      members.push({
        name: member,
        balance: 0,
        passcode: generateRandomString({ length: 4 }),
        admin: admin,
      });
    });
    // get next renewal date
    const prevDate = new Date(plan_start * 1000);
    prevDate.setMonth(prevDate.getMonth() + 1);
    const next_renewal = prevDate.getTime() / 1000;

    // map the new values to a Family object
    const family_generated: Family = {
      name: name,
      family_code: family_code,
      plan_start: plan_start,
      next_renewal: next_renewal,
      price: price,
      members: members,
      rounding: body_json.rounding,
      payments: [],
      charges: [],
      adjustments: [],
    };

    if (body_json.initial_charge === "true") {
      // add an initial charge, used when you're starting a new plan and nobody has paid yet

      const updated_family: Family = Object(family_generated);
      let cost_per_member =
        family_generated.price / family_generated.members.length;
      // we round to the nearest tenth by default
      cost_per_member = Math.round(cost_per_member * 10) / 10;
      switch (updated_family.rounding) {
        case "up":
          // round up to the nearest dollar
          cost_per_member = Math.round(
            family_generated.price / family_generated.members.length
          );
          break;
        case "down":
          // round down to the nearest dollar
          cost_per_member = Math.floor(
            family_generated.price / family_generated.members.length
          );
          break;
        case "none":
          // rounding is disabled
          break;

        default:
          // rounding is disabled
          break;
      }

      // iterate through family members
      let index: number = 0;
      family_generated.members.forEach(() => {
        // add to the members balance
        family_generated.members[index].balance += cost_per_member;
        index += 1;
      });

      // add a charge
      const newCharge: Charge = {
        id: family_generated.charges.length + 1,
        timestamp: unixTimestampNow(),
        amount: family_generated.price,
        memberCount: family_generated.members.length,
        memberCost: cost_per_member,
      };
      family_generated.charges = [...family_generated.charges, newCharge];

      console.log(
        `an initial charge for family "${family_generated.name}" (${family_generated.family_code}) has been added`
      );
    }

    // insert new family into the database
    if (db) {
      await db.collection("family").insertOne(family_generated);
    } else {
      return new Response(
        JSON.stringify({ status: "failed", error: "Database error" }),
        {
          status: 500,
        }
      );
    }
    console.log(
      `new family created: "${family_generated.name}" (${family_generated.family_code}) with ${family_generated.members.length} members`
    );

    // return new family
    return new Response(
      JSON.stringify({ status: "success", family: family_generated }),
      {
        status: 200,
      }
    );
  } catch (err) {
    console.log(err);
    return new Response(
      JSON.stringify({ status: "failed", error: String(err) }),
      {
        status: 400,
      }
    );
  }
}

// PATCH /api/family
// edits a family
export async function PATCH(request: Request) {
  // process request body
  let body_json: { full_code: string; target: string; ediff: object } | null =
    null;
  try {
    body_json = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        status: "failed",
        error: "Missing request body",
      }),
      {
        status: 400,
      }
    );
  } finally {
    if (body_json === null) {
      return new Response(
        JSON.stringify({
          status: "failed",
          error: "Missing request body",
        }),
        {
          status: 400,
        }
      );
    }
  }

  let full_code: string;
  // let family_code: string;
  let familyUpd: {
    name?: string;
    price?: number;
    rounding?: string;
  };
  if (!body_json.full_code || !body_json.ediff) {
    return new Response(
      JSON.stringify({
        status: "failed",
        error: "Client sent a request without a family code",
      }),
      {
        status: 400,
      }
    );
  } else {
    // get full code from req body json
    full_code = body_json.full_code;
    // get updated values from req body json
    familyUpd = body_json.ediff;
  }

  if ((await isAdminCode({ full_code: full_code })) != true) {
    return new Response(
      JSON.stringify({
        status: "failed",
        error: "Only admins can modify the family",
      }),
      {
        status: 403,
      }
    );
  }

  if (db) {
    // get family
    const family = await getFamily({ full_code: full_code });
    if (family && family != "DB_ERROR") {
      const updated_family: Family = Object(family);

      // apply modifications to the family
      for (const [key, newValue] of Object.entries(familyUpd)) {
        // get previous value
        const currentValue = updated_family[key];

        // is this a valid and pre-existing key?
        if (currentValue != undefined) {
          // only update if theres a diff between values
          if (updated_family[key] != newValue) {
            console.log(
              `updating family [${key}: ${currentValue} --> ${newValue}]...`
            );
            updated_family[key] = newValue;
          }
        } else {
          console.log(
            `update ignored: invalid key [${key}: ${currentValue} --> ${newValue}]...`
          );
        }
      }

      // update family in the database by replacing it with the updated family
      await db
        .collection("family")
        .replaceOne({ family_code: family.family_code }, updated_family);
      return new Response(
        JSON.stringify({
          status: "success",
          family: updated_family,
        }),
        {
          status: 200,
        }
      );
    }
  }

  return new Response(
    JSON.stringify({ status: "failed", error: "Unknown error" }),
    {
      status: 500,
    }
  );
}

// DELETE /api/family
// deletes a family
export async function DELETE(request: Request) {
  console.log(request);
  // TODO: implement family deletion
  return new Response(JSON.stringify({ error: "NOT_IMPLEMENTED" }), {
    status: 501,
  });
}
