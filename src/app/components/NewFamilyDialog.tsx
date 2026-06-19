"use client";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { KeyboardEvent, MouseEvent, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faUserPlus,
  faUserShield,
  faX,
} from "@fortawesome/free-solid-svg-icons";
import BackBtn from "./BackBtn";
import { sleep } from "../utils/shared";
import styles from "@/app/style/module/NewFamilyDialog.module.css";

function MemberList({
  planMembers,
  setPlanMembers,
}: {
  planMembers: Array<string>;
  setPlanMembers: React.Dispatch<React.SetStateAction<Array<string>>>;
}) {
  const [memberEls, setMemberEls] = useState<React.JSX.Element[]>([]);

  useEffect(() => {
    function removeMember(e: MouseEvent<HTMLButtonElement>) {
      const removeTarget = e.currentTarget.getAttribute("data-target");
      console.log("remove member");
      setPlanMembers((prevMembers) =>
        prevMembers.filter((member) => member !== removeTarget)
      );
    }
    // effect to update memberEls
    console.log("updating member els...");
    const memberEls_tmp: React.JSX.Element[] = [];
    planMembers.forEach((member) => {
      // first user will always be the family admin, so we'll set an icon to signify this
      let icon;
      if (memberEls_tmp.length === 0) icon = faUserShield;
      else icon = faUser;

      memberEls_tmp.push(
        <span key={member}>
          <p>
            <FontAwesomeIcon icon={icon} /> {member}
          </p>
          <button onClick={removeMember} data-target={member}>
            <FontAwesomeIcon icon={faX} />
          </button>
        </span>
      );
    });
    // fill in additional slots with "empty slot"
    while (memberEls_tmp.length < 6) {
      memberEls_tmp.push(
        <span key={`empty-${memberEls_tmp.length}`}>
          <p>(empty slot)</p>
        </span>
      );
    }
    setMemberEls(memberEls_tmp);
  }, [planMembers, setPlanMembers]);

  return <div className={styles.member_list}>{memberEls}</div>;
}

export default function NewFamilyDialog() {
  const router = useRouter();

  // states
  const [planMembers, setPlanMembers] = useState<Array<string>>(["admin"]);
  // refs
  const familyNameInputRef = useRef<HTMLInputElement | null>(null);
  const planStartInputRef = useRef<HTMLInputElement | null>(null);
  const renewalCostInputRef = useRef<HTMLInputElement | null>(null);
  const memberInputRef = useRef<HTMLInputElement | null>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") addMember();
  }

  function addMember() {
    if (memberInputRef.current) {
      const newMember = memberInputRef.current.value;
      // input checks
      if (
        planMembers.length === 6 ||
        planMembers.includes(newMember) ||
        newMember.trim() === ""
      ) {
        // shake member input to signify invalid input
        if (memberInputRef.current.className === "redshake") {
          // user is spamming enter, return early to prevent animation cutoff
          return;
        }
        if (newMember.trim() === "") toast.warn("Maximum members reached");
        if (planMembers.includes(newMember))
          toast.warn("Duplicate member name not allowed");
        if (newMember.trim() === "") toast.warn("Please enter a member name");
        memberInputRef.current.className = "redshake";
        sleep(500).then(() => {
          if (memberInputRef.current) memberInputRef.current.className = "";
        });
        return;
      }

      // all checks passed, add the new member
      setPlanMembers((prevMembers) => [...prevMembers, newMember.trim()]);
      memberInputRef.current.value = "";
    }
  }

  async function submitFamilyCreate() {
    if (
      familyNameInputRef.current &&
      planStartInputRef.current &&
      renewalCostInputRef.current
    ) {
      const familyName = familyNameInputRef.current.value;
      const planStart = planStartInputRef.current.valueAsNumber / 1000;
      const price = renewalCostInputRef.current.valueAsNumber;

      // validate inputs
      if (!familyName || familyName === "") {
        toast.warn("Family name cannot be empty");
        familyNameInputRef.current.className = "redshake";
        sleep(500).then(() => {
          if (familyNameInputRef.current)
            familyNameInputRef.current.className = "";
        });
        return;
      }
      if (!planStart) {
        toast.warn("Plan start date cannot be empty");
        planStartInputRef.current.className = "redshake";
        sleep(500).then(() => {
          if (planStartInputRef.current)
            planStartInputRef.current.className = "";
        });
        return;
      }
      if (!price) {
        toast.warn("Price cannot be empty");
        renewalCostInputRef.current.className = "redshake";
        sleep(500).then(() => {
          if (renewalCostInputRef.current)
            renewalCostInputRef.current.className = "";
        });
        return;
      }

      const resp = await fetch("/api/family", {
        method: "POST",
        body: JSON.stringify({
          name: familyName,
          plan_start: planStart,
          price: price,
          members: planMembers,
        }),
      });
      const resp_json = await resp.json();
      if (resp_json.status === "success") {
        // navigate to the family overview page using the family code and admin passcode
        const fullcode = `${resp_json.family.family_code}_${resp_json.family.members[0].passcode}`;
        router.replace(`/family?code=${fullcode}`);
      } else {
        console.error(`Error creating family: ${resp_json.error}`);
        toast.error("Error creating family");
      }
    } else {
      console.error(
        "One or all input refs are null, cannot submit family create req"
      );
    }
  }

  return (
    <div className={styles.main}>
      <span>
        <BackBtn />
        <h1>Create a new family</h1>
      </span>
      <label>Family name</label>
      <input
        ref={familyNameInputRef}
        type="text"
        placeholder="YouTube slimes..."
      />
      <span>
        <div className="startdatediv">
          <label>Plan start date</label>
          <input ref={planStartInputRef} type="date" />
        </div>
        <div className="costdiv">
          <label>Renewal cost ($ / mo)</label>
          <input
            ref={renewalCostInputRef}
            type="number"
            placeholder="$27"
            defaultValue={27}
          />
        </div>
      </span>
      <label>Add some members... ({planMembers.length}/6)</label>
      <span>
        <input
          type="text"
          placeholder="Member name..."
          ref={memberInputRef}
          onKeyDown={handleKeyDown}
        />
        <button onClick={addMember}>
          <FontAwesomeIcon icon={faUserPlus} />
        </button>
      </span>
      <p className="admin_notice">
        * first member will be the family administrator
      </p>
      <MemberList planMembers={planMembers} setPlanMembers={setPlanMembers} />
      <button onClick={submitFamilyCreate}>Create</button>
    </div>
  );
}
