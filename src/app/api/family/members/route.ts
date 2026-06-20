// API Route
// /api/family/members

import db from "@/app/drivers/db";
import { BalanceAdjustment, Family, Member } from "@/app/models/db";
import {
  addMember,
  removeMember,
  getFamily,
  isAdminCode,
  addAdjustment,
  getMe,
} from "@/app/utils/db";
import { generateRandomString, unixTimestampNow } from "@/app/utils/shared";

// POST /api/family/members
export async function POST(request: Request) {
  const body_json = await request.json();

  let full_code: string;
  let family_code: string;
  // let passcode: string;
  if (!body_json.full_code) {
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
    family_code = full_code.split("_")[0];
    // passcode = full_code.split("_")[1];
  }

  // check body params
  if (!body_json.member.name) {
    console.log(body_json);
    return new Response(
      JSON.stringify({
        status: "failed",
        error: "Client sent an invalid request body",
      }),
      {
        status: 400,
      }
    );
  }

  // get family
  const family = await getFamily({ full_code: full_code, force_nostrip: true });

  // handle getFamily return
  switch (family) {
    case "DB_ERROR":
      // db is null
      return new Response(
        JSON.stringify({ status: "failed", error: "Database error" }),
        {
          status: 500,
        }
      );
    case null:
      // family data is null
      return new Response(
        JSON.stringify({ status: "failed", error: "Invalid family code" }),
        {
          status: 404,
        }
      );

    default:
      // cast family to a full family object since we used force_nostrip and know its the full data
      const family_: Family = Object(family);

      if (db) {
        // only an admin can add new family members
        if (!(await isAdminCode({ full_code: full_code }))) {
          return new Response(
            JSON.stringify({
              status: "failed",
              error:
                "Only family administrators are permitted to add new family members",
            }),
            {
              status: 403,
            }
          );
        }

        // create a new Member object
        const newMember: Member = {
          name: body_json.member.name,
          balance: 0,
          passcode: generateRandomString({ length: 4 }),
          admin: false,
        };
        // check if someone else already has this name
        // find member
        const m = family_.members.find(
          (member_: Member) => member_.name === body_json.member.name
        );
        if (m) {
          // a member was found with this name
          return new Response(
            JSON.stringify({
              status: "failed",
              error: "Another member already has this name",
            }),
            {
              status: 400,
            }
          );
        }

        // add member to the database
        switch (
          await addMember({ family_code: family_code, member: newMember })
        ) {
          // handle function return
          case true:
            return new Response(
              JSON.stringify({
                status: "success",
                member: newMember,
              }),
              {
                status: 200,
              }
            );
          case "DB_ERROR":
            return new Response(
              JSON.stringify({
                status: "failed",
                error: "Database error",
              }),
              {
                status: 500,
              }
            );

          case null:
            return new Response(
              JSON.stringify({
                status: "failed",
                error: "Family not found",
              }),
              {
                status: 400,
              }
            );

          default:
            return new Response(
              JSON.stringify({
                status: "failed",
                error: "Unknown error",
              }),
              {
                status: 500,
              }
            );
        }
      }
  }
}

