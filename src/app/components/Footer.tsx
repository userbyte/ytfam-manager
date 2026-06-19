import getConfig from "next/config";
import styles from "../style/module/Footer.module.css";

export default function Footer() {
  const { publicRuntimeConfig } = getConfig();
  const curYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <p>ytfam-manager v{publicRuntimeConfig?.version}</p>
      <p>
        &copy;{" "}
        <a id="homepageFooterLink" href="https://userbyte.xyz">
          userbyte.xyz
        </a>{" "}
        {curYear}
      </p>
    </footer>
  );
}
