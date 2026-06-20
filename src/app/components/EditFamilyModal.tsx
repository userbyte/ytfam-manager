"use client";
import { useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave } from "@fortawesome/free-solid-svg-icons";
import { Family } from "../models/db";
import styles from "@/app/style/module/EditFamilyModal.module.css";

export default function EditFamilyModal({
  setFamily,
  isAdmin,
  family,
  setDisplayEditFamilyModal,
}: {
  setFamily: React.Dispatch<React.SetStateAction<Family>>;
  isAdmin: boolean;
  family: Family | null;
  setDisplayEditFamilyModal: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const searchParams = useSearchParams();
  const full_code = searchParams.get("code");

  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const priceInputRef = useRef<HTMLInputElement | null>(null);
  const roundingSelectRef = useRef<HTMLSelectElement | null>(null);

  // return empty if not admin, or if targetFamily is unset
  if (!isAdmin || !family) {
    return <></>;
  }

  async function submitFamilyEdit() {
    if (!family) {
      console.log("submitFamilyEdit(): targetFamily is null");
      return;
    }
    // check input refs
    if (
      !nameInputRef.current ||
      !priceInputRef.current ||
      !roundingSelectRef.current
    ) {
      console.error("submitFamilyEdit(): one or more input refs are null");
      return;
    }

    // update to apply
    const familyUpd: {
      name?: string;
      price?: number;
      rounding?: string;
    } = {};
    // validate inputs
    // add all non-empty inputs to the ediff object
    if (nameInputRef.current.value != "") {
      familyUpd.name = nameInputRef.current.value;
    }
    if (priceInputRef.current.value != "") {
      familyUpd.price = priceInputRef.current.valueAsNumber;
    }
    if (
      roundingSelectRef.current.value != "" &&
      roundingSelectRef.current.value != family.rounding
    ) {
      familyUpd.rounding = roundingSelectRef.current.value;
    }

    // check if ediff is empty
    if (Object.entries(familyUpd).length === 0) {
      console.log("submitFamilyEdit(): no edits to apply");
      toast.info("No changes made");
      // close modal
      setDisplayEditFamilyModal((cur) => !cur);
      return;
    }

    // add to db
    const resp = await fetch("/api/family", {
      method: "PATCH",
      body: JSON.stringify({
        full_code: full_code,
        ediff: familyUpd,
      }),
    });
    const resp_json = await resp.json();
    if (resp_json.status === "success") {
      toast.success("Family edited");

      // update local family data to reflect changes
      setFamily((prevFamily) => {
        const editedFamily = Object(prevFamily);

        // apply modifications to the family
        for (const [key, newValue] of Object.entries(familyUpd)) {
          // get previous value
          const currentValue = editedFamily[key];

          // is this a valid and pre-existing key?
          if (currentValue != undefined) {
            // only update if theres a diff between values
            if (editedFamily[key] != newValue) {
              console.log(
                `submitFamilyEdit(): updating family [${key}: ${currentValue} --> ${newValue}]...`
              );
              editedFamily[key] = newValue;
            }
          } else {
            console.log(
              `submitFamilyEdit(): update ignored: invalid key [${key}: ${currentValue} --> ${newValue}]...`
            );
          }
        }

        return editedFamily;
      });

      // close modal
      setDisplayEditFamilyModal((cur) => !cur);
    } else {
      console.error(resp_json.error);
      if (resp.status === 403) {
        toast.error("Only family admins can edit the family");
      } else {
        toast.error("Error editing family");
      }
    }
  }

  return (
    <div
      className={styles.main}
      onClick={() => {
        setDisplayEditFamilyModal((cur) => !cur);
      }}
    >
      <div
        className="modal"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <h2 className="title_text">Edit family</h2>
        <hr />
        <label>Name</label>
        <input type="text" placeholder={family.name} ref={nameInputRef} />
        <label>Renewal price ($)</label>
        <input
          type="number"
          placeholder={String(family.price)}
          ref={priceInputRef}
        />
        <label>Rounding</label>
        <select ref={roundingSelectRef} defaultValue={family.rounding}>
          <option value={"up"}>
            Round up (${family.price / family.members.length} ➡ $
            {Math.round(family.price / family.members.length)})
          </option>
          <option value={"down"}>
            Round down (${family.price / family.members.length} ➡ $
            {Math.floor(family.price / family.members.length)})
          </option>
          <option value={"none"}>
            No rounding (${family.price} ➡ $
            {family.price / family.members.length})
          </option>
        </select>
        <span>
          <button className="save_button" onClick={submitFamilyEdit}>
            Save <FontAwesomeIcon icon={faSave} />
          </button>
          <button
            className="cancel_button"
            onClick={() => {
              setDisplayEditFamilyModal((cur) => !cur);
            }}
          >
            Cancel
          </button>
        </span>
      </div>
    </div>
  );
}