// PATCH /api/family/members
// edits an existing member
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
  let targetMember: string;
  let memberUpd: {
    name?: string;
    balance?: number;
    passcode?: string;
    admin?: boolean;
  };
  if (!body_json.full_code || !body_json.target || !body_json.ediff) {
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
    // family_code = full_code.split("_")[0];
    targetMember = body_json.target;
    memberUpd = body_json.ediff;
  }

  if ((await isAdminCode({ full_code: full_code })) != true) {
    return new Response(
      JSON.stringify({
        status: "failed",
        error: "Only admins can modify members",
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

      // find the member
      const memberIndex = updated_family.members.findIndex(
        (member_: Member) => member_.name === targetMember
      );
      if (memberIndex === -1) {
        // member could not be found
        return new Response(
          JSON.stringify({
            status: "failed",
            error: `Could not find member by the name of '${targetMember}'`,
          }),
          {
            status: 400,
          }
        );
      }
      let balanceAdj: BalanceAdjustment | undefined = undefined;
      // apply modifications to the member
      for (const [key, value] of Object.entries(memberUpd)) {
        if (key === "name") {
          // check if someone else already has this name

          // find member
          const m = updated_family.members.find(
            (member_: Member) => member_.name === value
          );
          if (m) {
            // a member was found with this name
            return new Response(
              JSON.stringify({
                status: "failed",
                error: "Another member already has this name",
              }),
              {
                status: 400,
              }
            );
          }
        }
        // only update if theres a diff between values
        if (updated_family.members[memberIndex][key] != value) {
          const prevValue = updated_family.members[memberIndex][key];
          console.log(
            `updating member [name="${targetMember}" (${key}: ${prevValue} --> ${value})]...`
          );
          updated_family.members[memberIndex][key] = value;

          // add balance adjustment if applicable
          if (key === "balance") {
            if (updated_family.adjustments) {
              const adjuster = await getMe({ full_code: full_code });

              balanceAdj = {
                id: updated_family.adjustments.length + 1,
                timestamp: unixTimestampNow(),
                adjuster:
                  adjuster != null && adjuster != "DB_ERROR"
                    ? adjuster.name
                    : "(unknown)",
                adjusted: targetMember,
                balanceFrom: Number(prevValue),
                balanceTo: Number(value),
              };

              updated_family.adjustments = [
                ...updated_family.adjustments,
                balanceAdj,
              ];
            }
          }
        }
      }

      // update family in the database by replacing it with the updated family
      await db
        .collection("family")
        .replaceOne({ family_code: family.family_code }, updated_family);
      return new Response(
        JSON.stringify({
          status: "success",
          member: updated_family.members[memberIndex],
          balanceAdjustment: balanceAdj,
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

// DELETE /api/family/members
export async function DELETE(request: Request) {
  const body_json = await request.json();

  let full_code: string;
  let family_code: string;
  // let passcode: string;
  if (!body_json.full_code) {
    console.log(body_json);
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
    family_code = full_code.split("_")[0];
    // passcode = full_code.split("_")[1];
  }

  // check body params
  if (!body_json.target) {
    return new Response(
      JSON.stringify({
        status: "failed",
        error: "Client sent an invalid request body",
      }),
      {
        status: 400,
      }
    );
  }

  // get family
  const family = await getFamily({ full_code: full_code, force_nostrip: true });

  // handle getFamily return
  switch (family) {
    case "DB_ERROR":
      // db is null
      return new Response(
        JSON.stringify({ status: "failed", error: "Database error" }),
        {
          status: 500,
        }
      );

    case null:
      // family data is null
      return new Response(
        JSON.stringify({ status: "failed", error: "Invalid family code" }),
        {
          status: 404,
        }
      );

    default:
      // cast family to a full family object since we used force_nostrip and know its the full data
      if (db) {
        // only an admin can add new family members
        if (!(await isAdminCode({ full_code: full_code }))) {
          return new Response(
            JSON.stringify({
              status: "failed",
              error:
                "Only family administrators are permitted to remove family members",
            }),
            {
              status: 403,
            }
          );
        }

        // remove member from the database
        switch (
          await removeMember({
            family_code: family_code,
            memberName: body_json.target,
          })
        ) {
          // handle function return
          case true:
            return new Response(
              JSON.stringify({
                status: "success",
              }),
              {
                status: 200,
              }
            );
          case "DB_ERROR":
            return new Response(
              JSON.stringify({
                status: "failed",
                error: "Database error",
              }),
              {
                status: 500,
              }
            );
          case null:
            return new Response(
              JSON.stringify({
                status: "failed",
                error: "Family not found",
              }),
              {
                status: 400,
              }
            );
          default:
            return new Response(
              JSON.stringify({
                status: "failed",
                error: "Unknown error",
              }),
              {
                status: 500,
              }
            );
        }
      }
  }
}
