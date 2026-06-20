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
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [redShakeTarget, setRedShakeTarget] = useState<string | null>(null);

  const [familyName, setFamilyName] = useState<string>("");
  const [planStart, setPlanStart] = useState<number | null>(null);
  const [renewalCost, setRenewalCost] = useState<number>(27);
  const [rounding, setRounding] = useState<string>("up");
  const [initialCharge, setInitialCharge] = useState<boolean>(false);

  // refs
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
        if (planMembers.length === 6) toast.warn("Maximum members reached");
        if (planMembers.includes(newMember))
          toast.warn("Duplicate member name not allowed");
        if (newMember.trim() === "") toast.warn("Please enter a member name");
        memberInputRef.current.className = "redshake";
        sleep(250).then(() => {
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
    if (familyName && planStart && renewalCost) {
      // validate inputs
      if (!familyName || familyName === "") {
        toast.warn("Family name is invalid");
        setPageNumber(1);
        setRedShakeTarget("familyName");
        sleep(500).then(() => {
          setRedShakeTarget(null);
        });
        return;
      }
      if (!planStart) {
        toast.warn("Plan start date cannot be empty");
        setPageNumber(2);
        setRedShakeTarget("planStart");
        sleep(750).then(() => {
          setRedShakeTarget(null);
        });
        return;
      }
      if (!renewalCost) {
        toast.warn("Renewal is invalid");
        setPageNumber(2);
        setRedShakeTarget("renewalCost");
        sleep(750).then(() => {
          setRedShakeTarget(null);
        });
        return;
      }

      const resp = await fetch("/api/family", {
        method: "POST",
        body: JSON.stringify({
          name: familyName,
          plan_start: planStart,
          price: renewalCost,
          members: planMembers,
          rounding: rounding,
          initial_charge: initialCharge ? "true" : "false",
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

  function calculatePerMemberCost() {
    let cost = renewalCost / planMembers.length;
    cost = Math.round(cost * 10) / 10;
    switch (rounding) {
      case "up":
        // round up to the nearest dollar
        cost = Math.round(renewalCost / planMembers.length);
        break;
      case "down":
        // round down to the nearest dollar
        cost = Math.floor(renewalCost / planMembers.length);
        break;
      case "none":
        // rounding is disabled
        break;

      default:
        // rounding is disabled
        break;
    }
    return cost;
  }

  return (
    <div className={styles.main}>
      <span>
        <BackBtn />
        <h1>Create a new family</h1>
      </span>
      <div
        className="page"
        style={{ display: pageNumber === 1 ? "flex" : "none" }}
      >
        <p className="desc_text">
          Welcome to ytfam-manager!
          <br />
          Let&apos;s get started... first, you&apos;ll need to set a name for
          your new YouTube Premium family
        </p>
        <label>Family name</label>
        <input
          type="text"
          placeholder="YouTube slimes..."
          className={redShakeTarget === "familyName" ? "redshake" : ""}
          onChange={(e) => {
            setFamilyName(e.currentTarget.value);
          }}
        />

        <button
          onClick={() => {
            // validate inputs before moving on
            if (!familyName || familyName === "") {
              console.log(familyName);
              toast.warn("Family name cannot be empty");
              setRedShakeTarget("familyName");
              sleep(250).then(() => {
                setRedShakeTarget(null);
              });
              return;
            }
            setPageNumber((cur) => cur + 1);
          }}
        >
          Next &gt;
        </button>
      </div>
      <div
        className="page"
        style={{ display: pageNumber === 2 ? "flex" : "none" }}
      >
        <p className="desc_text">
          We&apos;ll need some plan information to automate balance changes.
        </p>
        <div>
          <label>Plan start date</label>
          <p className="desc_text">When did the plan start?</p>
          <input
            type="date"
            className={redShakeTarget === "planStart" ? "redshake" : ""}
            onChange={(e) => setPlanStart(e.currentTarget.valueAsNumber / 1000)}
          />
        </div>
        <div>
          <label>Renewal cost ($ / mo)</label>
          <p className="desc_text">What is the monthly cost of the plan?</p>
          <input
            type="number"
            placeholder="$27"
            className={redShakeTarget === "renewalCost" ? "redshake" : ""}
            defaultValue={27}
            onKeyDown={(e) => {
              // validate input
              // prevent invalid character from being added
              // but we still allow backspace so they can fix their mistake lol
              const allowedKeys = [
                "0",
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
                "8",
                "9",
                "Backspace",
              ];
              if (!allowedKeys.includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
                toast.warn("That's not a number. Ti glupi peder.");
                setRedShakeTarget("renewalCost");
                sleep(250).then(() => {
                  setRedShakeTarget(null);
                });
                return;
              }

              setRenewalCost(e.currentTarget.valueAsNumber);
            }}
          />
        </div>
        <span className="page_controls">
          <button onClick={() => setPageNumber((cur) => cur - 1)}>
            &lt; Back
          </button>
          <nav className="page_indicators">
            <ul>
              <li></li>
              <li className="cur_page"></li>
              <li></li>
              <li></li>
              <li></li>
            </ul>
          </nav>
          <button
            onClick={() => {
              // validate inputs before moving on
              if (!planStart) {
                toast.warn("Plan start date cannot be empty");
                setRedShakeTarget("planStart");
                sleep(250).then(() => {
                  setRedShakeTarget(null);
                });
                return;
              }
              if (!renewalCost || renewalCost < 1) {
                toast.warn("Invalid renewal cost");
                setRedShakeTarget("renewalCost");
                sleep(250).then(() => {
                  setRedShakeTarget(null);
                });
                return;
              }

              setPageNumber((cur) => cur + 1);
            }}
          >
            Next &gt;
          </button>
        </span>
      </div>
      <div
        className="page"
        style={{ display: pageNumber === 3 ? "flex" : "none" }}
      >
        <p className="desc_text">
          Now it&apos;s time to add some people to the family.
        </p>
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
        <span className="page_controls">
          <button onClick={() => setPageNumber((cur) => cur - 1)}>
            &lt; Back
          </button>
          <nav className="page_indicators">
            <ul>
              <li></li>
              <li></li>
              <li className="cur_page"></li>
              <li></li>
              <li></li>
            </ul>
          </nav>
          <button
            onClick={() => {
              // validate inputs before moving on
              // TODO

              setPageNumber((cur) => cur + 1);
            }}
          >
            Next &gt;
          </button>
        </span>
      </div>
      <div
        className="page"
        style={{ display: pageNumber === 4 ? "flex" : "none" }}
      >
        <label>Cost rounding</label>
        <p className="desc_text">What should everyone be charged?</p>
        <select onChange={(e) => setRounding(e.currentTarget.value)}>
          <option value={"up"}>
            Round up (${renewalCost / planMembers.length} ➡ $
            {Math.round(renewalCost / planMembers.length)})
          </option>
          <option value={"down"}>
            Round down (${renewalCost / planMembers.length} ➡ $
            {Math.floor(renewalCost / planMembers.length)})
          </option>
          <option value={"none"}>
            No rounding (${renewalCost} ➡ ${renewalCost / planMembers.length})
          </option>
        </select>
        <label>Initial charge</label>
        <select
          onChange={(e) => setInitialCharge(e.currentTarget.value === "true")}
        >
          <option value={"false"}>
            Don&apos;t add a charge for this month
          </option>
          <option value={"true"}>Add a charge for this month</option>
        </select>
        <span className="page_controls">
          <button onClick={() => setPageNumber((cur) => cur - 1)}>
            &lt; Back
          </button>
          <nav className="page_indicators">
            <ul>
              <li></li>
              <li></li>
              <li></li>
              <li className="cur_page"></li>
              <li></li>
            </ul>
          </nav>
          <button
            onClick={() => {
              // validate inputs before moving on
              // TODO

              setPageNumber((cur) => cur + 1);
            }}
          >
            Next &gt;
          </button>
        </span>
      </div>
      <div
        className="page"
        style={{ display: pageNumber === 5 ? "flex" : "none" }}
      >
        <h3>Summary</h3>
        <p className="desc_text">
          Final step! Double check everything here, then hit create when you're
          ready!
        </p>
        <div>
          <label>Family name</label>
          <p>{familyName}</p>
        </div>
        <div>
          <label>Renewal cost</label>
          <p>${renewalCost} per month</p>
          <p>${calculatePerMemberCost()} per member</p>
        </div>
        <div>
          <label>Members (6)</label>
          <ul>
            {planMembers.map((memberName) => {
              return <li key={memberName}>{memberName}</li>;
            })}
          </ul>
        </div>
        <span className="page_controls">
          <button onClick={() => setPageNumber((cur) => cur - 1)}>
            &lt; Back
          </button>
          <nav className="page_indicators">
            <ul>
              <li></li>
              <li></li>
              <li></li>
              <li></li>
              <li className="cur_page"></li>
            </ul>
          </nav>
          <button onClick={submitFamilyCreate}>Create!</button>
        </span>
      </div>
    </div>
  );
}
