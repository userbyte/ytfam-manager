"use client";
import { useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAdd } from "@fortawesome/free-solid-svg-icons";
import { Family, Member } from "../models/db";
import styles from "@/app/style/module/AddPaymentModal.module.css";
import { sleep } from "../utils/shared";

export default function AddPaymentModal({
  family,
  setFamily,
  me,
  isAdmin,
  setDisplayAddPaymentModal,
}: {
  family: Family;
  setFamily: React.Dispatch<React.SetStateAction<Family>>;
  me: Member;
  isAdmin: boolean;
  setDisplayAddPaymentModal: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const searchParams = useSearchParams();
  const full_code = searchParams.get("code");

  const datetimeInputRef = useRef<HTMLInputElement | null>(null);
  const memberSelectRef = useRef<HTMLSelectElement | null>(null);
  const amountInputRef = useRef<HTMLInputElement | null>(null);

  const selectionEls: Array<React.JSX.Element> = [];
  family.members.forEach((member) => {
    selectionEls.push(
      <option key={member.name} value={member.name}>
        {member.name}
      </option>
    );
  });

  async function submitAddPayment() {
    // check input refs
    if (
      !datetimeInputRef.current ||
      !memberSelectRef.current ||
      !amountInputRef.current
    ) {
      console.error("submitAddPayment(): one or more input refs are null");
      return;
    }

    // validate inputs
    if (amountInputRef.current.value === "") {
      toast.error("Payment amount cannot be empty");
      const initialColor = amountInputRef.current.style.backgroundColor;
      amountInputRef.current.style.backgroundColor = "#992a2a";
      sleep(700).then(() => {
        if (amountInputRef.current)
          amountInputRef.current.style.backgroundColor = initialColor;
      });
      return;
    }

    // if we are an admin, we are allowed to set the payment member
    // otherwise, the payment member will be set to ourself
    let member: string = me.name;
    if (isAdmin) {
      member = memberSelectRef.current.value;
    }
    // get local timezone offset
    const tzoffset = new Date().getTimezoneOffset();

    const newPayment = {
      timestamp: datetimeInputRef.current.valueAsNumber / 1000 + tzoffset * 60,
      member: member,
      amount: amountInputRef.current.valueAsNumber,
    };

    // add to db
    const resp = await fetch("/api/family/payments", {
      method: "POST",
      body: JSON.stringify({
        full_code: full_code,
        payment: newPayment,
      }),
    });
    const resp_json = await resp.json();
    if (resp_json.status === "success") {
      // update local family data to reflect change
      setFamily((prevFamily) => {
        const updated_payments = [...prevFamily.payments, resp_json.payment];

        return {
          ...prevFamily,
          payments: updated_payments,
        };
      });

      // close modal
      setDisplayAddPaymentModal(false);
    } else {
      console.error(resp_json.error);
      if (resp.status === 403) {
        toast.error(
          `You can only add a payment with member of "${me.name}" (permission error)`
        );
      } else {
        toast.error("Error adding payment");
      }
    }
  }

  function formatLocalDateTime(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");

    const Y = date.getFullYear();
    const M = pad(date.getMonth() + 1);
    const D = pad(date.getDate());
    const h = pad(date.getHours());
    const m = pad(date.getMinutes());

    return `${Y}-${M}-${D}T${h}:${m}`;
  }

  return (
    <div
      className={styles.main}
      onClick={() => {
        setDisplayAddPaymentModal((cur) => !cur);
      }}
    >
      <div
        className="modal"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <p className="title_text">Add a payment</p>
        <hr />
        <label>Date + time</label>
        <input
          type="datetime-local"
          defaultValue={formatLocalDateTime(new Date())}
          ref={datetimeInputRef}
        />
        {isAdmin ? (
          <>
            <label>Member</label>
            <select ref={memberSelectRef}>{selectionEls}</select>
          </>
        ) : (
          <>
            <label>Member</label>
            <select ref={memberSelectRef} defaultValue={me.name} disabled>
              {selectionEls}
            </select>
          </>
        )}
        <label>Amount ($)</label>
        <input type="number" placeholder="$0.00" min="0" ref={amountInputRef} />
        <span>
          <button className="add_button" onClick={submitAddPayment}>
            Add <FontAwesomeIcon icon={faAdd} />
          </button>
          <button
            className="close_button"
            onClick={() => {
              setDisplayAddPaymentModal((cur) => !cur);
            }}
          >
            Cancel
          </button>
        </span>
      </div>
    </div>
  );
}
