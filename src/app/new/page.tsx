import type { Metadata } from "next";
import NewFamilyDialog from "../components/NewFamilyDialog";
import styles from "@/app/style/module/NewFamilyPage.module.css";

export const metadata: Metadata = {
  title: "ytfam-manager",
  description: "Create a new family...",
};

export default function NewFamilyPage() {
  return (
    <div className={styles.main}>
      <NewFamilyDialog />
    </div>
  );
}
