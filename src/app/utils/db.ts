import db from "../drivers/db";
import {
  Family,
  FamilyStripped,
  Member,
  MemberStripped,
  Payment,
} from "../models/db";

export async function getFamily({
  full_code,
  family_code,
  force_nostrip,
}: {
  full_code?: string;
  family_code?: string;
  force_nostrip?: boolean;
}): Promise<Family | FamilyStripped | "DB_ERROR" | null> {
  let family_code_: string | undefined;
  let passcode: string | undefined;

  // handle func params
  if (full_code) {
    // if a full_code was provided, split into family code and passcode
    family_code_ = full_code.split("_")[0];
    passcode = full_code.split("_")[1];
  } else {
    // if a family_code was provided, set passcode to some bullshit so the admin check later fails
    family_code_ = family_code;
    passcode = "....";
  }

  if (db) {
    const coll = db.collection("family");
    const family = await coll.findOne({ family_code: family_code_ });

    if (!family) {
      // family data is null
      return null;
    } else {
      // family data exists!

      // cast family db object to a Family object so the function signature is happy
      const family_: Family = {
        name: family.name,
        family_code: family.family_code,
        plan_start: family.plan_start,
        next_renewal: family.next_renewal,
        price: family.price,
        rounding: family.rounding,
        members: family.members,
        payments: family.payments,
        charges: family.charges,
      };

      // get requesting member using the provided passcode
      const member = family.members.find(
        (member: Member) => member.passcode === passcode
      );

      // check if the passcode provided is an admin
      if (full_code) {
        if (member.admin) {
          // if the member is an admin, return the full family data
          return family_;
        }
      }
      // if the above checks did not pass, we return a stripped down version of the family data
      const members_: Array<MemberStripped> = [];
      family.members.forEach((member: Member) => {
        members_.push({
          name: member.name,
          balance: member.balance,
          admin: member.admin,
        });
      });

      const family_stripped: FamilyStripped = {
        name: family_.name,
        family_code: family_.family_code,
        plan_start: family_.plan_start,
        next_renewal: family.next_renewal,
        price: family_.price,
        members: members_,
        payments: family_.payments,
      };

      if (force_nostrip) {
        // force_nostrip has been set, this is a backend-only thing. the data should NEVER get sent to the client if this option is used
        // return the full family data...
        return family_;
      } else {
        // return stripped family data
        return family_stripped;
      }
    }
  } else {
    // db is null
    console.error("getFamily(): database error");
    return "DB_ERROR";
  }
}
export async function getMe({
  full_code,
}: {
  full_code: string;
}): Promise<Member | "DB_ERROR" | null> {
  // get family
  const family = await getFamily({ full_code: full_code, force_nostrip: true });
  const passcode = full_code.split("_")[1];

  // handle getFamily return
  switch (family) {
    case "DB_ERROR":
      // db is null
      return "DB_ERROR";
    case null:
      // family data is null
      return null;

    default:
      // cast family to a full family object since we used force_nostrip and know its the full data
      const family_: Family = Object(family);

      // find the member
      const member = family_.members.find(
        (member: Member) => member.passcode === passcode
      );
      if (member) {
        // return the member
        return member;
      } else {
        return null;
      }
  }
}

export async function addPayment({
  family_code,
  payment,
}: {
  family_code: string;
  payment: Payment;
}): Promise<true | "DB_ERROR" | null> {
  if (db) {
    const coll = db.collection("family");
    const family = await coll.findOne({ family_code: family_code });

    if (!family) {
      // family data is null
      return null;
    } else {
      // family data exists!

      // create an object to store updated data
      const updated_family: Family = Object(family);

      // add payment to the payment list
      updated_family.payments = [...family.payments, payment];

      // update db by replacing db object with an updated one
      await coll.replaceOne({ family_code: family_code }, updated_family);

      return true;
    }
  } else {
    // db is null
    console.error("addPayment(): database error");
    return "DB_ERROR";
  }
}

export async function addMember({
  family_code,
  member,
}: {
  family_code: string;
  member: { name: string };
}): Promise<true | "DB_ERROR" | null> {
  if (db) {
    const coll = db.collection("family");
    const family = await coll.findOne({ family_code: family_code });

    if (!family) {
      // family data is null
      return null;
    } else {
      // family data exists!

      // create an object to store updated data
      const updated_family: Family = Object(family);

      // add member to the member list
      updated_family.members = [...family.members, member];

      // update db by replacing db object with an updated one
      await coll.replaceOne({ family_code: family_code }, updated_family);

      return true;
    }
  } else {
    // db is null
    console.error("addMember(): database error");
    return "DB_ERROR";
  }
}

export async function removeMember({
  family_code,
  memberName,
}: {
  family_code: string;
  memberName: string;
}): Promise<true | "DB_ERROR" | null> {
  if (db) {
    const coll = db.collection("family");
    const family = await coll.findOne({ family_code: family_code });

    if (!family) {
      // family data is null
      return null;
    } else {
      // family data exists!

      // create an object to store updated data
      const updated_family: Family = Object(family);

      // find the member to be removed
      const memberIndex = family.members.findIndex(
        (member: Member) => member.name === memberName
      );

      // remove member from the member list
      updated_family.members.splice(memberIndex, 1);

      // update db by replacing db object with an updated one
      await coll.replaceOne({ family_code: family_code }, updated_family);

      return true;
    }
  } else {
    // db is null
    console.error("remvoeMember(): database error");
    return "DB_ERROR";
  }
}

export async function isAdminCode({
  full_code,
}: {
  full_code: string;
}): Promise<true | false | "DB_ERROR" | null> {
  // check if the provided code is for a family admin

  // split full_codeinto family code and passcode
  const family_code = full_code.split("_")[0];
  const passcode = full_code.split("_")[1];

  if (db) {
    const coll = db.collection("family");
    const family = await coll.findOne({ family_code: family_code });

    if (!family) {
      // family data is null
      return null;
    } else {
      // family data exists!

      // find the member
      const memberIndex = family.members.findIndex(
        (member: Member) => member.passcode === passcode
      );

      // return their admin status
      return family.members[memberIndex].admin;
    }
  } else {
    // db is null
    console.error("addPayment(): database error");
    return "DB_ERROR";
  }
}
